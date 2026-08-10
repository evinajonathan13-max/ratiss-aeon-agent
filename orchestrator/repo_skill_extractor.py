"""orchestrator.repo_skill_extractor — Analyse de repo clone -> creation de skills.

Quand RATISS clone un depot Git, il peut l'analyser et proposer la creation de
skills de competences lui-meme, sous validation utilisateur. L'analyse est
deterministe (heuristiques locales) :
  - Detection du langage / framework (README, package.json, pyproject.toml, Cargo.toml...)
  - Extraction des points d'entree (main, cli, scripts)
  - Proposition de skills (label, categorie, commande d'invocation)
  - Validation utilisateur requise avant enregistrement dans le HarnessManager
"""

from __future__ import annotations
import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Signatures de langage/framework
_LANG_SIGNATURES = [
    ("python", ["setup.py", "pyproject.toml", "requirements.txt", "*.py"]),
    ("node", ["package.json", "*.js", "*.ts"]),
    ("rust", ["Cargo.toml", "*.rs"]),
    ("go", ["go.mod", "*.go"]),
    ("java", ["pom.xml", "build.gradle", "*.java"]),
    ("cpp", ["CMakeLists.txt", "Makefile", "*.cpp", "*.h"]),
    ("ruby", ["Gemfile", "*.rb"]),
]

# Mots-cles scientifiques pour categoriser
_SCI_KEYWORDS = {
    "physics": ["quantum", "lanczos", "hamiltonian", "qubit", "spin", "lattice"],
    "biology": ["pdb", "protein", "alphafold", "biopython", "sequence"],
    "topology": ["homology", "betti", "gudhi", "persistence", "vietoris"],
    "crypto": ["zk", "stark", "proof", "risc", "commitment"],
    "ml": ["model", "train", "dataset", "neural", "transformer"],
    "web": ["http", "api", "server", "fastapi", "flask", "express"],
    "data": ["csv", "dataframe", "pandas", "numpy", "analysis"],
}


def _detect_language(repo_path: Path) -> List[str]:
    langs: List[str] = []
    for lang, files in _LANG_SIGNATURES:
        for pattern in files:
            if pattern.startswith("*"):
                if list(repo_path.rglob(pattern))[:1]:
                    if lang not in langs:
                        langs.append(lang)
            else:
                if (repo_path / pattern).exists() and lang not in langs:
                    langs.append(lang)
    return langs


def _detect_category(repo_path: Path, readme_text: str) -> str:
    text = readme_text.lower()
    scores: Dict[str, int] = {}
    for cat, keywords in _SCI_KEYWORDS.items():
        scores[cat] = sum(text.count(kw) for kw in keywords)
    # Aussi scanner les noms de fichiers
    for f in repo_path.rglob("*"):
        if f.is_file():
            fname = f.name.lower()
            for cat, keywords in _SCI_KEYWORDS.items():
                scores[cat] = scores.get(cat, 0) + sum(fname.count(kw) for kw in keywords)
    best = max(scores, key=scores.get) if scores else "utility"
    return best if scores.get(best, 0) > 0 else "utility"


def _extract_entry_points(repo_path: Path, langs: List[str]) -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    # Python : main.py, cli.py, __main__.py, scripts console_scripts
    if "python" in langs:
        for name in ["main.py", "cli.py", "app.py", "run.py", "__main__.py"]:
            if (repo_path / name).exists():
                entries.append({"file": name, "type": "python_script", "invoke": f"python {name}"})
        # console_scripts dans pyproject.toml
        pp = repo_path / "pyproject.toml"
        if pp.exists():
            try:
                content = pp.read_text(errors="ignore")
                for m in re.finditer(r'(\w[\w-]*)\s*=\s*"([\w.]+):(\w+)"', content):
                    entries.append({"file": m.group(3) + ".py", "type": "console_script", "invoke": m.group(1)})
            except Exception:
                pass
    # Node : package.json bin
    if "node" in langs:
        pj = repo_path / "package.json"
        if pj.exists():
            try:
                pkg = json.loads(pj.read_text())
                for name in (pkg.get("bin") or {}).keys():
                    entries.append({"file": "bin", "type": "node_bin", "invoke": f"npx {name}"})
                if pkg.get("scripts"):
                    for script in pkg["scripts"]:
                        entries.append({"file": "package.json", "type": "npm_script", "invoke": f"npm run {script}"})
            except Exception:
                pass
    # Rust : Cargo.toml bin
    if "rust" in langs:
        ct = repo_path / "Cargo.toml"
        if ct.exists():
            try:
                content = ct.read_text(errors="ignore")
                for m in re.finditer(r'name\s*=\s*"([^"]+)"', content):
                    entries.append({"file": "src/main.rs", "type": "rust_bin", "invoke": f"cargo run --bin {m.group(1)}"})
                    break
            except Exception:
                pass
    return entries[:10]  # limiter


