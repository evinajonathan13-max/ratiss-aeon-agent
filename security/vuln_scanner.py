"""security/vuln_scanner.py — Module de scan de vulnérabilités DÉFENSIF et BRIDÉ.

⚠️  AVERTISSEMENT LÉGAL ET ÉTHIQUE ⚠️

Ce module est conçu UNIQUEMENT pour l'audit de sécurité DÉFENSIF et LÉGAL :
  - Scan de systèmes dont vous êtes propriétaire, OU
  - Scan de systèmes avec autorisation explicite et écrite du propriétaire, OU
  - Scan de systèmes dans le cadre d'un contrat d'audit (bug bounty, pentest autorisé).

L'opérateur souverain (Jonathan Evina, instance JohnKing0) engage sa responsabilité
sur l'usage légal de cet outil. Au Cameroun comme ailleurs, scanner sans autorisation
un système qui ne vous appartient pas est un délit (loi n° 2010/013 sur la cybersécurité
au Cameroun, Articles 78-80 ; Convention de Budapest sur la cybercriminalité).

⚠️  BRIDAGE ARCHITECTURAL ⚠️

Ce module est BRIDÉ par construction. Il ne peut QUE :
  - Détecter (ports ouverts, versions de services, headers manquants)
  - Lire (bannières de services, réponses HTTP, code source local)
  - Rapporter (générer un rapport de vulnérabilités)

Il NE PEUT PAS :
  - Envoyer des payloads d'exploitation (SQLi, XSS, RCE, buffer overflow)
  - Effectuer du brute-force de mots de passe
  - Installer des backdoors ou reverse shells
  - Modifier, supprimer ou altérer la cible
  - Télécharger et exécuter des exploits (Metasploit-like)

Toute tentative d'appeler une action offensive lève RuntimeError("ACTION_OFFENSIVE_INTERDITE").
"""
from __future__ import annotations

import re
import json
import socket
import ssl
import hashlib
import logging
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any
from datetime import datetime, timezone

from security import vuln_auth

logger = logging.getLogger("RATISS-VULN-SCANNER")

# ── Liste des actions offensives INTERDITES (bridage architectural) ──────────
# Ces actions sont refusées SYSTÉMATIQUEMENT, peu importe le contexte.
ATTACK_ACTIONS_FORBIDDEN = {
    # Exploitation
    "exploit", "exploit_run", "metasploit", "msfconsole", "payload_send",
    "payload_generate", "shellcode", "inject", "sqli_exploit", "xss_exploit",
    "rce_exploit", "buffer_overflow", "format_string",
    # Accès / persistance
    "backdoor", "reverse_shell", "bind_shell", "webshell", "rootkit",
    "persistence", "lateral_movement", "privilege_escalation", "privesc",
    # Force brute / cassage
    "brute_force", "bruteforce", "password_crack", "hash_crack", "wordlist_attack",
    # Modification / destruction
    "deface", "drop_database", "delete", "rm_rf", "truncate", "alter",
    # Évasion / exfiltration
    "data_exfiltration", "exfiltrate", "covert_channel", "dns_tunneling",
    # Dénial de service
    "dos", "ddos", "syn_flood", "slowloris",
}

