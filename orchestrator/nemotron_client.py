"""
orchestrator/nemotron_client.py — Client OpenRouter pour Nemotron 3 Ultra (planification).

Rôle : reçoit une tâche en langage naturel, retourne un plan structuré (JSON)
décomposé en étapes exécutables par le noyau RATISS.

Souveraineté : si OPENROUTER_API_KEY est absent, bascule sur un planificateur
local déterministe (heuristique par mots-clés). Aucune clé n'est jamais loggée.
"""
from __future__ import annotations

import os
import json
import logging
import urllib.request
from typing import Any

logger = logging.getLogger("ratiss.nemotron")

MODEL = os.environ.get("OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")
ENDPOINT = os.environ.get("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")
TIMEOUT = int(os.environ.get("OPENROUTER_TIMEOUT_SECONDS", "30"))

SYSTEM_PROMPT = """Tu es Nemotron 3 Ultra, le planificateur scientifique de RATISS V9 Aeon Prime.
Tu reçois une tâche scientifique en langage naturel et tu la décomposes en un plan structuré.

Réponds UNIQUEMENT avec un objet JSON de la forme :
{
  "goal": "résumé de l'objectif",
  "domain": "quantum | topology | structural_biology | crypto | orchestration",
  "steps": [
    {"id": 1, "action": "load_pdb", "params": {"pdb_id": "4MZI"}, "description": "Charger la structure"},
    {"id": 2, "action": "topology", "params": {"max_dimension": 2}, "description": "Homologie persistante"},
    {"id": 3, "action": "quantum_ed", "params": {"Lx": 4, "Ly": 4}, "description": "Diagonalisation Lanczos"},
    {"id": 4, "action": "zk_proof", "params": {}, "description": "Certification ZK-STARK"}
  ],
  "expected_artifacts": ["result.json", "zk_receipt.b64", "betti_diagram.png"]
}

Actions disponibles : load_pdb, topology, quantum_ed, zk_proof, full_pipeline, tryperposition.
Sois précis et minimal. Pas de texte hors JSON."""


