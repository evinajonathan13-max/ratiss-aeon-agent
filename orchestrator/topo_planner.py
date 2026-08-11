"""
orchestrator/topo_planner.py — Planificateur topologique FRL (First Reasoning Learn).

Le « vrai cerveau » qui n'a pas toujours besoin du LLM. Tâche → projection en
concepts → sous-graphe requête → rappel structurel dans le Structural Data Vault
→ émission d'un plan par ordre topologique du sous-graphe matched.

Chaîne de fallback INVERSÉE (le cœur de FRL) :
    topo_planner (rappel structurel)  →  heuristique locale (mots-clés)
    →  LLM (dernier recours)

Le LLM devient un recours, pas le défaut. C'est la définition littérale de
l'objectif : « un vrai cerveau qui n'a pas toujours besoin du LLM connecté ».

Déterministe, reproductible, falsifiable (red-teamable). Aucune clé n'est
jamais requise pour le chemin topo_planner — c'est le test d'indépendance LLM.

Usage :
    from orchestrator.topo_planner import plan_topological
    plan = plan_topological("Analyse topologique de la protéine p53-MDM2 4MZI")
"""
from __future__ import annotations

import logging
from typing import Any

from kernel.core.structural_vault import get_vault
from orchestrator.skill_manager import list_skills

logger = logging.getLogger("ratiss.topo_planner")

# Actions scientifiques validables ZK (chaînes de certification).
SCIENTIFIC_ACTIONS = {"quantum_ed", "topology", "full_pipeline", "tryperposition", "load_pdb"}

# Catalogue des concepts déclencheurs : mots-clés de la tâche -> concepts du vault.
# Le projecteur est volontairement simple (déterministe) : il ne fait pas de
# raisonnement, il traduit le langage naturel en concepts a-sémantiques.
TRIGGER_KEYWORDS: list[tuple[list[str], str, str]] = [
    # (mots-clés, type_concept, nom_concept)
    (["4mzi", "p53", "mdm2"], "entity", "4MZI"),
    (["4mzr", "3kmd"], "entity", "4MZR"),
    (["1tup", "2ocj"], "entity", "2OCJ"),
    (["pdb", "protéine", "protein", "structure"], "action", "load_pdb"),
    (["betti", "homologie", "topologie", "topology", "poche", "pocket", "persistance"], "action", "topology"),
    (["quantique", "quantum", "lanczos", "t-j", "tj", "énergie", "energy", "spin", "ground state"], "action", "quantum_ed"),
    (["zk", "stark", "preuve", "proof", "certif", "risc zero"], "action", "zk_proof"),
    (["pipeline complet", "full pipeline", "tryperposition", "abscisse", "décohérence", "decoherence", "cohérence"], "action", "full_pipeline"),
    (["arxiv", "prépublication", "prepublication", "article"], "action", "web_arxiv"),
    (["pubmed", "biomédical", "biomedical"], "action", "web_pubmed"),
    (["chembl", "composé", "compose", "molécule", "molecule", "drug"], "action", "web_chembl"),
    (["alphafold"], "action", "web_alphafold"),
    (["rapport", "report", "pdf", "document"], "action", "generate_pdf"),
    (["graphique", "chart", "diagramme", "plot", "figure"], "action", "generate_chart"),
    (["page web", "webpage", "html", "site"], "action", "generate_webpage"),
    (["diagramme de persistance", "persistence diagram", "betti diagram"], "action", "generate_betti_diagram"),
    (["navigate", "ouvre le site", "ouvrir le site", "visite", "browser", "naviguer"], "action", "browser"),
    (["python", "exécute le code", "execute code", "calcule", "script"], "action", "python_execute"),
    (["recherche web", "google", "search"], "action", "google_search"),
    (["terminal", "shell", "commande"], "action", "terminal"),
]

