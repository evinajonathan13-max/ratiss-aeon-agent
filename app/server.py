"""
app/server.py — Serveur FastAPI pour RATISS Aeon Prime.

HTTP endpoints + WebSocket unique multiplexé (chat, cascade, logs, telemetry,
artifacts, connectors). Sert l'UI statique (HTML/CSS/JS + D3.js local).

Lancement : python -m app.server  (ou uvicorn app.server:app)
"""
from __future__ import annotations

import os
import sys
import json
import asyncio
import logging
from pathlib import Path
from typing import Any

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from kernel import bridge
from kernel.connectors.registry import get_connectors_status, list_local_pdb
from kernel.connectors.integrations import (
    integrations_status as _integrations_status,
    set_token as _set_integration_token,
    clear_token as _clear_integration_token,
    get_token as _get_integration_token,
)
from kernel.connectors.integration_actions import run_integration
from orchestrator.agent import RatissAgent, get_skills_overview

logger = logging.getLogger("ratiss.server")
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(name)s %(message)s")

app = FastAPI(title="RATISS Aeon Prime", version="9.0.0")

STATIC_DIR = _ROOT / "app" / "static"
ASSETS_DIR = STATIC_DIR / "assets"

# ── Logo & bannière (assets source, servis avant le mount /assets) ───────────
# Les routes logo sont déclarées AVANT le mount StaticFiles("/assets") : Starlette
# résout les routes dans l'ordre d'enregistrement, donc ces routes précises
# (/assets/logo.svg, /assets/logo.png) sont servies par Ratiss et ne sont pas
# masquées par le bundle Vite (qui a des noms hachés). Valide en local (pas de
# build frontend) ET en Docker (build frontend présent).
from fastapi.responses import Response as _Response


@app.get("/assets/logo.svg")
async def logo_svg():
    p = _ROOT / "assets" / "ratiss_logo.svg"
    if p.exists():
        return _Response(content=p.read_text(encoding="utf-8"), media_type="image/svg+xml")
    return JSONResponse({"error": "not_found"}, status_code=404)


@app.get("/assets/logo.png")
async def logo_png():
    p = _ROOT / "assets" / "ratiss_logo.png"
    if p.exists():
        return _Response(content=p.read_bytes(), media_type="image/png")
    return JSONResponse({"error": "not_found"}, status_code=404)


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
# Assets du build Vite (frontend React) servis à la racine /assets/
if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

# ── Connexions WebSocket actives ──────────────────────────────────────────────
_active_ws: set[WebSocket] = set()


async def _broadcast(evt: dict[str, Any]) -> None:
    """Diffuse un événement à tous les WebSocket connectés."""
    dead = set()
    for ws in _active_ws:
        try:
            await ws.send_json(evt)
        except Exception:
            dead.add(ws)
    _active_ws.difference_update(dead)


def _make_sync_emitter(loop: asyncio.AbstractEventLoop) -> Any:
    """Crée un émetteur synchrone qui planifie la diffusion async."""

    def emit(evt: dict[str, Any]) -> None:
        asyncio.run_coroutine_threadsafe(_broadcast(evt), loop)

    return emit


# ── HTTP endpoints ────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index():
    return HTMLResponse((STATIC_DIR / "index.html").read_text(encoding="utf-8"))


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "9.0.0", "kernel": "ratiss_v9_aeon_prime"}


# ── Identité souveraine & mémoire persistante ─────────────────────────────────


@app.get("/api/identity")
async def identity():
    """Déclaration d'identité ancrée de Ratiss (JohnKing0 / RATISS V9 Aeon Prime)."""
    from config.sovereign_identity import identity_signature, who_am_i

    return {
        "who_am_i": who_am_i(),
        "signature": identity_signature(),
    }


@app.get("/api/profile")
async def profile_get():
    """Profil utilisateur (onboarding) + état de la mémoire persistante."""
    from kernel.system.sovereign_memory import get_memory

    mem = get_memory()
    return {
        "profile": mem.get_profile(),
        "onboarded": mem.is_onboarded(),
        "security_mode": mem.get_security_mode(),
        "capabilities": mem.list_capabilities(),
        "memories": mem.list_memories(limit=50),
    }


@app.post("/api/profile/onboard")
async def profile_onboard(body: dict = None):
    """Synchronisation initiale avec Ratiss (une fois).

    Récupère l'âge, les données métier (rôle, domaine, objectif) et le mode de
    sécurité choisi, puis enregistre le tout dans la mémoire persistante. À
    partir de là, Ratiss se souvient de l'utilisateur à chaque conversation.

    Body: {
      display_name, age, role, domain, business{role,domain}, goal,
      security_mode: "sovereign" | "cloud_opt_in"
    }
    """
    from kernel.system.sovereign_memory import get_memory

    body = body or {}
    profile = {
        "display_name": (body.get("display_name") or body.get("name") or "").strip(),
        "age": body.get("age"),
        "role": (body.get("role") or "").strip(),
        "domain": (body.get("domain") or "").strip(),
        "goal": (body.get("goal") or "").strip(),
    }
    business = body.get("business") or {}
    if business.get("role"):
        profile["role"] = profile["role"] or business["role"]
    if business.get("domain"):
        profile["domain"] = profile["domain"] or business["domain"]

    mem = get_memory()
    saved = mem.set_profile(profile, mark_onboarded=True)

    # Standard de sécurité d'entrée : souverain (fermé) par défaut, cloud opt-in
    # seulement si l'utilisateur l'accepte explicitement.
    mode = body.get("security_mode", "sovereign")
    if mode in ("sovereign", "cloud_opt_in"):
        try:
            mem.set_security_mode(mode)
        except Exception:
            pass

    return {
        "status": "ONBOARDED",
        "profile": saved,
        "security_mode": mem.get_security_mode(),
        "message": f"Bienvenue {saved.get('display_name') or ''} ! Ratiss a mémorisé ton profil.",
    }


@app.post("/api/profile/security")
async def profile_security(body: dict = None):
    """Change le standard de sécurité d'entrée (souverain / cloud opt-in)."""
    from kernel.system.sovereign_memory import get_memory

    body = body or {}
    mode = body.get("security_mode", "sovereign")
    try:
        get_memory().set_security_mode(mode)
        return {"status": "OK", "security_mode": mode}
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@app.get("/api/memory/state")
async def memory_state():
    """État complet de la mémoire persistante de Ratiss."""
    from kernel.system.sovereign_memory import get_memory

    return get_memory().state()


