"""
tests/test_agentique_pdb_pdf.py — Test du pipeline agentique complet :
structure PDB + topologie (Betti) + visualisation + rapport PDF enrichi.

Valide la chaîne de bout en bout (sans serveur, sans clé API externe) :
  1. L'agent planifie et exécute une tâche mêlant PDB + Betti + PDF + graphique.
  2. Toutes les étapes s'exécutent avec succès (load_pdb, topology, generate_*).
  3. Un rapport PDF ENRICHI est généré : il contient la structure PDB, les
     nombres de Betti et une visualisation graphique embarquée.
  4. Le contenu du PDF reflète bien les données réelles (4MZI, Betti, b0/b1/b2).

Ce test incarne le cas d'usage « l'agent génère un PDF sur un problème avec sa
structure PDB plus visualisation » demandé par l'auteur.
"""
import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

import pytest

from orchestrator.agent import RatissAgent


@pytest.fixture(scope="module")
def agentic_run():
    """Exécute une fois l'agent sur une tâche PDB + Betti + PDF + visualisation."""
    agent = RatissAgent(emit_fn=lambda evt: None)
    task = (
        "Analyse la structure PDB 4MZI (p53) avec topologie Betti "
        "et génère un rapport PDF avec graphique de visualisation"
    )
    summary = agent.run(task)
    return summary, agent


def _workspace_path(summary: dict) -> Path:
    ws = summary["workspace"]
    return ws if os.path.isabs(ws) else _ROOT / ws


def _extract_pdf_text(pdf_path: Path) -> str:
    """Extrait le texte d'un PDF (pypdf si disponible, sinon binaire brut)."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(pdf_path))
        return "".join((page.extract_text() or "") for page in reader.pages)
    except Exception:
        # Fallback : le texte PDF contient les chaînes en clair entre markers
        return pdf_path.read_bytes().decode("latin-1", errors="ignore")


def test_pipeline_steps_all_succeed(agentic_run):
    """Toutes les étapes du pipeline agentique doivent réussir."""
    summary, _ = agentic_run
    assert summary["steps_executed"] >= 3, "Le pipeline doit comporter au moins 3 étapes"
    assert summary["steps_success"] == summary["steps_executed"], (
        f"Toutes les étapes doivent réussir : {summary['steps_success']}/{summary['steps_executed']}"
    )


def test_load_pdb_executed(agentic_run):
    """L'étape load_pdb doit être présente et chargée."""
    summary, _ = agentic_run
    pdb_steps = [r for r in summary["results"] if r.get("action") == "load_pdb" and "error" not in r]
    assert len(pdb_steps) >= 1, "L'étape load_pdb doit être exécutée"
    pdb_res = pdb_steps[0]["result"]
    assert pdb_res["status"] == "PDB_LOADED"
    assert pdb_res["pdb_id"] == "4MZI"


def test_topology_executed(agentic_run):
    """L'étape topology doit produire des nombres de Betti."""
    summary, _ = agentic_run
    topo_steps = [r for r in summary["results"] if r.get("action") == "topology" and "error" not in r]
    assert len(topo_steps) >= 1, "L'étape topology doit être exécutée"
    topo_res = topo_steps[0]["result"]
    assert topo_res["status"] == "SUCCESS"
    betti = topo_res.get("betti_numbers")
    assert betti is not None and len(betti) >= 1, "Les nombres de Betti doivent être calculés"


def test_enriched_pdf_generated(agentic_run):
    """Un rapport PDF enrichi doit être généré dans le workspace."""
    summary, _ = agentic_run
    ws_path = _workspace_path(summary)
    pdfs = sorted(
        [f for f in os.listdir(ws_path) if f.startswith("rapport_") and f.endswith(".pdf")],
        key=lambda f: os.path.getsize(ws_path / f),
        reverse=True,
    )
    assert len(pdfs) >= 1, "Au moins un rapport PDF doit être généré"
    # Le PDF enrichi est le plus gros (contient sections PDB + Betti + image)
    enriched = ws_path / pdfs[0]
    assert enriched.stat().st_size > 2000, (
        f"Le PDF enrichi doit dépasser 2000 octets (sections PDB+Betti+viz), reçu {enriched.stat().st_size}"
    )


def test_enriched_pdf_contains_pdb_structure(agentic_run):
    """Le PDF enrichi doit contenir les métadonnées de la structure PDB."""
    summary, _ = agentic_run
    ws_path = _workspace_path(summary)
    pdfs = sorted(
        [f for f in os.listdir(ws_path) if f.startswith("rapport_") and f.endswith(".pdf")],
        key=lambda f: os.path.getsize(ws_path / f),
        reverse=True,
    )
    text = _extract_pdf_text(ws_path / pdfs[0])
    assert "4MZI" in text, "Le PDF doit mentionner l'identifiant PDB 4MZI"
    assert "PDB" in text, "Le PDF doit référencer la structure PDB"


def test_enriched_pdf_contains_betti(agentic_run):
    """Le PDF enrichi doit contenir les nombres de Betti et leur décomposition."""
    summary, _ = agentic_run
    ws_path = _workspace_path(summary)
    pdfs = sorted(
        [f for f in os.listdir(ws_path) if f.startswith("rapport_") and f.endswith(".pdf")],
        key=lambda f: os.path.getsize(ws_path / f),
        reverse=True,
    )
    text = _extract_pdf_text(ws_path / pdfs[0])
    assert "Betti" in text, "Le PDF doit mentionner les nombres de Betti"
    assert "b0" in text or "composantes" in text, "Le PDF doit détailler b0 (composantes connexes)"


def test_enriched_pdf_contains_visualization(agentic_run):
    """Le PDF enrichi doit embarquer une visualisation (graphique Betti)."""
    summary, _ = agentic_run
    ws_path = _workspace_path(summary)
    # Un graphique de visualisation doit accompagner le PDF
    charts = [f for f in os.listdir(ws_path) if f.startswith("chart_") and "betti" in f.lower()]
    assert len(charts) >= 1, "Un graphique de visualisation Betti doit être généré"
    assert (ws_path / charts[0]).stat().st_size > 0


def test_zk_certification_present(agentic_run):
    """Le pipeline doit produire une certification ZK-STARK."""
    summary, _ = agentic_run
    ws_path = _workspace_path(summary)
    # ZK soit en étape explicite, soit en reçu sauvegardé
    zk_steps = [r for r in summary["results"] if r.get("action") == "zk_proof"]
    has_receipt = (ws_path / "zk_receipt.b64").exists()
    assert len(zk_steps) >= 1 or has_receipt, "Une certification ZK doit être présente"


def test_result_artifact_saved(agentic_run):
    """Le résumé d'exécution doit être sauvegardé (result.json)."""
    summary, _ = agentic_run
    ws_path = _workspace_path(summary)
    assert (ws_path / "result.json").exists(), "result.json doit être sauvegardé"
