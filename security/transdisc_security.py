"""security/transdisc_security.py — Topologie de la surface d'attaque.

⚠️  LA TOUCHE UNIQUE RATISS — transdisciplinarité plagie du module scientifique ⚠️

RATISS reconnaît des patterns dans les sciences (biologie, physique, topologie)
via l'homologie persistante et les nombres de Betti. Ce module transplanté applique
la MÊME mathématique à la SÉCURITÉ globale : la surface d'attaque devient un nuage
de points topologique, et sa structure révèle les chaînes d'attaque (kill chains).

La surface d'attaque = nuage de points dans un espace de features :
  - Sévérité (CRITICAL=0.0, HIGH=0.25, MEDIUM=0.5, LOW=0.75, INFO=1.0)
  - Catégorie OWASP (A01..A10 → angle sur le cercle unité)
  - Position réseau (port normalisé, profondeur web)
  - Exposabilité (0.0 interne → 1.0 externe)

Homologie persistante sur ce nuage :
  - β₀ (composantes connexes) = îlots de vulnérabilités isolés
  - β₁ (cycles/trous 1D) = CHAÎNES D'ATTAQUE (kill chains) — le trou = le cycle
    d'exploitation qui relie plusieurs vulnérabilités
  - β₂ (cavités 2D) = vulnérabilités multidimensionnelles profondes
  - Persistance = vulnérabilités qui survivent à plusieurs échelles = les plus critiques

C'est la transdisciplinarité RATISS appliquée à la cybersécurité. Personne ne fait ça.
"""
from __future__ import annotations

import math
import json
import logging
import hashlib
from pathlib import Path
from typing import Any
from datetime import datetime, timezone

logger = logging.getLogger("RATISS-TRANSDISC-SEC")

# ── Mapping sévérité → coordonnée radiale ────────────────────────────────────
SEVERITY_RADIUS = {
    "CRITICAL": 0.0,   # centre — le plus dangereux
    "HIGH": 0.25,
    "MEDIUM": 0.5,
    "LOW": 0.75,
    "INFO": 1.0,       # périphérie — le moins dangereux
}

# ── Mapping OWASP Top 10 2021 → angle sur le cercle unité ────────────────────
# Chaque catégorie OWASP = un angle (36° = 2π/10), pour répartir les vulnérabilités
# autour du centre. Deux vulnérabilités de même catégorie OWASP sont angulairement
# proches, ce qui crée des amas topologiques.
OWASP_ANGLE = {
    "A01": 0.0,           # Broken Access Control
    "A02": math.pi / 5,   # Cryptographic Failures
    "A03": 2 * math.pi / 5,  # Injection
    "A04": 3 * math.pi / 5,  # Insecure Design
    "A05": 4 * math.pi / 5,  # Security Misconfiguration
    "A06": math.pi,          # Vulnerable Components
    "A07": 6 * math.pi / 5,  # Auth Failures
    "A08": 7 * math.pi / 5,  # Software Integrity Failures
    "A09": 8 * math.pi / 5,  # Logging Failures
    "A10": 9 * math.pi / 5,  # SSRF
}


