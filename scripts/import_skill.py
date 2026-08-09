#!/usr/bin/env python3
"""scripts/import_skill.py — Importe une compétence depuis un dépôt GitHub.

Clone un dépôt, l'exécute dans le sandbox NemoSandbox (Docker ou restreint),
valide qu'il expose les bons points d'entrée, puis purge le clone.

Usage :
    python scripts/import_skill.py https://github.com/user/skill-repo
    python scripts/import_skill.py https://github.com/user/skill-repo --entry skill.py

Sécurité : le code externe est exécuté uniquement dans le sandbox isolé.
"""
from __future__ import annotations

import argparse
import sys
import os
import shutil
import tempfile
import subprocess
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

from security.sandbox_hardener import NemoSandbox


def clone_repo(url: str, dest: Path) -> bool:
    """Clone un dépôt Git dans dest. Retourne True si succès."""
    try:
        r = subprocess.run(
            ["git", "clone", "--depth", "1", url, str(dest)],
            capture_output=True, timeout=60, text=True,
        )
        return r.returncode == 0
    except Exception as e:
        print(f"Erreur clone: {e}", file=sys.stderr)
        return False


def find_entry_points(repo_dir: Path) -> list[Path]:
    """Trouve les points d'entrée Python potentiels."""
    entries = []
    for name in ["skill.py", "main.py", "run.py", "entry.py"]:
        p = repo_dir / name
        if p.exists():
            entries.append(p)
    # Fallback : tous les .py à la racine
    if not entries:
        entries = sorted(repo_dir.glob("*.py"))
    return entries


def main() -> int:
    parser = argparse.ArgumentParser(description="Importe et teste une compétence depuis GitHub dans le sandbox RATISS.")
    parser.add_argument("url", help="URL du dépôt GitHub")
    parser.add_argument("--entry", default=None, help="Fichier d'entrée à exécuter (défaut: auto-détection)")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout d'exécution (secondes)")
    parser.add_argument("--keep", action="store_true", help="Garder le clone après exécution (debug)")
    args = parser.parse_args()

    tmpdir = Path(tempfile.mkdtemp(prefix="ratiss_skill_"))
    print(f"[1/4] Clonage de {args.url}...")
    if not clone_repo(args.url, tmpdir):
        print("Échec du clonage.", file=sys.stderr)
        shutil.rmtree(tmpdir, ignore_errors=True)
        return 1

    # Trouver le point d'entrée
    if args.entry:
        entry = tmpdir / args.entry
        if not entry.exists():
            print(f"Point d'entrée introuvable: {entry}", file=sys.stderr)
            shutil.rmtree(tmpdir, ignore_errors=True)
            return 1
    else:
        entries = find_entry_points(tmpdir)
        if not entries:
            print("Aucun point d'entrée Python trouvé.", file=sys.stderr)
            shutil.rmtree(tmpdir, ignore_errors=True)
            return 1
        entry = entries[0]

    print(f"[2/4] Point d'entrée : {entry.name}")
    code = entry.read_text(encoding="utf-8", errors="replace")

    print(f"[3/4] Exécution dans le sandbox (mode Docker si disponible)...")
    sandbox = NemoSandbox()
    result = sandbox.execute(code, timeout=args.timeout, user_id="importer", session_id="skill_test")

    print(f"\n[4/4] Résultat (mode: {result['mode']}):")
    print(f"  returncode: {result['returncode']}")
    if result["stdout"]:
        print(f"  stdout:\n{result['stdout'][:2000]}")
    if result["stderr"]:
        print(f"  stderr:\n{result['stderr'][:2000]}")

    # Purge
    if not args.keep:
        shutil.rmtree(tmpdir, ignore_errors=True)
        print("\n✓ Clone purgé (sandbox éphémère).")
    else:
        print(f"\n Clone conservé : {tmpdir}")

    return 0 if result["returncode"] == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
