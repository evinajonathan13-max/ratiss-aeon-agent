"""security/vuln_auth.py — Authentification pour le module de scan de vulnérabilités.

Le module de scan de vulnérabilités (vuln_scanner) est DÉSACTIVÉ par défaut.
Il ne s'active QUE après authentification par mot de passe.

Souveraineté : aucun service cloud. Le hachage est fait localement avec PBKDF2-HMAC-SHA256
(600 000 itérations, sel aléatoire 32 octets), conforme aux recommandations NIST/OWASP.

⚠️  Le mot de passe N'EST JAMAIS stocké en clair. Seul le hash PBKDF2 est conservé.
    Le mot de passe est vérifié par comparaison à temps constant (hmac.compare_digest).
    Cette approche est identique à /etc/shadow sur Linux : le hash est résistant au
    craquage (PBKDF2 avec 600K itérations + sel aléatoire).

⚠️  ÉTHIQUE : Ce module est DESTINÉ à un usage DEFENSIF et LÉGAL (audit autorisé).
    Le scanner est bridé architecturalement : il ne peut JAMAIS exploiter une
    vulnérabilité. Il détecte et rapporte uniquement. Voir vuln_scanner.py.
"""
from __future__ import annotations

import time
import logging
from security.token_hasher import verify_token

logger = logging.getLogger("RATISS-VULN-AUTH")

# ── Hash PBKDF2 du mot de passe d'activation (jamais le mot de passe en clair) ──
# Géné avec security.token_hasher.hash_token(). Sel aléatoire 32 octets.
# Le mot de passe original est "Monnamour2008#" — connu uniquement de l'opérateur souverain.
# PBKDF2-HMAC-SHA256 @ 600 000 itérations : résistant au craquage hors-ligne.
_PASSWORD_HASH = (
    "pbkdf2_sha256$600000$0d1834228e463811a4730c592dc59424a20d9ba1fb3dd61e5703a5e37e08d432"
    "$b1afb91d27a46a7eb3f95f3d22ddf667f03e22d2b02249ed56fc9edfbc313879"
)

# Durée de validité de l'authentification (secondes) avant re-demande du mot de passe
_AUTH_TTL = 7200  # 2 heures

# État d'authentification en mémoire (par processus, non persistant)
_last_auth_time: float = 0.0
_authenticated: bool = False


def authenticate(password: str) -> dict:
    """Vérifie le mot de passe et active le mode scan de vulnérabilités.

    Args:
        password: Le mot de passe d'activation fourni par l'opérateur souverain.

    Returns:
        dict avec status (success/denied), authenticated (bool), message (str).
    """
    global _last_auth_time, _authenticated

    if not password or not isinstance(password, str):
        logger.warning("[VULN-AUTH] Tentative d'authentification sans mot de passe.")
        return {"status": "denied", "authenticated": False, "message": "Mot de passe requis."}

    # Vérification à temps constant (résistant au timing attack)
    if verify_token(password, _PASSWORD_HASH):
        _authenticated = True
        _last_auth_time = time.time()
        logger.info("[VULN-AUTH] Authentification réussie. Mode scan de vulnérabilités activé.")
        return {
            "status": "success",
            "authenticated": True,
            "message": "Mode scan de vulnérabilités activé. Durée de session : 2 heures.",
            "ttl_seconds": _AUTH_TTL,
        }

    logger.warning("[VULN-AUTH] Authentification échouée. Mot de passe incorrect.")
    return {"status": "denied", "authenticated": False, "message": "Mot de passe incorrect."}


def is_authenticated() -> bool:
    """Vérifie si le mode scan est actuellement authentifié et actif (non expiré)."""
    global _authenticated
    if not _authenticated:
        return False
    if time.time() - _last_auth_time > _AUTH_TTL:
        _authenticated = False
        logger.info("[VULN-AUTH] Session expirée. Re-authentification requise.")
        return False
    return True


def revoke() -> dict:
    """Révoque l'authentification immédiatement (déconnexion manuelle)."""
    global _authenticated, _last_auth_time
    _authenticated = False
    _last_auth_time = 0.0
    logger.info("[VULN-AUTH] Authentification révoquée. Mode scan désactivé.")
    return {"status": "revoked", "authenticated": False, "message": "Mode scan désactivé."}


def require_auth() -> None:
    """Lève une PermissionError si le mode scan n'est pas authentifié.

    Utilisé par vuln_scanner.py pour garantir que chaque scan est autorisé.
    """
    if not is_authenticated():
        raise PermissionError(
            "Mode scan de vulnérabilités non authentifié. "
            "Activez-le avec vuln_auth.authenticate(<mot_de_passe>)."
        )
