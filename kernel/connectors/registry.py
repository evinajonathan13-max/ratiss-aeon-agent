"""
kernel/connectors/registry.py — Registre unifié des connecteurs API externes.

Expose le statut et les capacités de chaque connecteur (IBM Quantum, Quandela,
AlphaFold/RCSB) avec logique de fallback locale stricte.

Principe souverain : aucune clé n'est jamais loggée ni exposée. On signale
uniquement la disponibilité (connecté / fallback / indisponible).
"""
from __future__ import annotations

import os
import json
import logging
from typing import Any
from pathlib import Path

logger = logging.getLogger("ratiss.connectors")

CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"


def _has_token(*names: str) -> bool:
    """Vérifie qu'au moins une variable d'environnement parmi `names` est définie et non vide."""
    for n in names:
        v = os.environ.get(n, "").strip()
        if v and not v.startswith("TON_") and v.lower() not in ("none", "null"):
            return True
    return False


class ConnectorStatus:
    """Snapshot du statut de tous les connecteurs (sans exposer de secrets)."""

    def __init__(self):
        self.ibm = self._ibm_status()
        self.quandela = self._quandela_status()
        self.alphafold = self._alphafold_status()
        self.rcsb = self._rcsb_status()
        self.openrouter = self._openrouter_status()

    def _ibm_status(self) -> dict[str, Any]:
        available = _has_token("IBM_QUANTUM_TOKEN", "IBMQ_TOKEN")
        try:
            from qiskit_ibm_runtime import QiskitRuntimeService  # noqa: F401
            runtime = True
        except Exception:
            runtime = False
        return {
            "name": "IBM Quantum",
            "id": "ibm_quantum",
            "connected": available and runtime,
            "runtime_installed": runtime,
            "token_configured": available,
            "mode": "live" if (available and runtime) else "fallback_local",
            "capabilities": ["circuit_execution", "qpu_brisbane", "simulator_qasm"],
            "note": "Lanczos ED local si indisponible" if not (available and runtime) else "QPU IBM accessible",
        }

    def _quandela_status(self) -> dict[str, Any]:
        available = _has_token("QUANDELA_API_TOKEN")
        try:
            import perceval  # noqa: F401
            perceval_installed = True
        except Exception:
            perceval_installed = False
        return {
            "name": "Quandela (Photonique)",
            "id": "quandela",
            "connected": available and perceval_installed,
            "runtime_installed": perceval_installed,
            "token_configured": available,
            "mode": "live" if (available and perceval_installed) else "fallback_local",
            "capabilities": ["photonic_simulation", "qpu_ascella", "sim_exqalibur"],
            "note": "Simulateur photonique local si indisponible" if not (available and perceval_installed) else "QPU Quandela accessible",
        }

    def _alphafold_status(self) -> dict[str, Any]:
        # AlphaFold DB est une API REST publique (pas de token requis)
        return {
            "name": "AlphaFold DB",
            "id": "alphafold",
            "connected": True,
            "token_configured": False,
            "mode": "public_api",
            "capabilities": ["structure_prediction_fetch", "uniprot_mapping"],
            "endpoint": "https://alphafold.ebi.ac.uk/api/prediction/",
            "note": "API publique (récupération de prédictions)",
        }

    def _rcsb_status(self) -> dict[str, Any]:
        return {
            "name": "RCSB PDB",
            "id": "rcsb",
            "connected": True,
            "token_configured": False,
            "mode": "public_api",
            "capabilities": ["structure_fetch", "structure_search"],
            "endpoint": "https://data.rcsb.org/rest/v1/core/entry/",
            "note": "API publique (structures cristallographiques)",
        }

    def _openrouter_status(self) -> dict[str, Any]:
        available = _has_token("OPENROUTER_API_KEY")
        return {
            "name": "OpenRouter (Nemotron)",
            "id": "openrouter",
            "connected": available,
            "token_configured": available,
            "mode": "live" if available else "fallback_local",
            "model": os.environ.get("OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free"),
            "note": "Planification locale (REACT) si indisponible" if not available else "Nemotron 3 Ultra accessible",
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "ibm_quantum": self.ibm,
            "quandela": self.quandela,
            "alphafold": self.alphafold,
            "rcsb": self.rcsb,
            "openrouter": self.openrouter,
            "total_connected": sum(1 for c in [self.ibm, self.quandela, self.alphafold, self.rcsb, self.openrouter] if c["connected"]),
            "total_connectors": 5,
        }


def get_connectors_status() -> dict[str, Any]:
    """Retourne le statut de tous les connecteurs."""
    return ConnectorStatus().to_dict()


def list_local_pdb() -> list[dict[str, Any]]:
    """Liste les structures PDB locales (offline-first)."""
    pdb_dir = Path(__file__).resolve().parent.parent.parent / "data" / "pdb"
    structures = []
    if not pdb_dir.exists():
        return structures
    for f in sorted(pdb_dir.glob("*.cif")):
        structures.append({"id": f.stem, "filename": f.name, "size_kb": round(f.stat().st_size / 1024, 1)})
    return structures