def _extract_readme_summary(repo_path: Path) -> str:
    for name in ["README.md", "README.rst", "README.txt", "readme.md"]:
        p = repo_path / name
        if p.exists():
            try:
                text = p.read_text(errors="ignore")
                # Premier paragraphe non vide apres le titre
                lines = [l.strip() for l in text.splitlines() if l.strip()]
                summary_lines: List[str] = []
                for line in lines[1:20]:
                    if line.startswith("#"):
                        continue
                    summary_lines.append(line)
                    if len(summary_lines) >= 3:
                        break
                return " ".join(summary_lines)[:300]
            except Exception:
                pass
    return ""


def analyze_repo(repo_path: str | Path) -> Dict[str, Any]:
    """Analyse un repo clone et propose des skills sous validation."""
    repo = Path(repo_path)
    if not repo.exists():
        return {"status": "ERROR", "error": f"repo_not_found: {repo}"}

    langs = _detect_language(repo)
    readme = _extract_readme_summary(repo)
    category = _detect_category(repo, readme)
    entries = _extract_entry_points(repo, langs)

    # Proposer des skills a partir des points d'entree
    proposed_skills: List[Dict[str, Any]] = []
    repo_name = repo.name
    for i, entry in enumerate(entries):
        skill_id = f"repo_{repo_name}_{entry['type']}_{i}".lower().replace("-", "_")
        skill_id = re.sub(r"[^a-z0-9_]", "", skill_id)
        proposed_skills.append({
            "skill_id": skill_id,
            "label": f"{repo_name}: {entry['invoke']}",
            "category": category,
            "invoke": entry["invoke"],
            "entry_file": entry["file"],
            "validated": False,  # requiert validation utilisateur
        })

    return {
        "status": "SUCCESS",
        "repo_path": str(repo),
        "repo_name": repo_name,
        "languages": langs,
        "category": category,
        "readme_summary": readme,
        "entry_points": entries,
        "proposed_skills": proposed_skills,
        "validation_required": True,
    }


def validate_and_register_skills(analysis: Dict[str, Any], harness_manager, skill_ids: List[str] | None = None) -> Dict[str, Any]:
    """Valide et enregistre les skills proposes dans le HarnessManager.

    Args:
        analysis: resultat de analyze_repo
        harness_manager: instance HarnessManager
        skill_ids: liste des skill_ids a valider (None = tous)
    """
    registered: List[str] = []
    skipped: List[str] = []
    for skill in analysis.get("proposed_skills", []):
        if skill_ids and skill["skill_id"] not in skill_ids:
            skipped.append(skill["skill_id"])
            continue
        try:
            harness_manager.upsert_skill(
                name=skill["skill_id"],
                label=skill["label"],
                category=skill["category"],
                enabled=True,
                metadata={"invoke": skill["invoke"], "source": "repo_analysis", "entry_file": skill["entry_file"]},
            )
            registered.append(skill["skill_id"])
        except Exception as e:
            logger.exception(f"[SKILL-EXTRACTOR] Erreur enregistrement {skill['skill_id']}")
            skipped.append(f"{skill['skill_id']}: {e}")
    return {
        "status": "SUCCESS",
        "registered": registered,
        "skipped": skipped,
        "version": harness_manager.state().get("version", 0),
    }
