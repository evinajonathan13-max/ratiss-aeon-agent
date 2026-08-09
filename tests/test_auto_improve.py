"""
tests/test_auto_improve.py — Test de la boucle d'auto-amélioration (RLM / Continual Harness).

Valide la chaîne complète sur une tâche complexe (4MZI + Betti + ZK) :
  1. Exécution du pipeline (validation du résultat)
  2. Analyse de la trajectoire (auto_improve.analyze_trajectory)
  3. Extraction des leçons (auto_improve.extract_lessons)
  4. Validation ZK des leçons (auto_improve.validate_lessons_with_zk)
  5. Application au harnais (harness_manager.apply_updates) + versioning
  6. Génération du rapport PDF d'auto-amélioration
  7. Rollback du harnais

Lancé sans serveur : utilise directement l'agent et les modules.
"""
import os
import sys
import shutil
import tempfile
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

import pytest

from orchestrator.agent import RatissAgent
from orchestrator.auto_improve import (
    analyze_trajectory,
    extract_lessons,
    validate_lessons_with_zk,
    refine,
)
from orchestrator.harness_manager import HarnessManager


@pytest.fixture
def tmp_harness(tmp_path, monkeypatch):
    """Isolation du harnais dans un répertoire temporaire pour chaque test."""
    harness = HarnessManager(base_dir=tmp_path / "harness")
    import orchestrator.harness_manager as hm
    monkeypatch.setattr(hm, "_singleton", harness)
    monkeypatch.setattr("orchestrator.agent.get_harness", lambda: harness)
    return harness


@pytest.fixture(scope="module")
def executed_summary():
    """Exécute une fois le pipeline 4MZI + Betti + ZK et renvoie (summary, plan)."""
    agent = RatissAgent(emit_fn=lambda evt: None)
    summary = agent.run("Analyse 4MZI, extrais les Betti, génère un graphique, un rapport PDF et certifie ZK")
    return summary, agent.last_plan


def test_pipeline_executed_successfully(executed_summary):
    """Le pipeline complexe doit s'exécuter avec un taux de succès élevé."""
    summary, _ = executed_summary
    assert summary["steps_executed"] >= 3
    assert summary["steps_success"] >= 1
    zk_steps = [r for r in summary["results"] if r.get("action") == "zk_proof"]
    assert len(zk_steps) >= 1
    assert zk_steps[0]["result"].get("proof_valid") is True


def test_analyze_trajectory(executed_summary):
    """L'analyse produit des métriques et un hash."""
    summary, plan = executed_summary
    analysis = analyze_trajectory(summary, plan)
    metrics = analysis["metrics"]
    assert metrics["steps_executed"] == summary["steps_executed"]
    assert 0.0 <= metrics["success_rate"] <= 1.0
    assert metrics["zk_validated"] is True
    assert analysis["analysis_hash"]
    assert len(analysis["observable_facts"]) >= 1


def test_extract_lessons(executed_summary):
    """L'extraction produit au moins une leçon de type memory pour une tâche 4MZI+Betti."""
    summary, plan = executed_summary
    analysis = analyze_trajectory(summary, plan)
    lessons = extract_lessons(analysis)
    assert len(lessons) >= 1
    types = {l["type"] for l in lessons}
    assert "memory" in types
    for l in lessons:
        assert l["id"] and l["type"] and l["target"] and l["content"]
        assert 0.0 <= l["confidence"] <= 1.0


def test_validate_lessons_with_zk(executed_summary):
    """La validation ZK des leçons doit réussir (invariants physiques préservés)."""
    summary, plan = executed_summary
    analysis = analyze_trajectory(summary, plan)
    lessons = extract_lessons(analysis)
    zk = validate_lessons_with_zk(lessons)
    assert zk["valid"] is True
    assert zk["proof_hash"]
    assert zk["lessons_hash"]


def test_refine_pipeline_returns_proposed_updates(executed_summary):
    """refine() orchestre analyse+leçons+ZK+propositions et renvoie un rapport complet."""
    summary, plan = executed_summary
    report = refine(summary, plan)
    assert "analysis" in report
    assert len(report["lessons"]) >= 1
    assert report["zk_validation"]["valid"] is True
    assert len(report["proposed_updates"]) >= 1
    for upd in report["proposed_updates"]:
        assert upd["op"].startswith("upsert_") or upd["op"].startswith("delete_")
        assert upd["payload"]


