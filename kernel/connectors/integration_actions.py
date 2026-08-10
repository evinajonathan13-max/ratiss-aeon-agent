"""
kernel/connectors/integration_actions.py — Actions concrètes des intégrations.

Implémente les appels réseau (HTTP) pour chaque intégration en utilisant
uniquement la stdlib (urllib) — aucun secret n'est loggé.

GitHub est l'intégration prioritaire ; les autres suivent la même logique
orientée recherche scientifique reproductible.
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from typing import Any

from kernel.connectors.integrations import get_token


def _http_get(url: str, headers: dict[str, str] | None = None, timeout: int = 20) -> dict[str, Any]:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return {"_raw": body[:4000]}


def _http_post(url: str, headers: dict[str, str], payload: dict[str, Any], timeout: int = 30) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return {"_raw": body[:4000], "status_code": resp.status}


# ── GitHub ────────────────────────────────────────────────────────────────────

_GITHUB_API = "https://api.github.com"


def _github_headers() -> dict[str, str]:
    token = get_token("github")
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def github_list_repos(per_page: int = 30, sort: str = "updated") -> dict[str, Any]:
    """Liste les dépôts de l'utilisateur authentifié."""
    url = f"{_GITHUB_API}/user/repos?per_page={per_page}&sort={sort}"
    repos = _http_get(url, _github_headers())
    if isinstance(repos, list):
        return {"repos": [
            {"id": r.get("id"), "name": r.get("full_name"), "private": r.get("private"),
             "stars": r.get("stargazers_count"), "desc": r.get("description"),
             "url": r.get("html_url"), "default_branch": r.get("default_branch"),
             "language": r.get("language"), "updated_at": r.get("updated_at")}
            for r in repos
        ], "count": len(repos)}
    return {"error": "github_unauthorized", "detail": repos}


def github_search_code(query: str, per_page: int = 10) -> dict[str, Any]:
    """Recherche de code across GitHub (reproductibilité des méthodes scientifiques)."""
    q = urllib.parse.quote(query)
    url = f"{_GITHUB_API}/search/code?q={q}&per_page={per_page}"
    res = _http_get(url, _github_headers())
    items = res.get("items", []) if isinstance(res, dict) else []
    return {"results": [
        {"repo": i.get("repository", {}).get("full_name"), "path": i.get("path"),
         "name": i.get("name"), "url": i.get("html_url"), "score": i.get("score")}
        for i in items
    ], "total": res.get("total_count", 0)}


def github_search_repos(query: str, per_page: int = 10) -> dict[str, Any]:
    """Recherche de dépôts (utile pour trouver implémentations d'algorithmes)."""
    q = urllib.parse.quote(query)
    url = f"{_GITHUB_API}/search/repositories?q={q}&per_page={per_page}&sort=stars"
    res = _http_get(url, _github_headers())
    items = res.get("items", []) if isinstance(res, dict) else []
    return {"results": [
        {"name": i.get("full_name"), "stars": i.get("stargazers_count"),
         "desc": i.get("description"), "url": i.get("html_url"),
         "language": i.get("language"), "forks": i.get("forks_count")}
        for i in items
    ], "total": res.get("total_count", 0)}


def github_read_file(owner: str, repo: str, path: str, ref: str = "") -> dict[str, Any]:
    """Lit un fichier d'un dépôt (récupération d'un pipeline/scipt scientifique)."""
    ref_part = f"?ref={urllib.parse.quote(ref)}" if ref else ""
    url = f"{_GITHUB_API}/repos/{owner}/{repo}/contents/{urllib.parse.quote(path)}{ref_part}"
    res = _http_get(url, _github_headers())
    if isinstance(res, dict) and res.get("content"):
        import base64
        content = base64.b64decode(res["content"]).decode("utf-8", errors="replace")
        return {"path": res.get("path"), "size": res.get("size"), "encoding": res.get("encoding"),
                "content": content, "sha": res.get("sha")}
    return {"error": "not_found_or_dir", "detail": res if isinstance(res, dict) else {}}


def github_get_repo(owner: str, repo: str) -> dict[str, Any]:
    url = f"{_GITHUB_API}/repos/{owner}/{repo}"
    r = _http_get(url, _github_headers())
    if isinstance(r, dict) and r.get("id"):
        return {"name": r.get("full_name"), "desc": r.get("description"),
                "stars": r.get("stargazers_count"), "forks": r.get("forks_count"),
                "default_branch": r.get("default_branch"), "url": r.get("html_url"),
                "language": r.get("language"), "topics": r.get("topics", [])}
    return {"error": "not_found", "detail": r}