# Domaines attendus (alignés sur le planificateur local existant).
DOMAIN_KEYWORDS: list[tuple[list[str], str]] = [
    (["quantique", "quantum", "lanczos", "t-j", "énergie", "spin"], "quantum"),
    (["betti", "homologie", "topologie", "topology", "persistance"], "topology"),
    (["pdb", "protéine", "protein", "p53", "mdm2", "alphafold", "pubmed"], "structural_biology"),
    (["zk", "stark", "preuve", "proof", "certif", "crypto", "chiffrement"], "crypto"),
]
DEFAULT_DOMAIN = "orchestration"


# ── Projection : tâche -> concepts ────────────────────────────────────────────


def _concept_id(kind: str, name: str) -> str:
    return f"{kind}:{str(name).strip().lower()}"


def project_task(task: str) -> tuple[list[str], str]:
    """Projette une tâche en langage naturel vers une liste de concepts du vault.

    Déterministe : mots-clés -> (type, nom) -> concept_id. Détecte aussi le
    domaine dominant.
    """
    t = task.lower()
    concepts: list[str] = []
    seen: set[str] = set()
    domain = DEFAULT_DOMAIN
    for keywords, ctype, cname in TRIGGER_KEYWORDS:
        if any(k in t for k in keywords):
            cid = _concept_id(ctype, cname)
            if cid not in seen:
                concepts.append(cid)
                seen.add(cid)
    # Domaine
    for keywords, dom in DOMAIN_KEYWORDS:
        if any(k in t for k in keywords):
            domain = dom
            break
    # Toujours inclure le concept de domaine pour ancrer le rappel structurel
    dom_cid = _concept_id("domain", domain)
    if dom_cid not in seen:
        concepts.append(dom_cid)
    return concepts, domain


# ── Planificateur topologique ─────────────────────────────────────────────────


def plan_topological(task: str) -> dict[str, Any]:
    """Planifie une tâche par rappel structurel dans le Structural Data Vault.

    Renvoie un plan au même format que les autres planificateurs (planner, goal,
    domain, steps, expected_artifacts) pour intégration transparente dans la
    boucle ReAct de l'agent.

    Si le vault ne contient pas assez de structure (vault froid), renvoie un
    plan vide avec planner="topo_cold" pour que l'appelant bascule sur la
    chaîne de fallback (heuristique locale -> LLM).
    """
    concepts, domain = project_task(task)
    vault = get_vault()

    # Vault chaud ? Assez de structure pour rappeler.
    if len(vault.nodes) < 3:
        return {
            "planner": "topo_cold",
            "goal": task[:160],
            "domain": domain,
            "steps": [],
            "expected_artifacts": [],
            "concepts": concepts,
            "recall": None,
        }

    # Rappel structurel : sous-graphe le plus proche dans le vault.
    matches = vault.nearest_subgraph(concepts, top_k=3)
    if not matches:
        return {
            "planner": "topo_cold",
            "goal": task[:160],
            "domain": domain,
            "steps": [],
            "expected_artifacts": [],
            "concepts": concepts,
            "recall": None,
        }

    best = matches[0]
    steps = _build_plan_from_recall(best, concepts, domain)
    artifacts = _infer_artifacts(steps)

    return {
        "planner": "topo_recall",
        "planner_detail": f"rappel structurel (dist={best['distance']}, β={best['beta']})",
        "goal": task[:160],
        "domain": domain,
        "steps": steps,
        "expected_artifacts": artifacts,
        "concepts": concepts,
        "recall": {
            "distance": best["distance"],
            "beta": best["beta"],
            "matched_concepts": best["concepts"],
            "signature": best["signature"],
        },
    }


