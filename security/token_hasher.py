"""security/token_hasher.py — Hachage sécurisé des jetons (PBKDF2 + SHA256).

Souveraineté : aucun service cloud. Le hachage est fait localement avec PBKDF2-HMAC-SHA256
(600 000 itérations, sel aléatoire 32 octets), conforme aux recommandations NIST/OWASP.
"""
from __future__ import annotations

import os
import hmac
import hashlib
import secrets

PBKDF2_ITERATIONS = 600_000
SALT_BYTES = 32
HASH_BYTES = 32
ALGORITHM = "pbkdf2_sha256"


def hash_token(token: str, iterations: int = PBKDF2_ITERATIONS) -> str:
    """Hache un jeton avec PBKDF2-HMAC-SHA256. Retourne au format Django : algo$iterations$salt$hash."""
    salt = secrets.token_hex(SALT_BYTES)
    dk = hashlib.pbkdf2_hmac("sha256", token.encode("utf-8"), bytes.fromhex(salt), iterations, dklen=HASH_BYTES)
    return f"{ALGORITHM}${iterations}${salt}${dk.hex()}"


def verify_token(token: str, stored: str) -> bool:
    """Vérifie un jeton contre la valeur hachée stockée. Comparaison à temps constant."""
    try:
        algo, iters_str, salt, hash_hex = stored.split("$")
        if algo != ALGORITHM:
            return False
        iterations = int(iters_str)
        dk = hashlib.pbkdf2_hmac("sha256", token.encode("utf-8"), bytes.fromhex(salt), iterations, dklen=HASH_BYTES)
        return hmac.compare_digest(dk.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


def generate_session_token() -> str:
    """Génère un jeton de session aléatoire (256 bits)."""
    return secrets.token_urlsafe(32)


if __name__ == "__main__":
    # Auto-test
    h = hash_token("test123")
    assert verify_token("test123", h), "verify failed"
    assert not verify_token("wrong", h), "should fail"
    print("token_hasher OK")