@app.post("/api/memory/remember")
async def memory_remember(body: dict = None):
    """Ajoute un souvenir à la mémoire persistante de Ratiss."""
    from kernel.system.sovereign_memory import get_memory

    body = body or {}
    content = (body.get("content") or "").strip()
    if not content:
        return JSONResponse({"error": "empty_content"}, status_code=400)
    entry = get_memory().remember(
        content,
        kind=body.get("kind", "note"),
        confidence=body.get("confidence", 0.8),
    )
    return {"status": "REMEMBERED", "entry": entry}


@app.delete("/api/memory/{memory_id}")
async def memory_forget(memory_id: str):
    from kernel.system.sovereign_memory import get_memory

    deleted = get_memory().forget(memory_id)
    return {"status": "OK" if deleted else "NOT_FOUND", "deleted": deleted}


@app.get("/api/memory")
async def memory():
    return bridge.get_memory_status()


@app.get("/api/connectors")
async def connectors():
    return get_connectors_status()


@app.get("/api/pdb")
async def pdb_list():
    return {"structures": list_local_pdb(), "local_count": len(list_local_pdb())}


@app.get("/api/skills")
async def skills():
    return {"skills": get_skills_overview()}


@app.get("/api/artifacts/{session_id}")
async def list_artifacts(session_id: str):
    ws_dir = _ROOT / "workspace" / session_id
    if not ws_dir.exists():
        return {"artifacts": [], "session_id": session_id}
    artifacts = []
    for f in sorted(ws_dir.iterdir()):
        if f.is_file():
            artifacts.append({
                "name": f.name,
                "size_bytes": f.stat().st_size,
                "kind": f.suffix.lstrip("."),
                "path": str(f.relative_to(_ROOT)),
            })
    return {"artifacts": artifacts, "session_id": session_id}


@app.get("/api/artifacts/{session_id}/{filename}")
async def download_artifact(session_id: str, filename: str):
    fpath = _ROOT / "workspace" / session_id / filename
    if not fpath.exists() or not fpath.is_file():
        return JSONResponse({"error": "not_found"}, status_code=404)
    return FileResponse(str(fpath), filename=filename)


@app.post("/api/run")
async def run_sync(task: str = ""):
    """Exécution synchrone (sans WebSocket) — pour tests/API."""
    result = {"error": "no_task"}
    if task:
        # Émetteur noop pour run synchrone
        agent = RatissAgent(emit_fn=lambda evt: None)
        loop = asyncio.get_event_loop()
        agent.cascade.emit_fn = _make_sync_emitter(loop)
        result = await asyncio.to_thread(agent.run, task)
    return result


# ── Endpoints de compatibilité UI (frontend React) ───────────────────────────
# Ces endpoints adaptent le backend existant à la logique visuelle du frontend :
# /api/chat (SSE), /api/stats, /api/config/*, /api/agentic/*.


@app.get("/api/stats")
async def stats():
    """Compteur de requêtes (compat UI). Persistant en mémoire processus."""
    stats.n = getattr(stats, "n", 0)
    return {"count": stats.n, "quota": 100}


@app.post("/api/stats", include_in_schema=False)
async def stats_inc():
    stats.n = getattr(stats, "n", 0) + 1
    return {"count": stats.n, "quota": 100}


@app.get("/api/config/status")
async def config_status():
    """État de configuration — tous les fournisseurs LLM."""
    from orchestrator.llm_router import llm_router

    status = llm_router.status()
    any_configured = any(p["configured"] for p in status["providers"].values())
    return {"configured": any_configured, "providers": status["providers"], "default_model": status["default_model"]}


@app.post("/api/config/key")
async def config_key(body: dict = None):
    """Configure une clé API pour un fournisseur LLM.

    Body: {"provider": "anthropic|google|openai|openrouter", "api_key": "sk-..."}
    """
    from orchestrator.llm_router import set_api_key, llm_router

    body = body or {}
    provider = body.get("provider", body.get("provider_id", ""))
    api_key = body.get("api_key", "").strip()
    if not provider or not api_key:
        return JSONResponse({"error": "missing_provider_or_key"}, status_code=400)
    ok = set_api_key(provider, api_key)
    if not ok:
        return JSONResponse({"error": "unknown_provider", "provider": provider}, status_code=400)
    # Si un model_id est fourni, l'activer comme défaut
    if body.get("model_id"):
        os.environ["RATISS_MODEL_ID"] = body["model_id"]
    status = llm_router.status()
    return {"configured": True, "provider": provider, "providers": status["providers"]}


@app.get("/api/llm/models")
async def llm_models():
    """Liste tous les modèles disponibles (catalogue multi-fournisseurs)."""
    from orchestrator.llm_router import llm_router

    return llm_router.status()


@app.get("/api/llm/status")
async def llm_status():
    """Alias de /api/llm/models — état des fournisseurs LLM."""
    from orchestrator.llm_router import llm_router

    return llm_router.status()


# ── Vault de cles API persistant (environnement souverain) ───────────────────

@app.get("/api/vault/keys")
async def vault_list():
    """Liste les cles API stockees dans le vault persistant (sans reveler les valeurs)."""
    from security.api_vault import list_keys, SUPPORTED_KEYS
    stored = list_keys()
    return {"keys": stored, "supported": SUPPORTED_KEYS}


@app.post("/api/vault/key")
async def vault_store(body: dict = None):
    """Stocke une cle API dans le vault persistant (chiffre au repos).

    Body: {"key_id": "ibm_quantum", "api_key": "...", "label": "IBM QPU", "metadata": {}}
    """
    from security.api_vault import store_key, SUPPORTED_KEYS
    body = body or {}
    key_id = body.get("key_id", "").strip()
    api_key = body.get("api_key", "").strip()
    if not key_id or not api_key:
        return JSONResponse({"error": "missing_key_id_or_api_key"}, status_code=400)
    if key_id not in SUPPORTED_KEYS:
        return JSONResponse({"error": "unsupported_key", "key_id": key_id, "supported": SUPPORTED_KEYS}, status_code=400)
    store_key(key_id, api_key, body.get("label", ""), body.get("metadata"))
    return {"stored": True, "key_id": key_id}