def _build_plan_from_recall(
    match: dict[str, Any], query_concepts: list[str], domain: str
) -> list[dict[str, Any]]:
    """Construit un plan par ordre topologique du sous-graphe rappelé.

    On extrait les actions du sous-graphe matched et on les ordonne selon les
    arêtes de « precede » (ordre causal observé dans les trajectoires passées).
    C'est le raisonnement par rappel structurel : on rejoue la séquence qui a
    déjà réussi topologiquement, validée par persistance.
    """
    vault = get_vault()
    matched = set(match["concepts"])
    # Actions présentes dans le sous-graphe rappelé (par ordre de persistance décroissant)
    actions = [
        (nid, vault.nodes[nid])
        for nid in matched
        if nid.startswith("action:") and vault.nodes[nid]["kind"] == "action"
    ]
    actions.sort(key=lambda kv: kv[1].get("weight", 0.0), reverse=True)

    if not actions:
        return []

    # Ordre causal via les arêtes "precede" entre actions du sous-graphe.
    # On construit un graphe orienté A->B si (A precede B) observé.
    preds: dict[str, set[str]] = {nid: set() for nid, _ in actions}
    action_ids = {nid for nid, _ in actions}
    for e in vault.edges.values():
        if e["rel"] == "precede" and e["src"] in action_ids and e["dst"] in action_ids:
            preds[e["dst"]].add(e["src"])

    # Tri topologique (Kahn) : on émet d'abord les actions sans prédécesseur,
    # puis on débloque les suivantes. Détermiste (tri par poids + nom à égalité).
    ordered: list[str] = []
    remaining = {nid: True for nid in action_ids}
    weight_of = {nid: vault.nodes[nid].get("weight", 0.0) for nid in action_ids}
    while remaining:
        ready = [nid for nid in remaining if not preds[nid]]
        if not ready:
            # Cycle : on brise en émettant le plus lourd (le vault peut avoir des cycles β1)
            ready = sorted(remaining, key=lambda n: (-weight_of[n], n))[:1]
        ready.sort(key=lambda n: (-weight_of[n], n))
        nxt = ready[0]
        ordered.append(nxt)
        del remaining[nxt]
        for other in preds:
            preds[other].discard(nxt)

    steps: list[dict[str, Any]] = []
    for i, nid in enumerate(ordered, 1):
        action = nid.split(":", 1)[1]
        params = _default_params(action, query_concepts)
        steps.append({
            "id": i,
            "action": action,
            "params": params,
            "description": f"[FRL rappel] {action} (poids={round(weight_of[nid], 2)})",
        })

    # Complétude ZK : si une action scientifique est présente, on s'assure
    # qu'une certification zk_proof suit (logique de chaîne de confiance).
    has_sci = any(s["action"] in SCIENTIFIC_ACTIONS for s in steps)
    has_zk = any(s["action"] == "zk_proof" for s in steps)
    if has_sci and not has_zk:
        steps.append({
            "id": len(steps) + 1,
            "action": "zk_proof",
            "params": {},
            "description": "[FRL rappel] Certification ZK-STARK (chaîne de confiance)",
        })
    return steps


def _default_params(action: str, query_concepts: list[str]) -> dict[str, Any]:
    """Paramètres par défaut d'une action, dérivés des concepts requêtés."""
    if action == "load_pdb":
        # Détecte l'entité PDB dans les concepts (ex: entity:4mzi -> 4MZI)
        for c in query_concepts:
            if c.startswith("entity:"):
                return {"pdb_id": c.split(":", 1)[1].upper()}
        return {"pdb_id": "4MZI"}
    if action == "topology":
        return {"n_points": 500, "max_dimension": 2, "max_edge": 2.0}
    if action == "quantum_ed":
        return {"Lx": 4, "Ly": 4, "t": 1.0, "J": 0.4}
    if action in ("full_pipeline", "tryperposition"):
        return {"Lx": 4, "Ly": 4, "t": 1.0, "J": 0.4}
    return {}


_ARTIFACT_MAP = {
    "load_pdb": "pdb_result.json",
    "topology": "betti_diagram.json",
    "quantum_ed": "quantum_result.json",
    "zk_proof": "zk_receipt.b64",
    "full_pipeline": "result.json",
    "tryperposition": "tryperposition_result.json",
    "web_arxiv": "arxiv_results.json",
    "web_pubmed": "pubmed_results.json",
    "web_chembl": "chembl_results.json",
    "generate_pdf": "rapport_scientifique.pdf",
    "generate_chart": "chart.png",
    "generate_webpage": "page.html",
    "generate_betti_diagram": "betti_diagram.png",
}


