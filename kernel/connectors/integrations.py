"""
kernel/connectors/integrations.py — Registre souverain des intégrations externes.

Conçu pour un agent scientifique : chaque intégration sert la reproductibilité,
l'open science et la chaîne de recherche (code, données, publications, calcul).

Principe souverain : les jetons sont stockés localement (config/integrations.json),
jamais loggés, jamais exposés dans les réponses API. On ne signale que la disponibilité.

Intégrations scientifiques & agentiques :
  - github        : reproductibilité du code, issues, pull requests, search
  - arxiv         : prépublications scientifiques (search/fetch)
  - zenodo        : dépôt de jeux de données & artéfacts (DOI)
  - openalex      : graphe scientifique (citations, auteurs, concepts)
  - crossref      : métadonnées de publications (DOI lookup)
  - rcsb_pdb      : structures protéiques (déjà partiellement géré)
  - overleaf      : collaboration LaTeX (rapports académiques)
  - ibm_quantum   : QPU (déjà géré dans registry.py)
  - tavily        : recherche web pour grounding factuel
"""
from __future__ import annotations

import os
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("ratiss.integrations")

_CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"
_TOKENS_FILE = _CONFIG_DIR / "integrations.json"


def _load_tokens() -> dict[str, str]:
    """Charge les jetons stockés localement (jamais loggés)."""
    if not _TOKENS_FILE.exists():
        return {}
    try:
        data = json.loads(_TOKENS_FILE.read_text(encoding="utf-8"))
        return {k: v for k, v in data.items() if isinstance(v, str)} if isinstance(data, dict) else {}
    except Exception:
        logger.warning("[integrations] jetons illisibles, réinitialisation")
        return {}


def _save_tokens(tokens: dict[str, str]) -> None:
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    _TOKENS_FILE.write_text(json.dumps(tokens, indent=2), encoding="utf-8")
    try:
        _TOKENS_FILE.chmod(0o600)
    except Exception:
        pass


def get_token(integration_id: str) -> str:
    """Renvoie le jeton pour une intégration (env en priorité, puis store local)."""
    env_map = {
        "github": "GITHUB_TOKEN",
        "tavily": "TAVILY_API_KEY",
        "zenodo": "ZENODO_TOKEN",
        "openalex": "OPENALEX_EMAIL",
        "overleaf": "OVERLEAF_TOKEN",
    }
    env_var = env_map.get(integration_id, "")
    val = os.environ.get(env_var, "").strip() if env_var else ""
    if val:
        return val
    return _load_tokens().get(integration_id, "")


def set_token(integration_id: str, token: str) -> bool:
    """Stocke un jeton localement (souverain). Renvoie True si reconnu."""
    token = (token or "").strip()
    if not token:
        return False
    tokens = _load_tokens()
    tokens[integration_id] = token
    _save_tokens(tokens)
    return True


def clear_token(integration_id: str) -> bool:
    tokens = _load_tokens()
    if integration_id in tokens:
        del tokens[integration_id]
        _save_tokens(tokens)
        return True
    return False


# ── Catalogue des intégrations ────────────────────────────────────────────────