@app.delete("/api/vault/key")
async def vault_delete(body: dict = None):
    """Supprime une cle API du vault persistant."""
    from security.api_vault import delete_key
    body = body or {}
    key_id = body.get("key_id", "").strip()
    if not key_id:
        return JSONResponse({"error": "missing_key_id"}, status_code=400)
    deleted = delete_key(key_id)
    return {"deleted": deleted, "key_id": key_id}


@app.post("/api/vault/load")
async def vault_load_env():
    """Charge toutes les cles du vault dans l'environnement (au demarrage)."""
    from security.api_vault import load_all_into_env
    count = load_all_into_env()
    return {"loaded": count}


# ── Analyse de repo clone -> creation de skills sous validation ──────────────

@app.post("/api/repo/analyze")
async def repo_analyze(body: dict = None):
    """Analyse un repo clone et propose des skills sous validation.

    Body: {"repo_path": "/path/to/repo"}
    """
    from orchestrator.repo_skill_extractor import analyze_repo
    body = body or {}
    repo_path = body.get("repo_path", "")
    if not repo_path:
        return JSONResponse({"error": "missing_repo_path"}, status_code=400)
    return analyze_repo(repo_path)


@app.post("/api/repo/register-skills")
async def repo_register_skills(body: dict = None):
    """Valide et enregistre les skills proposes dans le HarnessManager.

    Body: {"analysis": {...}, "skill_ids": ["repo_xxx_0", ...]}
    """
    from orchestrator.repo_skill_extractor import validate_and_register_skills
    from orchestrator.harness_manager import HarnessManager
    body = body or {}
    analysis = body.get("analysis")
    if not analysis:
        return JSONResponse({"error": "missing_analysis"}, status_code=400)
    hm = HarnessManager()
    return validate_and_register_skills(analysis, hm, body.get("skill_ids"))


@app.post("/api/llm/test")
async def llm_test(body: dict = None):
    """Teste une connexion LLM en envoyant un prompt simple.

    Body: {"model_id": "anthropic/claude-3-5-sonnet", "prompt": "Dis bonjour"}
    """
    from orchestrator.llm_router import llm_router

    body = body or {}
    model_id = body.get("model_id", "")
    prompt = body.get("prompt", "Réponds en une phrase : quel est ton nom et ton modèle ?")
    try:
        text = llm_router.complete(prompt, model_id=model_id, max_tokens=256)
        return {"status": "SUCCESS", "model_id": model_id, "response": text}
    except Exception as e:
        return {"status": "FAILED", "model_id": model_id, "error": str(e)}


@app.post("/api/llm/select")
async def llm_select(body: dict = None):
    """Sélectionne le modèle LLM par défaut pour l'agent.

    Body: {"model_id": "anthropic/claude-3-5-sonnet"}
    """
    body = body or {}
    model_id = body.get("model_id", "")
    if not model_id:
        return JSONResponse({"error": "missing_model_id"}, status_code=400)
    os.environ["RATISS_MODEL_ID"] = model_id
    return {"status": "SUCCESS", "model_id": model_id}


@app.post("/api/agentic/decompose-task")
async def decompose_task(body: dict = None):
    """Décomposition agentique d'un prompt en étapes (Plan Nemotron)."""
    body = body or {}
    prompt = body.get("prompt", "Calcul scientifique")
    try:
        from kernel.llm.nemotron_client import NemotronClient
        nc = NemotronClient()
        plan = nc.plan(prompt)
        steps = plan.get("steps", [])
        return {"status": "SUCCESS", "steps": steps, "planner": plan.get("planner", "nemotron")}
    except Exception as e:
        # Fallback : étapes génériques pour ne pas casser l'UI
        return {
            "status": "SUCCESS",
            "steps": [
                {"id": 1, "action": "plan", "description": "Analyse de la requête"},
                {"id": 2, "action": "full_pipeline", "description": "Pipeline scientifique"},
                {"id": 3, "action": "zk_proof", "description": "Certification ZK-STARK"},
                {"id": 4, "action": "generate_pdf", "description": "Génération du rapport"},
            ],
            "planner": "fallback",
            "note": str(e),
        }


@app.post("/api/agentic/predict-next")
async def predict_next(body: dict = None):
    """Suggestions prédictives pour la suite de la conversation."""
    body = body or {}
    ctx = body.get("context", "")[:500]
    base = [
        "Certifier ce résultat avec ZK-STARK",
        "Générer un rapport PDF académique",
        "Analyser les nombres de Betti",
        "Comparer avec une autre structure PDB",
        "Visualiser la topologie persistante",
    ]
    return {"suggestions": base, "status": "SUCCESS"}


@app.post("/api/agentic/search-grounding")
async def search_grounding(body: dict = None):
    """Recherche web pour grounding factuel (sans WebSocket)."""
    body = body or {}
    query = body.get("query", "")
    try:
        from tools.web_search import google_search
        r = google_search(query, max_results=body.get("max_results", 5))
        return r
    except Exception as e:
        return {"status": "FAILED", "error": str(e), "results": []}


@app.post("/api/competition/analyze")
async def competition_analyze(file: bytes = None, filename: str = ""):
    """Analyse forensics d'un fichier attaché (compat UI)."""
    return {
        "status": "SUCCESS",
        "report": f"### 🔍 PHENIX-FORENSICS\n\nAnalyse du fichier **{filename or 'attaché'}** "
        f"({len(file) if file else 0} octets). Le pipeline RATISS a intégré ce fichier "
        "pour résolution agentique. Connectez le moteur Gemini/Nemotron via /api/config/key "
        "pour une analyse sémantique complète.",
    }


@app.post("/api/competition/execute")
async def competition_execute(body: dict = None):
    """Exécution Python agentique (compat UI Phenix ODV)."""
    body = body or {}
    code = body.get("code", "")
    if not code:
        return {"status": "FAILED", "error": "no_code"}
    from tools.python_executor import PythonExecutor
    pe = PythonExecutor(timeout=body.get("timeout", 30), workspace_dir=str(_ROOT / "workspace"))
    return pe.execute(code)


