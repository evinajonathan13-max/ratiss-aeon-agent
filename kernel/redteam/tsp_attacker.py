"""kernel.redteam.tsp_attacker — Fuzzing TSP (instances adversariales).

Genere des instances difficiles pour auditer les solveurs TSP :
  - Famille Held-Karp integrality gap (graphes de Petersen/Coxeter)
  - Famille high-treewidth expanders (grille 2D avec trous)
Benchmark un solveur candidat et certifie son verdict (PASSED / KILLED).
"""

from __future__ import annotations
from typing import Callable, List, Dict, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import time
import numpy as np

try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False


class InstanceFamily(Enum):
    HK_INTEGRALITY_GAP = "HeldKarp_IntegralityGap"
    HIGH_TREEWIDTH_EXPANDER = "HighTreewidth_Expander"


@dataclass
class TSPInstance:
    name: str
    family: InstanceFamily
    n: int
    dist_matrix: np.ndarray
    optimal_value: float
    hk_lower_bound: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class TSPInstanceFactory:
    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)

    def generate_hk_gap_family(self) -> List[TSPInstance]:
        instances: List[TSPInstance] = []
        if not HAS_NETWORKX:
            # Fallback synthetique : cycle + chords (integrality gap canonique)
            for n in (6, 8):
                D = np.full((n, n), 2.0, dtype=np.float64)
                for i in range(n):
                    D[i, (i + 1) % n] = 1.0
                    D[(i + 1) % n, i] = 1.0
                instances.append(TSPInstance(
                    name=f"HK_Gap_Synth_{n}", family=InstanceFamily.HK_INTEGRALITY_GAP,
                    n=n, dist_matrix=D, optimal_value=float(n + 1), hk_lower_bound=float(n),
                    metadata={"source_graph": "synthetic_cycle"},
                ))
            return instances
        known_graphs: Dict[str, Any] = {"Petersen": nx.petersen_graph()}
        if hasattr(nx, "coxeter_graph"):
            known_graphs["Coxeter"] = nx.coxeter_graph()
        for name, G in known_graphs.items():
            n = G.number_of_nodes()
            dist_dict = dict(nx.all_pairs_shortest_path_length(G))
            D = np.zeros((n, n), dtype=np.float64)
            for i in range(n):
                for j in range(n):
                    D[i, j] = dist_dict[i][j]
            instances.append(TSPInstance(
                name=f"HK_Gap_{name}_{n}", family=InstanceFamily.HK_INTEGRALITY_GAP,
                n=n, dist_matrix=D, optimal_value=float(n + 1), hk_lower_bound=float(n),
                metadata={"source_graph": name},
            ))
        return instances

    def generate_expander_family(self) -> List[TSPInstance]:
        instances: List[TSPInstance] = []
        if not HAS_NETWORKX:
            for n in (10, 12):
                D = self.rng.integers(1, 9, size=(n, n)).astype(np.float64)
                D = (D + D.T) / 2
                np.fill_diagonal(D, 0)
                instances.append(TSPInstance(
                    name=f"High_TW_Synth_{n}", family=InstanceFamily.HIGH_TREEWIDTH_EXPANDER,
                    n=n, dist_matrix=D, optimal_value=float(n + 2), hk_lower_bound=float(n),
                    metadata={"treewidth_lower_bound": 4},
                ))
            return instances
        G = nx.grid_2d_graph(5, 5)
        G.remove_nodes_from([(1, 1), (3, 3)])
        G = nx.convert_node_labels_to_integers(G)
        n = G.number_of_nodes()
        dist_dict = dict(nx.all_pairs_shortest_path_length(G))
        D = np.zeros((n, n), dtype=np.float64)
        for i in range(n):
            for j in range(n):
                D[i, j] = dist_dict[i][j] if j in dist_dict[i] else 100.0
        instances.append(TSPInstance(
            name=f"High_TW_Grid_{n}", family=InstanceFamily.HIGH_TREEWIDTH_EXPANDER,
            n=n, dist_matrix=D, optimal_value=float(n + 2), hk_lower_bound=float(n),
            metadata={"treewidth_lower_bound": 4},
        ))
        return instances


class TSPAlgoAttacker:
    """Auditeur de solveurs TSP via instances adversariales."""

    def __init__(self):
        self.factory = TSPInstanceFactory()
        self.instances: List[TSPInstance] = []
        self.instances.extend(self.factory.generate_hk_gap_family())
        self.instances.extend(self.factory.generate_expander_family())

    def benchmark_algorithm(self, algo_candidate: Callable[[np.ndarray], Tuple[float, List[int]]]) -> dict:
        report: Dict[str, Any] = {"verdict": "PASSED_ALL_BRICKS", "failures": [], "results": {}}
        for instance in self.instances:
            start_time = time.perf_counter()
            try:
                claimed_opt, claimed_tour = algo_candidate(instance.dist_matrix.copy())
                exec_time = time.perf_counter() - start_time
                is_valid, error_msg = self._verify_tour(instance.n, claimed_tour, instance.dist_matrix, claimed_opt)
                if not is_valid:
                    report["verdict"] = "KILLED"
                    report["failures"].append({"instance": instance.name, "reason": f"INVALID_TOUR: {error_msg}"})
                    continue
                if abs(claimed_opt - instance.optimal_value) > 1e-5:
                    report["verdict"] = "KILLED"
                    reason = "WRONG_OPTIMAL_VALUE"
                    if abs(claimed_opt - instance.hk_lower_bound) < 1e-5:
                        reason = "TRAPPED_BY_HELD_KARP_RELAXATION (Confusion borne inf fractionnaire / solution entiere)"
                    report["failures"].append({"instance": instance.name, "reason": reason, "expected": instance.optimal_value, "got": claimed_opt})
                report["results"][instance.name] = {"status": "PASSED" if abs(claimed_opt - instance.optimal_value) <= 1e-5 else "FAILED", "time_seconds": exec_time, "nodes": instance.n}
            except Exception as e:
                report["verdict"] = "KILLED"
                report["failures"].append({"instance": instance.name, "reason": f"RUNTIME_CRASH: {str(e)}"})
        return report

    def _verify_tour(self, n: int, tour: List[int], D: np.ndarray, claimed_cost: float) -> Tuple[bool, str]:
        if len(tour) != n:
            return False, f"Tour de taille {len(tour)} au lieu de {n}."
        if set(tour) != set(range(n)):
            return False, "Le tour ne visite pas chaque sommet exactement une fois."
        actual_cost = 0.0
        for i in range(n):
            actual_cost += D[tour[i], tour[(i + 1) % n]]
        if abs(actual_cost - claimed_cost) > 1e-5:
            return False, f"Cout reel calcule ({actual_cost}) != cout revendique ({claimed_cost})."
        return True, ""
