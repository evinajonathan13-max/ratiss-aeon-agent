"""
tools/web_search.py — Recherche web générale (agent agentique souverain).

Permet à l'agent RATISS de faire des recherches web génériques, au-delà des
sources scientifiques spécialisées (arXiv, PubMed, ChEMBL).

Priorité :
  1. Tavily API (si TAVILY_API_KEY présent) — optimisé pour l'IA
  2. DuckDuckGo HTML (fallback, sans clé) — souveraineté

Équivalent du GoogleSearch de RATISS, adapté pour RATISS.
"""
from __future__ import annotations

import os
import re
import logging
import urllib.request
import urllib.parse
import json as _json
from typing import Any

logger = logging.getLogger("ratiss.web_search")


def _search_tavily(query: str, max_results: int = 5) -> dict[str, Any] | None:
    """Recherche via Tavily API (si clé disponible)."""
    api_key = os.environ.get("TAVILY_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=api_key)
        response = client.search(query=query, max_results=max_results, search_depth="basic")
        results = []
        for r in response.get("results", []):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "snippet": r.get("content", "")[:300],
                "score": r.get("score", 0),
            })
        return {
            "status": "SEARCH_SUCCESS",
            "engine": "tavily",
            "query": query,
            "count": len(results),
            "results": results,
        }
    except Exception as e:
        logger.warning(f"[WEB_SEARCH] Tavily failed ({e}), falling back to DuckDuckGo")
        return None


def _search_duckduckgo(query: str, max_results: int = 5) -> dict[str, Any]:
    """Recherche via DuckDuckGo HTML (fallback, sans clé)."""
    try:
        url = "https://html.duckduckgo.com/html/"
        data = urllib.parse.urlencode({"q": query}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "User-Agent": "RATISS-Aeon-Agent/9.0 (Research)",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="replace")

        # Parser les résultats (DuckDuckGo HTML)
        results = []
        # Titres et URLs
        title_blocks = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)
        snippet_blocks = re.findall(r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)

        for i, (raw_url, raw_title) in enumerate(title_blocks[:max_results]):
            # Nettoyer le titre
            title = re.sub(r"<[^>]+>", "", raw_title).strip()
            # Décoder l'URL (DuckDuckGo utilise des redirects)
            if raw_url.startswith("//"):
                raw_url = "https:" + raw_url
            # Extraire l'URL réelle du redirect DuckDuckGo
            url_match = re.search(r"uddg=([^&]+)", raw_url)
            if url_match:
                actual_url = urllib.parse.unquote(url_match.group(1))
            else:
                actual_url = raw_url

            snippet = ""
            if i < len(snippet_blocks):
                snippet = re.sub(r"<[^>]+>", "", snippet_blocks[i]).strip()[:300]

            results.append({
                "title": title,
                "url": actual_url,
                "snippet": snippet,
            })

        if not results:
            return {
                "status": "SEARCH_NO_RESULTS",
                "engine": "duckduckgo",
                "query": query,
                "count": 0,
                "results": [],
                "error": "No results parsed from DuckDuckGo HTML",
            }

        return {
            "status": "SEARCH_SUCCESS",
            "engine": "duckduckgo",
            "query": query,
            "count": len(results),
            "results": results,
        }
    except Exception as e:
        return {
            "status": "SEARCH_ERROR",
            "engine": "duckduckgo",
            "query": query,
            "count": 0,
            "results": [],
            "error": str(e),
        }


def google_search(query: str, max_results: int = 5) -> dict[str, Any]:
    """Recherche web générale. Tavily si disponible, sinon DuckDuckGo.

    Args:
        query: La requête de recherche
        max_results: Nombre maximum de résultats (défaut 5)
    """
    if not query or not query.strip():
        return {"status": "SEARCH_ERROR", "error": "empty_query", "results": []}

    query = query.strip()

    # 1. Essayer Tavily
    result = _search_tavily(query, max_results)
    if result:
        return result

    # 2. Fallback DuckDuckGo
    return _search_duckduckgo(query, max_results)


def execute_search(params: dict[str, Any]) -> dict[str, Any]:
    """Point d'entrée pour le skill_manager."""
    query = params.get("query", params.get("q", ""))
    max_results = params.get("max_results", 5)
    return google_search(query, max_results)
