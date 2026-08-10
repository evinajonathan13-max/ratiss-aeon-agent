"""tests/test_vuln_scanner.py — Tests du module de scan de vulnérabilités DÉFENSIF.

Valide :
  1. Bridage architectural (exploit/attaque TOUJOURS refusés)
  2. Authentification requise (scan sans auth = PermissionError)
  3. Authentification (bon mot de passe accepté, mauvais refusé)
  4. Scans défensifs (SAST, config, réseau, web)
  5. Rapport consolidé
  6. Déduplication des findings
"""
import json
import tempfile
from pathlib import Path

import pytest

from security.vuln_auth import authenticate, revoke, is_authenticated
from security.vuln_scanner import VulnerabilityScanner, ATTACK_ACTIONS_FORBIDDEN


CORRECT_PASSWORD = "Monnamour2008#"


@pytest.fixture(autouse=True)
def _reset_auth():
    """Révoque l'auth avant ET après chaque test pour l'isolation."""
    revoke()
    yield
    revoke()


# ── 1. Bridage architectural ────────────────────────────────────────────────

class TestBridage:
    """Le scanner est bridé : il ne peut JAMAIS attaquer."""

    def test_execute_attack_always_raises(self):
        """execute_attack doit TOUJOURS lever RuntimeError, peu importe les arguments."""
        scanner = VulnerabilityScanner()
        with pytest.raises(RuntimeError, match="ACTION_OFFENSIVE_INTERDITE"):
            scanner.execute_attack()

    def test_execute_attack_with_args_raises(self):
        """execute_attack refuse même avec des arguments 'plausibles'."""
        scanner = VulnerabilityScanner()
        with pytest.raises(RuntimeError, match="ACTION_OFFENSIVE_INTERDITE"):
            scanner.execute_attack("sqli", target="http://example.com", payload="' OR 1=1--")

    @pytest.mark.parametrize("action", sorted(ATTACK_ACTIONS_FORBIDDEN))
    def test_all_forbidden_actions_blocked(self, action):
        """Chaque action de la liste interdite doit lever RuntimeError."""
        with pytest.raises(RuntimeError, match="ACTION_OFFENSIVE_INTERDITE"):
            VulnerabilityScanner._check_action_allowed(action)

    def test_defensive_actions_allowed(self):
        """Les actions défensives (scan, audit, report) ne sont pas bloquées."""
        # Ces noms ne contiennent aucun mot-clé interdit
        for safe_action in ["scan", "audit", "report", "detect", "read", "list"]:
            # Ne doit PAS lever d'exception
            VulnerabilityScanner._check_action_allowed(safe_action)


# ── 2. Authentification requise ─────────────────────────────────────────────

class TestAuthRequired:
    """Le scanner nécessite une authentification préalable."""

    def test_scan_network_requires_auth(self):
        scanner = VulnerabilityScanner()
        with pytest.raises(PermissionError, match="non authentifié"):
            scanner.scan_network("localhost", [80])

    def test_audit_web_requires_auth(self):
        scanner = VulnerabilityScanner()
        with pytest.raises(PermissionError, match="non authentifié"):
            scanner.audit_web("https://example.com")

    def test_audit_code_requires_auth(self):
        scanner = VulnerabilityScanner()
        with pytest.raises(PermissionError, match="non authentifié"):
            scanner.audit_code(".")

    def test_audit_config_requires_auth(self):
        scanner = VulnerabilityScanner()
        with pytest.raises(PermissionError, match="non authentifié"):
            scanner.audit_config(".")

    def test_get_report_requires_auth(self):
        scanner = VulnerabilityScanner()
        with pytest.raises(PermissionError, match="non authentifié"):
            scanner.get_report()


# ── 3. Authentification ─────────────────────────────────────────────────────

class TestAuthentication:
    """L'authentification vérifie le mot de passe haché PBKDF2."""

    def test_correct_password_accepted(self):
        result = authenticate(CORRECT_PASSWORD)
        assert result["status"] == "success"
        assert result["authenticated"] is True
        assert is_authenticated() is True

    def test_wrong_password_rejected(self):
        result = authenticate("mauvais_mot_de_passe")
        assert result["status"] == "denied"
        assert result["authenticated"] is False
        assert is_authenticated() is False

    def test_empty_password_rejected(self):
        result = authenticate("")
        assert result["status"] == "denied"
        assert result["authenticated"] is False

    def test_none_password_rejected(self):
        result = authenticate(None)  # type: ignore[arg-type]
        assert result["status"] == "denied"

    def test_revoke_clears_auth(self):
        authenticate(CORRECT_PASSWORD)
        assert is_authenticated() is True
        revoke()
        assert is_authenticated() is False


# ── 4. Scans défensifs ──────────────────────────────────────────────────────