INTEGRATIONS_CATALOG: list[dict[str, Any]] = [
    {
        "id": "github",
        "name": "GitHub",
        "category": "code",
        "icon": "github",
        "scientific_role": "Reproductibilité du code, versioning, issues & PR pour les pipelines scientifiques",
        "requires_token": True,
        "token_hint": "ghp_... (Personal Access Token) ou gho_... (OAuth)",
        "actions": ["list_repos", "search_code", "read_file", "create_issue", "list_prs", "get_repo"],
        "docs_url": "https://docs.github.com/rest",
    },
    {
        "id": "arxiv",
        "name": "arXiv",
        "category": "publications",
        "icon": "file",
        "scientific_role": "Recherche & récupération de prépublications scientifiques",
        "requires_token": False,
        "actions": ["search", "fetch_abstract"],
        "docs_url": "https://arxiv.org",
    },
    {
        "id": "zenodo",
        "name": "Zenodo",
        "category": "data",
        "icon": "database",
        "scientific_role": "Dépôt de jeux de données et artéfacts avec DOI persistant",
        "requires_token": True,
        "token_hint": "Jetons d'accès Zenodo (sandbox ou production)",
        "actions": ["search", "create_deposit", "list_deposits"],
        "docs_url": "https://developers.zenodo.org",
    },
    {
        "id": "openalex",
        "name": "OpenAlex",
        "category": "publications",
        "icon": "globe",
        "scientific_role": "Graphe scientifique : citations, auteurs, concepts, institutions",
        "requires_token": False,
        "actions": ["search_works", "get_work", "search_authors"],
        "docs_url": "https://docs.openalex.org",
    },
    {
        "id": "crossref",
        "name": "Crossref",
        "category": "publications",
        "icon": "book",
        "scientific_role": "Métadonnées de publications & résolution DOI",
        "requires_token": False,
        "actions": ["lookup_doi", "search"],
        "docs_url": "https://api.crossref.org",
    },
    {
        "id": "rcsb_pdb",
        "name": "RCSB PDB",
        "category": "structural_biology",
        "icon": "atom",
        "scientific_role": "Banque mondiale de structures 3D de macromolécules",
        "requires_token": False,
        "actions": ["search", "fetch_structure"],
        "docs_url": "https://data.rcsb.org",
    },
    {
        "id": "overleaf",
        "name": "Overleaf",
        "category": "publications",
        "icon": "file_text",
        "scientific_role": "Collaboration LaTeX pour rapports & articles académiques",
        "requires_token": True,
        "token_hint": "Jeton d'intégration Overleaf (GitHub-like)",
        "actions": ["list_projects", "push_latex"],
        "docs_url": "https://www.overleaf.com/devs",
    },
    {
        "id": "ibm_quantum",
        "name": "IBM Quantum",
        "category": "quantum",
        "icon": "cpu",
        "scientific_role": "Exécution de circuits sur QPU réels (Brisbane, Heron)",
        "requires_token": True,
        "token_hint": "IBM Quantum API token",
        "actions": ["list_backends", "run_circuit"],
        "docs_url": "https://quantum-computing.ibm.com",
    },
    {
        "id": "tavily",
        "name": "Tavily (Web Search)",
        "category": "web",
        "icon": "search",
        "scientific_role": "Grounding factuel & veille scientifique temps réel",
        "requires_token": True,
        "token_hint": "tvly-... (clé API Tavily)",
        "actions": ["search"],
        "docs_url": "https://tavily.com",
    },
]


def _is_connected(integration_id: str) -> bool:
    """Détermine si une intégration est connectée (jeton présent si requis)."""
    cat = next((c for c in INTEGRATIONS_CATALOG if c["id"] == integration_id), None)
    if not cat:
        return False
    if not cat["requires_token"]:
        return True
    return bool(get_token(integration_id))


def integrations_status() -> dict[str, Any]:
    """Renvoie l'état de toutes les intégrations (sans exposer de jetons)."""
    items = []
    for cat in INTEGRATIONS_CATALOG:
        connected = _is_connected(cat["id"])
        items.append({
            "id": cat["id"],
            "name": cat["name"],
            "category": cat["category"],
            "icon": cat["icon"],
            "scientific_role": cat["scientific_role"],
            "requires_token": cat["requires_token"],
            "connected": connected,
            "actions": cat["actions"],
            "docs_url": cat["docs_url"],
        })
    total = len(items)
    connected_count = sum(1 for i in items if i["connected"])
    return {
        "integrations": items,
        "total": total,
        "connected": connected_count,
        "categories": ["code", "publications", "data", "structural_biology", "quantum", "web"],
    }
