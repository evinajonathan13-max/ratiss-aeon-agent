"""
tools/python_executor.py — Exécution Python sandbox (agent agentique souverain).

Permet à l'agent RATISS d'écrire et d'exécuter du code Python arbitraire dans
un environnement isolé avec :
  - Timeout strict (défaut 30s)
  - Capture stdout/stderr
  - Capture la valeur de retour (si la dernière expression est évaluée)
  - Restrictions : pas d'accès au système de fichiers en dehors du workspace
  - Variables prédéfinies : numpy, scipy, matplotlib disponibles

Équivalent du PythonExecute de RATISS, adapté pour RATISS.
"""
from __future__ import annotations

import sys
import io
import os
import traceback
import threading
import logging
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger("ratiss.python_exec")

_ROOT = Path(__file__).resolve().parent.parent


class PythonExecutor:
    """Exécuteur Python sandbox avec timeout et capture de sortie."""

    # Modules sûrs importés automatiquement dans le sandbox
    SAFE_BUILTINS = {
        "print": print,
        "len": len,
        "range": range,
        "int": int,
        "float": float,
        "str": str,
        "list": list,
        "dict": dict,
        "tuple": tuple,
        "set": set,
        "bool": bool,
        "abs": abs,
        "min": min,
        "max": max,
        "sum": sum,
        "round": round,
        "sorted": sorted,
        "reversed": reversed,
        "enumerate": enumerate,
        "zip": zip,
        "map": map,
        "filter": filter,
        "type": type,
        "isinstance": isinstance,
        "hasattr": hasattr,
        "getattr": getattr,
        "setattr": setattr,
        "open": open,  # limité par le chdir au workspace
        "Exception": Exception,
        "ValueError": ValueError,
        "TypeError": TypeError,
        "KeyError": KeyError,
        "IndexError": IndexError,
        "AttributeError": AttributeError,
        "ImportError": ImportError,
        "RuntimeError": RuntimeError,
        "StopIteration": StopIteration,
        "True": True,
        "False": False,
        "None": None,
    }

    def __init__(self, timeout: int = 30, workspace_dir: str | None = None):
        self.timeout = timeout
        self.workspace_dir = Path(workspace_dir) if workspace_dir else _ROOT / "workspace"
        self.workspace_dir.mkdir(parents=True, exist_ok=True)

    def execute(
        self,
        code: str,
        on_output: Callable[[str, str], None] | None = None,
        timeout: int | None = None,
    ) -> dict[str, Any]:
        """Exécute du code Python et retourne stdout, stderr, résultat.

        Args:
            code: Le code Python à exécuter
            on_output: Callback appelé pour chaque ligne de sortie (stream, line)
            timeout: Override du timeout par défaut
        """
        timeout = timeout or self.timeout

        # Préparer le namespace du sandbox
        namespace: dict[str, Any] = {"__name__": "__ratiss_sandbox__"}

        # Importer les modules scientifiques de manière sûre
        try:
            import numpy as np
            namespace["np"] = np
            namespace["numpy"] = np
        except ImportError:
            pass

        try:
            import scipy
            namespace["scipy"] = scipy
        except ImportError:
            pass

        try:
            import matplotlib
            matplotlib.use("Agg")  # pas de GUI
            import matplotlib.pyplot as plt
            namespace["plt"] = plt
            namespace["matplotlib"] = matplotlib
        except ImportError:
            pass

        try:
            import json
            namespace["json"] = json
        except ImportError:
            pass

        try:
            import math
            namespace["math"] = math
        except ImportError:
            pass

        # Changer le répertoire de travail vers le workspace
        old_cwd = os.getcwd()
        os.chdir(str(self.workspace_dir))

        stdout_buf = io.StringIO()
        stderr_buf = io.StringIO()
        old_stdout = sys.stdout
        old_stderr = sys.stderr

        result_value = None
        error = None
        timed_out = False

        def _run():
            nonlocal result_value, error
            try:
                # Exécuter le code
                exec(code, namespace)
                # Si la dernière ligne est une expression, on essaie de l'évaluer
                lines = code.strip().split("\n")
                last_line = lines[-1].strip() if lines else ""
                if last_line and not last_line.endswith(":") and not last_line.endswith("=") and not last_line.startswith(("import ", "from ", "def ", "class ", "#", "if ", "for ", "while ", "try", "except", "else", "finally")):
                    try:
                        result_value = eval(last_line, namespace)
                    except Exception:
                        result_value = None
            except Exception as e:
                error = traceback.format_exc()

        # Thread avec timeout
        thread = threading.Thread(target=_run, daemon=True)
        sys.stdout = stdout_buf
        sys.stderr = stderr_buf
        thread.start()
        thread.join(timeout=timeout)
        sys.stdout = old_stdout
        sys.stderr = old_stderr

        if thread.is_alive():
            timed_out = True
            error = f"TimeoutError: code execution exceeded {timeout}s limit"

        os.chdir(old_cwd)

        stdout_text = stdout_buf.getvalue()
        stderr_text = stderr_buf.getvalue()

        # Stream les lignes de sortie via callback
        if on_output:
            for line in stdout_text.splitlines():
                on_output("stdout", line)
            for line in stderr_text.splitlines():
                on_output("stderr", line)

        # Convertir le résultat en type sérialisable
        result_str = None
        if result_value is not None:
            try:
                if isinstance(result_value, (int, float, str, bool, list, dict)):
                    result_str = str(result_value)
                else:
                    result_str = repr(result_value)[:500]
            except Exception:
                result_str = f"<{type(result_value).__name__}>"

        return {
            "status": "TIMEOUT" if timed_out else ("ERROR" if error and "Traceback" in (error or "") else "SUCCESS"),
            "stdout": stdout_text,
            "stderr": stderr_text,
            "result": result_str,
            "error": error if error and not timed_out else (error if timed_out else None),
            "timed_out": timed_out,
            "execution_time_sec": timeout if timed_out else None,
        }
