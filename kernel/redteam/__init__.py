"""kernel.redteam — Framework de red-teaming P vs NP (RATISS V9 Aeon Prime).

Modules déterministes pour falsifier nos propres hypothèses de sécurité et
de complexité avant qu'un adversaire ne le fasse :
  - natural_proofs : barriere Razborov-Rudich (Natural Proofs)
  - circuit_lb     : attaques de bornes inferieures de circuits (AC0/NC0/TC0)
  - tsp_attacker   : fuzzing TSP (instances adversariales Held-Karp / expanders)
  - impossibility  : 4 lois physiques de la calculabilite (Margolus-Levitin,
                      Landauer, Zurek, Bekenstein) + defis de substitution Clay
"""

from .natural_proofs import NaturalProofChecker
from .circuit_lb import CircuitLowerBoundAttacker, RedTeamResult, AttackVector
from .tsp_attacker import TSPAlgoAttacker, TSPInstance
from .impossibility_solver import evaluate_physical_bounds

__all__ = [
    "NaturalProofChecker",
    "CircuitLowerBoundAttacker",
    "RedTeamResult",
    "AttackVector",
    "TSPAlgoAttacker",
    "TSPInstance",
    "evaluate_physical_bounds",
]
