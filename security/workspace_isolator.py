"""security/workspace_isolator.py — Isolation physique des espaces de travail.

Chaque utilisateur/session a son propre dossier /workspace/{user_id}/{session_id}/.
Les chemins sont validés (pas de traversal) et nettoyés après expiration.
"""
from __future__ import annotations

import os
import shutil
import logging
from pathlib import Path

logger = logging.getLogger("ratiss.security")

_ROOT = Path(__file__).resolve().parent.parent
WORKSPACE_ROOT = _ROOT / "workspace"


class WorkspaceIsolator:
    """Isole les workspaces par utilisateur et session."""

    def __init__(self, root: Path | None = None):
        self.root = root or WORKSPACE_ROOT
        self.root.mkdir(parents=True, exist_ok=True)

    def get_user_dir(self, user_id: str) -> Path:
        """Retourne (et crée) le dossier d'un utilisateur."""
        safe = self._safe_name(user_id)
        d = self.root / f"user_{safe}"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def create_session_workspace(self, user_id: str, session_id: str) -> Path:
        """Crée un workspace isolé pour une session."""
        safe_user = self._safe_name(user_id)
        safe_session = self._safe_name(session_id)
        ws = self.root / f"user_{safe_user}" / f"session_{safe_session}"
        ws.mkdir(parents=True, exist_ok=True)
        (ws / "artifacts").mkdir(exist_ok=True)
        (ws / "logs").mkdir(exist_ok=True)
        return ws

    def purge_session(self, user_id: str, session_id: str) -> bool:
        """Supprime le workspace d'une session."""
        safe_user = self._safe_name(user_id)
        safe_session = self._safe_name(session_id)
        ws = self.root / f"user_{safe_user}" / f"session_{safe_session}"
        if ws.exists() and ws.is_dir():
            shutil.rmtree(ws)
            logger.info(f"Workspace purgé: {ws}")
            return True
        return False

    def list_sessions(self, user_id: str) -> list[dict]:
        """Liste les sessions d'un utilisateur."""
        safe_user = self._safe_name(user_id)
        user_dir = self.root / f"user_{safe_user}"
        if not user_dir.exists():
            return []
        sessions = []
        for d in sorted(user_dir.iterdir()):
            if d.is_dir() and d.name.startswith("session_"):
                size = sum(f.stat().st_size for f in d.rglob("*") if f.is_file())
                sessions.append({"session_id": d.name.replace("session_", ""), "path": str(d), "size_bytes": size})
        return sessions

    @staticmethod
    def _safe_name(name: str) -> str:
        """Sanitize un nom pour éviter le path traversal."""
        import re
        return re.sub(r"[^a-zA-Z0-9_-]", "", name)[:64]
