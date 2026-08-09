"""
tools/web_client.py — Accès web scientifique (type Manus IA).

Permet à l'agent de :
  - fetch(url)            : récupérer le contenu d'une URL (HTML, JSON, texte)
  - search_arxiv(query)   : chercher des prépublications sur arXiv
  - search_pubmed(query)  : chercher des articles biomédicaux (PubMed E-utilities)
  - search_chembl(query)  : chercher des composés dans ChEMBL
  - fetch_pdb(id)         : récupérer une structure PDB depuis RCSB
  - fetch_alphafold(uniprot) : récupérer une prédiction AlphaFold DB

Toutes les requêtes sont faites via urllib (pas de dépendance externe), avec
timeout et user-agent propre. Aucune donnée n'est envoyée vers un cloud.
"""
from __future__ import annotations

import os
import json
import logging
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Any

logger = logging.getLogger("ratiss.web")

TIMEOUT = int(os.environ.get("RATISS_WEB_TIMEOUT", "20"))
USER_AGENT = "RATISS-Aeon-Agent/1.0 (scientific research; contact: evinajonathan13@gmail.com)"


def _fetch_raw(url: str, headers: dict[str, str] | None = None, timeout: int = TIMEOUT) -> tuple[int, bytes, dict]:
    """Récupère le contenu brut d'une URL. Retourne (status_code, body_bytes, response_headers)."""
    req_headers = {"User-Agent": USER_AGENT}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().encode("utf-8") if hasattr(e, "read") else b"", {}
    except Exception as e:
        logger.warning(f"[WEB] Erreur fetch {url}: {e}")
        return 0, str(e).encode("utf-8"), {}


def fetch(url: str, fmt: str = "auto") -> dict[str, Any]:
    """Récupère le contenu d'une URL et le parse.

    Args:
        url: L'URL à récupérer
        fmt: Format de parsing ('auto', 'json', 'text', 'html')

    Returns:
        {url, status, content_type, data, error}
    """
    status, body, headers = _fetch_raw(url)
    content_type = headers.get("Content-Type", headers.get("content-type", ""))

    if status == 0:
        return {"url": url, "status": 0, "content_type": "", "data": None, "error": body.decode("utf-8", errors="replace")}

    # Parsing
    if fmt == "json" or (fmt == "auto" and "json" in content_type):
        try:
            data = json.loads(body.decode("utf-8", errors="replace"))
        except Exception:
            data = body.decode("utf-8", errors="replace")
    elif fmt == "html" or (fmt == "auto" and "html" in content_type):
        # Nettoyage basique du HTML → texte
        text = body.decode("utf-8", errors="replace")
        # Extraire le <title>
        title = ""
        if "<title>" in text.lower():
            try:
                title = text.lower().split("<title>", 1)[1].split("</title>", 1)[0].strip()
            except Exception:
                pass
        # Strip tags basique
        import re
        clean = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
        clean = re.sub(r"<style[^>]*>.*?</style>", "", clean, flags=re.DOTALL | re.IGNORECASE)
        clean = re.sub(r"<[^>]+>", " ", clean)
        clean = re.sub(r"\s+", " ", clean).strip()
        data = {"title": title, "text": clean[:5000], "html_length": len(text)}
    else:
        data = body.decode("utf-8", errors="replace")

    return {
        "url": url,
        "status": status,
        "content_type": content_type,
        "data": data,
        "size_bytes": len(body),
        "error": None if status == 200 else f"HTTP {status}",
    }


def search_arxiv(query: str, max_results: int = 5) -> dict[str, Any]:
    """Cherche des prépublications sur arXiv via l'API Atom."""
    base = "http://export.arxiv.org/api/query"
    params = urllib.parse.urlencode({
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": max_results,
        "sortBy": "relevance",
        "sortOrder": "descending",
    })
    url = f"{base}?{params}"
    status, body, _ = _fetch_raw(url)
    if status != 200:
        return {"query": query, "results": [], "error": f"HTTP {status}"}

    # Parser l'XML Atom
    results = []
    try:
        root = ET.fromstring(body.decode("utf-8", errors="replace"))
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("atom:entry", ns):
            title = entry.find("atom:title", ns)
            summary = entry.find("atom:summary", ns)
            id_elem = entry.find("atom:id", ns)
            published = entry.find("atom:published", ns)
            authors = [a.find("atom:name", ns).text for a in entry.findall("atom:author", ns) if a.find("atom:name", ns) is not None]
            results.append({
                "title": (title.text or "").strip().replace("\n", " ") if title is not None else "",
                "id": (id_elem.text or "").strip() if id_elem is not None else "",
                "url": (id_elem.text or "").strip() if id_elem is not None else "",
                "summary": (summary.text or "").strip()[:500] if summary is not None else "",
                "authors": authors,
                "published": (published.text or "").strip()[:10] if published is not None else "",
            })
    except Exception as e:
        logger.warning(f"[WEB] Erreur parsing arXiv: {e}")
        return {"query": query, "results": [], "error": str(e)}

    return {"query": query, "source": "arxiv", "count": len(results), "results": results, "error": None}


