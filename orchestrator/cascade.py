"""
orchestrator/cascade.py — Émetteur d'étapes de raisonnement en cascade.

Produit des événements structurés (Planning → Step → Log → Telemetry → Artifact)
 destinés au WebSocket. L'agent appelle emit() à chaque étape ; le serveur
les relaye au frontend en temps réel.
"""
from __future__ import annotations

import time
import uuid
from typing import Any, Callable

# Types d'événements du canal WebSocket (multiplexé)
EVT_PLANNING = "planning"        # plan reçu du planificateur
EVT_STEP_START = "step_start"    # début d'une étape
EVT_STEP_DONE = "step_done"      # fin d'une étape (succès)
EVT_STEP_ERROR = "step_error"    # étape en échec
EVT_LOG = "log"                  # log temps réel
EVT_TELEMETRY = "telemetry"      # RAM/CPU
EVT_ARTIFACT = "artifact"        # artefact généré
EVT_CHAT = "chat"                # message de chat (user/assistant)
EVT_STATUS = "status"            # statut global de la session
EVT_DONE = "done"                # pipeline terminé
EVT_CONNECTORS = "connectors"    # statut des connecteurs API


class CascadeEmitter:
    """Émet des événements de cascade vers un callback (le serveur WebSocket)."""

    def __init__(self, emit_fn: Callable[[dict[str, Any]], None]):
        self.emit_fn = emit_fn
        self.session_id = uuid.uuid4().hex[:12]

    def _emit(self, event_type: str, **payload: Any) -> None:
        evt = {"type": event_type, "ts": time.time(), "session": self.session_id, **payload}
        try:
            self.emit_fn(evt)
        except Exception:
            pass

    def chat(self, role: str, content: str) -> None:
        self._emit(EVT_CHAT, role=role, content=content)

    def planning(self, plan: dict[str, Any]) -> None:
        self._emit(EVT_PLANNING, plan=plan)

    def step_start(self, step: dict[str, Any]) -> None:
        self._emit(EVT_STEP_START, step=step)

    def step_done(self, step_id: int, result: dict[str, Any]) -> None:
        self._emit(EVT_STEP_DONE, step_id=step_id, result=result)

    def step_error(self, step_id: int, error: str) -> None:
        self._emit(EVT_STEP_ERROR, step_id=step_id, error=error)

    def log(self, message: str, stream: str = "ratiss") -> None:
        self._emit(EVT_LOG, stream=stream, message=message)

    def telemetry(self, mem: dict[str, Any], cpu: float = 0.0) -> None:
        self._emit(EVT_TELEMETRY, memory=mem, cpu_pct=round(cpu, 1))

    def artifact(self, name: str, path: str, kind: str = "json", size_bytes: int = 0) -> None:
        self._emit(EVT_ARTIFACT, name=name, path=path, kind=kind, size_bytes=size_bytes)

    def connectors(self, status: dict[str, Any]) -> None:
        self._emit(EVT_CONNECTORS, status=status)

    def status(self, status: str, detail: str = "") -> None:
        self._emit(EVT_STATUS, status=status, detail=detail)

    def done(self, summary: dict[str, Any]) -> None:
        self._emit(EVT_DONE, summary=summary)
