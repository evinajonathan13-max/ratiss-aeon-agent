"""
tools/file_editor.py — Éditeur de fichiers (agent agentique souverain).

Permet à l'agent RATISS de manipuler des fichiers :
  - view : voir le contenu d'un fichier (avec numéros de ligne)
  - create : créer un nouveau fichier
  - str_replace : remplacer une chaîne dans un fichier
  - insert : insérer du texte après une ligne donnée
  - undo : annuler la dernière modification

Équivalent du éditeur str_replace de RATISS, adapté pour RATISS.
"""
from __future__ import annotations

import os
import shutil
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("ratiss.file_editor")

_ROOT = Path(__file__).resolve().parent.parent

# Historique pour undo (limité à 20 opérations)
_edit_history: list[dict[str, Any]] = []


def _resolve_path(filepath: str, workspace_dir: str | None = None) -> Path:
    """Résout un chemin relatif au workspace ou à la racine."""
    p = Path(filepath)
    if p.is_absolute():
        return p
    if workspace_dir:
        candidate = Path(workspace_dir) / filepath
        if candidate.exists():
            return candidate
    # Essayer depuis la racine du projet
    candidate = _ROOT / filepath
    if candidate.exists():
        return candidate
    # Retourner le chemin depuis le workspace
    if workspace_dir:
        return Path(workspace_dir) / filepath
    return _ROOT / filepath


def view_file(filepath: str, view_range: list[int] | None = None, workspace_dir: str | None = None) -> dict[str, Any]:
    """Affiche le contenu d'un fichier avec numéros de ligne."""
    p = _resolve_path(filepath, workspace_dir)
    if not p.exists():
        return {"status": "FILE_NOT_FOUND", "path": str(p)}
    if not p.is_file():
        return {"status": "NOT_A_FILE", "path": str(p)}

    try:
        content = p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return {"status": "BINARY_FILE", "path": str(p), "size_bytes": p.stat().st_size}

    lines = content.splitlines()
    total = len(lines)

    if view_range:
        start, end = view_range[0], view_range[1] if len(view_range) > 1 else total
        start = max(1, start)
        end = min(total, end if end > 0 else total)
        lines = lines[start - 1 : end]
    else:
        start = 1
        end = total

    # Formater avec numéros de ligne (comme cat -n)
    numbered = "\n".join(f"{i + start:>6}\t{line}" for i, line in enumerate(lines))

    return {
        "status": "VIEWED",
        "path": str(p),
        "total_lines": total,
        "viewed_range": [start, end],
        "content": numbered,
        "size_bytes": p.stat().st_size,
    }


def create_file(filepath: str, content: str, workspace_dir: str | None = None) -> dict[str, Any]:
    """Crée un nouveau fichier (échoue si le fichier existe déjà)."""
    p = _resolve_path(filepath, workspace_dir)
    if p.exists():
        return {"status": "FILE_EXISTS", "path": str(p), "error": "File already exists. Use str_replace to edit."}

    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        _edit_history.append({"action": "create", "path": str(p)})
        return {
            "status": "CREATED",
            "path": str(p),
            "lines": len(content.splitlines()),
            "size_bytes": p.stat().st_size,
        }
    except Exception as e:
        return {"status": "CREATE_ERROR", "path": str(p), "error": str(e)}


def str_replace(filepath: str, old_str: str, new_str: str, workspace_dir: str | None = None) -> dict[str, Any]:
    """Remplace old_str par new_str dans le fichier (doit être unique)."""
    p = _resolve_path(filepath, workspace_dir)
    if not p.exists():
        return {"status": "FILE_NOT_FOUND", "path": str(p)}

    try:
        content = p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return {"status": "BINARY_FILE", "path": str(p)}

    count = content.count(old_str)
    if count == 0:
        return {"status": "NOT_FOUND", "path": str(p), "error": "old_str not found in file"}
    if count > 1:
        return {"status": "MULTIPLE_MATCHES", "path": str(p), "error": f"old_str found {count} times, needs to be unique"}

    # Sauvegarder pour undo
    _edit_history.append({"action": "str_replace", "path": str(p), "old_content": content})

    new_content = content.replace(old_str, new_str, 1)
    p.write_text(new_content, encoding="utf-8")

    return {
        "status": "REPLACED",
        "path": str(p),
        "occurrences": 1,
        "new_size_bytes": p.stat().st_size,
    }


def insert_lines(filepath: str, line_num: int, text: str, workspace_dir: str | None = None) -> dict[str, Any]:
    """Insère du texte après la ligne line_num."""
    p = _resolve_path(filepath, workspace_dir)
    if not p.exists():
        return {"status": "FILE_NOT_FOUND", "path": str(p)}

    try:
        content = p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return {"status": "BINARY_FILE", "path": str(p)}

    _edit_history.append({"action": "insert", "path": str(p), "old_content": content})

    lines = content.splitlines(True)  # keepends=True
    if line_num < 0:
        line_num = 0
    if line_num > len(lines):
        line_num = len(lines)

    if not text.endswith("\n"):
        text = text + "\n"

    lines.insert(line_num, text)
    p.write_text("".join(lines), encoding="utf-8")

    return {
        "status": "INSERTED",
        "path": str(p),
        "inserted_after_line": line_num,
        "new_total_lines": len(lines),
    }


def undo_edit(workspace_dir: str | None = None) -> dict[str, Any]:
    """Annule la dernière modification."""
    if not _edit_history:
        return {"status": "NO_HISTORY", "error": "No edits to undo"}

    last = _edit_history.pop()
    p = Path(last["path"])

    if last["action"] == "create":
        if p.exists():
            p.unlink()
        return {"status": "UNDONE", "action": "create", "path": str(p)}
    elif last["action"] in ("str_replace", "insert"):
        if "old_content" in last:
            p.write_text(last["old_content"], encoding="utf-8")
            return {"status": "UNDONE", "action": last["action"], "path": str(p)}
    return {"status": "UNDO_FAILED", "action": last.get("action")}


def execute_file_action(action: str, params: dict[str, Any], workspace_dir: str | None = None) -> dict[str, Any]:
    """Point d'entrée unique pour toutes les actions file_editor."""
    action = action.lower().strip()
    filepath = params.get("path", params.get("filepath", params.get("filename", "")))

    if action == "view":
        return view_file(filepath, params.get("view_range"), workspace_dir)
    elif action == "create":
        return create_file(filepath, params.get("content", params.get("text", "")), workspace_dir)
    elif action in ("str_replace", "replace", "edit"):
        return str_replace(filepath, params.get("old_str", ""), params.get("new_str", ""), workspace_dir)
    elif action == "insert":
        return insert_lines(filepath, params.get("line", params.get("line_num", 0)), params.get("text", ""), workspace_dir)
    elif action == "undo":
        return undo_edit(workspace_dir)
    elif action == "list":
        d = _resolve_path(filepath or ".", workspace_dir)
        if d.is_dir():
            files = [{"name": f.name, "size_bytes": f.stat().st_size, "is_dir": f.is_dir()} for f in sorted(d.iterdir())]
            return {"status": "LISTED", "path": str(d), "files": files}
        return {"status": "NOT_A_DIR", "path": str(d)}
    else:
        return {"status": "UNKNOWN_ACTION", "action": action}