def search_pubmed(query: str, max_results: int = 5) -> dict[str, Any]:
    """Cherche des articles biomédicaux sur PubMed via E-utilities."""
    # Étape 1: esearch pour obtenir les IDs
    base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    params = urllib.parse.urlencode({
        "db": "pubmed",
        "term": query,
        "retmax": max_results,
        "retmode": "json",
    })
    status, body, _ = _fetch_raw(f"{base}?{params}")
    if status != 200:
        return {"query": query, "results": [], "error": f"esearch HTTP {status}"}

    try:
        data = json.loads(body.decode("utf-8"))
        ids = data.get("esearchresult", {}).get("idlist", [])
    except Exception:
        return {"query": query, "results": [], "error": "Parsing esearch échoué"}

    if not ids:
        return {"query": query, "source": "pubmed", "count": 0, "results": [], "error": None}

    # Étape 2: esummary pour les détails
    base2 = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    params2 = urllib.parse.urlencode({"db": "pubmed", "id": ",".join(ids), "retmode": "json"})
    status2, body2, _ = _fetch_raw(f"{base2}?{params2}")
    if status2 != 200:
        return {"query": query, "source": "pubmed", "count": len(ids), "ids": ids, "results": [], "error": f"esummary HTTP {status2}"}

    results = []
    try:
        summaries = json.loads(body2.decode("utf-8")).get("result", {})
        for pmid in ids:
            item = summaries.get(pmid, {})
            if item:
                results.append({
                    "pmid": pmid,
                    "title": item.get("title", ""),
                    "authors": [a.get("name", "") for a in item.get("authors", [])],
                    "journal": item.get("fulljournalname", ""),
                    "pubdate": item.get("pubdate", ""),
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                })
    except Exception as e:
        return {"query": query, "source": "pubmed", "count": len(ids), "ids": ids, "results": [], "error": str(e)}

    return {"query": query, "source": "pubmed", "count": len(results), "results": results, "error": None}


def search_chembl(query: str, max_results: int = 5) -> dict[str, Any]:
    """Cherche des composés dans ChEMBL."""
    base = "https://www.ebi.ac.uk/chembl/api/data/molecule.json"
    params = urllib.parse.urlencode({
        "molecule_chembl_id__icontains": query,
        "limit": max_results,
        "format": "json",
    })
    status, body, _ = _fetch_raw(f"{base}?{params}")
    if status != 200:
        return {"query": query, "results": [], "error": f"HTTP {status}"}

    try:
        data = json.loads(body.decode("utf-8"))
        molecules = data.get("molecules", [])
        results = []
        for mol in molecules:
            results.append({
                "chembl_id": mol.get("molecule_chembl_id", ""),
                "name": mol.get("pref_name", "N/A"),
                "formula": mol.get("molecule_properties", {}).get("full_mol_formula", "N/A") if mol.get("molecule_properties") else "N/A",
                "weight": mol.get("molecule_properties", {}).get("full_mwt", "N/A") if mol.get("molecule_properties") else "N/A",
                "logp": mol.get("molecule_properties", {}).get("alogp", "N/A") if mol.get("molecule_properties") else "N/A",
            })
        return {"query": query, "source": "chembl", "count": len(results), "results": results, "error": None}
    except Exception as e:
        return {"query": query, "results": [], "error": str(e)}


def fetch_pdb(pdb_id: str) -> dict[str, Any]:
    """Récupère les métadonnées d'une structure PDB depuis RCSB."""
    url = f"https://data.rcsb.org/rest/v1/core/entry/{pdb_id.upper()}"
    status, body, _ = _fetch_raw(url)
    if status != 200:
        return {"pdb_id": pdb_id, "data": None, "error": f"HTTP {status}"}
    try:
        data = json.loads(body.decode("utf-8"))
        return {
            "pdb_id": pdb_id.upper(),
            "title": data.get("struct", {}).get("title", ""),
            "method": data.get("exptl", [{}])[0].get("method", "") if data.get("exptl") else "",
            "resolution": data.get("rcsb_entry_info", {}).get("resolution_combined", [None])[0],
            "organism": data.get("rcsb_entity_source_organism", [{}])[0].get("ncbi_scientific_name", "") if data.get("rcsb_entity_source_organism") else "",
            "url": f"https://www.rcsb.org/structure/{pdb_id.upper()}",
            "download_url": f"https://files.rcsb.org/download/{pdb_id.upper()}.cif",
            "data": data,
            "error": None,
        }
    except Exception as e:
        return {"pdb_id": pdb_id, "data": None, "error": str(e)}


def fetch_alphafold(uniprot_id: str) -> dict[str, Any]:
    """Récupère une prédiction de structure AlphaFold DB."""
    url = f"https://alphafold.ebi.ac.uk/api/prediction/{uniprot_id.upper()}"
    status, body, _ = _fetch_raw(url)
    if status != 200:
        return {"uniprot_id": uniprot_id, "data": None, "error": f"HTTP {status}"}
    try:
        data = json.loads(body.decode("utf-8"))
        return {
            "uniprot_id": uniprot_id.upper(),
            "pdb_url": data.get("pdbUrl", ""),
            "cif_url": data.get("cifUrl", ""),
            "avg_pLDDT": data.get("pLDDT", {}).get("avg", "") if isinstance(data.get("pLDDT"), dict) else data.get("pLDDT"),
            "data": data,
            "error": None,
        }
    except Exception as e:
        return {"uniprot_id": uniprot_id, "data": None, "error": str(e)}


# Registre des actions web pour le skill_manager
WEB_ACTIONS = {
    "web_fetch": {"fn": fetch, "label": "Récupérer une URL web"},
    "web_arxiv": {"fn": search_arxiv, "label": "Rechercher sur arXiv"},
    "web_pubmed": {"fn": search_pubmed, "label": "Rechercher sur PubMed"},
    "web_chembl": {"fn": search_chembl, "label": "Rechercher sur ChEMBL"},
    "web_pdb": {"fn": fetch_pdb, "label": "Récupérer structure PDB (RCSB)"},
    "web_alphafold": {"fn": fetch_alphafold, "label": "Récupérer prédiction AlphaFold"},
}
