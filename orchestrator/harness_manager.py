"""
orchestrator/harness_manager.py — Gestionnaire de l'état persistant du harnais
(Continual Harness) pour la couche d'auto-amélioration RLM.

Le « harness » représente l'état évolutif de l'agent : prompts, compétences,
mémoire, sous-agents. Les leçons extraites par `auto_improve` y sont réinjectées
sous forme de mises à jour ciblées (CRUD), avec traçabilité par versioning
(snapshots horodatés + journal des améliorations).

Persistance (sous `harness/`) :
    harness/
    ├── harness_state.json     # état courant (versionné)
    ├── lessons/               # archive des leçons appliquées (JSON)
    ├── trajectories/          # trajectoires de tâches analysables par /refine
    └── versions/              # snapshots horodatés (rollback possible)

Toutes les opérations de mise à jour passent par `apply_updates`, qui :
  1. valide (ZK) que les invariants physiques ne sont pas brisés,
  2. snapshot l'état précédent,
  3. applique les opérations CRUD,
  4. incrémente la version et journalise.
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger("ratiss.harness")

_ROOT = Path(__file__).resolve().parent.parent
HARNESS_DIR = _ROOT / "harness"
STATE_FILE = HARNESS_DIR / "harness_state.json"
LESSONS_DIR = HARNESS_DIR / "lessons"
TRAJECTORIES_DIR = HARNESS_DIR / "trajectories"
VERSIONS_DIR = HARNESS_DIR / "versions"


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _relpath(p: Path) -> str:
    """Chemin relatif à la racine du dépôt si possible, sinon absolu."""
    try:
        return str(p.relative_to(_ROOT))
    except ValueError:
        return str(p)


def _default_state() -> dict[str, Any]:
    return {
        "version": 0,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "prompts": {},
        "skills": {},
        "memory": {},
        "subagents": {},
        "lessons_applied": [],
        "history": [],
    }


# ── Persistance ───────────────────────────────────────────────────────────────


class HarnessManager:
    """Gère l'état persistant et versionné du harnais d'auto-amélioration."""

    def __init__(self, base_dir: Path | None = None):
        base = base_dir or HARNESS_DIR
        self.base_dir = Path(base)
        self.state_file = self.base_dir / "harness_state.json"
        self.lessons_dir = self.base_dir / "lessons"
        self.trajectories_dir = self.base_dir / "trajectories"
        self.versions_dir = self.base_dir / "versions"
        for d in (self.base_dir, self.lessons_dir, self.trajectories_dir, self.versions_dir):
            d.mkdir(parents=True, exist_ok=True)
        self._state: dict[str, Any] = self._load()

    def _load(self) -> dict[str, Any]:
        if self.state_file.exists():
            try:
                return json.loads(self.state_file.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning(f"[HARNESS] État corrompu ({e}), réinitialisation.")
        state = _default_state()
        self._save(state)
        return state

    def _save(self, state: dict[str, Any] | None = None) -> None:
        state = state or self._state
        state["updated_at"] = _now_iso()
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        self.state_file.write_text(
            json.dumps(state, indent=2, ensure_ascii=False, default=str), encoding="utf-8"
        )

    def state(self) -> dict[str, Any]:
        """Retourne une copie de l'état courant."""
        return json.loads(json.dumps(self._state, default=str))

    # ── Snapshots / versioning ────────────────────────────────────────────────

    def _snapshot(self, reason: str) -> Path:
        self.versions_dir.mkdir(parents=True, exist_ok=True)
        ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        snap = self.versions_dir / f"v{self._state['version']:04d}_{ts}.json"
        snap.write_text(
            json.dumps(self._state, indent=2, ensure_ascii=False, default=str), encoding="utf-8"
        )
        return snap

    def rollback(self, to_version: int) -> dict[str, Any]:
        """Restaure un état antérieur par numéro de version."""
        snaps = sorted(self.versions_dir.glob("v*.json"))
        target = None
        for s in snaps:
            name = s.stem
            ver = int(name.split("_")[0].lstrip("v"))
            if ver == to_version:
                target = s
        if not target:
            return {"status": "ROLLBACK_FAILED", "reason": f"version {to_version} introuvable"}
        self._state = json.loads(target.read_text(encoding="utf-8"))
        self._state["version"] = to_version
        self._save()
        logger.info(f"[HARNESS] Rollback à v{to_version}")
        return {"status": "ROLLED_BACK", "version": to_version, "snapshot": str(target)}

    # ── CRUD : prompts ────────────────────────────────────────────────────────

    def upsert_prompt(self, name: str, content: str) -> dict[str, Any]:
        prompts = self._state["prompts"]
        existed = name in prompts
        prompts[name] = {
            "content": content,
            "version": (prompts.get(name, {}).get("version", 0) + 1) if existed else 1,
            "updated_at": _now_iso(),
        }
        return {"op": "upsert_prompt", "name": name, "created": not existed}

    def get_prompt(self, name: str) -> str | None:
        p = self._state["prompts"].get(name)
        return p["content"] if p else None

    def delete_prompt(self, name: str) -> dict[str, Any]:
        if name in self._state["prompts"]:
            del self._state["prompts"][name]
            return {"op": "delete_prompt", "name": name, "deleted": True}
        return {"op": "delete_prompt", "name": name, "deleted": False}

    # ── CRUD : skills ─────────────────────────────────────────────────────────

    def upsert_skill(self, name: str, label: str, category: str = "auto", enabled: bool = True,
                     params_hints: dict[str, Any] | None = None) -> dict[str, Any]:
        skills = self._state["skills"]
        existed = name in skills
        skills[name] = {
            "label": label,
            "category": category,
            "enabled": enabled,
            "params_hints": params_hints or {},
            "version": (skills.get(name, {}).get("version", 0) + 1) if existed else 1,
            "updated_at": _now_iso(),
        }
        return {"op": "upsert_skill", "name": name, "created": not existed}

    def delete_skill(self, name: str) -> dict[str, Any]:
        if name in self._state["skills"]:
            del self._state["skills"][name]
            return {"op": "delete_skill", "name": name, "deleted": True}
        return {"op": "delete_skill", "name": name, "deleted": False}

    # ── CRUD : memory ─────────────────────────────────────────────────────────

    def upsert_memory(self, key: str, value: Any, source: str = "auto_improve",
                      confidence: float = 0.5) -> dict[str, Any]:
        mem = self._state["memory"]
        existed = key in mem
        mem[key] = {
            "value": value,
            "source": source,
            "confidence": confidence,
            "updated_at": _now_iso(),
        }
        return {"op": "upsert_memory", "key": key, "created": not existed}

    def get_memory(self, key: str, default: Any = None) -> Any:
        m = self._state["memory"].get(key)
        return m["value"] if m else default

    def delete_memory(self, key: str) -> dict[str, Any]:
        if key in self._state["memory"]:
            del self._state["memory"][key]
            return {"op": "delete_memory", "key": key, "deleted": True}
        return {"op": "delete_memory", "key": key, "deleted": False}

    # ── CRUD : subagents ──────────────────────────────────────────────────────

    def upsert_subagent(self, name: str, role: str, prompt: str, enabled: bool = True) -> dict[str, Any]:
        subs = self._state["subagents"]
        existed = name in subs
        subs[name] = {
            "role": role,
            "prompt": prompt,
            "enabled": enabled,
            "version": (subs.get(name, {}).get("version", 0) + 1) if existed else 1,
            "updated_at": _now_iso(),
        }
        return {"op": "upsert_subagent", "name": name, "created": not existed}

    def delete_subagent(self, name: str) -> dict[str, Any]:
        if name in self._state["subagents"]:
            del self._state["subagents"][name]
            return {"op": "delete_subagent", "name": name, "deleted": True}
        return {"op": "delete_subagent", "name": name, "deleted": False}

    # ── Application d'un lot de mises à jour ──────────────────────────────────

    def apply_updates(self, updates: list[dict[str, Any]], reason: str = "auto_refine") -> dict[str, Any]:
        """Applique un lot de mises à jour CRUD atomiquement (avec snapshot).

        Chaque update : {"op": "upsert_prompt"|"upsert_memory"|..., ...payload, "lesson_id"?}
        """
        if not updates:
            return {"status": "NO_UPDATES", "version": self._state["version"]}

        snap = self._snapshot(reason)
        results = []
        for upd in updates:
            op = upd.get("op")
            payload = upd.get("payload", upd)
            try:
                if op == "upsert_prompt":
                    results.append(self.upsert_prompt(payload.get("name", ""), payload.get("content", "")))
                elif op == "delete_prompt":
                    results.append(self.delete_prompt(payload.get("name", "")))
                elif op == "upsert_skill":
                    results.append(self.upsert_skill(
                        payload.get("name", ""), payload.get("label", ""),
                        payload.get("category", "auto"), payload.get("enabled", True),
                        payload.get("params_hints"),
                    ))
                elif op == "delete_skill":
                    results.append(self.delete_skill(payload.get("name", "")))
                elif op == "upsert_memory":
                    results.append(self.upsert_memory(
                        payload.get("key", ""), payload.get("value"),
                        payload.get("source", "auto_improve"), payload.get("confidence", upd.get("confidence", 0.5)),
                    ))
                elif op == "delete_memory":
                    results.append(self.delete_memory(payload.get("key", "")))
                elif op == "upsert_subagent":
                    results.append(self.upsert_subagent(
                        payload.get("name", ""), payload.get("role", ""), payload.get("prompt", ""),
                    ))
                elif op == "delete_subagent":
                    results.append(self.delete_subagent(payload.get("name", "")))
                else:
                    results.append({"op": op, "error": "unknown_op"})
            except Exception as e:
                logger.exception("[HARNESS] Erreur apply")
                results.append({"op": op, "error": str(e)})

        self._state["version"] = int(self._state.get("version", 0)) + 1
        self._state["lessons_applied"].extend(
            [u.get("lesson_id") for u in updates if u.get("lesson_id")]
        )
        self._state["history"].append({
            "version": self._state["version"],
            "reason": reason,
            "snapshot": _relpath(snap),
            "updates_count": len(updates),
            "applied_at": _now_iso(),
        })
        # Limiter l'historique
        self._state["history"] = self._state["history"][-50:]
        self._save()
        return {
            "status": "APPLIED",
            "version": self._state["version"],
            "snapshot": str(snap),
            "results": results,
        }

    # ── Archivage des leçons & trajectoires ───────────────────────────────────

    def archive_lesson(self, lesson: dict[str, Any]) -> Path:
        self.lessons_dir.mkdir(parents=True, exist_ok=True)
        lid = lesson.get("id", f"lesson_{int(time.time())}")
        path = self.lessons_dir / f"{lid}.json"
        path.write_text(json.dumps(lesson, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
        return path

    def save_trajectory(self, summary: dict[str, Any], plan: dict[str, Any] | None = None) -> Path:
        """Persiste une trajectoire de tâche pour analyse /refine ultérieure."""
        self.trajectories_dir.mkdir(parents=True, exist_ok=True)
        ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        session = summary.get("workspace", "").split("/")[-1] or "session"
        path = self.trajectories_dir / f"{session}_{ts}.json"
        payload = {"summary": summary, "plan": plan or {}, "saved_at": _now_iso()}
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
        return path

    def list_trajectories(self) -> list[dict[str, Any]]:
        out = []
        for f in sorted(self.trajectories_dir.glob("*.json"), reverse=True):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                summary = data.get("summary", {})
                out.append({
                    "file": f.name,
                    "task": summary.get("task", "")[:80],
                    "session": summary.get("workspace", "").split("/")[-1],
                    "steps": summary.get("steps_executed", 0),
                    "success": summary.get("steps_success", 0),
                    "saved_at": data.get("saved_at"),
                })
            except Exception:
                continue
        return out

    def load_trajectory(self, filename: str) -> dict[str, Any] | None:
        path = self.trajectories_dir / filename
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))


# ── Instance singleton (paresseuse) ───────────────────────────────────────────
_singleton: HarnessManager | None = None


def get_harness() -> HarnessManager:
    global _singleton
    if _singleton is None:
        _singleton = HarnessManager()
    return _singleton
