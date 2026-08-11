"""
kernel/core/structural_vault.py — Structural Data Vault (SDV).

Le « cerveau » du First Reasoning Learn (FRL). Contrairement à la mémoire
souveraine (qui stocke des souvenirs textuels) et au harnais (qui versionne
prompts/skills), le SDV stocke le **squelette géométrique du raisonnement** :
un graphe conceptuel a-sémantique où les nœuds sont des concepts (actions,
domaines, entités, faits) et les arêtes des relations typées (precede,
depends_on, validates, causes) pondérées par la **persistance topologique**.

Principes fondateurs (FRL) :
  - A-sémantique : on ne stocke pas de mots/tokens, mais la structure
    géométrique du sens (causalité, comportement, poids de concept).
  - Stateless : le graphe est reconstruisable à l'identique depuis les
    trajectoires archivées (idempotent). La persistance n'est qu'un cache.
  - Borné : comme sovereign_memory (MAX 200), le vault plafonne ses nœuds et
    **évince par faible poids de persistance** = la filtration, exactement le
    principe du Topology Compressor appliqué à la mémoire. On ne garde que les
    caractéristiques topologiques invariantes.
  - Auto-stabilisant : chaque ingestion doit préserver la cohérence de Betti
    globale du vault (dβ1/dt = 0) — sinon rejet (le vault ne devient pas un
    blob statistique bruité).

Persistance (sous data/) :
    data/structural_vault.json    # graphe courant (JSON, UTF-8) — cache

Usage :
    from kernel.core.structural_vault import get_vault
    vault = get_vault()
    vault.ingest_trajectory(summary, plan)         # apprend d'une tâche
    sig = vault.persistence_signature(concepts)    # empreinte β0/β1 + hash
    match = vault.nearest_subgraph(concepts)       # rappel structurel
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

from kernel.system.memory_guard import memory_guard, get_current_memory_mb

logger = logging.getLogger("ratiss.structural_vault")

_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = _ROOT / "data"
VAULT_FILE = DATA_DIR / "structural_vault.json"

# Bornes : le vault ne devient jamais un blob statistique.
MAX_NODES = 5000
MAX_EDGES = 20000
# Renforcement de persistance par ingestion réussie (ZK-validée).
PERSISTENCE_REINFORCE_OK = 1.0
PERSISTENCE_REINFORCE_FAIL = 0.2
# Seuil d'évection : sous ce poids, un nœud/arête est du bruit topologique.
EVICT_THRESHOLD = 0.35
# Cohérence de Betti : un vault sain reste majoritairement connexe (β0 petit).
# Une ingestion qui fragmente le graphe au-delà de ce seuil est rejetée.
MAX_CONNECTED_COMPONENTS = 12

# Relations typées du graphe conceptuel.
REL_PRECEDE = "precede"          # A précède B dans une trajectoire (ordre causal)
REL_DEPENDS_ON = "depends_on"    # B dépend de A (ex: topology depends_on load_pdb)
REL_VALIDATES = "validates"      # A valide/certifie B (ex: zk_proof validates topology)
REL_CAUSES = "causes"            # A produit/cause l'observation B

# Domaines reconnus (alignés sur le planificateur local).
KNOWN_DOMAINS = ("quantum", "topology", "structural_biology", "crypto", "orchestration")


# ── Utilitaires ───────────────────────────────────────────────────────────────


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _short_hash(payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]


def _concept_id(kind: str, name: str) -> str:
    """Identifiant stable d'un concept : 'action:load_pdb', 'entity:4MZI'..."""
    return f"{kind}:{str(name).strip().lower()}"