@app.post("/api/ratiss-shell/chat")
async def ratiss_shell_chat(body: dict = None):
    """Chat synchrone du shell (compat UI)."""
    body = body or {}
    task = body.get("message") or body.get("prompt") or ""
    if not task:
        return {"error": "no_message"}
    agent = RatissAgent(emit_fn=lambda evt: None)
    loop = asyncio.get_event_loop()
    agent.cascade.emit_fn = _make_sync_emitter(loop)
    result = await asyncio.to_thread(agent.run, task)
    return {"status": "SUCCESS", "summary": result.get("goal", ""), "result": result}


# ── TTS (compat UI VoiceManager) ──────────────────────────────────────────────


@app.get("/api/tts/voices")
async def tts_voices():
    return {
        "voices": [
            {"id": "browser-femme", "name": "Voix navigateur (femme)", "source": "browser", "lang": "fr-FR"},
            {"id": "browser-homme", "name": "Voix navigateur (homme)", "source": "browser", "lang": "fr-FR"},
            {"id": "piper-fr-femme", "name": "Piper FR (femme)", "source": "piper", "lang": "fr-FR"},
        ]
    }


@app.get("/api/tts/status")
async def tts_status():
    return {"available": True, "engine": "browser-fallback", "piper_ready": False}


@app.post("/api/tts/prepare")
async def tts_prepare(body: dict = None):
    return {"status": "ready", "engine": "browser"}


@app.post("/api/tts")
async def tts_synth(body: dict = None):
    """Le TTS réel est rendu côté navigateur (souverain). Endpoint de compat."""
    body = body or {}
    return {
        "status": "SUCCESS",
        "engine": "browser",
        "message": "Synthèse navigateur activée. Utilisez Web Speech API côté client.",
    }


