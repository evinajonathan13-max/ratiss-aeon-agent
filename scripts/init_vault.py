#!/usr/bin/env python3
"""scripts/init_vault.py — Initialise le coffre local et crée le 1er compte administrateur.

Usage :
    python scripts/init_vault.py --username admin --password "votre_mot_de_passe"

Souveraineté : 100% local. Aucune donnée n'est envoyée vers un service cloud.
"""
from __future__ import annotations

import argparse
import sys
import os
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

from security.session_manager import SessionManager
from security.workspace_isolator import WorkspaceIsolator


def main() -> int:
    parser = argparse.ArgumentParser(description="Initialise le coffre RATISS et crée le premier administrateur.")
    parser.add_argument("--username", required=True, help="Nom de l'administrateur")
    parser.add_argument("--password", required=True, help="Mot de passe (min 8 caractères)")
    parser.add_argument("--db", default=None, help="Chemin de la base SQLite (défaut: workspace/vault/ratiss_sessions.db)")
    args = parser.parse_args()

    sm = SessionManager(db_path=args.db)
    try:
        user = sm.create_user(args.username, args.password, role="admin")
    except ValueError as e:
        print(f"Erreur: {e}", file=sys.stderr)
        return 1

    # Créer le workspace de l'admin
    wi = WorkspaceIsolator()
    ws = wi.create_session_workspace(user["user_id"], "default")
    print(f"✓ Administrateur créé : {user['username']} (id: {user['user_id']})")
    print(f"✓ Workspace initialisé : {ws}")
    print(f"✓ Base de données : {sm.db_path}")
    print("\nLe coffre est prêt. Lancez le serveur : python -m app.server")
    return 0


if __name__ == "__main__":
    sys.exit(main())