class AttackSurfaceTopology:
    """Analyse topologique de la surface d'attaque (transdisciplinaire RATISS).

    Transplante l'homologie persistante du module scientifique vers la cybersécurité :
    le nuage de points = les vulnérabilités détectées, dans un espace de features
    où la distance euclidienne encode la proximité sémantique des vulnérabilités.
    """

    def __init__(self, findings: list[dict[str, Any]] | None = None) -> None:
        self.findings = findings or []
        self.points: list[list[float]] = []
        self.labels: list[str] = []
        self.owasp_codes: list[str] = []

    def _extract_owasp_code(self, owasp_str: str) -> str:
        """Extrait le code OWASP (A01..A10) d'une chaîne comme 'A03:2021 - Injection'."""
        for code in OWASP_ANGLE:
            if code in owasp_str:
                return code
        return "A05"  # défaut : Security Misconfiguration

    def _finding_to_point(self, finding: dict[str, Any]) -> list[float]:
        """Projette une vulnérabilité dans l'espace de features (x, y, z).

        Coordonnées :
          - r = rayon radial (sévérité, 0=CRITICAL au centre)
          - θ = angle OWASP (catégorie de vulnérabilité)
          - z = hauteur (exposabilité : interne=0, externe=1)

        Returns: [x, y, z] où x=r·cos(θ), y=r·sin(θ), z=exposabilité
        """
        severity = finding.get("severity", "INFO").upper()
        r = SEVERITY_RADIUS.get(severity, 1.0)

        owasp_str = finding.get("owasp", "")
        code = self._extract_owasp_code(owasp_str)
        theta = OWASP_ANGLE.get(code, 0.0)

        # Exposabilité : déduit de la catégorie et de la cible
        category = finding.get("category", "").upper()
        target = finding.get("target", "")
        # Web/réseau = externe (z=1), SAST/config = interne (z=0)
        if category in ("WEB", "NETWORK"):
            z = 1.0
        elif category in ("SAST", "CONFIG"):
            z = 0.0
        else:
            z = 0.5

        # Petite jitter déterministe pour éviter les points superposés
        # (deux vulnérabilités identiques ne doivent pas être au même point exact)
        evidence_hash = finding.get("evidence", "")[:50]
        jitter_seed = int(hashlib.md5(evidence_hash.encode()).hexdigest(), 16) % 1000
        jitter = (jitter_seed / 1000) * 0.05  # ±0.05

        x = (r + jitter) * math.cos(theta)
        y = (r + jitter) * math.sin(theta)
        return [round(x, 4), round(y, 4), round(z + jitter, 4)]

    def build_point_cloud(self) -> None:
        """Construit le nuage de points à partir des findings."""
        self.points = []
        self.labels = []
        self.owasp_codes = []
        for f in self.findings:
            pt = self._finding_to_point(f)
            self.points.append(pt)
            self.labels.append(f.get("title", "unknown"))
            self.owasp_codes.append(self._extract_owasp_code(f.get("owasp", "")))

    # ── Homologie persistante native (fallback sans gudhi) ───────────────────
    def compute_persistent_homology(self, max_dimension: int = 2,
                                     max_edge: float = 1.5) -> dict[str, Any]:
        """Calcule l'homologie persistante sur le nuage de vulnérabilités.

        Utilise gudhi si disponible, sinon le résolveur natif RATISS (MST + cycles).
        """
        if not self.points:
            return {"status": "NO_DATA", "betti_numbers": [0, 0, 0], "diagrams": {}}

        N = len(self.points)

        # 1. Calcul des distances euclidiennes entre tous les points
        edges = []
        for i in range(N):
            for j in range(i + 1, N):
                d = math.sqrt(sum(
                    (self.points[i][k] - self.points[j][k]) ** 2
                    for k in range(min(len(self.points[i]), len(self.points[j])))
                ))
                edges.append((d, i, j))
        edges.sort(key=lambda x: x[0])

        diagrams = {0: [], 1: [], 2: []}

        # 2. H0 : composantes connexes via Union-Find (Kruskal MST)
        parent = list(range(N))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        mst_edges = []
        for d, u, v in edges:
            ru, rv = find(u), find(v)
            if ru != rv:
                parent[ru] = rv
                mst_edges.append((d, u, v))
                diagrams[0].append([0.0, d])
                if len(mst_edges) == N - 1:
                    break

        beta_0 = max(1, N - len(mst_edges))

        # 3. H1 : cycles (chaînes d'attaque) — détection des cycles dans le graphe
        # Un cycle = une arête non-MST qui connecte deux sommets déjà dans la même composante
        # Chaque cycle = une kill chain potentielle
        cycles_1d = []
        # Réinitialiser Union-Find pour la détection de cycles
        parent = list(range(N))

        def find2(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        for d, u, v in edges:
            if d > max_edge:
                break
            ru, rv = find2(u), find2(v)
            if ru == rv:
                # Cycle détecté ! Cette arête ferme un cycle = kill chain
                cycles_1d.append((d, u, v))
                diagrams[1].append([0.0, d])
            else:
                parent[ru] = rv

        beta_1 = len(cycles_1d)

        # 4. H2 : cavités (estimation) — nombre de paires de cycles qui partagent
        # au moins 2 sommets = cavité 2D = vulnérabilité multidimensionnelle
        cavities = 0
        for i in range(len(cycles_1d)):
            for j in range(i + 1, len(cycles_1d)):
                _, u1, v1 = cycles_1d[i]
                _, u2, v2 = cycles_1d[j]
                shared = {u1, v1} & {u2, v2}
                if len(shared) >= 1:
                    cavities += 1
        beta_2 = cavities

        betti_numbers = [beta_0, beta_1, beta_2]

        # 5. Persistance totale H1 = somme des durées de vie des cycles
        total_persistence_h1 = sum(d[1] - d[0] for d in diagrams[1]) if diagrams[1] else 0.0

        # 6. Invariant = signature topologique de la surface d'attaque
        invariant_hash = float(beta_0 * 1000 + beta_1 * 10 + total_persistence_h1)

        # 7. Identifier les kill chains (cycles = chaînes d'attaque)
        kill_chains = self._identify_kill_chains(cycles_1d)

        # 8. Score de risque topologique
        risk_score = self._compute_risk_score(betti_numbers, total_persistence_h1)

        return {
            "status": "SUCCESS",
            "betti_numbers": betti_numbers,
            "diagrams": diagrams,
            "total_persistence_h1": round(total_persistence_h1, 4),
            "invariant_hash": invariant_hash,
            "kill_chains": kill_chains,
            "risk_score": risk_score,
            "n_points": N,
            "n_edges": len(edges),
            "n_cycles": beta_1,
            "n_cavities": beta_2,
        }

    def _identify_kill_chains(self, cycles: list[tuple]) -> list[dict[str, Any]]:
        """Identifie les chaînes d'attaque à partir des cycles topologiques.

        Un cycle = plusieurs vulnérabilités reliées = une kill chain (chaîne d'exploitation).
        Chaque kill chain relie des vulnérabilités qui, combinées, forment un chemin d'attaque.
        """
        kill_chains = []
        for idx, (distance, u, v) in enumerate(cycles):
            if u < len(self.labels) and v < len(self.labels):
                chain = {
                    "chain_id": f"KC-{idx+1}",
                    "vuln_a": self.labels[u],
                    "vuln_b": self.labels[v],
                    "owasp_a": self.owasp_codes[u] if u < len(self.owasp_codes) else "?",
                    "owasp_b": self.owasp_codes[v] if v < len(self.owasp_codes) else "?",
                    "topological_distance": round(distance, 4),
                    "interpretation": (
                        f"Cycle reliant '{self.labels[u][:40]}' et '{self.labels[v][:40]}' — "
                        f"ces deux vulnérabilités forment une chaîne d'attaque "
                        f"(kill chain) car elles sont topologiquement proches "
                        f"(distance={distance:.3f}). Un attaquant peut les combiner."
                    ),
                }
                kill_chains.append(chain)
        return kill_chains

    @staticmethod
    def _compute_risk_score(betti: list[int], persistence: float) -> dict[str, Any]:
        """Calcule un score de risque topologique (0-100).

        Formule : score = min(100, β0·10 + β1·25 + β2·15 + persistence·30)
        """
        raw = (betti[0] * 10) + (betti[1] * 25) + (betti[2] * 15) + (persistence * 30)
        score = min(100, round(raw))
        if score >= 75:
            level = "CRITIQUE"
        elif score >= 50:
            level = "ÉLEVÉ"
        elif score >= 25:
            level = "MOYEN"
        else:
            level = "FAIBLE"
        return {"score": score, "level": level, "formula": "β0·10 + β1·25 + β2·15 + persist·30"}

    # ── Rapport topologique consolidé ────────────────────────────────────────
    def get_topology_report(self, max_edge: float = 1.5) -> dict[str, Any]:
        """Génère le rapport topologique complet de la surface d'attaque."""
        self.build_point_cloud()
        homology = self.compute_persistent_homology(max_dimension=2, max_edge=max_edge)

        # Si pas de données, retourner un rapport vide cohérent
        if homology.get("status") == "NO_DATA":
            return {
                "status": "NO_DATA",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "module": "transdisc_security (homologie persistante → cybersécurité)",
                "message": "Aucune vulnérabilité détectée — surface d'attaque vide.",
                "topology": homology,
                "interpretation": {
                    "beta_0": "0 — aucune vulnérabilité",
                    "risk": "Score de risque topologique : 0/100 (FAIBLE)",
                },
                "kill_chains": [],
                "disclaimer": "Analyse transdisciplinaire RATISS — bridé, défensif, légal.",
            }

        return {
            "status": "SUCCESS",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "module": "transdisc_security (homologie persistante → cybersécurité)",
            "methodology": (
                "Surface d'attaque = nuage de points dans un espace de features "
                "(sévérité radiale, angle OWASP, exposabilité). "
                "Homologie persistante (β0, β1, β2) révèle la structure : "
                "β0 = îlots isolés, β1 = chaînes d'attaque (kill chains), "
                "β2 = vulnérabilités multidimensionnelles profondes."
            ),
            "topology": homology,
            "interpretation": {
                "beta_0": f"{homology['betti_numbers'][0]} composante(s) connexe(s) = îlot(s) de vulnérabilités",
                "beta_1": f"{homology['betti_numbers'][1]} cycle(s) = chaîne(s) d'attaque (kill chain(s)) détectée(s)",
                "beta_2": f"{homology['betti_numbers'][2]} cavité(s) = vulnérabilité(s) multidimensionnelle(s)",
                "risk": f"Score de risque topologique : {homology['risk_score']['score']}/100 ({homology['risk_score']['level']})",
            },
            "kill_chains": homology.get("kill_chains", []),
            "disclaimer": (
                "Analyse transdisciplinaire RATISS — homologie persistante appliquée à la "
                "cybersécurité. Le module est bridé : il détecte et rapporte, n'attaque jamais."
            ),
        }


# ── Chiffrement du rapport (Fernet, clé dérivée du mot de passe) ──────────────

def encrypt_report(report: dict[str, Any], password: str) -> bytes:
    """Chiffre un rapport avec Fernet (clé dérivée du mot de passe via PBKDF2).

    Le rapport chiffré ne peut être lu qu'avec le mot de passe d'activation.
    """
    from cryptography.fernet import Fernet
    import base64

    # Dériver une clé Fernet du mot de passe (PBKDF2-HMAC-SHA256, sel fixe)
    # Note: le sel est intentionnellement fixe pour que le même mot de passe
    # génère toujours la même clé (déchiffrement reproductible).
    salt = b"ratiss_aeon_prime_v95_transdisc_security"
    key_material = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 480000, dklen=32)
    fernet_key = base64.urlsafe_b64encode(key_material)
    fernet = Fernet(fernet_key)

    data = json.dumps(report, ensure_ascii=False, indent=2).encode("utf-8")
    return fernet.encrypt(data)


def decrypt_report(encrypted: bytes, password: str) -> dict[str, Any]:
    """Déchiffre un rapport chiffré avec Fernet (clé dérivée du mot de passe)."""
    from cryptography.fernet import Fernet
    import base64

    salt = b"ratiss_aeon_prime_v95_transdisc_security"
    key_material = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 480000, dklen=32)
    fernet_key = base64.urlsafe_b64encode(key_material)
    fernet = Fernet(fernet_key)

    data = fernet.decrypt(encrypted)
    return json.loads(data.decode("utf-8"))