# ── Signatures de détection (lecture seule, défensive) ──────────────────────
# Patterns de code dangereux pour le SAST (Static Application Security Testing)
SAST_PATTERNS: dict[str, dict[str, Any]] = {
    "SQL_INJECTION": {
        "severity": "HIGH",
        "patterns": [
            r'execute\s*\(\s*["\']SELECT.*\+.*["\']',  # Concatenation SQL
            r'execute\s*\(\s*f["\']SELECT.*\{.*\}',    # f-string SQL
            r'execute\s*\(\s*["\']SELECT.*%s.*%.*\)',  # % formatting SQL
            r'cursor\.execute\s*\(\s*["\'].*\+.*str\(',
            r'["\']SELECT.*WHERE.*=\s*["\']\s*\+',  # "SELECT ... WHERE x = " +
            r'["\']SELECT.*\+\s*\w+',  # "SELECT ..." + variable
            r'["\']INSERT INTO.*\+\s*\w+',  # INSERT concat
            r'["\']DELETE FROM.*\+\s*\w+',  # DELETE concat
        ],
        "owasp": "A03:2021 - Injection",
        "fix": "Utiliser des requêtes paramétrées (placeholders ? ou :name), jamais de concaténation.",
    },
    "XSS_REFLECTED": {
        "severity": "HIGH",
        "patterns": [
            r'innerHTML\s*=\s*.*request\.',  # innerHTML depuis input
            r'document\.write\s*\(.*request\.',
            r'\|\s*safe\b',  # Django |safe (désactive l'échappement)
            r'<%=.*request\..*%>',  # EJS/ERB non échappé
        ],
        "owasp": "A03:2021 - Injection (XSS)",
        "fix": "Échapper systématiquement la sortie. Jamais de innerHTML avec des données utilisateur.",
    },
    "HARDCODED_SECRET": {
        "severity": "CRITICAL",
        "patterns": [
            r'(?i)(api[_-]?key|secret|password|passwd|token|passwd)\s*=\s*["\'][A-Za-z0-9+/=_-]{12,}["\']',
            r'(?i)AKIA[0-9A-Z]{16}',  # AWS Access Key
            r'-----BEGIN (RSA |EC )?PRIVATE KEY-----',
            r'(?i)sk-[A-Za-z0-9]{20,}',  # OpenAI / générique
            r'(?i)ghp_[A-Za-z0-9]{36}',  # GitHub PAT
            r'(?i)password\s*=\s*["\'][^"\']{8,}["\']',  # password = "toto1234"
        ],
        "owasp": "A02:2021 - Cryptographic Failures (hardcoded secrets)",
        "fix": "Stockage dans des variables d'environnement ou un vault (api_vault). Jamais dans le code source.",
    },
    "INSECURE_DESERIALIZATION": {
        "severity": "CRITICAL",
        "patterns": [
            r'pickle\.loads?\s*\(',
            r'yaml\.load\s*\(.*[^,]',  # sans Loader=SafeLoader
            r'marshal\.loads?\s*\(',
            r'eval\s*\(\s*.*request\.',
            r'exec\s*\(\s*.*request\.',
        ],
        "owasp": "A08:2021 - Software and Data Integrity Failures",
        "fix": "Utiliser json.load() au lieu de pickle/yaml.load sans SafeLoader. Jamais eval/exec sur des données externes.",
    },
    "PATH_TRAVERSAL": {
        "severity": "HIGH",
        "patterns": [
            r'open\s*\(\s*.*request\..*\.\.',  # open avec ../
            r'\.\./\.\./\.\.',  # ../ séquences
            r'subprocess\..*shell\s*=\s*True',
            r'os\.system\s*\(.*request\.',
        ],
        "owasp": "A01:2021 - Broken Access Control (Path Traversal)",
        "fix": "Valider et nettoyer les chemins. Utiliser os.path.basename() et restreindre à un répertoire racine.",
    },
    "INSECURE_FUNCTIONS": {
        "severity": "MEDIUM",
        "patterns": [
            r'\beval\s*\(',
            r'\bexec\s*\(',
            r'os\.system\s*\(',
            r'subprocess\.call\s*\(.*shell\s*=\s*True',
            r'tempfile\.mktemp\s*\(',  # Race condition
            r'random\.random\s*\(\s*\)',  # PRNG non cryptographique
        ],
        "owasp": "A08:2021 - Software and Data Integrity Failures",
        "fix": "Remplacer eval/exec par des alternatives sûres. Utiliser secrets.token_* pour le crypto.",
    },
    "INSECURE_CRYPTO": {
        "severity": "MEDIUM",
        "patterns": [
            r'hashlib\.md5\s*\(',
            r'hashlib\.sha1\s*\(',
            r'(?i)DES\b.*encrypt',
            r'ECB\b',
        ],
        "owasp": "A02:2021 - Cryptographic Failures",
        "fix": "MD5/SHA1 sont cassés. Utiliser SHA-256+ avec sel (PBKDF2) pour les mots de passe, AES-GCM pour le chiffrement.",
    },
    "DEBUG_ENABLED": {
        "severity": "MEDIUM",
        "patterns": [
            r'(?i)app\.run\s*\(.*debug\s*=\s*True',
            r'(?i)DEBUG\s*=\s*True',
            r'(?i)ALLOWED_HOSTS\s*=\s*\[\s*["\']\*["\']',
        ],
        "owasp": "A05:2021 - Security Misconfiguration",
        "fix": "Désactiver DEBUG en production. ALLOWED_HOSTS ne doit jamais contenir '*'.",
    },
}

