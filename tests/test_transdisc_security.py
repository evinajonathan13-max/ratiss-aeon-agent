"""tests/test_transdisc_security.py — Tests de la couche transdisciplinaire.

Valide :
  1. Construction du nuage de points (features par vulnérabilité)
  2. Homologie persistante (β0, β1, β2)
  3. Identification des kill chains
  4. Score de risque topologique
  5. Rapport vide (aucune vulnérabilité)
  6. Chiffrement/déchiffrement Fernet (clé = mot de passe)
"""
import pytest

from security.transdisc_security import (
    AttackSurfaceTopology,
    encrypt_report,
    decrypt_report,
    SEVERITY_RADIUS,
    OWASP_ANGLE,
)


CORRECT_PASSWORD = "Monnamour2008#"


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_findings():
    """5 vulnérabilités de test couvrant plusieurs catégories OWASP."""
    return [
        {"title": "SQL Injection", "severity": "CRITICAL", "owasp": "A03:2021 - Injection",
         "category": "WEB", "target": "http://example.com/search", "evidence": "id=1' OR 1=1--"},
        {"title": "XSS Reflected", "severity": "HIGH", "owasp": "A03:2021 - Injection (XSS)",
         "category": "WEB", "target": "http://example.com/xss", "evidence": "q=<script>"},
        {"title": "Hardcoded Secret", "severity": "CRITICAL", "owasp": "A02:2021 - Cryptographic Failures",
         "category": "SAST", "target": "config.py", "evidence": "password='admin123'"},
        {"title": "Missing HSTS", "severity": "HIGH", "owasp": "A05:2021 - Security Misconfiguration",
         "category": "WEB", "target": "http://example.com", "evidence": "no HSTS header"},
        {"title": "Debug enabled", "severity": "MEDIUM", "owasp": "A05:2021 - Security Misconfiguration",
         "category": "CONFIG", "target": "settings.py", "evidence": "DEBUG=True"},
    ]


# ── 1. Construction du nuage de points ──────────────────────────────────────

class TestPointCloud:
    def test_build_point_cloud(self, sample_findings):
        topo = AttackSurfaceTopology(sample_findings)
        topo.build_point_cloud()
        assert len(topo.points) == 5
        assert len(topo.labels) == 5
        assert len(topo.owasp_codes) == 5
        # Chaque point a 3 coordonnées (x, y, z)
        for pt in topo.points:
            assert len(pt) == 3

    def test_severity_mapping(self):
        """CRITICAL = centre (r=0), INFO = périphérie (r=1)."""
        assert SEVERITY_RADIUS["CRITICAL"] == 0.0
        assert SEVERITY_RADIUS["HIGH"] == 0.25
        assert SEVERITY_RADIUS["INFO"] == 1.0

    def test_owasp_angles_distinct(self):
        """Chaque catégorie OWASP a un angle distinct."""
        angles = list(OWASP_ANGLE.values())
        assert len(angles) == len(set(angles))  # tous différents

    def test_critical_at_center(self, sample_findings):
        """Une vulnérabilité CRITICAL doit être proche du centre (r≈0)."""
        topo = AttackSurfaceTopology([sample_findings[0]])  # SQL Injection CRITICAL
        topo.build_point_cloud()
        x, y, z = topo.points[0]
        r = (x**2 + y**2) ** 0.5
        assert r < 0.1, f"CRITICAL devrait être au centre, r={r}"


# ── 2. Homologie persistante ────────────────────────────────────────────────

class TestPersistentHomology:
    def test_returns_betti_numbers(self, sample_findings):
        topo = AttackSurfaceTopology(sample_findings)
        topo.build_point_cloud()
        result = topo.compute_persistent_homology()
        assert result["status"] == "SUCCESS"
        assert len(result["betti_numbers"]) == 3
        assert all(isinstance(b, int) for b in result["betti_numbers"])

    def test_beta_0_at_least_1(self, sample_findings):
        """Avec des vulnérabilités, β0 ≥ 1 (au moins une composante connexe)."""
        topo = AttackSurfaceTopology(sample_findings)
        topo.build_point_cloud()
        result = topo.compute_persistent_homology()
        assert result["betti_numbers"][0] >= 1

    def test_beta_1_detects_cycles(self, sample_findings):
        """Avec ≥3 vulnérabilités proches, β1 > 0 (au moins un cycle/kill chain)."""
        topo = AttackSurfaceTopology(sample_findings)
        topo.build_point_cloud()
        result = topo.compute_persistent_homology(max_edge=2.0)
        assert result["betti_numbers"][1] > 0, "Devrait détecter au moins 1 kill chain"

    def test_persistence_positive(self, sample_findings):
        topo = AttackSurfaceTopology(sample_findings)
        topo.build_point_cloud()
        result = topo.compute_persistent_homology()
        assert result["total_persistence_h1"] >= 0

    def test_invariant_hash_present(self, sample_findings):
        topo = AttackSurfaceTopology(sample_findings)
        topo.build_point_cloud()
        result = topo.compute_persistent_homology()
        assert "invariant_hash" in result
        assert isinstance(result["invariant_hash"], float)


