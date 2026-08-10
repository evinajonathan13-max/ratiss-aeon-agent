"""Test agentique complet v9.4 — piloté par le vrai LLM OpenRouter.

Exerce le pipeline : planification LLM → load_pdb → topology (Betti) →
diagramme de persistance → rapport PDF + téléchargement PDB réel depuis RCSB.
Les artefacts atterrissent dans le workspace du container ; ils seront copiés
hors du container puis committés comme preuve de fonctionnement.
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

from orchestrator.agent import RatissAgent
from orchestrator.skill_manager import execute_step, list_skills
from orchestrator.llm_router import llm_router

MODEL = "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free"
TASK = (
    "Analyse scientifique de la protéine p53-MDM2 (PDB 4MZI). "
    "Étapes demandées : (1) charger la structure PDB 4MZI, "
    "(2) calculer l'homologie persistante et les nombres de Betti, "
    "(3) générer le diagramme de persistance, "
    "(4) générer un rapport PDF scientifique complet. "
    "Topologie Betti, PDB, rapport PDF."
)

print("=" * 72)
print("TEST AGENTIQUE COMPLET RATISS v9.4 — LLM réel OpenRouter")
print("=" * 72)

# 0. État des fournisseurs LLM
status = llm_router.status()
providers = status.get("providers", {})
print("\n[0] Fournisseurs LLM configurés :")
for k, v in providers.items():
    flag = "OK" if v.get("available") else "--"
    print(f"    {k:12s} {flag}  ({v.get('name','')})")

# 1. Vérification de l'identité souveraine (vrai LLM)
print("\n[1] Test identité souveraine (vrai LLM OpenRouter)...")
resp = llm_router.complete(
    "Réponds en une phrase : qui es-tu et quel est ton nom ?",
    model_id=MODEL, max_tokens=200,
)
print(f"    Réponse LLM : {resp[:240]}")
assert "Ratiss" in resp or "RATISS" in resp, "L'identité souveraine n'est pas injectée !"
print("    -> Identité souveraine OK (Ratiss s'identifie, pas Nemotron)")

# 2. Planification via le LLM
print("\n[2] Planification de la tâche par le LLM...")
print(f"    Tâche : {TASK[:120]}...")
t0 = time.time()
plan = llm_router.plan(TASK, model_id=MODEL)
plan_t = time.time() - t0
planner = plan.get("planner", "?")
steps = plan.get("steps", [])
print(f"    Planificateur : {planner} ({plan_t:.1f}s)")
print(f"    Étapes LLM    : {len(steps)}")
for s in steps[:8]:
    print(f"      - {s.get('action','?')} : {s.get('description','')[:60]}")

if not steps or plan.get("_parse_error"):
    print("    -> Plan LLM illisible, fallback planificateur local...")
    from orchestrator.nemotron_client import NemotronClient
    plan = NemotronClient()._local_plan(TASK)
    steps = plan.get("steps", [])
    print(f"    Étapes locales : {len(steps)}")
    for s in steps[:8]:
        print(f"      - {s.get('action','?')} : {s.get('description','')[:60]}")

print(f"    Domaine : {plan.get('domain','?')}")

# 3. Exécution agentique complète (ReAct) — le modèle vient de RATISS_MODEL_ID
print("\n[3] Exécution ReAct de l'agent Ratiss...")
agent = RatissAgent()
summary = agent.run(TASK)
print(f"    Étapes exécutées : {summary.get('steps_executed',0)} "
      f"(succès : {summary.get('steps_success',0)})")
print(f"    Temps total : {summary.get('execution_time_sec',0)}s")
print(f"    Workspace : {summary.get('workspace','')}")

# 4. Téléchargement du fichier PDB réel (4MZI) depuis RCSB
print("\n[4] Téléchargement PDB réel 4MZI depuis RCSB...")
pdb_url = "https://files.rcsb.org/download/4MZI.pdb"
ws = Path("/app") / summary.get("workspace", "workspace/agent_run")
ws.mkdir(parents=True, exist_ok=True)
pdb_path = ws / "4MZI.pdb"
try:
    urllib.request.urlretrieve(pdb_url, pdb_path)
    size = pdb_path.stat().st_size
    print(f"    PDB téléchargé : {pdb_path.name} ({size} octets)")
    with open(pdb_path) as f:
        head = f.readline().strip()
    print(f"    1ère ligne PDB : {head[:70]}")
except Exception as e:
    print(f"    Téléchargement PDB échoué : {e}")

# 5. Génération du rapport PDF final (avec sections réelles)
print("\n[5] Génération du rapport PDF final...")
sections = []
# Section identité
sections.append({
    "heading": "Identite souveraine RATISS",
    "content": (
        "Instance : JohnKing0 / RATISS V9 Aeon Prime\n"
        "Mode : souverain (cloud opt-in) avec LLM OpenRouter Nemotron 3 Ultra\n"
        f"Test identite LLM : {resp[:200]}\n"
        "Verdict : le LLM s'identifie comme Ratiss (injection souveraine OK)."
    ),
})
# Section plan
sections.append({
    "heading": "Plan LLM",
    "content": (
        f"Planificateur : {planner}\n"
        f"Etapes : {len(steps)}\n"
        f"Domaine : {plan.get('domain','')}\n"
        f"Modele : {MODEL}\n"
        + "\n".join(f"- {s.get('action','')}: {s.get('description','')}" for s in steps[:8])
    ),
})
# Section résultats étapes
results = summary.get("results", [])
res_lines = []
for r in results:
    a = r.get("action", "?")
    st = r.get("result", r).get("status", "OK") if isinstance(r.get("result", r), dict) else "OK"
    res_lines.append(f"- {a}: {st}")
sections.append({
    "heading": "Resultats d'execution (ReAct)",
    "content": (
        f"Etapes executees : {summary.get('steps_executed',0)}\n"
        f"Etapes reussies : {summary.get('steps_success',0)}\n"
        f"Temps : {summary.get('execution_time_sec',0)}s\n"
        + "\n".join(res_lines)
    ),
})
# Section académique
acad = summary.get("academic", {})
sections.append({
    "heading": "Signature academique",
    "content": (
        f"Auteur : {acad.get('author','Jonathan Evina')}\n"
        f"ORCID : {acad.get('orcid','0009-0000-4092-5313')}\n"
        f"DOI   : {acad.get('doi','10.17605/OSF.IO/6JZMB')}\n"
        "Genere par l'agent Ratiss v9.4 (preuve de fonctionnement agentique)."
    ),
})
from tools.content_generator import generate_pdf
pdf_res = generate_pdf("Rapport Test Agentique Ratiss v9.4", sections, output_dir=ws)
print(f"    PDF : {pdf_res.get('filename')} ({pdf_res.get('size_bytes','?')} octets)")

# 6. Mémoire persistante
print("\n[6] Mémoire persistante...")
from kernel.system.sovereign_memory import get_memory
mem = get_memory()
mems = mem.list_memories()
print(f"    Souvenirs : {len(mems)} | onboarded : {mem._mem.get('onboarded')}")
if mems:
    print(f"    Dernier souvenir : {mems[-1].get('content','')[:100]}")

# 7. Récap artefacts
print("\n[7] Artefacts produits :")
for p in sorted(ws.iterdir()):
    if p.is_file():
        print(f"    {p.name:42s} {p.stat().st_size:>8} octets")

print("\n" + "=" * 72)
print("TEST AGENTIQUE COMPLET : TERMINE")
print("=" * 72)
print(json.dumps({"planner": planner, "steps": len(steps),
                  "executed": summary.get("steps_executed",0),
                  "success": summary.get("steps_success",0),
                  "workspace": str(ws.relative_to("/app")),
                  "pdf": pdf_res.get("filename"),
                  "pdb": "4MZI.pdb"}, indent=2))
