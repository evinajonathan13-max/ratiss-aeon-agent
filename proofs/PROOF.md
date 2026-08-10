# Preuves de fonctionnement agentique — RATISS v9.4

Ce dossier contient des **artefacts réellement générés par l'agent Ratiss v9.4**
lors d'un test agentique complet (2026-08-10), piloté par un vrai LLM OpenRouter
(Nemotron 3 Ultra, `sk-or-v1-...`) dans un conteneur Docker.

Aucun de ces fichiers n'a été écrit à la main : ils sont le produit de la boucle
**Plan → Execute → Certify → Artifacts** de l'agent.

## Conditions du test

- **Modèle LLM** : `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` (clé réelle)
- **Planificateur** : `openrouter_nemotron` (LLM, non heuristique locale)
- **Tâche** : analyse topologique de la protéine p53-MDM2 (PDB 4MZI)
- **Étapes LLM** : 4 planifiées, **4 exécutées avec succès** (ReAct)
- **Temps total** : ~16 s
- **Identité souveraine** : le LLM s'est présenté comme *"RATISS, instance JohnKing0"*
  (injection du Sovereign Prompt vérifiée — pas *"je suis Nemotron"*).

## Artefacts

| Fichier | Type | Taille | Description |
|---|---|---|---|
| `4MZI.pdb` | PDB | 166 Ko | Structure cristallographique réelle p53-MDM2 téléchargée depuis RCSB (`HEADER ANTITUMOR PROTEIN`) |
| `rapport_analyse_topologique_p53-mdm2.pdf` | PDF | 1.6 Ko | Rapport scientifique généré par l'agent (fpdf2, `%PDF-1.3`) |
| `rapport_test_agentique_ratiss_v9.4.pdf` | PDF | 2.4 Ko | Rapport de test final consolidé (identité + plan + résultats) |
| `betti_persistence_diagram.png` | PNG | 27 Ko | Diagramme de persistance (homologie) — généré par `generate_betti_diagram` |
| `step_2_topology.json` | JSON | 28 Ko | Résultat homologie persistante : **nombres de Betti [β0=1, β1=2, β2=0]** |
| `zk_receipt.b64` | JSON | 828 o | Reçu ZK-STARK RISC Zero — `RISC0_STARK_VERIFIED`, preuve valide |
| `result.json` | JSON | 44 Ko | Résumé complet de la trajectoire agentique (plan, étapes, mémoire, académique) |
| `run_log.txt` | texte | — | Sortie console complète du test |

## Capacités exercées

1. **Planification LLM** — le Nemotron a décomposé la tâche en 4 étapes valides
   (`load_pdb` → `topology` → `generate_betti_diagram` → `generate_pdf`).
2. **Identité souveraine ancrée** — injectée à chaque appel LLM, le modèle s'identifie
   comme Ratiss peu importe le backend.
3. **Compétences scientifiques** — chargement PDB, homologie persistante (Betti),
   diagramme de persistance, certification ZK-STARK.
4. **Génération d'artefacts** — PDF (fpdf2), PNG (matplotlib), JSON, reçu cryptographique.
5. **Mémoire persistante** — un souvenir de tâche a été sauvegardé sur disque
   (`Tâche terminée (topology) : Analyse topologique...`).
6. **Signature académique** — chaque artefact est signé
   `Jonathan Evina — ORCID 0009-0000-4092-5313 — DOI 10.17605/OSF.IO/6JZMB`.

## Reproduction

```bash
docker run -d --name ratiss -p 7860:7860 \
  -e OPENROUTER_API_KEY='sk-or-v1-...' \
  -e RATISS_MODEL_ID='openrouter/nvidia/nemotron-3-ultra-550b-a55b:free' \
  ratiss-final-check:latest
docker exec ratiss python agent_agentic_test.py
```

---

_Artefacts générés par l'agent IA Ratiss v9.4 au nom de Jonathan Evina, lors d'un test agentique en conteneur Docker._