def _infer_artifacts(steps: list[dict[str, Any]]) -> list[str]:
    return [_ARTIFACT_MAP[s["action"]] for s in steps if s["action"] in _ARTIFACT_MAP]


# ── Chaîne de fallback inversée : topo -> heuristique -> LLM ───────────────────


def plan(task: str, allow_llm: bool = True) -> dict[str, Any]:
    """Chaîne de planification FRL complète, dans l'ordre de priorité voulu :

    1. topo_planner  — rappel structurel (zéro LLM). Le vrai cerveau.
    2. heuristique locale (nemotron _local_plan) — mots-clés, déterministe.
    3. LLM (Nemotron/OpenRouter/router) — dernier recours si allow_llm.

    Le premier qui produit un plan exploitable (>= 1 étape) gagne. On logge
    quel chemin a été emprunté pour mesurer le ratio d'indépendance LLM.

    Returns:
        Plan + champ "frl_source" : "topo_recall" | "topo_cold" |
        "heuristic" | "llm" | "llm_failed".
    """
    # 1. Topo planner (rappel structurel)
    topo_plan = plan_topological(task)
    if topo_plan.get("steps"):
        topo_plan["frl_source"] = "topo_recall"
        logger.info(f"[FRL] Plan par rappel structurel ({len(topo_plan['steps'])} étapes, "
                    f"dist={topo_plan.get('recall', {}).get('distance')}).")
        return topo_plan

    # 2. Heuristique locale (déterministe, mots-clés)
    try:
        from orchestrator.nemotron_client import NemotronClient
        heuristic = NemotronClient()._local_plan(task)
        if heuristic.get("steps"):
            heuristic["frl_source"] = "heuristic"
            logger.info(f"[FRL] Vault froid → plan heuristique local ({len(heuristic['steps'])} étapes).")
            return heuristic
    except Exception as e:
        logger.warning(f"[FRL] Heuristique locale échouée ({e}).")

    # 3. LLM (dernier recours)
    if allow_llm:
        try:
            from orchestrator.nemotron_client import NemotronClient
            llm_plan = NemotronClient().plan(task)
            if llm_plan.get("steps"):
                llm_plan["frl_source"] = "llm"
                logger.info(f"[FRL] LLM requis ({len(llm_plan['steps'])} étapes, planner={llm_plan.get('planner')}).")
                return llm_plan
        except Exception as e:
            logger.warning(f"[FRL] LLM échoué ({e}).")

    # Échec total : renvoyer le plan froid (vide) pour ne pas bloquer l'agent.
    topo_plan["frl_source"] = "llm_failed" if allow_llm else "no_llm_cold"
    logger.warning(f"[FRL] Aucun plan exploitable (source={topo_plan['frl_source']}).")
    return topo_plan


def independence_ratio(tasks: list[str]) -> dict[str, Any]:
    """Mesure le ratio d'indépendance LLM sur un lot de tâches.

    Métrique clé de l'émergence FRL : % de tâches planifiées sans LLM.
    Doit croître à mesure que le Structural Data Vault se remplit.

    Returns:
        {"total", "topo_recall", "heuristic", "llm", "failed",
         "llm_independence_pct" (topo+heuristic), "topo_recall_pct"}
    """
    stats = {"total": len(tasks), "topo_recall": 0, "heuristic": 0, "llm": 0, "failed": 0}
    for task in tasks:
        p = plan_topological(task)
        if p.get("steps"):
            stats["topo_recall"] += 1
        else:
            # Simuler la suite de la chaîne sans appeler le LLM (métrique pure)
            from orchestrator.nemotron_client import NemotronClient
            h = NemotronClient()._local_plan(task)
            if h.get("steps"):
                stats["heuristic"] += 1
            else:
                stats["llm"] += 1
    stats["failed"] = 0  # la chaîne produit toujours un plan (froid au pire)
    done = stats["total"] or 1
    stats["llm_independence_pct"] = round(100.0 * (stats["topo_recall"] + stats["heuristic"]) / done, 1)
    stats["topo_recall_pct"] = round(100.0 * stats["topo_recall"] / done, 1)
    return stats