class TestSASTScan:
    """SAST : analyse statique de code source (après auth)."""

    @pytest.fixture(autouse=True)
    def _auth(self):
        authenticate(CORRECT_PASSWORD)

    def test_detects_sql_injection(self, tmp_path):
        f = tmp_path / "app.py"
        f.write_text('query = "SELECT * FROM users WHERE id = " + user_id\n')
        scanner = VulnerabilityScanner()
        scanner.audit_code(str(tmp_path))
        assert any("SQL" in f["title"] for f in scanner.findings)

    def test_detects_hardcoded_secret(self, tmp_path):
        f = tmp_path / "app.py"
        f.write_text('api_key = "sk-1234567890abcdefghijklmnopqrstuvwxyz"\n')
        scanner = VulnerabilityScanner()
        scanner.audit_code(str(tmp_path))
        assert any("SECRET" in f["title"].upper() for f in scanner.findings)

    def test_detects_eval(self, tmp_path):
        f = tmp_path / "app.py"
        f.write_text('eval(request.GET.get("code"))\n')
        scanner = VulnerabilityScanner()
        scanner.audit_code(str(tmp_path))
        titles = [f["title"].upper() for f in scanner.findings]
        assert any("DESERIALIZATION" in t or "FUNCTIONS" in t for t in titles)

    def test_detects_insecure_crypto(self, tmp_path):
        f = tmp_path / "app.py"
        f.write_text('import hashlib\nh = hashlib.md5(b"password")\n')
        scanner = VulnerabilityScanner()
        scanner.audit_code(str(tmp_path))
        assert any("CRYPTO" in f["title"].upper() for f in scanner.findings)

    def test_clean_code_no_findings(self, tmp_path):
        f = tmp_path / "safe.py"
        f.write_text('def add(a, b):\n    return a + b\n')
        scanner = VulnerabilityScanner()
        scanner.audit_code(str(tmp_path))
        assert len(scanner.findings) == 0

    def test_deduplication(self, tmp_path):
        """Le même pattern détecté deux fois ne doit apparaître qu'une fois."""
        f = tmp_path / "app.py"
        f.write_text('eval("1+1")\neval("2+2")\n')
        scanner = VulnerabilityScanner()
        scanner.audit_code(str(tmp_path))
        # eval() matche INSECURE_DESERIALIZATION et INSECURE_FUNCTIONS
        # mais chaque ligne unique ne doit apparaître qu'une fois par catégorie
        eval_findings = [f for f in scanner.findings if "eval" in f["evidence"].lower()]
        # Au moins 2 (deux lignes différentes), mais pas de doublons exacts
        evidence_set = {f["evidence"] for f in eval_findings}
        assert len(evidence_set) == len(eval_findings), "Doublons détectés"


class TestConfigAudit:
    """Audit config : fichiers sensibles exposés (après auth)."""

    @pytest.fixture(autouse=True)
    def _auth(self):
        authenticate(CORRECT_PASSWORD)

    def test_detects_env_file(self, tmp_path):
        (tmp_path / ".env").write_text("SECRET_KEY=super_secret")
        scanner = VulnerabilityScanner()
        scanner.audit_config(str(tmp_path))
        assert any(".env" in f["target"] for f in scanner.findings)

    def test_detects_private_key(self, tmp_path):
        (tmp_path / "id_rsa").write_text("-----BEGIN RSA PRIVATE KEY-----")
        scanner = VulnerabilityScanner()
        scanner.audit_config(str(tmp_path))
        assert any("id_rsa" in f["target"] or "RSA" in f["title"] for f in scanner.findings)

    def test_clean_dir_no_findings(self, tmp_path):
        (tmp_path / "readme.txt").write_text("hello")
        scanner = VulnerabilityScanner()
        scanner.audit_config(str(tmp_path))
        assert len(scanner.findings) == 0


class TestNetworkScan:
    """Scan réseau défensif (après auth)."""

    @pytest.fixture(autouse=True)
    def _auth(self):
        authenticate(CORRECT_PASSWORD)

    def test_localhost_scan_returns_dict(self):
        scanner = VulnerabilityScanner()
        result = scanner.scan_network("localhost", [80, 443], timeout=1.0)
        assert result["status"] == "SUCCESS"
        assert "ports_scanned" in result
        assert result["ports_scanned"] == 2

    def test_invalid_host_returns_error(self):
        scanner = VulnerabilityScanner()
        result = scanner.scan_network("this-host-does-not-exist.invalid", [80])
        assert result["status"] == "ERROR"


# ── 5. Rapport consolidé ─────────────────────────────────────────────────────

class TestReport:
    """Le rapport consolidé agrège tous les findings (après auth)."""

    @pytest.fixture(autouse=True)
    def _auth(self):
        authenticate(CORRECT_PASSWORD)

    def test_report_structure(self, tmp_path):
        f = tmp_path / "app.py"
        f.write_text('api_key = "sk-1234567890abcdefghijklmnopqrstuvwxyz"\n')
        scanner = VulnerabilityScanner()
        scanner.audit_code(str(tmp_path))
        report = scanner.get_report()
        assert "scan_id" in report
        assert "total_findings" in report
        assert "severity_counts" in report
        assert "findings" in report
        assert "disclaimer" in report
        assert report["total_findings"] == len(report["findings"])

    def test_severity_counts(self, tmp_path):
        f = tmp_path / "app.py"
        f.write_text(
            'api_key = "sk-1234567890abcdefghijklmnopqrstuvwxyz"\n'
            'query = "SELECT * FROM users WHERE id = " + user_id\n'
        )
        scanner = VulnerabilityScanner()
        scanner.audit_code(str(tmp_path))
        report = scanner.get_report()
        counts = report["severity_counts"]
        assert counts["CRITICAL"] >= 1  # hardcoded secret
        assert counts["HIGH"] >= 1  # SQL injection
        assert sum(counts.values()) == report["total_findings"]

    def test_report_json_serializable(self, tmp_path):
        scanner = VulnerabilityScanner()
        scanner.audit_code(str(tmp_path))
        json_str = scanner.get_report_json()
        parsed = json.loads(json_str)
        assert "findings" in parsed

    def test_disclaimer_in_report(self):
        scanner = VulnerabilityScanner()
        report = scanner.get_report()
        assert "DÉFENSIF" in report["disclaimer"] or "DEFENSIF" in report["disclaimer"].upper()
        assert "bridé" in report["disclaimer"].lower()
