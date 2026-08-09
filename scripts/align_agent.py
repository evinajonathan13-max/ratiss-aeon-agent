#!/usr/bin/env python3
"""scripts/align_agent.py — Configure Prime Agent (wrapper) avec Nemotron et RATISS.

Aligne l'orchestrateur : vérifie les variables d'environnement, les connecteurs
API, le Memory Guard, et affiche le statut d'alignement. Génère un fichier
config/agent_aligned.json récapitulatif.

Usage :
    python scripts/align_agent.py
    python scripts/align_agent.py --check   # mode vérification seule
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

from kernel import bridge
from kernel.connectors.registry import get_connectors_status
from orchestrator.nemotron_client import NemotronClient
from orchestrator.skill_manager import list_skills


def check_env() -> dict:
    """Vérifie les variables d'environnement critiques (sans exposer les valeurs)."""
    vars_to_check = [
        "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "OPENROUTER_API_URL",
        "IBM_QUANTUM_TOKEN", "QUANDELA_API_TOKEN",
        "RATISS_RAM_LIMIT_MB", "RATISS_HOST", "RATISS_PORT",
        "ACADEMIC_ORCID", "ACADEMIC_DOI",
    ]
    return {v: ("SET" if os.environ.get(v, "").strip() else "UNSET") for v in vars_to_check}


def main() -> int:
    parser = argparse.ArgumentParser(description="Aligne l'agent RATISS (Nemotron + noyau + connecteurs).")
    parser.add_argument("--check", action="store_true", help="Mode vérification seule (pas de fichier de sortie)")
    args = parser.parse_args()

    print("=" * 60)
    print("  ALIGNEMENT DE L'AGENT RATISS AEON PRIME")
    print("=" * 60)

    # 1. Memory Guard
    mem = bridge.get_memory_status()
    print(f"\n[1] MEMORY GUARD")
    print(f"    Statut : {mem['status']}")
    print(f"    RAM    : {mem['current_mb']} / {mem['limit_mb']} MB ({mem['usage_pct']}%)")

    # 2. Noyau
    print(f"\n[2] NOYAU RATISS")
    pdb = bridge.list_pdb_structures()
    print(f"    Structures PDB locales : {len(pdb)} ({', '.join(p['id'] for p in pdb)})")
    print(f"    Compétences : {len(list_skills())}")
    for s in list_skills():
        print(f"      - {s['action']}: {s['label']} [{s['category']}]")

    # 3. Nemotron
    print(f"\n[3] PLANIFICATEUR NEMOTRON")
    nm = NemotronClient()
    print(f"    OpenRouter : {'CONNECTÉ' if nm.available else 'FALLBACK LOCAL'}")
    print(f"    Modèle     : {nm.model}")

    # 4. Connecteurs
    print(f"\n[4] CONNECTEURS API")
    conns = get_connectors_status()
    for cid, c in conns.items():
        if cid in ("total_connected", "total_connectors"):
            continue
        dot = "✓" if c["connected"] else "○"
        print(f"    {dot} {c['name']}: {c['mode']}")

    # 5. Variables d'environnement
    print(f"\n[5] ENVIRONNEMENT")
    env_status = check_env()
    for v, s in env_status.items():
        print(f"    {s:6s} {v}")

    # Récap
    total = conns.get("total_connected", 0)
    print(f"\n{'=' * 60}")
    print(f"  Alignement : {total}/{conns.get('total_connectors', 5)} connecteurs actifs")
    print(f"  Nemotron   : {'live' if nm.available else 'fallback local'}")
    print(f"  Memory     : {mem['status']} ({mem['usage_pct']}%)")
    print(f"{'=' * 60}")

    if not args.check:
        out = _ROOT / "config" / "agent_aligned.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        recap = {
            "memory_guard": mem,
            "kernel": {"pdb_count": len(pdb), "pdb_ids": [p["id"] for p in pdb], "skills_count": len(list_skills())},
            "nemotron": {"available": nm.available, "mode": "live" if nm.available else "fallback_local"},
            "connectors": conns,
            "environment": env_status,
        }
        out.write_text(json.dumps(recap, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\n✓ Fichier d'alignement : {out}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