# ── 3. Kill chains ──────────────────────────────────────────────────────────

class TestKillChains:
    def test_kill_chains_listed(self, sample_findings):
        topo = AttackSurfaceTopology(sample_findings)
        topo.build_point_cloud()
        result = topo.compute_persistent_homology(max_edge=2.0)
        chains = result.get("kill_chains", [])
        assert len(chains) == result["betti_numbers"][1]
        for kc in chains:
            assert "chain_id" in kc
            assert "vuln_a" in kc
            assert "vuln_b" in kc
            assert "topological_distance" in kc
            assert "interpretation" in kc

    def test_kill_chain_references_valid_vulns(self, sample_findings):
        """Chaque kill chain référence des vulnérabilités réelles."""
        topo = AttackSurfaceTopology(sample_findings)
        topo.build_point_cloud()
        result = topo.compute_persistent_homology(max_edge=2.0)
        titles = [f["title"] for f in sample_findings]
        for kc in result.get("kill_chains", []):
            assert kc["vuln_a"] in titles
            assert kc["vuln_b"] in titles


# ── 4. Score de risque ──────────────────────────────────────────────────────

class TestRiskScore:
    def test_risk_score_in_range(self, sample_findings):
        topo = AttackSurfaceTopology(sample_findings)
        topo.build_point_cloud()
        result = topo.compute_persistent_homology(max_edge=2.0)
        score = result["risk_score"]["score"]
        assert 0 <= score <= 100
        assert result["risk_score"]["level"] in ("CRITIQUE", "ÉLEVÉ", "MOYEN", "FAIBLE")


# ── 5. Rapport vide ─────────────────────────────────────────────────────────

class TestEmptyReport:
    def test_no_findings_returns_no_data(self):
        topo = AttackSurfaceTopology([])
        report = topo.get_topology_report()
        assert report["status"] == "NO_DATA"
        assert report["topology"]["betti_numbers"] == [0, 0, 0]

    def test_empty_report_no_kill_chains(self):
        topo = AttackSurfaceTopology([])
        report = topo.get_topology_report()
        assert report["kill_chains"] == []


# ── 6. Chiffrement / déchiffrement ──────────────────────────────────────────

class TestEncryption:
    def test_encrypt_decrypt_roundtrip(self, sample_findings):
        topo = AttackSurfaceTopology(sample_findings)
        report = topo.get_topology_report()
        enc = encrypt_report(report, CORRECT_PASSWORD)
        dec = decrypt_report(enc, CORRECT_PASSWORD)
        assert dec["status"] == report["status"]
        assert dec["topology"]["betti_numbers"] == report["topology"]["betti_numbers"]

    def test_wrong_password_fails(self, sample_findings):
        topo = AttackSurfaceTopology(sample_findings)
        report = topo.get_topology_report()
        enc = encrypt_report(report, CORRECT_PASSWORD)
        from cryptography.fernet import InvalidToken
        with pytest.raises(InvalidToken):
            decrypt_report(enc, "mauvais_mot_de_passe")

    def test_empty_password_fails(self, sample_findings):
        topo = AttackSurfaceTopology(sample_findings)
        report = topo.get_topology_report()
        enc = encrypt_report(report, CORRECT_PASSWORD)
        from cryptography.fernet import InvalidToken
        with pytest.raises(InvalidToken):
            decrypt_report(enc, "")

    def test_encrypted_data_is_binary(self, sample_findings):
        topo = AttackSurfaceTopology(sample_findings)
        report = topo.get_topology_report()
        enc = encrypt_report(report, CORRECT_PASSWORD)
        assert isinstance(enc, bytes)
        assert enc.startswith(b"gAAAA")  # préfixe Fernet

    def test_different_passwords_produce_different_keys(self, sample_findings):
        """Le rapport chiffré avec mdp A ne se déchiffre pas avec mdp B."""
        topo = AttackSurfaceTopology(sample_findings)
        report = topo.get_topology_report()
        enc = encrypt_report(report, CORRECT_PASSWORD)
        from cryptography.fernet import InvalidToken
        with pytest.raises(InvalidToken):
            decrypt_report(enc, "OtherPassword123!")
