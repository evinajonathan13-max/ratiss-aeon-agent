"""security/sandbox_hardener.py — Bac à sable durci (NemoSandbox).

Lance un conteneur Docker éphémère pour exécuter du code non fiable :
  - Image : python:3.11-slim
  - mem_limit = 2g, cpus = 1.0
  - Réseau désactivé par défaut
  - Volume workspace en lecture/écriture isolé
  - Purge automatique après exécution (--rm)
  - Liste blanche d'imports (allowed_imports.txt)

Si Docker n'est pas disponible, bascule sur un exécuteur Python restreint (fallback).
"""
from __future__ import annotations

import os
import sys
import time
import json
import shutil
import logging
import tempfile
import threading
import subprocess
from pathlib import Path
from typing import Any

logger = logging.getLogger("ratiss.security")

_ROOT = Path(__file__).resolve().parent.parent
ALLOWED_IMPORTS_FILE = _ROOT / "config" / "allowed_imports.txt"

DEFAULT_ALLOWED = [
    "math", "random", "collections", "itertools", "json", "re",
    "statistics", "fractions", "decimal", "datetime", "hashlib",
    "base64", "string", "typing", "dataclasses", "abc",
    "numpy", "scipy", "psutil", "matplotlib",
]


def ensure_allowed_imports() -> Path:
    """S'assure que config/allowed_imports.txt existe et contient tous les modules par défaut."""
    ALLOWED_IMPORTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not ALLOWED_IMPORTS_FILE.exists():
        ALLOWED_IMPORTS_FILE.write_text("\n".join(DEFAULT_ALLOWED) + "\n", encoding="utf-8")
    else:
        # Fusionner : ajouter les modules DEFAULT manquants (ex: matplotlib)
        existing = set(line.strip() for line in ALLOWED_IMPORTS_FILE.read_text().splitlines() if line.strip() and not line.startswith("#"))
        missing = [m for m in DEFAULT_ALLOWED if m not in existing]
        if missing:
            content = ALLOWED_IMPORTS_FILE.read_text(encoding="utf-8")
            if not content.endswith("\n"):
                content += "\n"
            content += "\n".join(missing) + "\n"
            ALLOWED_IMPORTS_FILE.write_text(content, encoding="utf-8")
    return ALLOWED_IMPORTS_FILE


def _make_restricted_import(allowed: set[str]):
    """Crée une fonction __import__ restreinte qui ne permet d'importer que les modules
    de la liste blanche. Refuse os, subprocess, socket, etc."""
    import importlib

    def _restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
        # Autoriser seulement le module de premier niveau dans la liste blanche
        root = name.split(".")[0]
        if root not in allowed:
            raise ImportError(f"Module '{name}' non autorisé dans le sandbox. Allowlist: {', '.join(sorted(allowed))}")
        return importlib.import_module(name)

    return _restricted_import


def is_docker_available() -> bool:
    """Vérifie si Docker est disponible et fonctionnel."""
    if not shutil.which("docker"):
        return False
    try:
        r = subprocess.run(["docker", "info"], capture_output=True, timeout=10)
        return r.returncode == 0
    except Exception:
        return False