@app.post("/api/chat")
async def chat_sse(body: dict = None):
    """Chat principal en streaming SSE — adapté au frontend React.

    Lance l'agent RATISS en thread, collecte les événements cascade et les
    reformate en flux SSE `data: {content|reasoning|imageUrl|error}\\n\\n`
    compatible avec le reader côté client.

    Body: {messages: [{role, content}], mode, model_id, reasoning_mode}
    """
    import queue as _queue

    body = body or {}
    messages = body.get("messages", [])
    if not messages:
        return JSONResponse({"error": "no_messages"}, status_code=400)

    # Le dernier message utilisateur est la tâche de l'agent
    task = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            task = m.get("content", "")
            break
    task = (task or "").strip() or "Analyse scientifique"

    mode = body.get("mode", "Standard (N1)")
    model_id = body.get("model_id", "")
    reasoning_mode = bool(body.get("reasoning_mode", False))

    # Appliquer le modèle si fourni
    if model_id:
        os.environ["RATISS_MODEL_ID"] = model_id

    # ── Commandes slash d'auto-amélioration (couche RLM) ──────────────
    # /refine       → analyse la trajectoire courante, propose des leçons
    # /refine apply → analyse + applique les mises à jour au harnais
    # /harness      → affiche l'état du harnais (version, prompts, mémoire…)
    _slash = task.lower().strip()
    if _slash.startswith("/refine") or _slash == "/harness" or _slash.startswith("/harness"):
        from orchestrator.auto_improve import refine as _refine_fn
        from orchestrator.harness_manager import get_harness as _get_harness

        async def _slash_stream():
            if _slash.startswith("/harness"):
                h = _get_harness()
                st = h.state()
                lines = [
                    "## 🧠 Harnais d'auto-amélioration (Continual Harness)",
                    f"**Version:** {st.get('version', 0)}",
                    f"**Créé le:** {st.get('created_at', '?')}",
                    f"**Mis à jour:** {st.get('updated_at', '?')}",
                    f"\n**Prompts ({len(st.get('prompts', {}))}):** " + ", ".join(st.get("prompts", {}).keys()) or "—",
                    f"**Compétences ({len(st.get('skills', {}))}):** " + ", ".join(st.get("skills", {}).keys()) or "—",
                    f"**Mémoire ({len(st.get('memory', {}))}):** " + ", ".join(st.get("memory", {}).keys()) or "—",
                    f"**Leçons appliquées:** {len(st.get('lessons_applied', []))}",
                    f"**Historique:** {len(st.get('history', []))} versions",
                    f"\n*Trajectoires archivées: {len(h.list_trajectories())}*",
                    f"\n💡 Tapez `/refine` pour analyser la dernière trajectoire, ou `/refine apply` pour appliquer les leçons.",
                ]
                _content = "\n".join(lines) + "\n"
                yield f"data: {json.dumps({'content': _content}, ensure_ascii=False)}\n\n"
            else:
                apply = "apply" in _slash
                h = _get_harness()
                trajs = h.list_trajectories()
                if not trajs:
                    _msg = "⚠️ Aucune trajectoire archivée. Lancez d abord une tâche complexe (ex: 4MZI + Betti + ZK).\n"
                    yield f"data: {json.dumps({'content': _msg}, ensure_ascii=False)}\n\n"
                else:
                    traj = h.load_trajectory(trajs[0]["file"])
                    summary = traj.get("summary", {})
                    plan = traj.get("plan", {})
                    report = await asyncio.to_thread(_refine_fn, summary, plan)

                    analysis = report.get("analysis", {})
                    metrics = analysis.get("metrics", {})
                    lessons = report.get("lessons", [])
                    updates = report.get("proposed_updates", [])
                    zk = report.get("zk_validation", {})

                    lines = [
                        "## 🔄 Auto-amélioration RLM — Analyse de trajectoire",
                        f"**Tâche:** {analysis.get('task', '?')[:80]}",
                        f"**Domaine:** {analysis.get('domain', '?')}",
                        f"**Succès:** {metrics.get('success_rate', 0):.0%} ({metrics.get('steps_success', 0)}/{metrics.get('steps_executed', 0)} étapes)",
                        f"**ZK-STARK:** {'✅ Validé' if metrics.get('zk_validated') else '❌ Non validé'}",
                        f"**Temps:** {metrics.get('execution_time_sec', 0):.2f}s",
                        f"**Stuck détecté:** {'⚠️ Oui' if metrics.get('stuck_detected') else 'Non'}",
                    ]

                    lines.append(f"\n### 📚 Leçons extraites ({len(lessons)})")
                    for i, l in enumerate(lessons):
                        lines.append(f"{i+1}. **[{l.get('type','?')}]** {l.get('title','')} _(confiance: {l.get('confidence',0):.0%})_")
                        lines.append(f"   > {l.get('content','')[:120]}")

                    lines.append(f"\n### 🔧 Propositions de mise à jour du harnais ({len(updates)})")
                    for i, u in enumerate(updates):
                        lines.append(f"{i+1}. `{u.get('op','?')}` → {u.get('target','?')} (confiance: {u.get('confidence',0):.0%})")

                    lines.append(f"\n🔐 **Validation ZK:** {'✅ Toutes les leçons respectent les invariants' if zk.get('valid') else '⚠️ ' + str(zk.get('reason',''))}")

                    if apply:
                        applied = h.apply_updates(updates, reason="slash_refine")
                        for lesson in lessons:
                            h.archive_lesson(lesson)
                        lines.append(f"\n### ✅ Appliqué au harnais")
                        lines.append(f"**Nouvelle version:** {applied.get('version', '?')}")
                        lines.append(f"**Mises à jour:** {len(applied.get('results', []))}")
                        lines.append(f"**Snapshot:** `{applied.get('snapshot', '')[-40:]}`")
                    else:
                        lines.append(f"\n💡 Tapez `/refine apply` pour appliquer ces {len(updates)} mise(s) à jour au harnais.")

                    _content = "\n".join(lines) + "\n"
                    yield f"data: {json.dumps({'content': _content}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        from starlette.responses import StreamingResponse
        return StreamingResponse(_slash_stream(), media_type="text/event-stream")

    evt_q: _queue.Queue = _queue.Queue()
    loop = asyncio.get_event_loop()

    def _emit(evt: dict[str, Any]) -> None:
        evt_q.put(evt)

    agent = RatissAgent(emit_fn=_emit)
    agent.cascade.emit_fn = _emit

    async def _stream():
        # Lance l'agent dans un thread
        fut = loop.run_in_executor(None, agent.run, task)

        while True:
            # Soit on a un événement, soit l'agent a terminé
            if fut.done() and evt_q.empty():
                break
            try:
                evt = evt_q.get_nowait()
            except _queue.Empty:
                await asyncio.sleep(0.05)
                continue

            etype = evt.get("type", "")
            data: dict[str, Any] = {}

            # Reasoning pendant la planification
            if etype == "planning":
                plan = evt.get("plan", {})
                steps = plan.get("steps", [])
                if steps and reasoning_mode:
                    data["reasoning"] = "📋 Plan:\n" + "\n".join(
                        f"  {s.get('id', '?')}. {s.get('description', s.get('action', ''))}" for s in steps
                    ) + "\n"
            elif etype == "log":
                stream = evt.get("stream", "")
                msg = evt.get("message", "")
                if reasoning_mode and stream in ("ratiss", "nemotron", "zk"):
                    data["reasoning"] = f"[{stream}] {msg}\n"
            elif etype == "status":
                if reasoning_mode:
                    data["reasoning"] = f"▶ {evt.get('status', '')}: {evt.get('detail', '')}\n"
            elif etype == "step_done":
                res = evt.get("result", {})
                if res:
                    # Convertir les résultats scientifiques en contenu lisible
                    if "tj_model" in res or "ground_state_energy" in res:
                        tj = res.get("tj_model", res)
                        e0 = tj.get("ground_state_energy")
                        betti = res.get("betti_numbers")
                        parts = []
                        if e0 is not None:
                            parts.append(f"**Énergie fondamentale E₀:** {e0}")
                        if res.get("energy_per_site") is not None:
                            parts.append(f"**Énergie/site:** {res['energy_per_site']}")
                        if betti:
                            parts.append(f"**Nombres de Betti:** {betti}")
                        if parts:
                            data["content"] = "### 📊 Résultats scientifiques\n\n" + "\n".join(parts) + "\n\n"
            elif etype == "artifact":
                pass  # géré dans done
            elif etype == "done":
                summary = evt.get("summary", {})
                # Construire le contenu final
                lines = []
                if summary.get("goal"):
                    lines.append(f"## ✅ Tâche accomplie\n**Objectif:** {summary['goal']}\n")
                lines.append(f"**Domaine:** {summary.get('domain', 'N/A')}")
                lines.append(f"**Étapes:** {summary.get('steps_executed', 0)} exécutées, {summary.get('steps_success', 0)} réussies")
                lines.append(f"**Temps:** {summary.get('execution_time_sec', 0)}s")

                # Résultats scientifiques
                for r in summary.get("results", []):
                    res = r.get("result", {})
                    if r.get("action") == "zk_proof" and res.get("public_commitment"):
                        lines.append(f"\n### 🔐 Certification ZK-STARK\n**Commitment:** `{res['public_commitment']}`")
                        if res.get("receipt_b64"):
                            lines.append(f"**Reçu:** `{res['receipt_b64'][:60]}...`")
                    elif r.get("action") in ("topology", "full_pipeline") and res.get("betti_numbers"):
                        lines.append(f"\n### 📐 Topologie\n**Nombres de Betti:** {res['betti_numbers']}")
                    elif r.get("action") == "quantum_ed" and res.get("ground_state_energy") is not None:
                        lines.append(f"\n### ⚛️ Mécanique quantique\n**E₀:** {res['ground_state_energy']}")

                mem = summary.get("memory_final", {})
                if mem:
                    lines.append(f"\n**Mémoire:** {mem.get('current_mb', 0)} MB / {mem.get('limit_mb', 7500)} MB")

                lines.append(f"\n**Workspace:** `{summary.get('workspace', '')}`")
                lines.append(f"\n*Académique: {summary.get('academic', {}).get('author', '')} — ORCID {summary.get('academic', {}).get('orcid', '')}*")

                data["content"] = "\n".join(lines) + "\n"
            elif etype == "step_error":
                if evt.get("error"):
                    data["content"] = f"⚠️ Erreur étape {evt.get('step_id', '?')}: {evt['error']}\n"

            if data:
                yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

        # S'assurer que le thread est terminé
        try:
            fut.result(timeout=1)
        except Exception:
            pass
        yield "data: [DONE]\n\n"

    from starlette.responses import StreamingResponse
    return StreamingResponse(_stream(), media_type="text/event-stream")


@app.post("/api/terminal")
async def terminal_exec(command: str = "", cwd: str = ""):
    """Exécution directe de commande terminal (sans WebSocket)."""
    from tools.terminal_executor import TerminalExecutor
    te = TerminalExecutor(cwd=Path(cwd) if cwd else None)
    r = te.execute(command)
    return r


