"""
tools/file_saver.py — Sauvegarde de fichiers (agent agentique souverain).

Permet à l'agent RATISS de sauvegarder du contenu arbitraire dans le workspace.
Équivalent du FileSaver de RATISS.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("ratiss.file_saver")

_ROOT = Path(__file__).resolve().parent.parent


def save_file(filename: str, content: str, workspace_dir: str | None = None) -> dict[str, Any]:
    """Sauvegarde du contenu dans un fichier du workspace.

    Args:
        filename: Nom du fichier (peut inclure des sous-dossiers)
        content: Contenu à sauvegarder (texte)
        workspace_dir: Répertoire de travail (défaut: workspace/)
    """
    ws = Path(workspace_dir) if workspace_dir else _ROOT / "workspace"
    ws.mkdir(parents=True, exist_ok=True)

    # Sécurité : empêcher les chemins qui remontent (../)
    safe_name = filename.replace("..", "").lstrip("/")
    fpath = ws / safe_name

    # Créer les sous-dossiers si nécessaire
    fpath.parent.mkdir(parents=True, exist_ok=True)

    try:
        fpath.write_text(content, encoding="utf-8")
        return {
            "status": "SAVED",
            "filename": safe_name,
            "path": str(fpath.relative_to(_ROOT)) if _ROOT in fpath.parents else str(fpath),
            "size_bytes": fpath.stat().st_size,
            "preview_url": f"/api/preview/{safe_name}",
        }
    except Exception as e:
        return {"status": "SAVE_ERROR", "filename": safe_name, "error": str(e)}


def execute_save(params: dict[str, Any], workspace_dir: str | None = None) -> dict[str, Any]:
    """Point d'entrée pour le skill_manager."""
    return save_file(
        params.get("filename", params.get("name", "output.txt")),
        params.get("content", params.get("text", "")),
        workspace_dir,
    )
