"""security/session_manager.py — Gestion des sessions locales (SQLite).

Souveraineté : 100% local, aucun service cloud. Sessions stockées dans une base
SQLite (workspace/vault/ratiss_sessions.db). Chaque session a un UUID, un jeton
haché (PBKDF2), et un workspace isolé.

Utilisation :
    sm = SessionManager()
    admin = sm.create_user("admin", "mot_de_passe_fort", role="admin")
    session = sm.create_session(admin["user_id"])
    ok = sm.verify_session(session["session_token"])
"""
from __future__ import annotations

import os
import sqlite3
import uuid
import time
import logging
from pathlib import Path
from typing import Any

from security.token_hasher import hash_token, verify_token, generate_session_token

logger = logging.getLogger("ratiss.security")

_ROOT = Path(__file__).resolve().parent.parent
VAULT_DIR = _ROOT / "workspace" / "vault"
DB_PATH = VAULT_DIR / "ratiss_sessions.db"
SESSION_TTL_SEC = 86400 * 7  # 7 jours


class SessionManager:
    """Gestionnaire de sessions et utilisateurs (SQLite local)."""

    def __init__(self, db_path: str | Path | None = None):
        self.db_path = Path(db_path) if db_path else DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._conn() as c:
            c.execute("""CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at REAL NOT NULL
            )""")
            c.execute("""CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                session_token_hash TEXT NOT NULL,
                created_at REAL NOT NULL,
                expires_at REAL NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )""")
            c.commit()

    def create_user(self, username: str, password: str, role: str = "user") -> dict[str, Any]:
        """Crée un utilisateur. Lève ValueError si le username existe."""
        if len(password) < 8:
            raise ValueError("Le mot de passe doit faire au moins 8 caractères")
        with self._conn() as c:
            existing = c.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone()
            if existing:
                raise ValueError(f"Utilisateur '{username}' existe déjà")
            user_id = uuid.uuid4().hex
            pw_hash = hash_token(password)
            c.execute(
                "INSERT INTO users (user_id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, username, pw_hash, role, time.time()),
            )
            c.commit()
        logger.info(f"Utilisateur créé: {username} ({role})")
        return {"user_id": user_id, "username": username, "role": role}

    def authenticate(self, username: str, password: str) -> dict[str, Any] | None:
        """Authentifie un utilisateur. Retourne l'utilisateur ou None."""
        with self._conn() as c:
            row = c.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            return None
        if not verify_token(password, row["password_hash"]):
            return None
        return {"user_id": row["user_id"], "username": row["username"], "role": row["role"]}

    def create_session(self, user_id: str, ttl: int = SESSION_TTL_SEC) -> dict[str, Any]:
        """Crée une session pour un utilisateur. Retourne le token en clair (à transmettre une fois)."""
        token = generate_session_token()
        token_hash = hash_token(token)
        session_id = uuid.uuid4().hex
        now = time.time()
        with self._conn() as c:
            c.execute(
                "INSERT INTO sessions (session_id, user_id, session_token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
                (session_id, user_id, token_hash, now, now + ttl),
            )
            c.commit()
        return {"session_id": session_id, "user_id": user_id, "session_token": token, "expires_at": now + ttl}

    def verify_session(self, session_token: str) -> dict[str, Any] | None:
        """Vérifie un token de session. Retourne la session + utilisateur ou None."""
        with self._conn() as c:
            rows = c.execute("SELECT s.*, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.user_id WHERE s.expires_at > ?", (time.time(),)).fetchall()
        for row in rows:
            if verify_token(session_token, row["session_token_hash"]):
                return {"session_id": row["session_id"], "user_id": row["user_id"], "username": row["username"], "role": row["role"]}
        return None

    def cleanup_expired(self) -> int:
        """Supprime les sessions expirées. Retourne le nombre supprimé."""
        with self._conn() as c:
            cur = c.execute("DELETE FROM sessions WHERE expires_at < ?", (time.time(),))
            c.commit()
            return cur.rowcount

    def list_users(self) -> list[dict[str, Any]]:
        with self._conn() as c:
            rows = c.execute("SELECT user_id, username, role, created_at FROM users").fetchall()
        return [dict(r) for r in rows]