@app.post("/api/browser")
async def browser_exec(body: dict = None):
    """Browser automation direct (sans WebSocket)."""
    from tools.browser_tool import execute_browser_action
    body = body or {}
    action = body.get("action", "navigate")
    params = {}
    for k in ("url", "selector", "text", "full_page"):
        if body.get(k) is not None:
            params[k] = body[k]
    r = execute_browser_action(action, params, workspace_dir=str(_ROOT / "workspace"))
    return r


@app.post("/api/python")
async def python_exec(body: dict = None):
    """Exécution Python sandbox direct (sans WebSocket)."""
    from tools.python_executor import PythonExecutor
    body = body or {}
    code = body.get("code", "")
    timeout = body.get("timeout", 30)
    pe = PythonExecutor(timeout=timeout, workspace_dir=str(_ROOT / "workspace"))
    r = pe.execute(code)
    return r


@app.post("/api/search")
async def web_search(body: dict = None):
    """Recherche web générale (sans WebSocket)."""
    from tools.web_search import google_search
    body = body or {}
    query = body.get("query", "")
    max_results = body.get("max_results", 5)
    r = google_search(query, max_results=max_results)
    return r


@app.post("/api/file")
async def file_action(body: dict = None):
    """File editor direct (sans WebSocket)."""
    from tools.file_editor import execute_file_action
    body = body or {}
    action = body.get("action", "view")
    params = {"action": action, "path": body.get("path", body.get("filename", ""))}
    if body.get("content"):
        params["content"] = body["content"]
    if body.get("text"):
        params["text"] = body["text"]
    if body.get("old_str"):
        params["old_str"] = body["old_str"]
    if body.get("new_str"):
        params["new_str"] = body["new_str"]
    r = execute_file_action(action, params, workspace_dir=str(_ROOT / "workspace"))
    return r


@app.post("/api/refine")
async def refine_sync(body: dict = None):
    """Auto-amélioration synchrone : analyse une trajectoire (fichier ou summary JSON)
    et renvoie les leçons + propositions de mise à jour du harnais.

    Body:
        {"trajectory_file": "..."}  -> analyse une trajectoire archivée
        {"summary": {...}, "plan": {...}}  -> analyse directe
        {"apply": true}  -> applique les mises à jour au harnais
    """
    from orchestrator.auto_improve import refine as _refine
    from orchestrator.harness_manager import get_harness

    body = body or {}
    apply = bool(body.get("apply", False))
    harness = get_harness()

    summary = body.get("summary")
    plan = body.get("plan", {})
    if not summary and body.get("trajectory_file"):
        traj = harness.load_trajectory(body["trajectory_file"])
        if not traj:
            return JSONResponse({"error": "trajectory_not_found"}, status_code=404)
        summary = traj.get("summary", {})
        plan = traj.get("plan", {})

    if not summary:
        # Dernière trajectoire archivée par défaut
        trajs = harness.list_trajectories()
        if not trajs:
            return JSONResponse({"error": "no_trajectory", "message": "Aucune trajectoire disponible."}, status_code=400)
        traj = harness.load_trajectory(trajs[0]["file"])
        summary = traj.get("summary", {})
        plan = traj.get("plan", {})

    report = _refine(summary, plan)
    if apply:
        for lesson in report.get("lessons", []):
            harness.archive_lesson(lesson)
        applied = harness.apply_updates(report.get("proposed_updates", []), reason="api_refine")
        report["applied"] = applied
    return report


@app.get("/api/harness")
async def harness_state():
    """État courant du harnais d'auto-amélioration + trajectoires archivées."""
    from orchestrator.harness_manager import get_harness
    h = get_harness()
    return {"state": h.state(), "trajectories": h.list_trajectories()}


@app.post("/api/harness/rollback")
async def harness_rollback(body: dict = None):
    """Restaure une version antérieure du harnais."""
    from orchestrator.harness_manager import get_harness
    body = body or {}
    version = int(body.get("version", 0))
    return get_harness().rollback(version)


# ── Intégrations externes (agent scientifique) ────────────────────────────────


@app.get("/api/integrations")
async def integrations_list():
    """Liste toutes les intégrations disponibles avec leur état de connexion."""
    return _integrations_status()


@app.post("/api/integrations/connect")
async def integrations_connect(body: dict = None):
    """Connecte une intégration en stockant son jeton localement (souverain).

    Body: {"integration_id": "github", "token": "ghp_..."}
    Aucun jeton n'est renvoyé en réponse.
    """
    body = body or {}
    iid = (body.get("integration_id") or body.get("id") or "").strip()
    token = (body.get("token") or "").strip()
    if not iid:
        return JSONResponse({"error": "missing_integration_id"}, status_code=400)
    ok = _set_integration_token(iid, token)
    if not ok:
        return JSONResponse({"error": "unknown_integration", "integration_id": iid}, status_code=400)
    status = _integrations_status()
    item = next((i for i in status["integrations"] if i["id"] == iid), None)
    return {"connected": True, "integration_id": iid, "status": item}


@app.post("/api/integrations/disconnect")
async def integrations_disconnect(body: dict = None):
    body = body or {}
    iid = (body.get("integration_id") or "").strip()
    if not iid:
        return JSONResponse({"error": "missing_integration_id"}, status_code=400)
    _clear_integration_token(iid)
    return {"connected": False, "integration_id": iid}


@app.post("/api/integrations/{integration_id}/{action}")
async def integrations_run(integration_id: str, action: str, body: dict = None):
    """Exécute une action d'intégration (ex: github/list_repos, arxiv/search)."""
    result = run_integration(integration_id, action, body or {})
    return result


# ── Import de fichiers universel (tous types) ─────────────────────────────────

UPLOADS_DIR = _ROOT / "workspace" / "uploads"


