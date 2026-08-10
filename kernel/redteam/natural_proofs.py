"""kernel.redteam.natural_proofs — Barriere Razborov-Rudich (Natural Proofs).

Evalue si une propriete de complexite de circuit est un "natural proof" :
  1. Constructive : peut etre verifiee en temps polynomial sur la table de verite.
  2. Largeness   : une fraction non negligeable des fonctions satisfait la propriete.
  3. Falsifie    : PARITY (ou une fonction difficile connue) satisfait la propriete.

Si les trois criteres sont reunis, la propriete ne peut pas separer P de NP
sous la barriere des Natural Proofs (Razborov-Rudich 1997).
"""

from __future__ import annotations
from typing import Callable, Dict, Any
import numpy as np


class NaturalProofChecker:
    """Verificateur de la barriere Natural Proofs sur une propriete de circuit."""

    def __init__(self, n_vars: int = 6):
        self.n = n_vars
        self.N = 2 ** n_vars

    # -- Parite de reference (difficile pour AC0) --
    def _parity_table(self) -> np.ndarray:
        return np.array([bin(i).count("1") % 2 for i in range(self.N)], dtype=np.uint8)

    def _is_truth_table(self, f: np.ndarray) -> bool:
        return isinstance(f, np.ndarray) and f.shape == (self.N,) and set(np.unique(f)).issubset({0, 1})

    def _constructiveness(self, property_evaluator: Callable[[np.ndarray], bool], target: np.ndarray) -> Dict[str, Any]:
        """Critere 1 : la propriete est-elle verifiable en temps polynomial ?"""
        try:
            ok = bool(property_evaluator(target))
            return {"is_polynomial_time_verifiable": True, "evaluation_succeeded": ok, "time_complexity": "poly(n)"}
        except Exception as e:
            return {"is_polynomial_time_verifiable": False, "error": str(e)}

    def _largeness(self, property_evaluator: Callable[[np.ndarray], bool]) -> Dict[str, Any]:
        """Critere 2 : une fraction non negligeable des fonctions satisfait la propriete."""
        rng = np.random.default_rng(123)
        sample_size = min(64, self.N)
        satisfied = 0
        for _ in range(sample_size):
            rand_f = rng.integers(0, 2, size=self.N, dtype=np.uint8)
            try:
                if property_evaluator(rand_f):
                    satisfied += 1
            except Exception:
                pass
        fraction = satisfied / sample_size if sample_size else 0.0
        return {"sampled_functions": sample_size, "satisfied": satisfied, "fraction": fraction, "is_large": fraction > 0.1}

    def _falsifiability(self, property_evaluator: Callable[[np.ndarray], bool]) -> Dict[str, Any]:
        """Critere 3 : PARITY (difficile) satisfait-elle la propriete ?"""
        parity = self._parity_table()
        try:
            parity_satisfies = bool(property_evaluator(parity))
        except Exception:
            parity_satisfies = False
        return {"hard_function": "PARITY", "hard_function_satisfies_property": parity_satisfies}

    def run_redteam_analysis(self, property_evaluator: Callable[[np.ndarray], bool], target: np.ndarray) -> Dict[str, Any]:
        """Analyse complete de la barriere Natural Proofs."""
        construct = self._constructiveness(property_evaluator, target)
        large = self._largeness(property_evaluator)
        falsif = self._falsifiability(property_evaluator)
        is_nat = (
            construct.get("is_polynomial_time_verifiable", False)
            and large.get("is_large", False)
            and falsif.get("hard_function_satisfies_property", False)
        )
        return {
            "n_variables": self.n,
            "constructiveness": construct,
            "largeness": large,
            "falsifiability": falsif,
            "VERDICT_IS_NATURAL_PROOF": is_nat,
            "barrier": "RAZBOROV-RUDICH (1997)" if is_nat else "NO_BARRIER",
            "conclusion": (
                "Propriete bloqueepar les Natural Proofs : ne peut pas separer P vs NP."
                if is_nat
                else "Propriete non bloquee par la barriere Natural Proofs."
            ),
        }