class NemoSandbox:
    """Bac à sable durci pour exécution de code non fiable."""

    def __init__(self, mem_limit: str = "2g", cpus: float = 1.0, network: str = "none"):
        self.mem_limit = mem_limit
        self.cpus = cpus
        self.network = network
        self.use_docker = is_docker_available()
        ensure_allowed_imports()

    def execute(self, code: str, timeout: int = 30, user_id: str = "anon", session_id: str = "tmp") -> dict[str, Any]:
        """Exécute du code dans le sandbox. Retourne {stdout, stderr, returncode, mode}."""
        if self.use_docker:
            return self._exec_docker(code, timeout, user_id, session_id)
        return self._exec_restricted(code, timeout)

    def _exec_docker(self, code: str, timeout: int, user_id: str, session_id: str) -> dict[str, Any]:
        """Exécution dans conteneur Docker éphémère."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, dir="/tmp") as f:
            f.write(code)
            script_path = f.name

        workspace = _ROOT / "workspace" / f"user_{user_id[:8]}" / f"session_{session_id[:8]}"
        workspace.mkdir(parents=True, exist_ok=True)

        try:
            cmd = [
                "docker", "run", "--rm",
                "--network", self.network,
                "--memory", self.mem_limit,
                "--cpus", str(self.cpus),
                "--read-only",
                "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
                "-v", f"{script_path}:/app/script.py:ro",
                "-v", f"{workspace}:/workspace:rw",
                "-w", "/app",
                "python:3.11-slim",
                "python", "/app/script.py",
            ]
            r = subprocess.run(cmd, capture_output=True, timeout=timeout, text=True)
            return {
                "stdout": r.stdout,
                "stderr": r.stderr,
                "returncode": r.returncode,
                "mode": "docker",
                "workspace": str(workspace),
            }
        except subprocess.TimeoutExpired:
            return {"stdout": "", "stderr": "Timeout", "returncode": -1, "mode": "docker_timeout"}
        except Exception as e:
            logger.warning(f"[SANDBOX] Docker exec failed: {e}, fallback to restricted")
            return self._exec_restricted(code, timeout)
        finally:
            Path(script_path).unlink(missing_ok=True)

    def _exec_restricted(self, code: str, timeout: int) -> dict[str, Any]:
        """Exécution Python restreinte (fallback sans Docker).

        Applique un timeout strict via un watchdog thread (_thread.interrupt_main)
        qui lève KeyboardInterrupt dans le thread d'exécution principal, empêchant
        les boucles infinies (DoS). Les builtins dangereux (open, eval, exec,
        __import__) sont retirés.
        """
        import _thread
        import io
        import contextlib

        allowed = set(line.strip() for line in ALLOWED_IMPORTS_FILE.read_text().splitlines() if line.strip() and not line.startswith("#"))
        safe_builtins = {
            "abs": abs, "all": all, "any": any, "bool": bool, "chr": chr, "dict": dict,
            "divmod": divmod, "enumerate": enumerate, "filter": filter, "float": float,
            "format": format, "hash": hash, "hex": hex, "int": int, "isinstance": isinstance,
            "iter": iter, "len": len, "list": list, "map": map, "max": max, "min": min,
            "next": next, "oct": oct, "ord": ord, "pow": pow, "print": print, "range": range,
            "repr": repr, "reversed": reversed, "round": round, "set": set, "slice": slice,
            "sorted": sorted, "str": str, "sum": sum, "tuple": tuple, "type": type, "zip": zip,
            "True": True, "False": False, "None": None,
            # __import__ restreint : ne permet d'importer que les modules autorisés
            "__import__": _make_restricted_import(allowed),
        }
        globals_env: dict[str, Any] = {"__builtins__": safe_builtins}
        for mod_name in allowed:
            try:
                globals_env[mod_name] = __import__(mod_name)
            except Exception:
                pass

        sout, serr = io.StringIO(), io.StringIO()
        # Watchdog : déclenche une interruption après `timeout` secondes
        timed_out = {"flag": False}

        def _watchdog():
            time.sleep(timeout)
            timed_out["flag"] = True
            _thread.interrupt_main()

        watcher = threading.Thread(target=_watchdog, daemon=True)
        watcher.start()
        try:
            with contextlib.redirect_stdout(sout), contextlib.redirect_stderr(serr):
                exec(compile(code, "<sandbox>", "exec"), globals_env, {})
            return {"stdout": sout.getvalue(), "stderr": serr.getvalue(), "returncode": 0, "mode": "restricted"}
        except KeyboardInterrupt:
            return {"stdout": sout.getvalue(), "stderr": serr.getvalue() + f"\n[TIMEOUT après {timeout}s]", "returncode": -1, "mode": "restricted_timeout"}
        except Exception as e:
            return {"stdout": sout.getvalue(), "stderr": serr.getvalue() + f"\n{type(e).__name__}: {e}", "returncode": 1, "mode": "restricted"}


if __name__ == "__main__":
    sb = NemoSandbox()
    print("Docker available:", sb.use_docker)
    r = sb.execute("import math\nprint('sqrt(2) =', math.sqrt(2))\nprint('pi =', math.pi)")
    print("Mode:", r["mode"])
    print("stdout:", r["stdout"])
    print("rc:", r["returncode"])