def _detect_file_kind(filename: str, content_type: str) -> str:
    """Détecte la catégorie scientifique d'un fichier (pour le pipeline RATISS)."""
    name = (filename or "").lower()
    ct = (content_type or "").lower()
    ext_map = {
        ".pdb": "structure_pdb", ".cif": "structure_cif", ".mmcif": "structure_cif",
        ".xyz": "structure_xyz", ".mol": "structure_mol", ".mol2": "structure_mol2",
        ".sdf": "structure_sdf",
        ".csv": "data_csv", ".tsv": "data_tsv", ".dat": "data_dat",
        ".npy": "array_npy", ".npz": "array_npz", ".h5": "array_hdf5", ".hdf5": "array_hdf5",
        ".json": "config_json", ".yaml": "config_yaml", ".yml": "config_yaml", ".toml": "config_toml",
        ".pdf": "document_pdf", ".docx": "document_docx", ".txt": "document_text",
        ".tex": "latex", ".bib": "bibliography",
        ".py": "code_python", ".ipynb": "code_notebook", ".r": "code_r", ".m": "code_matlab",
        ".js": "code_js", ".ts": "code_ts", ".cpp": "code_cpp", ".c": "code_c", ".rs": "code_rust",
        ".sh": "code_shell",
        ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image",
        ".webp": "image", ".bmp": "image", ".svg": "image_svg", ".tiff": "image",
        ".mp4": "video", ".mov": "video", ".webm": "video",
        ".wav": "audio", ".mp3": "audio", ".flac": "audio",
        ".zip": "archive_zip", ".tar": "archive_tar", ".gz": "archive_gz",
        ".md": "markdown",
    }
    for ext, kind in ext_map.items():
        if name.endswith(ext):
            return kind
    if ct.startswith("image/"):
        return "image"
    if ct.startswith("video/"):
        return "video"
    if ct.startswith("audio/"):
        return "audio"
    if ct == "application/pdf":
        return "document_pdf"
    if ct.startswith("text/"):
        return "document_text"
    return "other"


def _uploads_registry_path() -> Path:
    return UPLOADS_DIR / "_registry.json"


def _load_uploads_registry() -> list[dict[str, Any]]:
    p = _uploads_registry_path()
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_uploads_registry(items: list[dict[str, Any]]) -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    _uploads_registry_path().write_text(json.dumps(items, indent=2), encoding="utf-8")


@app.post("/api/files/upload")
async def files_upload(file: UploadFile = File(...)):
    """Import universel — accepte N'IMPORTE quel type de fichier.

    Sauvegarde dans workspace/uploads/, enregistre dans le registre, et renvoie
    les métadonnées avec la catégorie scientifique détectée. Le pipeline RATISS
    peut ensuite consommer le fichier (PDB → topologie, CSV → stats, etc.).
    """
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    raw = await file.read()
    if not raw:
        return JSONResponse({"error": "empty_file"}, status_code=400)

    safe_name = Path(file.filename or "upload.bin").name
    dest = UPLOADS_DIR / safe_name
    if dest.exists():
        stem, suffix = dest.stem, dest.suffix
        dest = UPLOADS_DIR / f"{stem}_{int(__import__('time').time())}{suffix}"
        safe_name = dest.name

    dest.write_bytes(raw)
    kind = _detect_file_kind(file.filename or "", file.content_type or "")

    item = {
        "id": f"{int(__import__('time').time()*1000)}_{safe_name}",
        "name": safe_name,
        "path": str(dest.relative_to(_ROOT)),
        "absolute_path": str(dest),
        "size_bytes": len(raw),
        "size_kb": round(len(raw) / 1024, 2),
        "content_type": file.content_type or "application/octet-stream",
        "kind": kind,
        "uploaded_at": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
    }
    items = _load_uploads_registry()
    items.insert(0, item)
    _save_uploads_registry(items)
    logger.info(f"[upload] {safe_name} ({len(raw)} octets, kind={kind})")
    return {"status": "SUCCESS", "file": item}


@app.get("/api/files")
async def files_list():
    """Liste les fichiers importés."""
    items = _load_uploads_registry()
    return {"files": items, "count": len(items)}


@app.delete("/api/files/{file_id}")
async def files_delete(file_id: str):
    items = _load_uploads_registry()
    target = next((i for i in items if i["id"] == file_id), None)
    if not target:
        return JSONResponse({"error": "not_found"}, status_code=404)
    try:
        Path(target["absolute_path"]).unlink(missing_ok=True)
    except Exception:
        pass
    items = [i for i in items if i["id"] != file_id]
    _save_uploads_registry(items)
    return {"status": "SUCCESS", "deleted": file_id}


@app.post("/api/files/analyze")
async def files_analyze(body: dict = None):
    """Lance l'analyse scientifique d'un fichier importé via le pipeline RATISS.

    Body: {"file_id": "...", "instruction": "Analyse topologique"}
    Le chemin du fichier est injecté dans la tâche de l'agent.
    """
    body = body or {}
    file_id = body.get("file_id", "")
    items = _load_uploads_registry()
    target = next((i for i in items if i["id"] == file_id), None)
    if not target:
        return JSONResponse({"error": "file_not_found"}, status_code=404)

    instruction = (body.get("instruction") or "").strip()
    task = f"{instruction or 'Analyse scientifique du fichier'}: {target['name']} (type={target['kind']}, {target['size_kb']} KB). Chemin: {target['absolute_path']}"
    agent = RatissAgent(emit_fn=lambda evt: None)
    loop = asyncio.get_event_loop()
    agent.cascade.emit_fn = _make_sync_emitter(loop)
    result = await asyncio.to_thread(agent.run, task)
    return {"status": "SUCCESS", "file": target, "result": result}


@app.get("/api/preview/{filename:path}")
async def preview_artifact(filename: str):
    # Décoder l'URL (pour les accents dans les noms de fichiers)
    from urllib.parse import unquote
    filename = unquote(filename)
    # Chercher dans tous les workspace/*/  ou workspace/
    search_dirs = [_ROOT / "workspace"]
    for d in (_ROOT / "workspace").iterdir():
        if d.is_dir():
            search_dirs.append(d)
    for d in search_dirs:
        fpath = d / filename
        if fpath.exists() and fpath.is_file():
            return FileResponse(str(fpath), filename=filename)
    return JSONResponse({"error": "not_found", "filename": filename}, status_code=404)