class NemotronClient:
    """Client OpenRouter avec fallback local déterministe."""

    def __init__(self):
        self.api_key = (os.environ.get("OPENROUTER_API_KEY") or "").strip()
        self.available = bool(self.api_key)
        self.model = MODEL

    def plan(self, task: str) -> dict[str, Any]:
        """Planifie une tâche : Nemotron si disponible, sinon fallback local."""
        if self.available:
            try:
                return self._call_openrouter(task)
            except Exception as e:
                logger.warning(f"[NEMOTRON] Échec OpenRouter ({e}), fallback local.")
                return self._local_plan(task, fallback=True)
        return self._local_plan(task)

    def _call_openrouter(self, task: str) -> dict[str, Any]:
        body = json.dumps({
            "model": MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": task},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }).encode("utf-8")
        req = urllib.request.Request(ENDPOINT, data=body, headers={
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.environ.get("OPENROUTER_HTTP_REFERER", "http://127.0.0.1:8787"),
            "X-Title": "RATISS Aeon Prime",
        })
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        content = payload.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        if "```" in content:
            content = content.split("```", 2)[1]
            if content.startswith("json"):
                content = content[4:]
        plan = json.loads(content.strip())
        plan["planner"] = "nemotron_openrouter"
        plan["model"] = MODEL
        return plan

    def _local_plan(self, task: str, fallback: bool = False) -> dict[str, Any]:
        """Planificateur local par heuristique de mots-clés."""
        t = task.lower()
        steps = []
        domain = "orchestration"
        artifacts = ["result.json"]

        if any(k in t for k in ["4mzi", "p53", "mdm2", "protéine", "protein", "pdb"]):
            pdb_id = "4MZI"
            for k, pid in [("4mzi", "4MZI"), ("4mzr", "4MZR"), ("1tup", "1TUP"), ("2ocj", "2OCJ"), ("3kmd", "3KMD")]:
                if k in t:
                    pdb_id = pid
                    break
            steps.append({"id": 1, "action": "load_pdb", "params": {"pdb_id": pdb_id}, "description": f"Charger la structure {pdb_id}"})
            domain = "structural_biology"

        if any(k in t for k in ["betti", "homologie", "topologie", "topology", "poche", "pocket"]):
            sid = len(steps) + 1
            steps.append({"id": sid, "action": "topology", "params": {"max_dimension": 2}, "description": "Homologie persistante (Betti)"})
            artifacts.append("betti_diagram.json")
            domain = "topology"

        if any(k in t for k in ["quantique", "quantum", "lanczos", "t-j", "tj", "énergie", "energy", "spin", "ground state"]):
            sid = len(steps) + 1
            steps.append({"id": sid, "action": "quantum_ed", "params": {"Lx": 4, "Ly": 4, "t": 1.0, "J": 0.4}, "description": "Diagonalisation exacte Lanczos (t-J)"})
            artifacts.append("quantum_result.json")
            domain = "quantum"

        if any(k in t for k in ["zk", "stark", "preuve", "proof", "certif", "risc zero"]):
            sid = len(steps) + 1
            steps.append({"id": sid, "action": "zk_proof", "params": {}, "description": "Certification ZK-STARK RISC Zero"})
            artifacts.append("zk_receipt.b64")

        # Web scientifique
        if any(k in t for k in ["arxiv", "prépublication", "prepublication"]):
            sid = len(steps) + 1
            query = t.split("arxiv")[-1].strip().strip(":").strip() or "quantum"
            steps.append({"id": sid, "action": "web_arxiv", "params": {"query": query[:100]}, "description": f"Recherche arXiv: {query[:50]}"})
            artifacts.append("arxiv_results.json")
        if any(k in t for k in ["pubmed", "biomédical", "biomedical", "article"]):
            sid = len(steps) + 1
            query = "p53 MDM2" if "p53" in t else "protein"
            steps.append({"id": sid, "action": "web_pubmed", "params": {"query": query}, "description": f"Recherche PubMed: {query}"})
            artifacts.append("pubmed_results.json")
        if any(k in t for k in ["chembl", "composé", "compose", "molécule", "molecule", "drug"]):
            sid = len(steps) + 1
            steps.append({"id": sid, "action": "web_chembl", "params": {"query": "aspirin"}, "description": "Recherche ChEMBL"})
            artifacts.append("chembl_results.json")

        # Génération de contenu
        if any(k in t for k in ["rapport", "report", "pdf", "document"]):
            sid = len(steps) + 1
            steps.append({"id": sid, "action": "generate_pdf", "params": {"title": "Rapport scientifique RATISS", "sections": []}, "description": "Génération du rapport PDF"})
            artifacts.append("rapport_scientifique.pdf")
        if any(k in t for k in ["graphique", "chart", "diagramme", "plot", "figure"]):
            sid = len(steps) + 1
            steps.append({"id": sid, "action": "generate_chart", "params": {"data": {}, "kind": "bar", "title": "Résultats"}, "description": "Génération d'un graphique"})
            artifacts.append("chart.png")
        if any(k in t for k in ["page web", "webpage", "html", "site"]):
            sid = len(steps) + 1
            steps.append({"id": sid, "action": "generate_webpage", "params": {"html": "", "title": "Page générée"}, "description": "Génération d'une page web"})
            artifacts.append("page.html")
        if any(k in t for k in ["diagramme de persistance", "persistence diagram", "betti diagram"]):
            sid = len(steps) + 1
            steps.append({"id": sid, "action": "generate_betti_diagram", "params": {"diagrams": {}}, "description": "Diagramme de persistance"})
            artifacts.append("betti_diagram.png")

        # Terminal (si l'utilisateur demande explicitement une commande)
        if any(k in t for k in ["terminal", "shell", "commande", "git clone", "git pull", "pip install"]):
            sid = len(steps) + 1
            cmd = "git --version"
            if "git clone" in t:
                cmd = "git clone --help"
            elif "pip install" in t:
                cmd = "pip --version"
            steps.append({"id": sid, "action": "terminal", "params": {"command": cmd}, "description": f"Terminal: {cmd}"})

        if any(k in t for k in ["tryperposition", "pipeline complet", "unifié", "unified", "tout"]):
            steps = [{"id": 1, "action": "tryperposition", "params": {}, "description": "Pipeline unifié Q ⊗ I ⊗ M"}]
            artifacts = ["result.json", "zk_receipt.b64", "betti_diagram.json", "quantum_result.json"]
            domain = "orchestration"

        if not steps:
            steps = [{"id": 1, "action": "full_pipeline", "params": {"Lx": 4, "Ly": 4}, "description": "Pipeline complet RATISS"}]
            artifacts = ["result.json", "zk_receipt.b64"]

        return {
            "goal": task[:200],
            "domain": domain,
            "steps": steps,
            "expected_artifacts": artifacts,
            "planner": "local_fallback" if fallback else "local_heuristic",
            "model": "ratiss-local-planner-v1",
        }