def test_harness_apply_updates_versioning(tmp_harness, executed_summary):
    """L'application des mises à jour incrémente la version et crée un snapshot."""
    summary, plan = executed_summary
    report = refine(summary, plan)
    updates = report["proposed_updates"]
    assert tmp_harness.state()["version"] == 0

    for lesson in report["lessons"]:
        tmp_harness.archive_lesson(lesson)

    result = tmp_harness.apply_updates(updates, reason="test_refine")
    assert result["status"] == "APPLIED"
    assert result["version"] == 1
    assert len(result["results"]) == len(updates)

    state = tmp_harness.state()
    assert state["version"] == 1
    assert len(state["history"]) == 1
    assert state["history"][0]["reason"] == "test_refine"
    assert len(state["memory"]) >= 1
    snap_name = state["history"][0]["snapshot"].split("/")[-1]
    assert (tmp_harness.versions_dir / snap_name).exists()


def test_harness_rollback(tmp_harness, executed_summary):
    """Le rollback restaure l'état antérieur."""
    summary, plan = executed_summary
    report = refine(summary, plan)
    tmp_harness.apply_updates(report["proposed_updates"], reason="apply")
    assert tmp_harness.state()["version"] == 1
    assert len(tmp_harness.state()["memory"]) >= 1

    res = tmp_harness.rollback(0)
    assert res["status"] == "ROLLED_BACK"
    assert tmp_harness.state()["version"] == 0
    assert len(tmp_harness.state()["memory"]) == 0


def test_harness_crud_operations(tmp_harness):
    """Les opérations CRUD du harnais fonctionnent (prompt, memory, skill, subagent)."""
    h = tmp_harness
    h.upsert_prompt("test_prompt", "Fais ceci.")
    assert h.get_prompt("test_prompt") == "Fais ceci."
    h.upsert_memory("betti_4mzi", [1, 2, 0], source="test", confidence=0.9)
    assert h.get_memory("betti_4mzi") == [1, 2, 0]
    h.upsert_skill("custom_action", "Action custom", category="test")
    assert "custom_action" in h.state()["skills"]
    h.upsert_subagent("analyst", "Analyste topologie", "Analyse les Betti.")
    assert "analyst" in h.state()["subagents"]
    h.delete_prompt("test_prompt")
    assert h.get_prompt("test_prompt") is None


def test_agent_refine_generates_pdf(tmp_harness):
    """agent.refine(apply=True) génère un rapport PDF d'auto-amélioration."""
    agent = RatissAgent(emit_fn=lambda evt: None)
    agent.run("Analyse 4MZI, extrais les Betti, certifie ZK")
    report = agent.refine(apply=True)
    assert report["status"] == "REFINED"
    assert report["zk_validation"]["valid"] is True
    applied = report.get("applied", {})
    assert applied.get("status") == "APPLIED"
    pdf = report.get("report_pdf", {})
    assert pdf.get("filename")
    assert pdf.get("size_bytes", 0) > 0
    assert pdf.get("preview_url")


def test_pitfall_lesson_on_failed_action(tmp_harness):
    """Une trajectoire avec une action échouée produit une leçon de type pitfall."""
    fake_summary = {
        "task": "Tâche bidon avec échec",
        "results": [
            {"step_id": 1, "action": "load_pdb", "result": {"status": "PDB_LOADED", "pdb_id": "4MZI"}},
            {"step_id": 2, "action": "topology", "result": {"status": "SUCCESS", "betti_numbers": [1, 2, 0]}},
            {"step_id": 3, "action": "bad_action", "result": {"status": "UNKNOWN_ACTION"}},
        ],
        "execution_time_sec": 0.5,
    }
    fake_plan = {"goal": "test", "domain": "topology", "planner": "test", "steps": []}
    analysis = analyze_trajectory(fake_summary, fake_plan)
    assert analysis["metrics"]["steps_failed"] >= 1
    lessons = extract_lessons(analysis)
    pitfalls = [l for l in lessons if l["type"] == "pitfall"]
    assert len(pitfalls) >= 1
