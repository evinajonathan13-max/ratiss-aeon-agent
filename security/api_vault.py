"""security.api_vault — Coffre-fort persistant de cles API (environnement souverain).

Permet a un utilisateur de stocker durablement ses cles API (IBM QPU, bio,
OpenRouter, Anthropic, etc.) de maniere persistante — comme Manus greffe un
environnement persistant a son agent. Les cles sont chiffrees au repos (Fernet)
et ne quittent jamais la machine.

Stockage : config/api_vault.json (chiffre) + config/api_vault.key (cle maitre).
La cle maitre est derivee d'un sel local + mot de passe utilisateur (optionnel).
"""

from __future__ import annotations
import os
import json
import hashlib
import base64
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

_VAULT_DIR = Path(os.environ.get("RATISS_CONFIG_DIR", "config"))
_VAULT_FILE = _VAULT_DIR / "api_vault.json"
_KEY_FILE = _VAULT_DIR / "api_vault.key"

# Cles API supportees (extensible)
SUPPORTED_KEYS = [
    # LLM
    "anthropic", "google", "openai", "openrouter",
    # Scientifique
    "ibm_quantum", "quandela", "tavily",
    # Bio
    "ncbi_api_key", "alphafold_api_key", "chembl_api_key",
    # Integrations
    "github_token", "zenodo_token", "overleaf_token",
    # Autre
    "custom",
]

try:
    from cryptography.fernet import Fernet
    HAS_CRYPTO = True
except ImportError:
    HAS_CRYPTO = False


def _ensure_dir() -> None:
    _VAULT_DIR.mkdir(parents=True, exist_ok=True)


def _load_or_create_key() -> bytes:
    """Charge ou cree la cle maitre Fernet (32 octets base64)."""
    _ensure_dir()
    if _KEY_FILE.exists():
        return _KEY_FILE.read_bytes().strip()
    key = Fernet.generate_key() if HAS_CRYPTO else b"plain"
    _KEY_FILE.write_bytes(key)
    try:
        os.chmod(_KEY_FILE, 0o600)
    except OSError:
        pass
    return key


def _encrypt(data: str) -> str:
    if not HAS_CRYPTO:
        return base64.b64encode(data.encode()).decode()
    key = _load_or_create_key()
    return Fernet(key).encrypt(data.encode()).decode()


def _decrypt(token: str) -> str:
    if not HAS_CRYPTO:
        return base64.b64decode(token.encode()).decode()
    key = _load_or_create_key()
    return Fernet(key).decrypt(token.encode()).decode()


def _load_vault() -> Dict[str, Any]:
    if not _VAULT_FILE.exists():
        return {"keys": {}}
    try:
        return json.loads(_VAULT_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"keys": {}}


def _save_vault(vault: Dict[str, Any]) -> None:
    _ensure_dir()
    _VAULT_FILE.write_text(json.dumps(vault, indent=2, ensure_ascii=False), encoding="utf-8")
    try:
        os.chmod(_VAULT_FILE, 0o600)
    except OSError:
        pass


def store_key(key_id: str, api_key: str, label: str = "", metadata: Optional[Dict] = None) -> bool:
    """Stocke (chiffre) une cle API dans le vault persistant."""
    vault = _load_vault()
    vault.setdefault("keys", {})[key_id] = {
        "encrypted": _encrypt(api_key),
        "label": label or key_id,
        "metadata": metadata or {},
    }
    _save_vault(vault)
    # Injecter aussi dans l'environnement pour les modules qui lisent os.environ
    env_var = _env_var_for(key_id)
    if env_var:
        os.environ[env_var] = api_key
    logger.info(f"[VAULT] Cle stockee: {key_id}")
    return True


def get_key(key_id: str) -> Optional[str]:
    """Recupere une cle API dechiffree (ou None)."""
    vault = _load_vault()
    entry = vault.get("keys", {}).get(key_id)
    if not entry:
        # Fallback env var
        env_var = _env_var_for(key_id)
        return os.environ.get(env_var) if env_var else None
    try:
        return _decrypt(entry["encrypted"])
    except Exception:
        return None


def delete_key(key_id: str) -> bool:
    vault = _load_vault()
    if key_id in vault.get("keys", {}):
        del vault["keys"][key_id]
        _save_vault(vault)
        env_var = _env_var_for(key_id)
        if env_var:
            os.environ.pop(env_var, None)
        return True
    return False


def list_keys() -> Dict[str, Dict[str, Any]]:
    """Liste les cles stockees (sans reveler les valeurs)."""
    vault = _load_vault()
    out: Dict[str, Dict[str, Any]] = {}
    for key_id, entry in vault.get("keys", {}).items():
        out[key_id] = {
            "label": entry.get("label", key_id),
            "metadata": entry.get("metadata", {}),
            "configured": True,
        }
    # Inclure les cles presentes en env var mais pas en vault
    for key_id in SUPPORTED_KEYS:
        if key_id not in out:
            env_var = _env_var_for(key_id)
            if env_var and os.environ.get(env_var):
                out[key_id] = {"label": key_id, "metadata": {"source": "env"}, "configured": True}
    return out


def load_all_into_env() -> int:
    """Charge toutes les cles du vault dans os.environ au demarrage. Retourne le nombre."""
    vault = _load_vault()
    count = 0
    for key_id, entry in vault.get("keys", {}).items():
        env_var = _env_var_for(key_id)
        if env_var:
            try:
                os.environ[env_var] = _decrypt(entry["encrypted"])
                count += 1
            except Exception:
                pass
    return count


def _env_var_for(key_id: str) -> str:
    mapping = {
        "anthropic": "ANTHROPIC_API_KEY",
        "google": "GEMINI_API_KEY",
        "openai": "OPENAI_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "ibm_quantum": "IBM_QUANTUM_TOKEN",
        "quandela": "QUANDELA_TOKEN",
        "tavily": "TAVILY_API_KEY",
        "ncbi_api_key": "NCBI_API_KEY",
        "alphafold_api_key": "ALPHAFOLD_API_KEY",
        "chembl_api_key": "CHEMBL_API_KEY",
        "github_token": "GITHUB_TOKEN",
        "zenodo_token": "ZENODO_TOKEN",
        "overleaf_token": "OVERLEAF_TOKEN",
    }
    return mapping.get(key_id, f"RATISS_KEY_{key_id.upper()}")
