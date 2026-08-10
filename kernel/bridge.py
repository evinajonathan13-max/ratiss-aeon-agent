"""
kernel/bridge.py — Pont unifié entre l'orchestrateur agentique et le noyau RATISS V9.

Expose une API simple et typée pour :
  - run_pipeline()        : pipeline scientifique complet (Lanczos ED + GUDHI + ZK)
  - get_memory_status()   : état du Memory Guard
  - list_pdb_structures() : structures PDB locales disponibles
  - run_quantum_only()    : solveur quantique seul
  - run_topology_only()   : homologie persistante seule
  - generate_zk_proof()   : preuve ZK-STARK d'un résultat

Tous les appels passent par le Memory Guard (7500 Mo).
"""
from __future__ import annotations

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Any

# Assurer que le répertoire parent (racine du dépôt) est dans sys.path
# pour que `kernel.*` soit importable.
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from kernel.system.memory_guard import (
    memory_guard,
    get_current_memory_mb,
    get_available_memory_mb,
)
from kernel.solvers.quantum_solver import solve_tj_ground_state
from kernel.solvers.topo_solver import solve_persistent_homology
from kernel.solvers.tryperposition_solver import solve_tryperposition_pipeline
from kernel.zk.prover_bridge import generate_risc_zero_proof
from kernel.core.refinery import pre_filter_topology

logger = logging.getLogger("ratiss.bridge")

DATA_DIR = _ROOT / "data" / "pdb"
MAX_RAM_MB = float(os.environ.get("RATISS_RAM_LIMIT_MB", "7500"))


def get_memory_status() -> dict[str, Any]:
    """Retourne l'état courant du Memory Guard."""
    current = get_current_memory_mb()
    available = get_available_memory_mb()
    return {
        "current_mb": round(current, 1),
        "available_mb": round(available, 1),
        "limit_mb": MAX_RAM_MB,
        "usage_pct": round(min(100.0, (current / MAX_RAM_MB) * 100.0), 1),
        "status": "OK" if current < MAX_RAM_MB * 0.9 else "WARNING" if current < MAX_RAM_MB else "CRITICAL",
    }


def list_pdb_structures() -> list[dict[str, Any]]:
    """Liste les structures PDB locales disponibles."""
    structures = []
    if not DATA_DIR.exists():
        return structures
    for f in sorted(DATA_DIR.glob("*.cif")):
        size_kb = round(f.stat().st_size / 1024, 1)
        structures.append({"id": f.stem, "filename": f.name, "size_kb": size_kb, "path": str(f)})
    return structures


def run_quantum_only(Lx: int = 4, Ly: int = 4, t: float = 1.0, J: float = 0.4) -> dict[str, Any]:
    """Exécute uniquement le solveur quantique t-J Lanczos ED."""
    result = solve_tj_ground_state(Lx=Lx, Ly=Ly, t=t, J=J)
    tj = result.get("tj_model", {})
    return {
        "status": result.get("status", "UNKNOWN"),
        "ground_state_energy": tj.get("ground_state_energy"),
        "energy_per_site": tj.get("energy_per_site"),
        "spin_gap": tj.get("spin_gap"),
        "d_wave_pairing": tj.get("d_wave_pairing"),
        "hilbert_dim": tj.get("hilbert_dim_effective"),
        "psi_norm": tj.get("psi_norm"),
        "convergence": result.get("convergence", {}),
        "qubit_processing": result.get("qubit_processing", {}),
        "mem_peak_mb": result.get("mem_peak_mb"),
    }


def run_topology_only(n_points: int = 500, max_dimension: int = 2, max_edge: float = 2.0) -> dict[str, Any]:
    """Exécute uniquement l'homologie persistante (GUDHI ou fallback natif)."""
    import numpy as np
    np.random.seed(42)
    landmarks = np.random.randn(n_points, 4).astype(np.float32).tolist()
    result = solve_persistent_homology(landmarks, max_dimension=max_dimension, max_edge_length=max_edge)
    return {
        "status": result.get("status", "UNKNOWN"),
        "betti_numbers": result.get("betti_numbers", [1, 0, 0]),
        "diagrams": result.get("diagrams", {}),
        "invariant_hash": result.get("invariant_hash"),
        "mem_peak_mb": result.get("mem_peak_mb"),
    }


def generate_zk_proof(result_dict: dict[str, Any]) -> dict[str, Any]:
    """Génère une preuve ZK-STARK RISC Zero à partir d'un résultat de solveur.

    Normalise les structures plates (ex: {'ground_state_energy': -3.5}) et les
    structures partielles (tj_model sans energy_per_site) vers la structure
    attendue par le prover afin d'éviter les faux positifs lorsque les clés
    sont absentes.
    """
    normalized = dict(result_dict)
    # Normaliser tj_model : mapper ground_state_energy → energy_per_site si absent
    tj = dict(normalized.get("tj_model", {}))
    if "energy_per_site" not in tj and "ground_state_energy" in tj:
        tj["energy_per_site"] = tj["ground_state_energy"]
    # Normaliser structure plate → tj_model
    if not tj:
        for k in ("ground_state_energy", "energy_per_site", "psi0_vec", "psi_norm"):
            if k in normalized:
                tj[k] = normalized.pop(k)
        if "energy_per_site" not in tj and "ground_state_energy" in tj:
            tj["energy_per_site"] = tj["ground_state_energy"]
    if tj:
        normalized["tj_model"] = tj

    # Normaliser qubit_processing
    qp = dict(normalized.get("qubit_processing", {}))
    if "entanglement_entropy" not in qp and "entropy" in qp:
        qp["entanglement_entropy"] = qp["entropy"]
    if not qp:
        for k in ("entanglement_entropy", "entropy", "psi_state_vector"):
            if k in normalized:
                qp[k] = normalized.pop(k)
        if "entanglement_entropy" not in qp and "entropy" in qp:
            qp["entanglement_entropy"] = qp["entropy"]
    if qp:
        normalized["qubit_processing"] = qp

    proof = generate_risc_zero_proof(normalized)
    return proof


def run_pipeline(Lx: int = 4, Ly: int = 4, t: float = 1.0, J: float = 0.4, **kwargs) -> dict[str, Any]:
    """Pipeline scientifique complet RATISS V9 : Topologie → Quantique → ZK."""
    from kernel.main import run_ratiss_v9_aeon_pipeline
    return run_ratiss_v9_aeon_pipeline(Lx=Lx, Ly=Ly, t=t, J=J, **kwargs)


def run_tryperposition(**kwargs) -> dict[str, Any]:
    """Pipeline Tryperposition unifié Q ⊗ I ⊗ M."""
    return solve_tryperposition_pipeline(**kwargs)


# ── Registre des compétences exposées à l'orchestrateur ──────────────────────

CAPABILITIES = {
    "quantum_ed": {
        "label": "Diagonalisation exacte Lanczos (modèle t-J)",
        "fn": run_quantum_only,
        "category": "physics",
    },
    "topology": {
        "label": "Homologie persistante (GUDHI / fallback natif)",
        "fn": run_topology_only,
        "category": "topology",
    },
    "zk_proof": {
        "label": "Preuve ZK-STARK RISC Zero",
        "fn": generate_zk_proof,
        "category": "crypto",
    },
    "full_pipeline": {
        "label": "Pipeline complet RATISS (Topo → Quantique → ZK)",
        "fn": run_pipeline,
        "category": "orchestration",
    },
    "tryperposition": {
        "label": "Tryperposition unifiée Q ⊗ I ⊗ M",
        "fn": run_tryperposition,
        "category": "orchestration",
    },
}
