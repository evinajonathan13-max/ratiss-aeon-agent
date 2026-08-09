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
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

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


@app.post("/api/terminal")
async def terminal_exec(command: str = "", cwd: str = ""):
    """Exécution directe de commande terminal (sans WebSocket)."""
    from tools.terminal_executor import TerminalExecutor
    te = TerminalExecutor(cwd=Path(cwd) if cwd else None)
    r = te.execute(command)
    return r


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
                # Lance l'agent dans un thread (synchrone) pour ne pas bloquer la boucle
                agent = RatissAgent(emit_fn=emitter)
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
