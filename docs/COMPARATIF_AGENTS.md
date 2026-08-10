# RATISS Aeon Agent — Comparatif complet avec les agents IA les plus utilisés au monde

**Auteur :** Jonathan Evina (ORCID 0009-0000-4092-5313 — DOI 10.17605/OSF.IO/6JZMB)
**Version du document :** 2026-08-10
**Version RATISS :** v9.4.0 « Aeon Prime »

> Ce document positionne RATISS Aeon Agent face aux agents IA les plus utilisés au monde.
> Données de marché compilées à partir de sources publiques (août 2026) : SWE-bench,
> leaderboards, blogs techniques, GitHub, sites officiels des éditeurs.

---

## Sommaire

1. [Vue d'ensemble du paysage](#1-vue-densemble-du-paysage)
2. [Tableau comparatif maître](#2-tableau-comparatif-maître)
3. [Positionnement de RATISS](#3-positionnement-de-ratiss)
4. [Comparaison détaillée agent par agent](#4-comparaison-détaillée-agent-par-agent)
5. [Comparaison des frameworks autonomes](#5-comparaison-des-frameworks-autonomes)
6. [Analyse des différenciateurs uniques de RATISS](#6-analyse-des-différenciateurs-uniques-de-ratiss)
7. [Comparatif scientifique (niche de RATISS)](#7-comparatif-scientifique-niche-de-ratiss)
8. [Critères de choix](#8-critères-de-choix)
9. [Sources](#9-sources)

---

## 1. Vue d'ensemble du paysage

Le marché des agents IA se scinde en **trois grandes familles** en 2026 :

| Famille | Description | Exemples |
|---|---|---|
| **Agents de code (SWE)** | Agents qui lisent un codebase, planifient, exécutent, testent, préparent des PR | Claude Code, OpenAI Codex, Cursor, Devin, GitHub Copilot, OpenHands |
| **Frameworks d'agents autonomes** | Bibliothèques pour construire des systèmes multi-agents | LangGraph, CrewAI, AutoGen, MetaGPT, OpenHands SDK |
| **Agents scientifiques / de niche** | Agents spécialisés par domaine (chimie, quantique, bio) | El Agente Q, Virtual Lab, RATISS |

**RATISS** est un cas à part : c'est un **agent scientifique souverain**, auto-hébergé,
qui combine les trois familles — il code (terminal, file editor, browser), orchestre
(plan ReAct multi-étapes) et fait de la science (quantique, topologie, bio, crypto) —
le tout avec une certification ZK-STARK et sans dépendance cloud propriétaire.

---

## 2. Tableau comparatif maître

### 2.1 Agents de code / ingénierie logicielle

| Critère | **RATISS Aeon** | Claude Code | OpenAI Codex | Cursor | Devin | GitHub Copilot | OpenHands |
|---|---|---|---|---|---|---|---|
| **Type** | Agent scientifique souverain | Agent terminal | Agent CLI + cloud VM | IDE + cloud agents | Agent cloud autonome | Assistant IDE + agent | Plateforme open-source |
| **Souveraineté (auto-hébergé)** | ✅ **100%** (aucune dépendance cloud propriétaire) | ❌ Dépend API Anthropic | ❌ Dépend API OpenAI | ❌ IDE fermé + cloud | ❌ Cloud managé | ❌ Dépend GitHub/OpenAI | ✅ Auto-hébergé |
| **Open source** | ✅ MIT | ❌ | Partiel (CLI) | ❌ | ❌ | Partiel (extension) | ✅ MIT |
| **SWE-bench Verified** | N/A (orienté science) | **77,2%** (#1) | 74,5% | ~70% (communauté) | 71% | — | 66,0% |
| **Domaines scientifiques** | ✅ **Quantique, topologie, bio, crypto** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Certification ZK-STARK** | ✅ **Intégrée** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Plan ReAct (Think→Act→Observe)** | ✅ | ✅ | ✅ | ✅ | ✅ | Partiel | ✅ |
| **Terminal natif** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Browser headless** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Génération PDF scientifique** | ✅ **Avec PDB + Betti + viz** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Mémoire persistante** | ✅ Sovereign Memory | Partiel | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Auto-amélioration (RLM)** | ✅ /refine + harnais | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Memory Guard (RAM)** | ✅ 7500 Mo | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Prix** | **Gratuit** (self-hosted) | Inclusion plans Claude | Inclusion plans OpenAI | 20–40 $/mois | Dès 20 $/mois | 10 $/mois | Gratuit (cloud tiers) |
| **Déploiement** | Docker / VPS / HF Spaces | Terminal | CLI + cloud | IDE | Cloud dashboard | IDE + CLI | Docker / cloud |

### 2.2 Frameworks d'agents autonomes

| Critère | **RATISS Aeon** | LangGraph | CrewAI | AutoGen | MetaGPT |
|---|---|---|---|---|---|
| **Type** | Agent scientifique complet | Framework graphe d'états | Framework multi-agents par rôles | Framework conversationnel multi-agents | Simulation d'équipe startup |
| **Orientation** | Science + code + souveraineté | Production / entreprise | Automatisation collaboration | Recherche / raisonnement | Dév. logiciel bout-en-bout |
| **Noyau scientifique natif** | ✅ **Quantique, topologie, bio, crypto** | ❌ | ❌ | ❌ | ❌ |
| **Certification ZK** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Génération d'artefacts** | ✅ PDF, graphiques, Betti, ZK | ❌ (à construire) | ❌ | ❌ | Code + docs |
| **Fallback sans clé API** | ✅ **Planificateur local déterministe** | ❌ | ❌ | ❌ | ❌ |
| **Mémoire souveraine** | ✅ | Checkpointer | ❌ | ❌ | ❌ |
| **Auto-amélioration** | ✅ /refine | ❌ | ❌ | ❌ | ❌ |
| **Courbe d'apprentissage** | Prêt à l'emploi | Raide | Douce | Moyenne | Moyenne |
| **Statut maintenance** | Actif (v9.4) | Actif (0.3.x) | Actif (0.95) | **Mode maintenance** (succédé par MS Agent Framework) | Actif |

---

## 3. Positionnement de RATISS

```
                     SOUVERAIN / AUTO-HÉBERGÉ
                              ▲
                              │
              RATISS Aeon ●   │
                              │
                              │
  SCIENTIFIQUE ◀──────────────┼──────────────▶ GÉNÉRALISTE
                              │
                              │
                              │   ● OpenHands (open-source, code)
                              │   ● LangGraph (framework)
                              │
                              │   ● Claude Code ● Cursor
                              │   ● Codex        ● Devin
                              │
                              ▼
                     CLOUD PROPRIÉTAIRE
```

**RATISS occupe une niche unique** : agent scientifique souverain. Aucun autre
agent sur le marché ne combine simultanément :
1. **Auto-hébergement 100%** — aucun envoi de données vers un cloud propriétaire
2. **Noyau scientifique natif** — quantique (Lanczos/ED), topologie (Betti), biologie (PDB), crypto (ZK-STARK)
3. **Certification ZK-STARK intégrée** — preuves cryptographiques des résultats
4. **Auto-amélioration continue** — boucle /refine avec versioning du harnais
5. **Génération de rapports PDF scientifiques** — avec structures PDB + visualisations embarquées

---

## 4. Comparaison détaillée agent par agent

### 4.1 Claude Code (Anthropic)

- **Score SWE-bench :** 77,2% (#1 mondial, sept 2025, Sonnet 4.5)
- **Forces :** Raisonnement repository-level, routines programmées, délégation par sous-agents, terminal-first
- **Faiblesses :** Dépendance API Anthropic, non open-source, pas de noyau scientifique
- **Prix :** Inclusion dans les plans Claude (à l'usage token)
- **Verdict vs RATISS :** Claude Code est le meilleur agent de *code*. Mais il est cloud-dépendant et n'a aucune capacité scientifique. RATISS et Claude Code sont **complémentaires** : Claude Code pour le code pur, RATISS pour la science + souveraineté.

### 4.2 OpenAI Codex CLI

- **Score SWE-bench :** 74,5% (GPT-5-Codex)
- **Forces :** Cloud VMs, jobs parallèles, terminal natif, record Terminal-Bench
- **Faiblesses :** Dépendance OpenAI, limites sandbox, pas de science
- **Prix :** Inclusion plans OpenAI
- **Verdict vs RATISS :** Codex excelle en chaînes CLI longues autonomes. RATISS excelle en pipelines scientifiques certifiés. Différents objectifs.

### 4.3 Cursor (Anysphere)

- **Score SWE-bench :** ~70% (communauté)
- **Forces :** IDE AI-native, tab completion rapide, multi-fichiers, 2 G$ de revenus annualisés (2026)
- **Faiblesses :** IDE fermé, peut dériver sur gros refactors, non souverain
- **Prix :** Gratuit / 20–40 $/mois
- **Verdict vs RATISS :** Cursor = meilleur IDE pour le code quotidien. RATISS = agent autonome souverain pour la science. Pas le même usage.

### 4.4 Devin (Cognition)

- **Score SWE-bench :** 71%
- **Forces :** Agent cloud le plus « mains libres », Jira ticket → PR, agents parallèles
- **Faiblesses :** Cloud managé fermé, risque de boucle, coût élevé, pas de souveraineté
- **Prix :** Dès 20 $/mois (+ usage)
- **Verdict vs RATISS :** Devin = délégation de backlog défini. RATISS = science souveraine. Devin est plus autonome sur le code mais pas du tout souverain ni scientifique.

### 4.5 GitHub Copilot (agent mode)

- **Forces :** Adoption la plus basse friction, flux issue → PR, modèles multiples (OpenAI + Claude + Gemini)
- **Faiblesses :** Facturation par usage peut exploser, pas de science, non souverain
- **Prix :** 10 $/mois
- **Verdict vs RATISS :** Copilot = assistante IDE pour équipes GitHub. RATISS = agent scientifique autonome auto-hébergé.

### 4.6 OpenHands (All Hands AI)

- **Score SWE-bench :** 66,0% (DeepSeek-V3)
- **Forces :** **Open-source MIT**, model-agnostic, sandboxed runtime, 80k+ étoiles GitHub, Agent Canvas, automations
- **Faiblesses :** Orienté code (pas de science), nécessite configuration cloud
- **Prix :** Gratuit (self-hosted) / cloud tiers
- **Verdict vs RATISS :** OpenHands est le plus proche philosophiquement (open-source, self-hosted, agent). La différence clé : OpenHands est un *framework de code* généraliste, RATISS est un *agent scientifique* avec ZK-STARK, topologie, quantique, bio. RATISS est à OpenHands ce qu'un labo scientifique est à un atelier de programmation.

---

## 5. Comparaison des frameworks autonomes

### 5.1 LangGraph (LangChain)

- **Forces :** Graphe d'états, exécution parallèle, mémoire (checkpointer), le plus de déploiements production (State of AI 2025)
- **Faiblesses :** Courbe raide, c'est un framework à assembler (pas un agent prêt à l'emploi)
- **Verdict vs RATISS :** LangGraph est un *outil pour construire* des agents. RATISS est un agent *déjà construit* et spécialisé science. RATISS inclut son propre planificateur ReAct (Nemotron) qui joue un rôle similaire à un graphe d'états.

### 5.2 CrewAI

- **Forces :** Multi-agents par rôles (PM, Dev, QA), le plus simple pour débuter
- **Faiblesses :** Pas de science, traction orientée contenu/SEO/ops
- **Verdict vs RATISS :** CrewAI excelle pour la collaboration multi-agents générique. RATISS a un seul agent mais ultra-spécialisé science + certifié ZK.

### 5.3 AutoGen (Microsoft)

- **Forces :** Conversation multi-agents, raisonnement par dialogue
- **Faiblesses :** **Mode maintenance depuis fin 2025** (succédé par Microsoft Agent Framework), pas de science
- **Verdict vs RATISS :** AutoGen décline ; RATISS est actif (v9.4) et a une feuille de route claire.

### 5.4 MetaGPT

- **Forces :** Simule une équipe startup complète (PM → Dev → QA), génère docs + code
- **Faiblesses :** Orienté développement logiciel uniquement, pas de science
- **Verdict vs RATISS :** MetaGPT = automatisation de produit logiciel. RATISS = science + souveraineté.

---

## 6. Analyse des différenciateurs uniques de RATISS

| Différenciateur | RATISS | Concurrent le plus proche | Écart |
|---|---|---|---|
| **Souveraineté 100%** | Aucune dépendance cloud | OpenHands (mais orienté code) | RATISS = seul agent scientifique souverain |
| **Noyau quantique (Lanczos/ED)** | t-J, ground state energy | El Agente Q (chimie quantique) | El Agente Q = chimie ; RATISS = matière condensée + topologie |
| **Topologie algébrique (Betti)** | Homologie persistante native | Aucun agent grand public | **Unique au monde** |
| **Certification ZK-STARK** | Preuves cryptographiques des résultats | Aucun | **Unique au monde** |
| **Bio (PDB / RCSB / AlphaFold)** | Structures 3D + dispatch | Benchling (mais SaaS fermé) | RATISS = open + souverain |
| **Rapport PDF scientifique enrichi** | PDB + Betti + graphique embarqué | Aucun agent | **Unique au monde** |
| **Auto-amélioration (/refine)** | Analyse trajectoire + leçons + versioning harnais | Aucun agent grand public | **Unique au monde** |
| **Mémoire souveraine** | Persistante hors-contexte-LLM | LangGraph (checkpointer) | RATISS = mémoire + raisonnement scientifique |
| **Fallback sans clé API** | Planificateur local déterministe | Aucun (tous nécessitent une clé LLM) | **Unique au monde** |
| **Memory Guard** | Limite RAM 7500 Mo | Aucun agent | Unique |

### Le « triple ↯ » qui rend RATISS unique

```
   SOUVERAINETÉ (auto-hébergé, ZK-STARK)
        ↯
   SCIENCE (quantique ⊗ topologie ⊗ bio ⊗ crypto)
        ↯
   AUTO-AMÉLIORATION (/refine, harnais versionné)
```

Aucun agent au monde ne combine ces trois axes. Les agents de code sont
souverains parfois (OpenHands) mais pas scientifiques. Les agents scientifiques
(El Agente Q, Virtual Lab) font de la science mais sont cloud-dépendants et
non certifiés ZK. RATISS est le seul à l'intersection.

---

## 7. Comparatif scientifique (niche de RATISS)

| Agent / Système | Domaine | Souverain | ZK | Type |
|---|---|---|---|---|
| **RATISS Aeon** | Quantique + topologie + bio + crypto | ✅ | ✅ | Agent autonome |
| El Agente Q (Matter Lab) | Chimie quantique | ❌ | ❌ | Agent de chimie computationnelle |
| Virtual Lab (Stanford) | Bio (nanobodies, Covid) | ❌ | ❌ | Équipe d'agents scientifiques |
| Paper2Agent | Convertit papers → agents | ❌ | ❌ | Framework de recherche |
| Benchling AI | Bio (DMTA cycle) | ❌ | ❌ | SaaS biotech |

**RATISS est le seul agent scientifique souverain avec certification ZK-STARK.**
Les autres agents scientifiques (El Agente Q, Virtual Lab) sont des projets de
recherche cloud-dépendants, sans certification cryptographique de leurs résultats.

---

## 8. Critères de choix

| Si vous voulez… | Choisissez… | Pourquoi |
|---|---|---|
| Faire de la science (quantique, topologie, bio) en souverain | **RATISS** | Seul agent scientifique auto-hébergé + ZK |
| Coder au quotidien dans un IDE | Cursor | Meilleur IDE AI-native |
| Refactors terminal complexes | Claude Code | #1 SWE-bench, raisonnement repo |
| Déléguer un backlog défini → PR | Devin | Agent cloud le plus autonome |
| Avoir un agent open-source model-agnostic | OpenHands | Le plus proche philosophiquement |
| Construire un système multi-agents | LangGraph | Graphe d'états, production |
| Automatiser du contenu/SEO | CrewAI | Multi-agents par rôles, simple |
| Chimie quantique depuis langage naturel | El Agente Q | Spécialiste chimie |
| **Tout cela en un seul agent souverain** | **RATISS** | Science + code + souveraineté + ZK |

---

## 9. Sources

1. BirJob — *AI Coding Agent Showdown 2026* — https://www.birjob.com/blog/ai-coding-agents-2026
2. Daily.dev — *The best AI coding agents in 2026, compared* — https://daily.dev/blog/best-ai-coding-agents-comparison
3. Coursiv — *Best AI Coding Agents in 2026: Top Tools by Use Case* — https://coursiv.io/blog/best-ai-agents-for-coding-2026
4. Vellum — *10 Best AI Coding Agents in 2026* — https://www.vellum.ai/blog/best-ai-coding-agents
5. MightyBot — *Best AI Coding Agents in 2026, Ranked* — https://mightybot.ai/blog/coding-ai-agents-for-accelerating-engineering-workflows
6. OpenHands — *The 9 Best Coding Agents in 2026* — https://www.openhands.dev/blog/best-coding-agents
7. Kilo — *Best AI Coding Tools for Enterprise in 2026* — https://kilo.ai/articles/best-ai-coding-tools-for-enterprise
8. Augment Code — *8 Best AI Coding Assistants [May 2026]* — https://www.augmentcode.com/tools/8-top-ai-coding-assistants-and-their-best-use-cases
9. Medium (Aman Raghuvanshi) — *Top AI Agent Frameworks in 2025* — https://medium.com/@iamanraghuvanshi/agentic-ai-3-top-ai-agent-frameworks-in-2025-langchain-autogen-crewai-beyond-2fc3388e7dec
10. PE Collective — *AI Agent Frameworks: LangGraph vs CrewAI vs AutoGen 2026* — https://pecollective.com/blog/ai-agent-frameworks-compared
11. Langfuse — *Comparing Open-Source AI Agent Frameworks* — https://langfuse.com/blog/2025-03-19-ai-agent-comparison
12. Chemistry World — *AI agents democratise computational chemistry* (2026) — https://www.chemistryworld.com/news/ai-agents-set-to-democratise-computational-chemistry/4022465.article
13. The Quantum Insider — *El Agente Q: AI Agent for Quantum Chemistry* (2025) — https://thequantuminsider.com/2025/05/07/study-introduces-an-ai-agent-that-automates-quantum-chemistry-tasks-from-natural-language-prompts
14. ACS Spring 2026 — *AI agents to accelerate scientific discoveries* — https://acs.digitellinc.com/live/36/session/584201
15. The Matter Blotter — *AI Agents Are Now Running Quantum Experiments* — https://aspuru.substack.com/p/ai-agents-are-now-running-quantum

---

*Document généré par OpenHands pour Jonathan Evina — RATISS Aeon Agent v9.4.0*
*Licence MIT — DOI : 10.17605/OSF.IO/6JZMB*