def github_list_prs(owner: str, repo: str, state: str = "open", per_page: int = 10) -> dict[str, Any]:
    url = f"{_GITHUB_API}/repos/{owner}/{repo}/pulls?state={state}&per_page={per_page}"
    prs = _http_get(url, _github_headers())
    if isinstance(prs, list):
        return {"prs": [
            {"number": p.get("number"), "title": p.get("title"), "state": p.get("state"),
             "user": p.get("user", {}).get("login"), "url": p.get("html_url"),
             "draft": p.get("draft"), "updated_at": p.get("updated_at")}
            for p in prs
        ], "count": len(prs)}
    return {"error": "failed", "detail": prs}


def github_create_issue(owner: str, repo: str, title: str, body: str = "", labels: list[str] | None = None) -> dict[str, Any]:
    """Crée une issue (ex: bug dans un pipeline scientifique reproduit)."""
    url = f"{_GITHUB_API}/repos/{owner}/{repo}/issues"
    payload: dict[str, Any] = {"title": title, "body": body}
    if labels:
        payload["labels"] = labels
    h = _github_headers()
    h["Content-Type"] = "application/json"
    if not h.get("Authorization"):
        return {"error": "no_token", "message": "Authentification GitHub requise pour créer une issue."}
    try:
        r = _http_post(url, h, payload)
        if isinstance(r, dict) and r.get("number"):
            return {"created": True, "number": r.get("number"), "url": r.get("html_url"), "title": r.get("title")}
        return {"error": "failed", "detail": r}
    except Exception as e:
        return {"error": "request_failed", "detail": str(e)}


def github_action(action: str, params: dict[str, Any]) -> dict[str, Any]:
    """Dispatcheur des actions GitHub."""
    if action == "list_repos":
        return github_list_repos(per_page=int(params.get("per_page", 30)))
    if action == "search_code":
        return github_search_code(params.get("query", ""), per_page=int(params.get("per_page", 10)))
    if action == "search_repos":
        return github_search_repos(params.get("query", ""), per_page=int(params.get("per_page", 10)))
    if action == "read_file":
        return github_read_file(params.get("owner", ""), params.get("repo", ""), params.get("path", ""), params.get("ref", ""))
    if action == "get_repo":
        return github_get_repo(params.get("owner", ""), params.get("repo", ""))
    if action == "list_prs":
        return github_list_prs(params.get("owner", ""), params.get("repo", ""), params.get("state", "open"))
    if action == "create_issue":
        return github_create_issue(params.get("owner", ""), params.get("repo", ""), params.get("title", ""), params.get("body", ""), params.get("labels"))
    return {"error": "unknown_action", "action": action}


# ── arXiv ─────────────────────────────────────────────────────────────────────

_ARXIV_API = "http://export.arxiv.org/api/query"