# ── Headers HTTP de sécurité attendus ────────────────────────────────────────
SECURITY_HEADERS = {
    "strict-transport-security": {"expected": True, "severity": "HIGH", "fix": "Ajouter Strict-Transport-Security: max-age=31536000; includeSubDomains"},
    "content-security-policy": {"expected": True, "severity": "HIGH", "fix": "Définir une CSP restrictive (default-src 'self')"},
    "x-frame-options": {"expected": True, "severity": "MEDIUM", "fix": "Ajouter X-Frame-Options: DENY ou SAMEORIGIN (anti clickjacking)"},
    "x-content-type-options": {"expected": True, "severity": "MEDIUM", "fix": "Ajouter X-Content-Type-Options: nosniff"},
    "x-xss-protection": {"expected": False, "severity": "LOW", "fix": "X-XSS-Protection est déprécié, mais 1; mode=block reste un filet (legacy browsers)"},
    "referrer-policy": {"expected": True, "severity": "LOW", "fix": "Ajouter Referrer-Policy: no-referrer ou strict-origin-when-cross-origin"},
    "permissions-policy": {"expected": True, "severity": "LOW", "fix": "Définir Permissions-Policy pour restreindre les API navigateur"},
}


class VulnerabilityScanner:
    """Scanner de vulnérabilités DÉFENSIF et BRIDÉ.

    ⚠️  Ce scanner ne peut QUE détecter et rapporter. Il NE PEUT PAS exploiter.
    """

    # ── BRIDAGE : vérification que l'action n'est pas dans la liste interdite ──
    @staticmethod
    def _check_action_allowed(action: str) -> None:
        """Vérifie qu'une action n'est pas offensive. Lève RuntimeError si interdite."""
        action_lower = action.lower().strip()
        for forbidden in ATTACK_ACTIONS_FORBIDDEN:
            if forbidden in action_lower:
                raise RuntimeError(
                    f"ACTION_OFFENSIVE_INTERDITE: '{action}' est une action d'exploitation. "
                    f"Ce module est bridé : il détecte et rapporte uniquement. "
                    f"Il ne peut PAS attaquer, exploiter, brute-forcer, installer de backdoor "
                    f"ou exécuter de payload. Usage défensif et légal uniquement."
                )

    def __init__(self) -> None:
        self.findings: list[dict[str, Any]] = []
        self.scan_id = hashlib.sha256(
            f"vuln_scan_{datetime.now(timezone.utc).isoformat()}".encode()
        ).hexdigest()[:16]

    def _add_finding(self, category: str, severity: str, title: str, description: str,
                     evidence: str, owasp: str, fix: str, target: str = "") -> None:
        """Ajoute une vulnérabilité détectée au rapport (avec déduplication)."""
        # Déduplication : éviter les doublons (même category + evidence)
        dedup_key = (category, evidence)
        if any((f["category"], f["evidence"]) == dedup_key for f in self.findings):
            return
        self.findings.append({
            "scan_id": self.scan_id,
            "category": category,
            "severity": severity,
            "title": title,
            "description": description,
            "evidence": evidence[:500],  # Limiter la taille de la preuve
            "owasp": owasp,
            "fix": fix,
            "target": target,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    # ── SCAN RÉSEAU : détection de ports ouverts (TCP connect, passif) ─────────
    def scan_network(self, host: str, ports: list[int] | None = None,
                     timeout: float = 2.0) -> dict[str, Any]:
        """Scan réseau DÉFENSIF : détection de ports ouverts via TCP connect.

        Utilise socket.connect() (poignée de main TCP complète), pas de SYN stealth.
        Ne tente PAS de brute-force ni d'exploitation. Lit uniquement la bannière si
        le service en envoie une spontanément (passive fingerprinting).
        """
        vuln_auth.require_auth()

        if not host or not isinstance(host, str):
            return {"status": "ERROR", "message": "Hôte requis."}

        # Validation : empêcher le scan de réseaux sensibles sans autorisation
        # (l'opérateur est responsable de l'autorisation légale)
        if not self._is_valid_host(host):
            return {"status": "ERROR", "message": f"Hôte invalide ou non résolvable: {host}"}

        default_ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445,
                         993, 995, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443]
        scan_ports = ports if ports else default_ports

        results = []
        for port in scan_ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((host, port))
                if result == 0:
                    # Port ouvert — tentative de lecture de bannière (passive)
                    banner = ""
                    try:
                        sock.settimeout(1.5)
                        banner = sock.recv(1024).decode("utf-8", errors="replace").strip()[:200]
                    except (socket.timeout, ConnectionError, OSError):
                        banner = "(pas de bannière spontanée)"
                    results.append({"port": port, "state": "open", "banner": banner})
                    # Détection de services non sécurisés
                    self._check_insecure_service(port, banner, host)
                sock.close()
            except (socket.gaierror, socket.timeout, OSError):
                continue

        return {
            "status": "SUCCESS",
            "scan_id": self.scan_id,
            "host": host,
            "ports_scanned": len(scan_ports),
            "ports_open": len([r for r in results if r["state"] == "open"]),
            "results": results,
        }

    def _check_insecure_service(self, port: int, banner: str, host: str) -> None:
        """Détecte les services non sécurisés d'après le port et la bannière."""
        insecure_services = {
            21: ("FTP non chiffré", "MEDIUM", "FTP transmet les identifiants en clair. Utiliser SFTP/FTPS."),
            23: ("Telnet non chiffré", "HIGH", "Telnet transmet tout en clair. Utiliser SSH."),
            25: ("SMTP sans TLS", "MEDIUM", "Vérifier STARTTLS. Le SMTP sans TLS expose les emails."),
            143: ("IMAP sans TLS", "MEDIUM", "Vérifier IMAPS (port 993) avec TLS."),
            3389: ("RDP exposé", "HIGH", "RDP exposé à Internet = cible privilégiée. Restreindre par VPN/firewall."),
            445: ("SMB exposé", "HIGH", "SMB exposé = vecteur ransomware (WannaCry). Restreindre l'accès."),
            6379: ("Redis sans auth", "CRITICAL", "Redis sans mot de passe = accès total. Activer requirepass."),
        }
        if port in insecure_services:
            title, sev, fix = insecure_services[port]
            self._add_finding(
                category="NETWORK", severity=sev, title=title,
                description=f"Port {port} ouvert sur {host}",
                evidence=f"Banner: {banner[:100]}", owasp="A05:2021 - Security Misconfiguration",
                fix=fix, target=f"{host}:{port}"
            )
        # Détection de versions vulnérables dans la bannière
        if banner and ("vsftpd 2.3.4" in banner.lower()):
            self._add_finding(
                category="NETWORK", severity="CRITICAL", title="vsftpd 2.3.4 backdoor (CVE-2011-2523)",
                description="vsftpd 2.3.4 contient une backdoor connue permettant l'exécution de code.",
                evidence=banner[:100], owasp="A06:2021 - Vulnerable Components",
                fix="Mettre à jour vsftpd immédiatement. CVE-2011-2523.", target=f"{host}:{port}"
            )
        if banner and ("openssh" in banner.lower() and any(v in banner for v in ["5.", "6.0", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6"])):
            self._add_finding(
                category="NETWORK", severity="HIGH", title="Version OpenSSH ancienne",
                description="OpenSSH < 7.0 a plusieurs vulnérabilités connues.",
                evidence=banner[:100], owasp="A06:2021 - Vulnerable Components",
                fix="Mettre à jour OpenSSH >= 9.0.", target=f"{host}:{port}"
            )

    @staticmethod
    def _is_valid_host(host: str) -> bool:
        """Valide qu'un hôte est résolvable (DNS) ou une IP valide."""
        try:
            socket.getaddrinfo(host, None)
            return True
        except socket.gaierror:
            return False

    # ── AUDIT WEB : headers de sécurité, TLS, cookies ─────────────────────────
    def audit_web(self, url: str, timeout: float = 10.0) -> dict[str, Any]:
        """Audit web DÉFENSIF : analyse des headers de sécurité et de la configuration TLS.

        Effectue une requête GET en lecture seule. Ne tente PAS d'injection XSS/SQLi,
        pas de fuzzing de paramètres, pas de brute-force de répertoires.
        """
        vuln_auth.require_auth()

        if not url or not isinstance(url, str):
            return {"status": "ERROR", "message": "URL requise."}
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        parsed = urllib.parse.urlparse(url)
        if not parsed.hostname:
            return {"status": "ERROR", "message": "URL invalide."}

        results: dict[str, Any] = {"url": url, "headers": {}, "tls": {}, "findings": []}

        # 1. Requête HTTP GET (lecture seule)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "RATISS-VulnScanner/9.4.1 (defensive audit)"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                response_headers = {k.lower(): v for k, v in resp.headers.items()}
                results["headers"] = response_headers
                results["status_code"] = resp.status
        except urllib.error.HTTPError as e:
            response_headers = {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
            results["headers"] = response_headers
            results["status_code"] = e.code
            self._add_finding(
                category="WEB", severity="LOW", title=f"HTTP {e.code} sur {url}",
                description=f"Le serveur retourne {e.code}.",
                evidence=f"HTTP {e.code}", owasp="A05:2021 - Security Misconfiguration",
                fix="Vérifier la gestion d'erreurs (ne pas exposer de stack trace).", target=url
            )
        except urllib.error.URLError as e:
            return {"status": "ERROR", "message": f"Connexion impossible: {e.reason}"}
        except Exception as e:
            return {"status": "ERROR", "message": f"Erreur: {e}"}

        # 2. Analyse des headers de sécurité
        for header, config in SECURITY_HEADERS.items():
            present = header in response_headers
            if config["expected"] and not present:
                self._add_finding(
                    category="WEB", severity=config["severity"],
                    title=f"Header de sécurité manquant: {header}",
                    description=f"Le header '{header}' n'est pas présent.",
                    evidence=f"Absence de {header}", owasp="A05:2021 - Security Misconfiguration",
                    fix=config["fix"], target=url
                )

        # 3. Détection de fuite d'informations dans les headers
        server_header = response_headers.get("server", "")
        if server_header:
            self._add_finding(
                category="WEB", severity="LOW", title="Header Server expose la version",
                description=f"Server: {server_header} — révèle la techno et sa version.",
                evidence=f"Server: {server_header}", owasp="A05:2021 - Security Misconfiguration",
                fix="Masquer ou anonymiser le header Server.", target=url
            )
        x_powered = response_headers.get("x-powered-by", "")
        if x_powered:
            self._add_finding(
                category="WEB", severity="LOW", title="Header X-Powered-By expose la techno",
                description=f"X-Powered-By: {x_powered} — révèle le langage/framework.",
                evidence=f"X-Powered-By: {x_powered}", owasp="A05:2021 - Security Misconfiguration",
                fix="Supprimer le header X-Powered-By.", target=url
            )

        # 4. Analyse TLS (si HTTPS)
        if url.startswith("https://"):
            tls_info = self._check_tls(parsed.hostname, parsed.port or 443)
            results["tls"] = tls_info

        return {"status": "SUCCESS", "scan_id": self.scan_id, "results": results}

    def _check_tls(self, hostname: str, port: int = 443) -> dict[str, Any]:
        """Vérifie la configuration TLS (lecture seule, connexion passif)."""
        tls_info: dict[str, Any] = {}
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=5) as sock:
                with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    tls_info["version"] = ssock.version()
                    tls_info["cipher"] = ssock.cipher()
                    if cert:
                        not_after = cert.get("notAfter", "")
                        tls_info["cert_expires"] = not_after
                        # Vérifier l'expiration
                        if not_after:
                            try:
                                exp_date = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
                                days_left = (exp_date - datetime.utcnow()).days
                                tls_info["days_until_expiry"] = days_left
                                if days_left < 0:
                                    self._add_finding(
                                        category="WEB", severity="CRITICAL", title="Certificat TLS expiré",
                                        description=f"Le certificat a expiré le {not_after}.",
                                        evidence=f"notAfter: {not_after}", owasp="A02:2021 - Cryptographic Failures",
                                        fix="Renouveler le certificat immédiatement.", target=f"{hostname}:{port}"
                                    )
                                elif days_left < 30:
                                    self._add_finding(
                                        category="WEB", severity="MEDIUM", title="Certificat TLS expirant bientôt",
                                        description=f"Le certificat expire dans {days_left} jours ({not_after}).",
                                        evidence=f"notAfter: {not_after}", owasp="A02:2021 - Cryptographic Failures",
                                        fix="Renouveler le certificat avant expiration.", target=f"{hostname}:{port}"
                                    )
                            except (ValueError, TypeError):
                                pass
        except ssl.SSLCertVerificationError as e:
            self._add_finding(
                category="WEB", severity="HIGH", title="Certificat TLS invalide",
                description=f"Le certificat ne peut pas être vérifié: {e.verify_message}",
                evidence=str(e), owasp="A02:2021 - Cryptographic Failures",
                fix="Installer un certificat valide signé par une CA reconnue.", target=f"{hostname}:{port}"
            )
        except Exception as e:
            tls_info["error"] = str(e)
            self._add_finding(
                category="WEB", severity="MEDIUM", title="TLS non vérifiable",
                description=f"Impossible d'établir une connexion TLS: {e}",
                evidence=str(e), owasp="A02:2021 - Cryptographic Failures",
                fix="Vérifier la configuration TLS du serveur.", target=f"{hostname}:{port}"
            )
        return tls_info

    # ── SAST : analyse statique de code source (lecture locale) ──────────────
    def audit_code(self, path: str, extensions: list[str] | None = None) -> dict[str, Any]:
        """Audit SAST : analyse statique de code source pour patterns vulnérables.

        Lit les fichiers locaux et recherche des patterns dangereux (SQLi, XSS,
        secrets codés en dur, crypto faible, etc.). Ne MODIFIE JAMAIS les fichiers.
        """
        vuln_auth.require_auth()

        root = Path(path)
        if not root.exists():
            return {"status": "ERROR", "message": f"Chemin introuvable: {path}"}

        default_exts = [".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".php", ".rb", ".go", ".html", ".vue"]
        scan_exts = set(extensions) if extensions else set(default_exts)

        files_scanned = 0
        lines_scanned = 0

        # Si c'est un fichier unique
        if root.is_file():
            files_to_scan = [root]
        else:
            files_to_scan = []
            for ext in scan_exts:
                files_to_scan.extend(root.rglob(f"*{ext}"))
            # Filtrer : ignorer les répertoires communs (node_modules, .git, venv)
            files_to_scan = [
                f for f in files_to_scan
                if not any(part in f.parts for part in
                          {"node_modules", ".git", "venv", ".venv", "__pycache__", "dist", "build", ".eggs"})
            ]

        for fpath in files_to_scan:
            try:
                content = fpath.read_text(encoding="utf-8", errors="replace")
                files_scanned += 1
                lines_scanned += content.count("\n") + 1
                self._scan_file_patterns(fpath, content)
            except (PermissionError, OSError):
                continue

        return {
            "status": "SUCCESS",
            "scan_id": self.scan_id,
            "path": path,
            "files_scanned": files_scanned,
            "lines_scanned": lines_scanned,
        }

    def _scan_file_patterns(self, fpath: Path, content: str) -> None:
        """Recherche les patterns vulnérables dans un fichier."""
        lines = content.split("\n")
        for vuln_name, config in SAST_PATTERNS.items():
            for pattern in config["patterns"]:
                regex = re.compile(pattern, re.IGNORECASE)
                for match in regex.finditer(content):
                    # Trouver le numéro de ligne
                    line_num = content[:match.start()].count("\n") + 1
                    line_content = lines[line_num - 1].strip() if line_num <= len(lines) else ""
                    self._add_finding(
                        category="SAST", severity=config["severity"],
                        title=f"{vuln_name.replace('_', ' ')} dans {fpath.name}",
                        description=f"Pattern vulnérable détecté: {vuln_name}",
                        evidence=f"L{line_num}: {line_content[:120]}",
                        owasp=config["owasp"], fix=config["fix"],
                        target=str(fpath)
                    )

    # ── AUDIT CONFIG : fichiers sensibles exposés, permissions ───────────────
    def audit_config(self, path: str) -> dict[str, Any]:
        """Audit de configuration : fichiers sensibles exposés, permissions laxistes.

        Détecte les .env, .git exposés, clés privées, fichiers world-readable, etc.
        Lecture seule — ne modifie aucune permission.
        """
        vuln_auth.require_auth()

        root = Path(path)
        if not root.exists():
            return {"status": "ERROR", "message": f"Chemin introuvable: {path}"}

        sensitive_files = [
            ".env", ".env.local", ".env.production", ".env.development",
            ".git/config", ".git/credentials",
            "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
            ".npmrc", ".pypirc", ".netrc", ".pgpass",
            "docker-compose.yml", "docker-compose.yaml",
            "config/database.yml", "config/secrets.yml",
            "wp-config.php", "configuration.php",
            ".htpasswd", ".htaccess",
        ]

        found = []
        if root.is_file():
            targets = [root]
        else:
            targets = []
            for sf in sensitive_files:
                targets.extend(root.rglob(sf))

        for fpath in targets:
            try:
                if fpath.exists() and fpath.is_file():
                    rel = fpath.relative_to(root) if root.is_dir() else fpath.name
                    stat = fpath.stat()
                    # Vérifier les permissions world-readable (Unix)
                    perms = oct(stat.st_mode)[-3:]
                    world_readable = int(perms[-1]) >= 4
                    found.append({
                        "file": str(rel),
                        "perms": perms,
                        "world_readable": world_readable,
                    })
                    severity = "CRITICAL" if fpath.name in (".env", ".env.production", "id_rsa") else "HIGH"
                    desc = f"Fichier sensible exposé: {rel}"
                    if world_readable:
                        desc += f" (permissions {perms} — world-readable)"
                    self._add_finding(
                        category="CONFIG", severity=severity, title=f"Fichier sensible: {fpath.name}",
                        description=desc, evidence=f"{rel} (perms: {perms})",
                        owasp="A01:2021 - Broken Access Control",
                        fix="Restreindre les permissions (chmod 600) et ajouter au .gitignore.",
                        target=str(fpath)
                    )
            except (PermissionError, OSError, ValueError):
                continue

        return {
            "status": "SUCCESS",
            "scan_id": self.scan_id,
            "path": path,
            "sensitive_files_found": len(found),
            "results": found,
        }

    # ── BRIDAGE : méthode d'attaque (TOUJOURS refusée) ────────────────────────
    def execute_attack(self, *args, **kwargs) -> None:
        """Méthode d'attaque — TOUJOURS REFUSÉE par bridage architectural.

        Cette méthode existe uniquement pour prouver que le bridage fonctionne.
        Elle lève toujours RuntimeError, peu importe les arguments.
        """
        raise RuntimeError(
            "ACTION_OFFENSIVE_INTERDITE: Ce module est bridé architecturalement. "
            "Il ne peut PAS attaquer, exploiter, brute-forcer, installer de backdoor "
            "ou exécuter de payload. Usage défensif et légal uniquement. "
            "RATISS est un outil d'AUDIT, pas d'ATTAQUE."
        )

    # ── RAPPORT consolidé ────────────────────────────────────────────────────
    def get_report(self) -> dict[str, Any]:
        """Génère le rapport consolidé de toutes les vulnérabilités détectées."""
        vuln_auth.require_auth()

        # Compter par sévérité
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        for f in self.findings:
            sev = f.get("severity", "INFO")
            if sev in severity_counts:
                severity_counts[sev] += 1

        return {
            "scan_id": self.scan_id,
            "status": "SUCCESS",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_findings": len(self.findings),
            "severity_counts": severity_counts,
            "findings": self.findings,
            "disclaimer": (
                "Ce rapport est généré par RATISS Aeon Prime (module vuln_scanner). "
                "Il est destiné à un usage DÉFENSIF et LÉGAL (audit autorisé). "
                "Les recommandations de remédiation sont fournies à titre indicatif. "
                "RATISS est bridé : il ne peut PAS exploiter les vulnérabilités détectées."
            ),
        }

    def get_report_json(self) -> str:
        """Retourne le rapport au format JSON (pour sauvegarde/export)."""
        return json.dumps(self.get_report(), indent=2, ensure_ascii=False)
