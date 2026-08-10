"""
kernel/system/sovereign_memory.py — Mémoire personnelle persistante de Ratiss.

Le cœur du « ratiss doit réécrire sa mémoire pour toujours se souvenir ».
La mémoire vit en dehors du contexte du modèle, sur le disque du nœud souverain.
Ainsi Ratiss ne se perd jamais, même si un travail est long et que le contexte
du modèle finit par être saturé : les éléments essentiels (qui il est, ses
capacités, le profil de l'utilisateur, les derniers souvenirs) sont rechargés
à chaque appel et réinjectés dans le préfixe système.

Persistance (sous config/) :
    config/sovereign_memory.json    # mémoire courante (JSON, UTF-8)

Structure de la mémoire :
    {
      "identity": { ... },          # ancrée (JohnKing0 / RATISS V9 Aeon Prime)
      "capabilities": [ ... ],      # ce que Ratiss sait faire
      "profile": { ... },           # profil utilisateur (onboarding : âge, métier…)
      "onboarded": bool,            # synchronisation initiale faite ou non
      "security_mode": "sovereign", # sovereign (fermé) ou cloud_opt_in
      "memories": [                  # souvenirs datés (les plus récents en premier)
        {"id", "ts", "kind", "content", "confidence"}
      ],
      "updated_at": "..."
    }

Souveraineté : 100 % local, fichier JSON, aucune donnée envoyée au cloud.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from pathlib import Path
from typing import Any

logger = logging.getLogger("ratiss.sovereign_memory")

_ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = _ROOT / "config"
MEMORY_FILE = CONFIG_DIR / "sovereign_memory.json"

# Bornes pour éviter une croissance infinie de la mémoire.
MAX_MEMORIES = 200
MAX_RECENT_SNAPSHOT = 8

# ── Capacités de base de Ratiss (référence, complétée par auto-improve) ───────

BASE_CAPABILITIES = [
    "Physique quantique (diagonalisation exacte Lanczos, modèle t-J)",
    "Topologie computationnelle (homologie persistante, nombres de Betti)",
    "Biologie structurale (structures PDB, AlphaFold)",
    "Cryptographie ZK-STARK (preuves vérifiables RISC Zero)",
    "Terminal sécurisé (allowlist, streaming, blocage des commandes dangereuses)",
    "Exécution Python sandbox (numpy, scipy, matplotlib, timeout 30s)",
    "Navigateur web (navigation, clic, saisie, capture, extraction)",
    "Recherche scientifique (arXiv, PubMed, ChEMBL, PDB, AlphaFold, web)",
    "Recherche web générale (Tavily + DuckDuckGo fallback)",
    "Génération d'artéfacts (PDF, graphiques, pages HTML, diagrammes)",
    "Import universel de fichiers (tous formats scientifiques)",
    "Auto-amélioration (RLM / Continual Harness, leçons validées par ZK)",
    "Mémoire persistante (souvenirs rechargés à chaque appel)",
]

# ── Identité ancrée (importée en retard pour éviter les cycles) ───────────────


def _anchored_identity() -> dict[str, Any]:
    try:
        from config.sovereign_identity import identity_signature

        sig = identity_signature()
        # On garde une trace stable, sans l'horodatage qui change à chaque appel.
        sig.pop("signed_at", None)
        return sig
    except Exception as e:  # défense : toujours avoir une identité
        logger.warning(f"[SOVEREIGN] Identité de secours ({e})")
        return {
            "instance_name": "JohnKing0",
            "system": "RATISS V9 Aeon Prime",
            "version": "9.3",
            "ecosystem": "Integrated Quantum Ecosystem",
            "architecte": "Jonathan Evina",
            "orcid": "0009-0000-4092-5313",
            "doi": "10.17605/OSF.IO/6JZMB",
            "platform": "Nœud Local Souverain (Ryzen 5 PRO, Linux)",
        }


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _default_memory() -> dict[str, Any]:
    return {
        "identity": _anchored_identity(),
        "capabilities": list(BASE_CAPABILITIES),
        "profile": {},
        "onboarded": False,
        "security_mode": "sovereign",  # fermé par défaut ; cloud opt-in explicite
        "memories": [],
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }


# ── Gestionnaire de mémoire ───────────────────────────────────────────────────


class SovereignMemory:
    """Mémoire personnelle persistante de Ratiss (hors contexte du modèle).

    Toutes les écritures passent par des méthodes explicites et sont sauvegardées
    immédiatement sur disque. La mémoire est rechargée à la volée, donc un long
    travail peut sauvegarder des souvenirs intermédiaires sans saturer le
    contexte du modèle : le prochain appel reprendra depuis ces souvenirs.
    """

    def __init__(self, path: Path | None = None):
        self.path = Path(path) if path else MEMORY_FILE
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._mem: dict[str, Any] = self._load()

    # ── Persistance ──────────────────────────────────────────────────────────

    def _load(self) -> dict[str, Any]:
        if self.path.exists():
            try:
                return json.loads(self.path.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning(f"[SOVEREIGN] Mémoire corrompue ({e}), réinitialisation.")
        mem = _default_memory()
        self._save(mem)
        return mem

    def _save(self, mem: dict[str, Any] | None = None) -> None:
        mem = mem or self._mem
        mem["updated_at"] = _now_iso()
        # Toujours garder l'identité ancrée à jour (au cas où la version change).
        if not mem.get("identity"):
            mem["identity"] = _anchored_identity()
        self.path.write_text(
            json.dumps(mem, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )

    def reload(self) -> None:
        """Recharge la mémoire depuis le disque (utile entre deux longs travaux)."""
        self._mem = self._load()

    def state(self) -> dict[str, Any]:
        """Retourne une copie de la mémoire complète."""
        return json.loads(json.dumps(self._mem, default=str))

    # ── Souvenirs ───────────────────────────────────────────────────────────

    def remember(
        self,
        content: str,
        kind: str = "note",
        confidence: float = 0.8,
    ) -> dict[str, Any]:
        """Ajoute un souvenir daté à la mémoire de Ratiss.

        Args:
            content: le souvenir, en langage naturel et court.
            kind: type de souvenir (note, fact, preference, lesson, task, profile).
            confidence: 0.0 à 1.0.

        Returns:
            Le souvenir créé.
        """
        if not content or not content.strip():
            return {}
        entry = {
            "id": uuid.uuid4().hex[:12],
            "ts": _now_iso(),
            "kind": kind,
            "content": content.strip(),
            "confidence": round(float(confidence), 2),
        }
        memories = self._mem.setdefault("memories", [])
        memories.insert(0, entry)  # les plus récents en premier
        # Limiter la taille de la mémoire.
        if len(memories) > MAX_MEMORIES:
            self._mem["memories"] = memories[:MAX_MEMORIES]
        self._save()
        return entry

    def forget(self, memory_id: str) -> bool:
        memories = self._mem.get("memories", [])
        before = len(memories)
        self._mem["memories"] = [m for m in memories if m.get("id") != memory_id]
        if len(self._mem["memories"]) != before:
            self._save()
            return True
        return False

    def clear_memories(self) -> None:
        """Efface tous les souvenirs (pas l'identité ni le profil)."""
        self._mem["memories"] = []
        self._save()

    def list_memories(self, kind: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        memories = self._mem.get("memories", [])
        if kind:
            memories = [m for m in memories if m.get("kind") == kind]
        return memories[:limit]

    # ── Profil utilisateur (onboarding) ──────────────────────────────────────

    def set_profile(self, profile: dict[str, Any], mark_onboarded: bool = True) -> dict[str, Any]:
        """Enregistre le profil utilisateur recueilli à l'onboarding.

        Synchronisé une fois avec Ratiss : âge, données métier, objectif, etc.
        """
        # Fusionner plutôt qu'écraser (permet les mises à jour partielles).
        current = self._mem.get("profile", {}) or {}
        current.update({k: v for k, v in profile.items() if v not in (None, "")})
        self._mem["profile"] = current
        if mark_onboarded:
            self._mem["onboarded"] = True
        # Garder une trace en souvenirs aussi.
        name = current.get("display_name") or current.get("name") or "l'utilisateur"
        self.remember(
            f"Profil synchronisé : {name}. Activité : "
            f"{current.get('role', 'non précisée')}. Objectif : "
            f"{current.get('goal', 'non précisé')}.",
            kind="profile",
            confidence=1.0,
        )
        self._save()
        return current

    def get_profile(self) -> dict[str, Any]:
        return self._mem.get("profile", {}) or {}

    def is_onboarded(self) -> bool:
        return bool(self._mem.get("onboarded"))

    # ── Mode de sécurité ─────────────────────────────────────────────────────

    def set_security_mode(self, mode: str) -> None:
        """Définit le standard de sécurité d'entrée.

        - 'sovereign' (défaut) : fermé, local, aucune donnée vers le cloud.
        - 'cloud_opt_in' : l'utilisateur a explicitement accepté d'ouvrir le cloud
          (clés API configurées). Les données restent sous contrôle utilisateur.
        """
        if mode not in ("sovereign", "cloud_opt_in"):
            raise ValueError(f"Mode de sécurité inconnu : {mode}")
        self._mem["security_mode"] = mode
        label = "souverain (fermé, local)" if mode == "sovereign" else "cloud opt-in (accepté par l'utilisateur)"
        self.remember(
            f"Standard de sécurité choisi : {label}.",
            kind="preference",
            confidence=1.0,
        )

    def get_security_mode(self) -> str:
        return self._mem.get("security_mode", "sovereign")

    # ── Capacités ────────────────────────────────────────────────────────────

    def add_capability(self, label: str) -> None:
        caps = self._mem.setdefault("capabilities", [])
        if label and label not in caps:
            caps.append(label)
            self._save()

    def list_capabilities(self) -> list[str]:
        return list(self._mem.get("capabilities", []))

    # ── Résumé pour injection dans le préfixe système ─────────────────────────

    def snapshot_for_prompt(self) -> dict[str, Any]:
        """Résumé court de la mémoire à injecter dans le préfixe système LLM.

        Garde l'essentiel (profil, capacités, derniers souvenirs) sans tout le
        détail, pour ne pas alourdir chaque appel. C'est ce qui empêche Ratiss
        de se perdre quand le contexte du modèle est saturé.
        """
        mem = self._mem
        recent = [m.get("content", "") for m in mem.get("memories", [])[:MAX_RECENT_SNAPSHOT]]
        return {
            "identity": mem.get("identity", {}),
            "profile": mem.get("profile", {}) or {},
            "capabilities": mem.get("capabilities", [])[:14],
            "recent_memories": recent,
            "onboarded": mem.get("onboarded", False),
            "security_mode": mem.get("security_mode", "sovereign"),
        }

    def build_system_prefix(self) -> str:
        """Construit le préfixe système complet : identité + mémoire."""
        from config.sovereign_identity import build_system_prefix as _bsp

        return _bsp(self.snapshot_for_prompt())

    def who_am_i(self) -> str:
        from config.sovereign_identity import who_am_i

        return who_am_i()


# ── Singleton paresseux ───────────────────────────────────────────────────────

_singleton: SovereignMemory | None = None


def get_memory() -> SovereignMemory:
    global _singleton
    if _singleton is None:
        _singleton = SovereignMemory()
    return _singleton