def arxiv_search(query: str, max_results: int = 10) -> dict[str, Any]:
    """Recherche de prépublications scientifiques sur arXiv."""
    import xml.etree.ElementTree as ET
    q = urllib.parse.quote(query)
    url = f"{_ARXIV_API}?search_query=all:{q}&start=0&max_results={max_results}"
    headers = {"User-Agent": "RATISS-Aeon/9.0 (scientific agent; mailto:ratiss@example.org)"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read().decode("utf-8", errors="replace")
    ns = {"a": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(body)
    results = []
    for entry in root.findall("a:entry", ns):
        title = entry.findtext("a:title", default="", namespaces=ns).strip().replace("\n", " ")
        summary = entry.findtext("a:summary", default="", namespaces=ns).strip().replace("\n", " ")
        published = entry.findtext("a:published", default="", namespaces=ns)
        id_url = entry.findtext("a:id", default="", namespaces=ns)
        authors = [a.findtext("a:name", default="", namespaces=ns) for a in entry.findall("a:author", ns)]
        link_pdf = ""
        for link in entry.findall("a:link", ns):
            if link.get("title") == "pdf":
                link_pdf = link.get("href", "")
        results.append({"id": id_url, "title": title, "summary": summary[:500],
                        "authors": authors, "published": published, "pdf_url": link_pdf})
    return {"results": results, "count": len(results), "query": query}


def arxiv_action(action: str, params: dict[str, Any]) -> dict[str, Any]:
    if action == "search":
        return arxiv_search(params.get("query", ""), max_results=int(params.get("max_results", 10)))
    return {"error": "unknown_action", "action": action}


# ── Zenodo ────────────────────────────────────────────────────────────────────

_ZENODO_API = "https://zenodo.org/api"
_ZENODO_SANDBOX = "https://sandbox.zenodo.org/api"


def _zenodo_headers() -> dict[str, str]:
    token = get_token("zenodo")
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def zenodo_search(query: str, size: int = 10) -> dict[str, Any]:
    q = urllib.parse.quote(query)
    url = f"{_ZENODO_API}/records?q={q}&size={size}"
    res = _http_get(url, {"User-Agent": "RATISS-Aeon/9.0"})
    hits = res.get("hits", {}).get("hits", []) if isinstance(res, dict) else []
    return {"results": [
        {"id": h.get("id"), "title": h.get("metadata", {}).get("title"),
         "doi": h.get("doi"), "url": h.get("links", {}).get("self"),
         "created": h.get("created"), "type": h.get("metadata", {}).get("resource_type", {}).get("title")}
        for h in hits
    ], "total": res.get("hits", {}).get("total", 0) if isinstance(res, dict) else 0}


def zenodo_action(action: str, params: dict[str, Any]) -> dict[str, Any]:
    if action == "search":
        return zenodo_search(params.get("query", ""), size=int(params.get("size", 10)))
    return {"error": "unknown_action", "action": action}


# ── OpenAlex ──────────────────────────────────────────────────────────────────

_OPENALEX_API = "https://api.openalex.org"


def openalex_search_works(query: str, per_page: int = 10) -> dict[str, Any]:
    email = get_token("openalex") or "ratiss@example.org"
    q = urllib.parse.quote(query)
    url = f"{_OPENALEX_API}/works?search={q}&per-page={per_page}&mailto={urllib.parse.quote(email)}"
    res = _http_get(url, {"User-Agent": f"RATISS-Aeon/9.0 (mailto:{email})"})
    results = res.get("results", []) if isinstance(res, dict) else []
    return {"results": [
        {"id": w.get("id"), "title": w.get("title"), "doi": w.get("doi"),
         "publication_year": w.get("publication_year"),
         "cited_by_count": w.get("cited_by_count"),
         "authors": [a.get("author", {}).get("display_name") for a in (w.get("authorships") or [])[:5]],
         "abstract": (w.get("abstract_inverted_index") and "…") or None,
         "type": w.get("type")}
        for w in results
    ], "count": res.get("meta", {}).get("count", 0) if isinstance(res, dict) else 0}


def openalex_action(action: str, params: dict[str, Any]) -> dict[str, Any]:
    if action == "search_works":
        return openalex_search_works(params.get("query", ""), per_page=int(params.get("per_page", 10)))
    return {"error": "unknown_action", "action": action}


# ── Crossref ──────────────────────────────────────────────────────────────────

_CROSSREF_API = "https://api.crossref.org"


def crossref_search(query: str, rows: int = 10) -> dict[str, Any]:
    q = urllib.parse.quote(query)
    url = f"{_CROSSREF_API}/works?query={q}&rows={rows}"
    res = _http_get(url, {"User-Agent": "RATISS-Aeon/9.0 (mailto:ratiss@example.org)"})
    items = res.get("message", {}).get("items", []) if isinstance(res, dict) else []
    return {"results": [
        {"doi": i.get("DOI"), "title": (i.get("title") or [""])[0],
         "container": (i.get("container-title") or [""])[0],
         "publisher": i.get("publisher"), "year": (i.get("published-print") or i.get("published-online") or {}).get("date-parts", [[None]])[0][0],
         "authors": [f"{a.get('given','')} {a.get('family','')}".strip() for a in (i.get("author") or [])[:5]],
         "type": i.get("type")}
        for i in items
    ], "total": res.get("message", {}).get("total-results", 0) if isinstance(res, dict) else 0}


def crossref_lookup_doi(doi: str) -> dict[str, Any]:
    doi = urllib.parse.quote(doi, safe="")
    url = f"{_CROSSREF_API}/works/{doi}"
    res = _http_get(url, {"User-Agent": "RATISS-Aeon/9.0 (mailto:ratiss@example.org)"})
    msg = res.get("message", {}) if isinstance(res, dict) else {}
    if not msg:
        return {"error": "not_found", "doi": doi}
    return {"doi": msg.get("DOI"), "title": (msg.get("title") or [""])[0],
            "container": (msg.get("container-title") or [""])[0],
            "authors": [f"{a.get('given','')} {a.get('family','')}".strip() for a in (msg.get("author") or [])],
            "abstract": msg.get("abstract"), "type": msg.get("type")}


def crossref_action(action: str, params: dict[str, Any]) -> dict[str, Any]:
    if action == "search":
        return crossref_search(params.get("query", ""), rows=int(params.get("rows", 10)))
    if action == "lookup_doi":
        return crossref_lookup_doi(params.get("doi", ""))
    return {"error": "unknown_action", "action": action}


# ── RCSB PDB (banque mondiale de structures 3D) ──────────────────────────────

def rcsb_search(query: str, max_results: int = 10) -> dict[str, Any]:
    """Recherche de structures dans la banque RCSB PDB."""
    q = urllib.parse.quote(query)
    url = (
        "https://search.rcsb.org/rcsbsearch/v2/query?json="
        + urllib.parse.quote(
            json.dumps({
                "query": {"type": "group", "logical_operator": "and",
                           "nodes": [{"type": "terminal", "service": "full_text", "parameters": {"value": query}}]},
                "return_type": "entry",
                "request_options": {"paginate": {"start": 0, "rows": max_results}},
            })
        )
    )
    return _http_get(url)


def rcsb_fetch_structure(pdb_id: str) -> dict[str, Any]:
    """Récupère les métadonnées d'une structure PDB + l'URL de téléchargement CIF/PDB."""
    pid = (pdb_id or "").upper()
    if not pid:
        return {"pdb_id": "", "error": "missing_pdb_id", "data": None}
    base = f"https://data.rcsb.org/rest/v1/core/entry/{pid}"
    try:
        data = _http_get(base)
    except Exception as e:
        return {"pdb_id": pid, "error": f"HTTP_error: {e}", "data": None}
    if not isinstance(data, dict) or "_raw" in data:
        return {"pdb_id": pid, "error": "non_json_response", "data": None}
    return {
        "pdb_id": pid,
        "title": (data.get("struct") or {}).get("title", ""),
        "method": (data.get("exptl") or [{}])[0].get("method", "") if data.get("exptl") else "",
        "resolution": (data.get("rcsb_entry_info") or {}).get("resolution_combined", [None])[0],
        "organism": (data.get("rcsb_entity_source_organism") or [{}])[0].get("ncbi_scientific_name", ""),
        "url": f"https://www.rcsb.org/structure/{pid}",
        "download_url": f"https://files.rcsb.org/download/{pid}.cif",
        "pdb_download_url": f"https://files.rcsb.org/download/{pid}.pdb",
        "data": data,
        "error": None,
    }


def rcsb_pdb_action(action: str, params: dict[str, Any]) -> dict[str, Any]:
    if action == "search":
        return rcsb_search(params.get("query", ""), max_results=int(params.get("max_results", 10)))
    if action == "fetch_structure":
        return rcsb_fetch_structure(params.get("pdb_id", params.get("id", "")))
    return {"error": "unknown_action", "action": action}


# ── Overleaf (collaboration LaTeX) ───────────────────────────────────────────

def overleaf_list_projects(token: str) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"}
    return _http_get("https://api.overleaf.com/v1/projects", headers=headers)


def overleaf_push_latex(token: str, project_id: str, path: str, content: str) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {"path": path, "content": content}
    return _http_post(f"https://api.overleaf.com/v1/projects/{project_id}/file", headers, payload)


def overleaf_action(action: str, params: dict[str, Any]) -> dict[str, Any]:
    token = params.get("token") or get_token("overleaf") or ""
    if not token:
        return {"error": "missing_token", "integration": "overleaf"}
    if action == "list_projects":
        return overleaf_list_projects(token)
    if action == "push_latex":
        return overleaf_push_latex(token, params.get("project_id", ""), params.get("path", ""), params.get("content", ""))
    return {"error": "unknown_action", "action": action}


# ── IBM Quantum (QPU) ───────────────────────────────────────────────────────

def ibm_quantum_action(action: str, params: dict[str, Any]) -> dict[str, Any]:
    token = params.get("token") or get_token("ibm_quantum") or ""
    if not token:
        return {"error": "missing_token", "integration": "ibm_quantum"}
    if action == "list_backends":
        headers = {"Authorization": f"Bearer {token}"}
        return _http_get("https://api.quantum-computing.ibm.com/v1/backends", headers=headers)
    return {"error": "unknown_action", "action": action}


# ── Dispatcheur universel ─────────────────────────────────────────────────────

def run_integration(integration_id: str, action: str, params: dict[str, Any]) -> dict[str, Any]:
    """Exécute une action d'intégration. Renvoie un dict structuré."""
    dispatch = {
        "github": github_action,
        "arxiv": arxiv_action,
        "zenodo": zenodo_action,
        "openalex": openalex_action,
        "crossref": crossref_action,
        "rcsb_pdb": rcsb_pdb_action,
        "overleaf": overleaf_action,
        "ibm_quantum": ibm_quantum_action,
    }
    fn = dispatch.get(integration_id)
    if not fn:
        return {"error": "unknown_integration", "integration": integration_id}
    try:
        return fn(action, params)
    except Exception as e:
        return {"error": "request_failed", "integration": integration_id, "action": action, "detail": str(e)}
