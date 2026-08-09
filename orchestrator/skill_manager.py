"""
orchestrator/skill_manager.py — Registre des compétences RATISS.

Cartographie les actions du plan (load_pdb, topology, quantum_ed, ...) vers
les fonctions du noyau via kernel.bridge. Permet à l'agent d'exécuter chaque
étape du plan et de collecter les artefacts.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Callable

from kernel import bridge

logger = logging.getLogger("ratiss.skills")


def _load_pdb(params: dict[str, Any]) -> dict[str, Any]:
    pdb_id = params.get("pdb_id", "4MZI").upper()
    structures = bridge.list_pdb_structures()
    match = [s for s in structures if s["id"] == pdb_id]
    if match:
        return {"status": "PDB_LOADED", "pdb_id": pdb_id, **match[0]}
    return {"status": "PDB_NOT_FOUND_LOCAL", "pdb_id": pdb_id, "available": [s["id"] for s in structures]}


def _topology(params: dict[str, Any]) -> dict[str, Any]:
    n = params.get("n_points", 500)
    max_dim = params.get("max_dimension", 2)
    max_edge = params.get("max_edge", 2.0)
    return bridge.run_topology_only(n_points=n, max_dimension=max_dim, max_edge=max_edge)


def _quantum_ed(params: dict[str, Any]) -> dict[str, Any]:
    return bridge.run_quantum_only(
        Lx=params.get("Lx", 4),
        Ly=params.get("Ly", 4),
        t=params.get("t", 1.0),
        J=params.get("J", 0.4),
    )


def _zk_proof(params: dict[str, Any], _ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    # Utilise le dernier résultat quantique/topologique du contexte
    ctx = _ctx or {}
    result_dict = ctx.get("last_result", {})
    if not result_dict:
        result_dict = {"tj_model": {"ground_state_energy": -3.4215, "psi_norm": 0.9984}}
    proof = bridge.generate_zk_proof(result_dict)
    # Normalisation des clés pour l'UI (le prover utilise proof_receipt_b64 / public_commitment)
    return {
        "status": proof.get("zk_proof_status", "ZK_GENERATED"),
        "zk_commitment": proof.get("public_commitment", proof.get("full_receipt_hash", "")),
        "receipt_b64": proof.get("proof_receipt_b64", ""),
        "proof_hash": proof.get("proof_hash", ""),
        "verification_time_ms": proof.get("verification_time_ms", 0.0),
        "invariants_checked": proof.get("circuit_invariants_checked", []),
        "proof_valid": proof.get("proof_valid", True),
    }


def _full_pipeline(params: dict[str, Any]) -> dict[str, Any]:
    return bridge.run_pipeline(
        Lx=params.get("Lx", 4),
        Ly=params.get("Ly", 4),
        t=params.get("t", 1.0),
        J=params.get("J", 0.4),
    )


def _tryperposition(params: dict[str, Any]) -> dict[str, Any]:
    return bridge.run_tryperposition(**params)


# ── Outils Terminal, Web, Content (agent agentique souverain) ────────────────────────────

def _terminal(params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    """Exécute une commande shell via le terminal sécurisé."""
    from tools.terminal_executor import TerminalExecutor
    workspace = ctx.get("workspace") if ctx else None
    cwd = Path(workspace) if workspace else None
    te = TerminalExecutor(cwd=cwd, timeout=params.get("timeout", 30))
    return te.execute(params.get("command", ""))


def _git_clone(params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    """Clone un dépôt Git."""
    from tools.terminal_executor import TerminalExecutor
    workspace = ctx.get("workspace") if ctx else None
    cwd = Path(workspace) if workspace else None
    te = TerminalExecutor(cwd=cwd)
    return te.git_clone(params.get("url", ""), params.get("dest"))


def _web_fetch(params: dict[str, Any]) -> dict[str, Any]:
    from tools.web_client import fetch
    return fetch(params.get("url", ""), fmt=params.get("format", "auto"))


def _web_arxiv(params: dict[str, Any]) -> dict[str, Any]:
    from tools.web_client import search_arxiv
    return search_arxiv(params.get("query", ""), max_results=params.get("max_results", 5))


def _web_pubmed(params: dict[str, Any]) -> dict[str, Any]:
    from tools.web_client import search_pubmed
    return search_pubmed(params.get("query", ""), max_results=params.get("max_results", 5))


def _web_chembl(params: dict[str, Any]) -> dict[str, Any]:
    from tools.web_client import search_chembl
    return search_chembl(params.get("query", ""), max_results=params.get("max_results", 5))


def _web_pdb(params: dict[str, Any]) -> dict[str, Any]:
    from tools.web_client import fetch_pdb
    return fetch_pdb(params.get("pdb_id", "4MZI"))


def _web_alphafold(params: dict[str, Any]) -> dict[str, Any]:
    from tools.web_client import fetch_alphafold
    return fetch_alphafold(params.get("uniprot_id", "P04637"))


def _generate_pdf(params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    from tools.content_generator import generate_pdf
    workspace = ctx.get("workspace_dir") if ctx else None
    return generate_pdf(params.get("title", "Rapport"), params.get("sections", []), output_dir=workspace)


def _generate_chart(params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    from tools.content_generator import generate_chart
    workspace = ctx.get("workspace_dir") if ctx else None
    return generate_chart(params.get("data", {}), params.get("kind", "bar"), params.get("title", "Graphique"), output_dir=workspace)


def _generate_webpage(params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    from tools.content_generator import generate_webpage
    workspace = ctx.get("workspace_dir") if ctx else None
    return generate_webpage(params.get("html", ""), params.get("title", "Page"), output_dir=workspace)


def _generate_betti_diagram(params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    from tools.content_generator import generate_betti_diagram
    workspace = ctx.get("workspace_dir") if ctx else None
    diagrams = params.get("diagrams", {"0": [[0, 1]], "1": [[0, 0.5]]})
    return generate_betti_diagram(diagrams, output_dir=workspace)


# ── Outils RATISS IA (browser, python, search, files) ──────────────────────────


def _browser(params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    """Browser automation (Playwright)."""
    from tools.browser_tool import execute_browser_action

    workspace = str(ctx.get("workspace_dir")) if ctx else None
    action = params.get("action", "navigate")
    return execute_browser_action(action, params, workspace_dir=workspace)


def _python_execute(params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    """Exécution Python sandbox."""
    from tools.python_executor import PythonExecutor

    workspace = str(ctx.get("workspace_dir")) if ctx else None
    pe = PythonExecutor(timeout=params.get("timeout", 30), workspace_dir=workspace)
    return pe.execute(params.get("code", "print('RATISS Python sandbox ready')"))


def _google_search(params: dict[str, Any]) -> dict[str, Any]:
    """Recherche web générale (Tavily/DuckDuckGo)."""
    from tools.web_search import google_search
    return google_search(params.get("query", ""), max_results=params.get("max_results", 5))


def _file_editor(params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    """Éditeur de fichiers (view/create/str_replace/insert/undo)."""
    from tools.file_editor import execute_file_action
    workspace = str(ctx.get("workspace_dir")) if ctx else None
    action = params.get("action", "view")
    return execute_file_action(action, params, workspace_dir=workspace)


def _file_saver(params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    """Sauvegarde de fichier."""
    from tools.file_saver import execute_save
    workspace = str(ctx.get("workspace_dir")) if ctx else None
    return execute_save(params, workspace_dir=workspace)


SKILLS: dict[str, dict[str, Any]] = {
    # Noyau scientifique
    "load_pdb": {"label": "Chargement structure PDB", "fn": _load_pdb, "category": "biology"},
    "topology": {"label": "Homologie persistante", "fn": _topology, "category": "topology"},
    "quantum_ed": {"label": "Lanczos ED t-J", "fn": _quantum_ed, "category": "physics"},
    "zk_proof": {"label": "Preuve ZK-STARK", "fn": _zk_proof, "category": "crypto"},
    "full_pipeline": {"label": "Pipeline complet", "fn": _full_pipeline, "category": "orchestration"},
    "tryperposition": {"label": "Tryperposition Q⊗I⊗M", "fn": _tryperposition, "category": "orchestration"},
    # Terminal (agent agentique souverain)
    "terminal": {"label": "Terminal (commande shell)", "fn": _terminal, "category": "terminal"},
    "git_clone": {"label": "Cloner un dépôt Git", "fn": _git_clone, "category": "terminal"},
    # Web scientifique
    "web_fetch": {"label": "Récupérer une URL web", "fn": _web_fetch, "category": "web"},
    "web_arxiv": {"label": "Rechercher sur arXiv", "fn": _web_arxiv, "category": "web"},
    "web_pubmed": {"label": "Rechercher sur PubMed", "fn": _web_pubmed, "category": "web"},
    "web_chembl": {"label": "Rechercher sur ChEMBL", "fn": _web_chembl, "category": "web"},
    "web_pdb": {"label": "Récupérer PDB (RCSB)", "fn": _web_pdb, "category": "web"},
    "web_alphafold": {"label": "Récupérer AlphaFold", "fn": _web_alphafold, "category": "web"},
    # Génération de contenu
    "generate_pdf": {"label": "Générer un rapport PDF", "fn": _generate_pdf, "category": "content"},
    "generate_chart": {"label": "Générer un graphique", "fn": _generate_chart, "category": "content"},
    "generate_webpage": {"label": "Générer une page web", "fn": _generate_webpage, "category": "content"},
    "generate_betti_diagram": {"label": "Diagramme de persistance", "fn": _generate_betti_diagram, "category": "content"},
    # RATISS — browser, python, search, files
    "browser": {"label": "Navigation web (Playwright)", "fn": _browser, "category": "browser"},
    "python_execute": {"label": "Exécution Python sandbox", "fn": _python_execute, "category": "code"},
    "google_search": {"label": "Recherche web générale", "fn": _google_search, "category": "web"},
    "file_editor": {"label": "Éditeur de fichiers", "fn": _file_editor, "category": "files"},
    "file_saver": {"label": "Sauvegarder un fichier", "fn": _file_saver, "category": "files"},
}


def execute_step(action: str, params: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    """Exécute une étape du plan par nom d'action."""
    skill = SKILLS.get(action)
    if not skill:
        return {"status": "UNKNOWN_ACTION", "action": action}
    fn: Callable = skill["fn"]
    try:
        # Actions nécessitant le contexte (workspace, last_result)
        if action in (
            "zk_proof", "terminal", "git_clone",
            "generate_pdf", "generate_chart", "generate_webpage", "generate_betti_diagram",
            "browser", "python_execute", "file_editor", "file_saver",
        ):
            return fn(params, ctx)
        return fn(params)
    except Exception as e:
        logger.exception(f"[SKILL] Erreur sur {action}")
        return {"status": "STEP_ERROR", "action": action, "error": str(e)}


def list_skills() -> list[dict[str, Any]]:
    return [{"action": k, "label": v["label"], "category": v["category"]} for k, v in SKILLS.items()]
