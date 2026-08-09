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

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from kernel import bridge
from kernel.connectors.registry import get_connectors_status, list_local_pdb
from orchestrator.agent import RatissAgent, get_skills_overview

logger = logging.getLogger("ratiss.server")
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(name)s %(message)s")

app = FastAPI(title="RATISS Aeon Prime", version="9.0.0")

STATIC_DIR = _ROOT / "app" / "static"
ASSETS_DIR = STATIC_DIR / "assets"
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
    """État de configuration (clé API OpenRouter)."""
    key = os.environ.get("OPENROUTER_API_KEY", "")
    return {"configured": bool(key), "has_key": bool(key)}


@app.post("/api/config/key")
async def config_key(body: dict = None):
    body = body or {}
    key = body.get("api_key", "").strip()
    if key:
        os.environ["OPENROUTER_API_KEY"] = key
        return {"configured": True}
    return JSONResponse({"error": "missing_api_key"}, status_code=400)


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


@app.get("/api/preview/{filename:path}")
async def preview_artifact(filename: str):
    """Sert un artéfact pour preview dans l'UI (PDF, PNG, HTML, SVG)."""
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