# ── WebSocket principal (multiplexé) ──────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    _active_ws.add(ws)
    loop = asyncio.get_event_loop()
    emitter = _make_sync_emitter(loop)
    try:
        # Envoi initial : statut connecteurs + mémoire + skills
        await ws.send_json({"type": "init", "connectors": get_connectors_status()})
        await ws.send_json({"type": "telemetry", "memory": bridge.get_memory_status(), "cpu_pct": 0.0})
        await ws.send_json({"type": "connectors", "status": get_connectors_status()})
        await ws.send_json({"type": "skills", "skills": get_skills_overview()})

        agent_ref: dict = {"agent": None}
        while True:
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "invalid_json"})
                continue

            msg_type = msg.get("type", "")
            if msg_type == "task":
                task = msg.get("task", "").strip()
                if not task:
                    await ws.send_json({"type": "error", "message": "empty_task"})
                    continue
                # Commande /refine : auto-amélioration de la trajectoire courante
                if task.startswith("/refine"):
                    await _handle_refine(ws, emitter, msg, agent_ref)
                    continue
                # Commande /harness : consultation de l'état du harnais
                if task.startswith("/harness"):
                    from orchestrator.harness_manager import get_harness
                    h = get_harness()
                    await ws.send_json({"type": "harness_state", "state": h.state(),
                                        "trajectories": h.list_trajectories()})
                    continue
                # Lance l'agent dans un thread (synchrone) pour ne pas bloquer la boucle
                agent = RatissAgent(emit_fn=emitter)
                agent_ref["agent"] = agent
                await ws.send_json({"type": "session_start", "session_id": agent.cascade.session_id})
                try:
                    summary = await asyncio.to_thread(agent.run, task)
                    await ws.send_json({"type": "done", "summary": summary})
                except Exception as e:
                    logger.exception("[WS] Erreur agent")
                    await ws.send_json({"type": "error", "message": str(e)})
            elif msg_type == "terminal":
                # Exécution directe de commande terminal avec streaming
                command = msg.get("command", "").strip()
                if not command:
                    await ws.send_json({"type": "error", "message": "empty_command"})
                    continue
                from tools.terminal_executor import TerminalExecutor
                await ws.send_json({"type": "terminal_start", "command": command})

                def _on_term_output(stream_name: str, line: str) -> None:
                    emitter({"type": "terminal_output", "stream": stream_name, "line": line})

                te = TerminalExecutor(cwd=_ROOT / "workspace", timeout=msg.get("timeout", 30))
                try:
                    result = await asyncio.to_thread(te.execute, command, _on_term_output)
                    await ws.send_json({"type": "terminal_done", "result": result})
                except Exception as e:
                    await ws.send_json({"type": "terminal_error", "error": str(e)})
            elif msg_type == "browser":
                # Browser automation via WebSocket
                from tools.browser_tool import execute_browser_action
                action = msg.get("action", "navigate")
                params = msg.get("params", {})
                await ws.send_json({"type": "browser_start", "action": action})

                def _on_browser_log(log_msg: str) -> None:
                    emitter({"type": "browser_log", "message": log_msg})

                try:
                    result = await asyncio.to_thread(execute_browser_action, action, params, str(_ROOT / "workspace"), _on_browser_log)
                    await ws.send_json({"type": "browser_done", "result": result})
                except Exception as e:
                    await ws.send_json({"type": "browser_error", "error": str(e)})
            elif msg_type == "python":
                # Python execution via WebSocket
                from tools.python_executor import PythonExecutor
                code = msg.get("code", "")
                await ws.send_json({"type": "python_start", "code_length": len(code)})

                def _on_py_output(stream_name: str, line: str) -> None:
                    emitter({"type": "python_output", "stream": stream_name, "line": line})

                pe = PythonExecutor(timeout=msg.get("timeout", 30), workspace_dir=str(_ROOT / "workspace"))
                try:
                    result = await asyncio.to_thread(pe.execute, code, _on_py_output)
                    await ws.send_json({"type": "python_done", "result": result})
                except Exception as e:
                    await ws.send_json({"type": "python_error", "error": str(e)})
            elif msg_type == "ping":
                await ws.send_json({"type": "pong"})
            elif msg_type == "telemetry":
                await ws.send_json({"type": "telemetry", "memory": bridge.get_memory_status(), "cpu_pct": 0.0})
    except WebSocketDisconnect:
        logger.info("[WS] Client déconnecté")
    except Exception as e:
        logger.exception(f"[WS] Erreur: {e}")
    finally:
        _active_ws.discard(ws)


async def _handle_refine(ws: WebSocket, emitter, msg: dict, agent_ref: dict) -> None:
    """Traite la commande /refine : analyse la trajectoire courante et propose
    des améliorations au harnais. Si l'utilisateur a ajouté ' apply' (ou ' accept'),
    les mises à jour sont appliquées immédiatement.
    """
    task = msg.get("task", "").strip()
    apply = any(kw in task.lower() for kw in ("apply", "accept", "appliquer", "valider"))
    agent: RatissAgent | None = agent_ref.get("agent")
    await ws.send_json({"type": "refine_start", "apply": apply})
    if agent is None:
        await ws.send_json({"type": "error", "message": "Aucune session active. Exécutez d'abord une tâche."})
        return
    try:
        report = await asyncio.to_thread(agent.refine, apply)
        await ws.send_json({"type": "refine_done", "report": report})
    except Exception as e:
        logger.exception("[WS] Erreur /refine")
        await ws.send_json({"type": "error", "message": str(e)})


# ── Tâche de fond : télémétrie périodique ─────────────────────────────────────

@app.on_event("startup")
async def startup_telemetry():
    # Charger les cles API persistantes du vault dans l'environnement
    try:
        from security.api_vault import load_all_into_env
        loaded = load_all_into_env()
        if loaded:
            print(f"[RATISS] Vault: {loaded} cle(s) API persistante(s) chargee(s)")
    except Exception as e:
        print(f"[RATISS] Vault: chargement impossible ({e})")

    async def telemetry_loop():
        while True:
            await asyncio.sleep(2)
            if _active_ws:
                try:
                    import psutil
                    cpu = psutil.cpu_percent(interval=None)
                except Exception:
                    cpu = 0.0
                await _broadcast({"type": "telemetry", "memory": bridge.get_memory_status(), "cpu_pct": round(cpu, 1)})

    asyncio.create_task(telemetry_loop())


def main():
    import uvicorn
    host = os.environ.get("RATISS_HOST", "0.0.0.0")
    port = int(os.environ.get("RATISS_PORT", "7860"))
    uvicorn.run("app.server:app", host=host, port=port, reload=False, log_level="info")


if __name__ == "__main__":
    main()