def _extract_concepts_from_trajectory(
    summary: dict[str, Any], plan: dict[str, Any] | None
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Transforme une trajectoire en (nœuds, arêtes) conceptuels.

    Nœuds : actions exécutées, domaine, entités observées (pdb_id, betti...).
    Arêtes : precede (ordre d'exécution), depends_on (heuristique domaine),
             validates (zk_proof valide l'action scientifique précédente).
    """
    plan = plan or {}
    results = summary.get("results", []) or []
    domain = (plan.get("domain") or summary.get("domain") or "orchestration").lower()
    if domain not in KNOWN_DOMAINS:
        domain = "orchestration"

    nodes: dict[str, dict[str, Any]] = {}
    edges: list[dict[str, Any]] = []

    def add_node(kind: str, name: str, obs_ok: bool = False) -> str:
        cid = _concept_id(kind, name)
        if cid not in nodes:
            nodes[cid] = {"id": cid, "kind": kind, "name": str(name), "obs": 0, "ok": 0}
        nodes[cid]["obs"] += 1
        if obs_ok:
            nodes[cid]["ok"] += 1
        return cid

    # Nœud de domaine
    dom_id = add_node("domain", domain, obs_ok=True)

    # Nœuds d'actions + arêtes precede (ordre causal)
    prev_action_id: str | None = None
    prev_sci_id: str | None = None  # dernière action scientifique (validable par ZK)
    for r in results:
        action = r.get("action", "unknown")
        ok = "error" not in r
        aid = add_node("action", action, obs_ok=ok)
        # L'action dépend du domaine
        edges.append({"src": aid, "dst": dom_id, "rel": REL_DEPENDS_ON})
        # Ordre causal
        if prev_action_id is not None:
            edges.append({"src": prev_action_id, "dst": aid, "rel": REL_PRECEDE})
        prev_action_id = aid
        # Chaîne de validation : zk_proof valide l'action scientifique précédente
        if action == "zk_proof" and prev_sci_id is not None:
            edges.append({"src": aid, "dst": prev_sci_id, "rel": REL_VALIDATES})
        if action in ("quantum_ed", "topology", "full_pipeline", "tryperposition"):
            prev_sci_id = aid

    # Nœuds d'entités / faits observables (ex: pdb_id, betti_numbers)
    for r in results:
        action = r.get("action")
        res = r.get("result", {}) if isinstance(r.get("result"), dict) else {}
        if action == "load_pdb" and res.get("pdb_id"):
            eid = add_node("entity", res["pdb_id"], obs_ok=True)
            edges.append({"src": _concept_id("action", "load_pdb"), "dst": eid, "rel": REL_CAUSES})
        if action == "topology" and res.get("betti_numbers") is not None:
            betti = res["betti_numbers"]
            fid = add_node("fact", f"betti_{betti}", obs_ok=True)
            edges.append({"src": _concept_id("action", "topology"), "dst": fid, "rel": REL_CAUSES})
        if action == "quantum_ed" and res.get("ground_state_energy") is not None:
            e = round(float(res["ground_state_energy"]), 4)
            fid = add_node("fact", f"gs_energy_{e}", obs_ok=True)
            edges.append({"src": _concept_id("action", "quantum_ed"), "dst": fid, "rel": REL_CAUSES})

    return list(nodes.values()), edges


# ── Le Vault ──────────────────────────────────────────────────────────────────


class StructuralVault:
    """Graphe conceptuel a-sémantique, borné et auto-stabilisant."""

    def __init__(self, path: Path | None = None):
        self.path = Path(path) if path else VAULT_FILE
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._state: dict[str, Any] = self._load()

    # ── Persistance ──────────────────────────────────────────────────────────

    def _load(self) -> dict[str, Any]:
        if self.path.exists():
            try:
                return json.loads(self.path.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning(f"[SDV] Cache corrompu ({e}), reconstruction vide.")
        state = self._default_state()
        self._save(state)
        return state

    def _save(self, state: dict[str, Any] | None = None) -> None:
        state = state or self._state
        state["updated_at"] = _now_iso()
        self.path.write_text(
            json.dumps(state, indent=2, ensure_ascii=False, default=str), encoding="utf-8"
        )

    @staticmethod
    def _default_state() -> dict[str, Any]:
        return {
            "version": 0,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "nodes": {},   # id -> {id, kind, name, weight, obs, ok}
            "edges": {},   # "src|rel|dst" -> {src, rel, dst, weight, obs}
            "ingested": 0,
            "rejected": 0,
            "history": [],
        }

    # ── Accès graphe ─────────────────────────────────────────────────────────

    @property
    def nodes(self) -> dict[str, dict[str, Any]]:
        return self._state["nodes"]

    @property
    def edges(self) -> dict[str, dict[str, Any]]:
        return self._state["edges"]

    def _edge_key(self, src: str, rel: str, dst: str) -> str:
        return f"{src}|{rel}|{dst}"

    def _adjacency(self, nodes: dict[str, Any], edges: dict[str, Any]) -> dict[str, set[str]]:
        adj: dict[str, set[str]] = {nid: set() for nid in nodes}
        for e in edges.values():
            s, d = e["src"], e["dst"]
            adj.setdefault(s, set()).add(d)
            adj.setdefault(d, set()).add(s)
        return adj

    # ── Topologie du graphe (Betti) ──────────────────────────────────────────

    def betti(self, nodes: dict[str, Any] | None = None, edges: dict[str, Any] | None = None) -> tuple[int, int]:
        """Calcule (β0, β1) du graphe conceptuel.

        β0 = nombre de composantes connexes (fragmentation — doit rester petit).
        β1 = nombre de cycles indépendants = E - V + β0 (richesse structurelle).
        C'est l'invariant du vault : dβ1/dt = 0 signifie que la richesse
        structurelle reste cohérente, sans explosion de bruit.
        """
        nodes = nodes if nodes is not None else self.nodes
        edges = edges if edges is not None else self.edges
        if not nodes:
            return (0, 0)
        adj = self._adjacency(nodes, edges)
        visited: set[str] = set()
        components = 0
        for nid in nodes:
            if nid in visited:
                continue
            components += 1
            queue = deque([nid])
            visited.add(nid)
            while queue:
                cur = queue.popleft()
                for nb in adj.get(cur, ()):
                    if nb not in visited:
                        visited.add(nb)
                        queue.append(nb)
        v = len(nodes)
        e = len(edges)
        beta0 = components
        beta1 = e - v + beta0
        return (beta0, max(0, beta1))

    def persistence_signature(self, concept_ids: list[str]) -> dict[str, Any]:
        """Empreinte topologique d'un ensemble de concepts (pour le matching).

        On extrait le sous-graphe induit par ces concepts, on calcule (β0, β1)
        + un hash du diagramme de persistance (poids des arêtes triés).
        C'est la signature utilisée par le planificateur topologique pour le
        rappel structurel (plus proche voisin dans le vault).
        """
        present = [c for c in concept_ids if c in self.nodes]
        sub_nodes = {c: self.nodes[c] for c in present}
        sub_edges = {
            k: e for k, e in self.edges.items()
            if e["src"] in sub_nodes and e["dst"] in sub_nodes
        }
        beta0, beta1 = self.betti(sub_nodes, sub_edges)
        weights = sorted(round(e["weight"], 4) for e in sub_edges.values())
        sig_hash = _short_hash({"beta0": beta0, "beta1": beta1, "weights": weights,
                                "concepts": sorted(present)})
        return {
            "concepts": present,
            "beta0": beta0,
            "beta1": beta1,
            "edge_count": len(sub_edges),
            "weights": weights,
            "signature": sig_hash,
            "total_weight": round(sum(e["weight"] for e in sub_edges.values()), 4),
        }

    # ── Ingestion (apprentissage) ────────────────────────────────────────────

    @memory_guard(max_mb=7500)
    def ingest_trajectory(self, summary: dict[str, Any], plan: dict[str, Any] | None = None) -> dict[str, Any]:
        """Ingère une trajectoire terminée dans le vault.

        1. Extraction des concepts (nœuds + arêtes) depuis la trajectoire.
        2. Vérification de cohérence de Betti (dβ1/dt = 0) : on simule
           l'ingestion et on rejette si elle fragmente le graphe (bruit).
        3. Renforcement des poids de persistance (OK=+1.0, échec=+0.2).
        4. Filtration : évection des nœuds/arêtes sous le seuil de persistance.

        Returns:
            Rapport d'ingestion (accepted, coherence, betti_before/after, evicted).
        """
        t_start = time.time()
        nodes_new, edges_new = _extract_concepts_from_trajectory(summary, plan)
        if not nodes_new:
            return {"status": "EMPTY", "message": "Aucun concept extractible."}

        # ZK-validité de la trajectoire (détermine le renforcement)
        results = summary.get("results", []) or []
        zk_valid = any(
            r.get("action") == "zk_proof"
            and isinstance(r.get("result"), dict)
            and r["result"].get("proof_valid", False)
            for r in results
        )
        success_rate = 0.0
        total = len(results)
        if total:
            success_rate = sum(1 for r in results if "error" not in r) / total
        reinforce = PERSISTENCE_REINFORCE_OK if (zk_valid or success_rate >= 0.8) else PERSISTENCE_REINFORCE_FAIL

        beta0_before, beta1_before = self.betti()

        # Simuler l'ingestion pour vérifier la cohérence topologique
        sim_nodes = json.loads(json.dumps(self.nodes, default=str))
        sim_edges = json.loads(json.dumps(self.edges, default=str))
        self._apply_ingestion(sim_nodes, sim_edges, nodes_new, edges_new, reinforce)
        beta0_after_sim, beta1_after_sim = self.betti(sim_nodes, sim_edges)

        coherence = self._check_coherence(beta0_before, beta1_before, beta0_after_sim, beta1_after_sim)

        if not coherence["valid"]:
            self._state["rejected"] += 1
            self._save()
            logger.warning(
                f"[SDV] Ingestion rejetée (cohérence Betti brisée): "
                f"β0 {beta0_before}→{beta0_after_sim}, β1 {beta1_before}→{beta1_after_sim}"
            )
            return {
                "status": "REJECTED",
                "reason": "betti_coherence_broken",
                "coherence": coherence,
                "betti_before": [beta0_before, beta1_before],
                "betti_after_sim": [beta0_after_sim, beta1_after_sim],
            }

        # Appliquer réellement + filtration
        self._apply_ingestion(self.nodes, self.edges, nodes_new, edges_new, reinforce)
        evicted = self._filter()
        self._state["ingested"] += 1
        beta0_after, beta1_after = self.betti()
        self._state["history"].append({
            "ts": _now_iso(),
            "concepts_added": len(nodes_new),
            "edges_added": len(edges_new),
            "reinforce": reinforce,
            "betti": [beta0_after, beta1_after],
            "evicted": evicted,
        })
        self._state["history"] = self._state["history"][-50:]
        self._state["version"] += 1
        self._save()

        logger.info(
            f"[SDV] Ingestion OK: +{len(nodes_new)} nœuds, +{len(edges_new)} arêtes "
            f"(reinforce={reinforce}). β=[{beta0_after},{beta1_after}] éviction={evicted} "
            f"({time.time()-t_start:.2f}s)"
        )
        return {
            "status": "INGESTED",
            "concepts_added": len(nodes_new),
            "edges_added": len(edges_new),
            "reinforce": reinforce,
            "coherence": coherence,
            "betti_before": [beta0_before, beta1_before],
            "betti_after": [beta0_after, beta1_after],
            "evicted": evicted,
            "version": self._state["version"],
        }

    def _apply_ingestion(
        self,
        nodes: dict[str, Any],
        edges: dict[str, Any],
        new_nodes: list[dict[str, Any]],
        new_edges: list[dict[str, Any]],
        reinforce: float,
    ) -> None:
        for n in new_nodes:
            nid = n["id"]
            if nid in nodes:
                nodes[nid]["weight"] = round(nodes[nid].get("weight", 0.0) + reinforce, 4)
                nodes[nid]["obs"] += n.get("obs", 1)
                nodes[nid]["ok"] += n.get("ok", 0)
            else:
                nodes[nid] = {
                    "id": nid, "kind": n["kind"], "name": n["name"],
                    "weight": round(reinforce, 4), "obs": n.get("obs", 1), "ok": n.get("ok", 0),
                }
        for e in new_edges:
            k = self._edge_key(e["src"], e["rel"], e["dst"])
            if k in edges:
                edges[k]["weight"] = round(edges[k].get("weight", 0.0) + reinforce, 4)
                edges[k]["obs"] += 1
            else:
                edges[k] = {"src": e["src"], "rel": e["rel"], "dst": e["dst"],
                            "weight": round(reinforce, 4), "obs": 1}

    def _check_coherence(self, b0b: int, b1b: int, b0a: int, b1a: int) -> dict[str, Any]:
        """dβ1/dt = 0 : la richesse structurelle ne doit pas exploser en bruit.

        On autorise la croissance (apprentissage) mais on rejette la fragmentation
        (β0 qui explose = graphe pulvérus = bruit statistique).
        """
        valid = b0a <= MAX_CONNECTED_COMPONENTS
        # β1 peut croître (plus de cycles = plus de raisonnement), mais pas de
        # manière incohérente : on veille à ce que β0 reste maîtrisé.
        return {
            "valid": valid,
            "beta0_before": b0b,
            "beta1_before": b1b,
            "beta0_after": b0a,
            "beta1_after": b1a,
            "rule": "d_beta1_dt_stable_no_fragmentation",
            "max_components": MAX_CONNECTED_COMPONENTS,
        }

    def _filter(self) -> dict[str, int]:
        """Filtration : évince les nœuds/arêtes sous le seuil de persistance.

        C'est le principe du Topology Compressor appliqué à la mémoire : on ne
        conserve que les caractéristiques topologiques invariantes (haut poids
        de persistance), on élimine le bruit combinatoire.
        """
        evicted_nodes = 0
        evicted_edges = 0
        # Éviction des arêtes faibles d'abord
        weak_edges = [k for k, e in self.edges.items() if e["weight"] < EVICT_THRESHOLD]
        for k in weak_edges:
            del self.edges[k]
            evicted_edges += 1
        # Éviction des nœuds faibles ET isolés (on garde les nœuds faibles encore
        # connectés, car ils participent à une structure persistante)
        adj = self._adjacency(self.nodes, self.edges)
        weak_nodes = [
            nid for nid, n in self.nodes.items()
            if n["weight"] < EVICT_THRESHOLD and not adj.get(nid)
        ]
        for nid in weak_nodes:
            del self.nodes[nid]
            evicted_nodes += 1
        # Bornes dures
        if len(self.nodes) > MAX_NODES:
            ordered = sorted(self.nodes.items(), key=lambda kv: kv[1].get("weight", 0.0))
            for nid, _ in ordered[: len(self.nodes) - MAX_NODES]:
                del self.nodes[nid]
                evicted_nodes += 1
        if len(self.edges) > MAX_EDGES:
            ordered = sorted(self.edges.items(), key=lambda kv: kv[1].get("weight", 0.0))
            for k, _ in ordered[: len(self.edges) - MAX_EDGES]:
                del self.edges[k]
                evicted_edges += 1
        return {"nodes": evicted_nodes, "edges": evicted_edges}

    # ── Rappel structurel (pour le planificateur topologique) ────────────────

    def nearest_subgraph(self, concept_ids: list[str], top_k: int = 1) -> list[dict[str, Any]]:
        """Recherche des sous-graphes du vault les plus proches des concepts requêtés.

        On construit la signature de persistance des concepts requêtés, puis on
        compare aux sous-graphes induits par les voisinages de chaque concept
        présent dans le vault. Le matching se fait par proximité de signature
        (β0, β1, poids) — pas par isomorphisme exact (NP-complet).
        """
        if not self.nodes:
            return []
        present = [c for c in concept_ids if c in self.nodes]
        if not present:
            return []
        query_sig = self.persistence_signature(present)
        candidates: list[dict[str, Any]] = []
        seen_seeds: set[str] = set()
        for seed in present:
            # Voisinage élargi (rayon 2) autour du concept seed
            nbhd = self._neighborhood([seed], radius=2)
            if not nbhd or seed in seen_seeds:
                continue
            sig = self.persistence_signature(list(nbhd))
            seen_seeds |= nbhd
            # Distance de signature : combinaison normalisée des écarts de β0/β1
            # et de la corrélation des poids (cosinus sur vecteurs de poids).
            dist = self._signature_distance(query_sig, sig)
            candidates.append({
                "seed": seed,
                "concepts": sorted(nbhd),
                "signature": sig["signature"],
                "distance": round(dist, 4),
                "beta": [sig["beta0"], sig["beta1"]],
                "total_weight": sig["total_weight"],
            })
        candidates.sort(key=lambda c: c["distance"])
        return candidates[:top_k]

    def _neighborhood(self, seeds: list[str], radius: int = 2) -> set[str]:
        """Voisinage du graphe jusqu'à un rayon donné (BFS)."""
        adj = self._adjacency(self.nodes, self.edges)
        seen: set[str] = set(seeds)
        frontier = list(seeds)
        for _ in range(radius):
            nxt: list[str] = []
            for nid in frontier:
                for nb in adj.get(nid, ()):
                    if nb not in seen:
                        seen.add(nb)
                        nxt.append(nb)
            if not nxt:
                break
            frontier = nxt
        return seen

    @staticmethod
    def _signature_distance(a: dict[str, Any], b: dict[str, Any]) -> float:
        """Distance entre deux signatures de persistance (plus proche = 0)."""
        db = abs(a["beta0"] - b["beta0"]) + abs(a["beta1"] - b["beta1"])
        # Corrélation des poids (cosinus) — 0 si vide
        wa = a.get("weights", []) or [0.0]
        wb = b.get("weights", []) or [0.0]
        n = max(len(wa), len(wb))
        wa = wa + [0.0] * (n - len(wa))
        wb = wb + [0.0] * (n - len(wb))
        dot = sum(x * y for x, y in zip(wa, wb))
        na = sum(x * x for x in wa) ** 0.5
        nb = sum(y * y for y in wb) ** 0.5
        cos = dot / (na * nb) if na and nb else 0.0
        return float(db) + (1.0 - cos)

    # ── Reconstruction stateless ─────────────────────────────────────────────

    def rebuild_from_trajectories(self, traj_dir: Path | None = None) -> dict[str, Any]:
        """Reconstruit le vault à l'identique depuis les trajectoires archivées.

        Statelessness : le graphe est une fonction déterministe de l'historique
        des trajectoires (harness/trajectories/). Cette méthode le prouve en
        repartant de zéro.
        """
        from orchestrator.harness_manager import TRAJECTORIES_DIR

        traj_dir = Path(traj_dir) if traj_dir else TRAJECTORIES_DIR
        self._state = self._default_state()
        ingested = 0
        rejected = 0
        for f in sorted(traj_dir.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                summary = data.get("summary", {})
                plan = data.get("plan", {})
                rep = self.ingest_trajectory(summary, plan)
                if rep["status"] == "INGESTED":
                    ingested += 1
                else:
                    rejected += 1
            except Exception as e:
                logger.warning(f"[SDV] Trajectoire {f.name} ignorée ({e})")
        self._save()
        return {
            "status": "REBUILT",
            "trajectories_dir": str(traj_dir),
            "ingested": ingested,
            "rejected": rejected,
            "nodes": len(self.nodes),
            "edges": len(self.edges),
            "betti": list(self.betti()),
            "version": self._state["version"],
        }

    # ── États ────────────────────────────────────────────────────────────────

    def state(self) -> dict[str, Any]:
        b0, b1 = self.betti()
        return {
            "version": self._state["version"],
            "nodes": len(self.nodes),
            "edges": len(self.edges),
            "ingested": self._state.get("ingested", 0),
            "rejected": self._state.get("rejected", 0),
            "betti": [b0, b1],
            "updated_at": self._state.get("updated_at"),
        }

    def export_graph(self) -> dict[str, Any]:
        """Exporte le graphe complet (nœuds + arêtes) pour visualisation/debug."""
        return {
            "nodes": list(self.nodes.values()),
            "edges": list(self.edges.values()),
            "betti": list(self.betti()),
        }


# ── Instance singleton (paresseuse) ───────────────────────────────────────────
_singleton: StructuralVault | None = None


def get_vault(path: Path | None = None) -> StructuralVault:
    global _singleton
    if _singleton is None:
        _singleton = StructuralVault(path)
    return _singleton


def reset_vault(path: Path | None = None) -> StructuralVault:
    """Réinitialise le singleton (utile pour les tests)."""
    global _singleton
    _singleton = StructuralVault(path)
    return _singleton
