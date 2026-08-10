# RATISS Aeon Agent

**Agent scientifique autonome souverain** — agent agentique souverain, combinant physique quantique (Lanczos ED), topologie computationnelle, biologie structurale, cryptographie (ZK-STARK), **browser web (Playwright)**, **terminal intégré**, **exécution Python sandbox**, **recherche web générale**, **éditeur de fichiers** et **génération de contenu** (PDF, graphiques, pages web).

> Auteur : **Jonathan Evina** · ORCID [0009-0000-4092-5313](https://orcid.org/0009-0000-4092-5313) · DOI [10.17605/OSF.IO/6JZMB](https://doi.org/10.17605/OSF.IO/6JZMB)

---

## Captures d'écran

| Dashboard complet | Recherche arXiv + PDF |
|:---:|:---:|
| ![Dashboard](screenshots/01-dashboard-full-task.png) | ![arXiv+PDF](screenshots/02-arxiv-pdf-generation.png) |

| Preview PDF intégré | Terminal en action |
|:---:|:---:|
| ![PDF Preview](screenshots/03-pdf-preview.png) | ![Terminal](screenshots/04-terminal-execution.png) |

## Vue d'ensemble

RATISS (Real-time Adaptive Topological & Integrative Scientific System) Aeon Prime est un agent scientifique autonome qui :

1. **Planifie** une tâche en langage naturel (Nemotron 3 Ultra via OpenRouter, ou planificateur local déterministe en fallback)
2. **Exécute** chaque étape via la **boucle ReAct** (Think → Act → Observe) avec détection de blocage
3. **Certifie** les résultats avec une preuve ZK-STARK RISC Zero (vérifiée en < 1 ms)
4. **Génère** des artéfacts téléchargeables (JSON, reçus ZK, diagrammes, PDF, screenshots)

Le tout dans un Memory Guard strict (7500 Mo, CPU-only), 100 % souverain : aucune donnée ne quitte la machine sans clé API explicite.

## Nouveautés — outils agentiques (v9.1)

RATISS intègre désormais les mêmes capacités qu'RATISS/agent agentique :

| Outil | Équivalent RATISS | Description |
|-------|---------------------|-------------|
| **Browser** (Playwright) | `BrowserUseTool` | Naviguer, cliquer, taper, extraire, screenshot, scroller |
| **PythonExecute** | `PythonExecute` | Exécuter du code Python dans un sandbox (numpy, scipy, matplotlib) |
| **GoogleSearch** | `GoogleSearch` | Recherche web générale (Tavily API + DuckDuckGo fallback) |
| **FileEditor** | `StrReplaceEditor` | Voir, créer, éditer des fichiers (str_replace, insert, undo) |
| **FileSaver** | `FileSaver` | Sauvegarder du contenu arbitraire dans le workspace |
| **ReAct loop** | `ReActAgent` | Boucle Think → Act → Observe avec détection de blocage |

## Architecture

    ratiss-kkl/
    ├── app/                    # Serveur FastAPI + UI
    │   ├── server.py           #   HTTP + WebSocket multiplexé
    │   └── static/             #   HTML/CSS/JS + D3.js local (280 Ko)
    ├── kernel/                 # Noyau scientifique RATISS V9
    │   ├── main.py             #   Pipeline orchestré (Topo → Quantique → ZK)
    │   ├── bridge.py           #   Pont typé vers l'orchestrateur
    │   ├── solvers/            #   Lanczos ED, homologie persistante, tryperposition
    │   ├── connectors/         #   IBM Quantum, Quandela, AlphaFold, RCSB
    │   ├── core/               #   Refinery, modules de base
    │   ├── system/             #   Memory Guard (7500 Mo)
    │   └── zk/                 #   Prover ZK-STARK RISC Zero
    ├── orchestrator/           # Agent agentique
    │   ├── agent.py            #   Boucle Plan → Execute → Certify → Artifact + refine()
    │   ├── nemotron_client.py  #   Client OpenRouter (Nemotron 3 Ultra)
    │   ├── skill_manager.py    #   Registre des compétences noyau
    │   ├── cascade.py          #   Émetteur d'événements WebSocket
    │   ├── auto_improve.py     #   Couche RLM : analyse trajectoire + leçons + validation ZK
    │   └── harness_manager.py  #   Continual Harness : état persistant + CRUD + versioning
    ├── security/               # Sécurité souveraine
    │   ├── session_manager.py  #   Sessions SQLite + auth PBKDF2
    │   ├── token_hasher.py     #   PBKDF2-HMAC-SHA256 (600K itérations)
    │   ├── workspace_isolator.py #  Isolation physique par session
    │   └── sandbox_hardener.py #   NemoSandbox (Docker ou Python restreint)
    ├── scripts/                # Outils
    │   ├── init_vault.py       #   Initialise le coffre + admin
    │   ├── import_skill.py     #   Importe/teste une compétence GitHub
    │   ├── align_agent.py      #   Alignement + vérification
    │   └── deploy.sh           #   Déploiement (local/docker/hf/vercel)
    ├── tests/                  # Tests (auto-amélioration, pipeline)
    ├── harness/                # État du Continual Harness (généré à l'exécution)
    ├── data/pdb/               # Structures PDB locales (4MZI, 4MZR)
    ├── config/                 # allowed_imports.txt, agent_aligned.json
    ├── Dockerfile              # HF Spaces / VPS (port 7860)
    ├── requirements.txt        # Dépendances minimales (frugal)
    └── .env.example            # Variables d'environnement (sans secrets)

## Nouveautés — Couche d'auto-amélioration (RLM / Continual Harness) (v9.2)

RATISS intègre désormais une **boucle d'auto-amélioration par validation**, inspirée
des architectures **Recursive Language Model (RLM)** et **Continual Harness** de
Prime Agent. À partir d'une tâche complexe **validée** (certification ZK-STARK), l'agent
analyse sa propre trajectoire, en extrait des « leçons » et les réinjecte dans son
harnais (prompts, compétences, mémoire, sous-agents) pour améliorer ses performances
futures.

### Architecture

```
[Exécution d'une tâche complexe]
        │
        ▼
[Validation du résultat (ZK-STARK, invariants physiques)]
        │
        ▼ (si validé)
[Analyse de la trajectoire : planification, étapes, raisonnements, artéfacts]
        │
        ▼
[Extraction des « leçons » : patterns, heuristiques, méthodes efficaces, erreurs évitées]
        │
        ▼
[Validation ZK des leçons (invariants physiques préservés)]
        │
        ▼
[Mise à jour du « Harness » : prompts, compétences, mémoire, sous-agents (CRUD + versioning)]
        │
        ▼
[Amélioration des performances futures]
```

### Modules

| Module | Rôle |
|--------|------|
| `orchestrator/auto_improve.py` | Analyse la trajectoire (plan, étapes, logs, résultats), extrait les patterns récurrents et génère des leçons structurées (JSON). Validation ZK des leçons. |
| `orchestrator/harness_manager.py` | État persistant et versionné du harnais (prompts, compétences, mémoire, sous-agents). CRUD ciblé + snapshots horodatés + rollback. |
| Commande `/refine` | Déclenche l'analyse de la trajectoire courante, propose des améliorations, et (après validation utilisateur) applique les mises à jour + génère un rapport PDF. |

### Types de leçons extraites

| Type | Cible | Description |
|------|-------|-------------|
| `pattern` | prompt | Séquence d'actions validée (à réutiliser pour ce domaine) |
| `heuristic` | skill | Règle générale dérivée (budget temps, paramètres par défaut) |
| `pitfall` | prompt/subagent | Erreur/piège rencontré (à éviter) |
| `memory` | memory | Fait observable stable (Betti 4MZI, E₀ t-J, PDB disponible) |

### Intégration avec les compétences existantes

- **`zk_proof`** : certifie que les leçons proposées ne violent pas les invariants physiques (énergie < 0, entropie ≥ 0, dimensions réseau valides). Aucune mise à jour n'est appliquée si la preuve ZK est invalide.
- **`generate_pdf`** : produit un rapport d'auto-amélioration (versioning des leçons appliquées, trajectoire analysée, validation ZK).
- **`file_editor`** : les fichiers de configuration du harnais (`harness/harness_state.json`, snapshots) sont gérés via le `HarnessManager`.

### Commande `/refine`

Dans le chat, après avoir exécuté une tâche complexe :

```
/refine          → analyse la trajectoire, affiche les leçons proposées (bannière Accepter/Rejeter)
/refine apply    → analyse ET applique les mises à jour au harnais + génère le rapport PDF
/harness         → affiche l'état courant du harnais (version, mémoire, prompts, trajectoires)
```

L'UI affiche une **bannière de proposition** avec chaque leçon (type, cible, confiance,
contenu) et des boutons **✓ Appliquer au harnais** / **✕ Rejeter**. L'application
incrémente la version du harnais et crée un snapshot horodaté (rollback possible).

### Persistance (`harness/`)

```
harness/
├── harness_state.json     # état courant (versionné)
├── lessons/               # archive des leçons appliquées (JSON, une par fichier)
├── trajectories/          # trajectoires de tâches analysables par /refine
└── versions/              # snapshots horodatés (v0000_*.json, v0001_*.json, ...)
```

Souveraineté : l'analyse est **déterministe** (heuristiques locales, aucun appel LLM
externe requis). Si Nemotron/OpenRouter est disponible, un enrichissement optionnel
peut être branché, mais le chemin par défaut reste local.

## Démarrage rapide

```bash
pip install -r requirements.txt
cp .env.example .env   # optionnel : configurer les clés API

# Frontend (build React → app/static/)
cd app/frontend && npm install && npm run build && cd ../..

python -m app.server   # UI : http://localhost:12000
```

> Le frontend React (Vite + TypeScript + Tailwind) se build dans `app/static/`
> et est servi directement par FastAPI. Aucun serveur Node en production.

## Interface web — UI React immersive (v9.3)

RATISS embarque désormais une interface React/TypeScript moderne, centrée sur
la fenêtre de chat principale avec un rendu agentique en temps réel.

**Architecture frontend** (`app/frontend/`) :
- **Vite 6 + React 19 + TypeScript + Tailwind v4**
- **Sidebar** : sessions, import, mode Competition, profil souverain
- **MessageBubble** : markdown rendu (react-markdown + remark-gfm), raisonnement
  dépliable, nombres de Betti, preuve ZK, artéfacts
- **ThinkingLoader** : décomposition agentique des étapes en direct
- **ChatInput** : zone de saisie + attachements + mode raisonnement
- **PredictiveSuggestions** : suggestions contextuelles
- **AgenticActionCard** : cartes d'actions agentiques (PDF, recherche…)
- **Timeline agentique** : RatissAgentViewer (exécution en direct)
- **Panneaux d'inspiration** : SovereignLab, InteractiveTerminal, RatissLive,
  TopologicalVideoPlayer, VoiceManager, ChromeniumBrowser, SettingsBranch

**Pont backend → frontend** :
- `POST /api/chat` (SSE) — lance l'agent RATISS, streame les événements cascade
  (plan → Think/Act/Observe → ZK → résumé) au format `{content|reasoning}`
- Endpoints de compatibilité : `/api/stats`, `/api/config/*`, `/api/agentic/*`,
  `/api/competition/*`, `/api/tts/*`, `/api/ratiss-shell/chat`
- WebSocket `/ws` (multiplexé) toujours disponible pour le streaming temps réel

**Développement frontend** :
```bash
cd app/frontend
npm run dev    # Vite dev server sur :5173 (proxy vers backend :12000)
```

Exemples de tâches :
- `Analyse 4MZI, extrais les Betti, génère un graphique et un rapport PDF, certifie ZK`
- `Calcule l'état fondamental t-J sur grille 4×4`
- `Recherche arXiv sur quantum spin liquid et génère un rapport PDF`
- `Recherche PubMed sur p53 MDM2`
- `Recherche ChEMBL pour l'aspirine`
- `Exécute git --version dans le terminal`
- `Navigue vers https://arxiv.org et prends un screenshot`
- `Calcule la matrice en python (det + eigenvalues)`
- `Recherche web sur Lanczos algorithm quantum`
- `Crée le fichier analyse.py avec un script numpy`
- `Pipeline complet quantique + topologie + certification`
- `Tryperposition unifiée Q ⊗ I ⊗ M`

### Routeur LLM multi-fournisseurs

RATISS supporte désormais **4 fournisseurs LLM** pour la planification et le raisonnement :

| Fournisseur | Modèles | Variable d'environnement |
|-------------|---------|------------------------|
| **Anthropic** | Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus | `ANTHROPIC_API_KEY` |
| **Google Gemini** | Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash | `GEMINI_API_KEY` |
| **OpenAI** | GPT-4o, GPT-4o mini, o1 | `OPENAI_API_KEY` |
| **OpenRouter** | Nemotron 3 Ultra, Llama 3.3 70B, DeepSeek R1, Qwen 2.5 72B — **+ tout modèle OpenRouter personnalisé** | `OPENROUTER_API_KEY` |
| **Souverain** | RATISS Local (heuristique, hors cloud) | aucune clé requise |

**Architecture** (`orchestrator/llm_router.py`) :
- `LLMRouter` sélectionne le fournisseur selon le `model_id` (`anthropic/...`, `google/...`, `openai/...`, `openrouter/...`, `local/...`)
- Chaque fournisseur expose `complete()` (chat libre) et `plan()` (planification structurée)
- **Modèle OpenRouter personnalisable** : l'utilisateur peut saisir n'importe quel ID de modèle OpenRouter (ex: `meta-llama/llama-3.1-405b-instruct:free`, `mistralai/mistral-large:free`) — le routeur parse le `model_id` (split sur la première barre oblique) et route automatiquement vers le provider OpenRouter. Aucune liste figée.
- **Fallback souverain** : si aucune clé n'est configurée ou si l'API échoue (401, timeout…), l'agent bascule automatiquement sur le planificateur heuristique local — aucune tâche ne reste bloquée
- Configuration dynamique via l'UI : le sélecteur de modèles affiche les badges "Connecté/Non configuré" en temps réel
- Aucune clé n'est jamais loggée

**Configuration via l'API** :
```bash
# Configurer une clé Anthropic
curl -X POST http://localhost:12000/api/config/key \
  -H "Content-Type: application/json" \
  -d '{"provider":"anthropic","api_key":"sk-ant-..."}'

# Sélectionner le modèle par défaut
curl -X POST http://localhost:12000/api/llm/select \
  -H "Content-Type: application/json" \
  -d '{"model_id":"anthropic/claude-3-5-sonnet"}'

# Tester une connexion
curl -X POST http://localhost:12000/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"model_id":"google/gemini-2.0-flash","prompt":"Bonjour"}'
```

**Configuration via l'UI** : le badge "ENGINE" en haut du chat ouvre le sélecteur de modèles groupé par fournisseur. Le bouton "CONFIGURER CLÉS API →" permet d'injecter une clé pour n'importe quel fournisseur. La section **« Modèle OpenRouter personnalisé »** (encadré violet) permet de saisir n'importe quel ID de modèle OpenRouter (sans préfixe `openrouter/`), de l'ajouter à la liste et de le sélectionner — le modèle est sauvegardé dans le localStorage et persiste entre les sessions.

### Captures d'écran

Voir `screenshots/ui-v9.3/` :
- `01-main-chat.png` — Interface principale (chat + sidebar + sélecteur de mode)
- `02-settings-tabs.png` — Branche Paramètres avec navigation par onglets (6 onglets)
- `03-models-llm.png` — Onglet « Modèles & LLM » : configuration des clés API multi-provider + catalogue de modèles
- `04-agent-science.png` — Onglet « Agent & Science » : profondeur de raisonnement, certification ZK auto, rapports PDF, limites, identité académique
- `05-integrations.png` / `05-integrations-full.png` — Onglet « Intégrations » : GitHub (priorité), arXiv, Zenodo, OpenAlex, Crossref, RCSB PDB, IBM Quantum, Tavily
- `06-file-manager.png` — Onglet « Fichiers » : import universel drag & drop (tous formats scientifiques)
- `07-file-manager-with-file.png` — Fichier importé (CSV détecté automatiquement) avec actions d'analyse
- `08-sovereign-lab.png` — SovereignLab (modules quantum t-J, topologie, pipeline Aeon)

### Intégrations externes (chaîne de recherche ouverte)

RATISS s'intègre nativement aux outils de la science ouverte. Les jetons sont stockés localement (variables d'environnement) — souveraineté totale, jamais exposés.

| Intégration | Catégorie | Actions | Variable d'environnement |
|-------------|-----------|---------|--------------------------|
| **GitHub** (priorité) | Code & reproductibilité | recherche de repos, détails, langages | `GITHUB_TOKEN` |
| arXiv | Publications | recherche de prépublications | publique (sans clé) |
| OpenAlex | Publications | graphe scientifique (auteurs, concepts) | publique (sans clé) |
| Crossref | Publications | métadonnées DOI | publique (sans clé) |
| Zenodo | Données | recherche de datasets | `ZENODO_TOKEN` |
| RCSB PDB | Biologie structurale | structures 3D de macromolécules | publique (sans clé) |
| IBM Quantum | Calcul quantique | exécution de circuits QPU | `IBMQ_TOKEN` |
| Overleaf | Documents | collaboration LaTeX | `OVERLEAF_TOKEN` |
| Tavily | Recherche web | grounding factuel | `TAVILY_API_KEY` |

**Endpoints** : `GET /api/integrations` (statut), `POST /api/integrations/connect`, `POST /api/integrations/disconnect`, `POST /api/integrations/{id}/{action}`.

### Import de fichiers universel

RATISS accepte **tous les types de fichiers** via l'onglet « Fichiers » ou par glisser-déposer directement dans le chat. La détection automatique du format scientifique permet d'injecter chaque fichier dans le pipeline d'analyse agentique.

| Type | Formats | Classification |
|------|---------|----------------|
| Structures | `.pdb`, `.cif`, `.xyz`, `.mol`, `.mol2`, `.sdf` | `structure_*` |
| Données | `.csv`, `.tsv`, `.dat` | `data_*` |
| Tableaux | `.npy`, `.npz`, `.h5`, `.hdf5` | `array_*` |
| Config | `.json`, `.yaml`, `.toml` | `config_*` |
| Documents | `.pdf`, `.docx`, `.txt`, `.tex`, `.bib` | `document_*` / `latex` / `bibliography` |
| Code | `.py`, `.ipynb`, `.r`, `.m`, `.js`, `.ts`, `.cpp`, `.c`, `.rs`, `.sh` | `code_*` |
| Médias | `.png`, `.jpg`, `.svg`, `.mp4`, `.wav` | `image*` / `video` / `audio` |
| Archives | `.zip`, `.tar`, `.gz` | `archive_*` |

**Endpoints** : `POST /api/files/upload` (multipart), `GET /api/files`, `DELETE /api/files/{id}`, `POST /api/files/analyze`.

## API REST

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/health` | GET | Santé du système |
| `/api/memory` | GET | État du Memory Guard |
| `/api/connectors` | GET | Statut des connecteurs API |
| `/api/pdb` | GET | Structures PDB locales |
| `/api/skills` | GET | 23 compétences disponibles |
| `/api/run?task=...` | POST | Exécution synchrone (ReAct) |
| `/api/chat` | POST | Chat principal SSE (streaming `{content\|reasoning}` vers l'UI React) |
| `/api/stats` | GET/POST | Compteur de requêtes (compat UI) |
| `/api/config/status` | GET | État de configuration — tous les fournisseurs LLM (Anthropic, Gemini, OpenAI, OpenRouter) |
| `/api/config/key` | POST | Configure une clé API pour un fournisseur (body: `{provider, api_key, model_id?}`) |
| `/api/llm/models` | GET | Catalogue des modèles LLM multi-fournisseurs |
| `/api/llm/status` | GET | État des fournisseurs LLM (connecté/non configuré) |
| `/api/llm/test` | POST | Teste une connexion LLM (body: `{model_id, prompt?}`) |
| `/api/llm/select` | POST | Sélectionne le modèle LLM par défaut (body: `{model_id}`) |
| `/api/agentic/decompose-task` | POST | Décomposition agentique d'un prompt en étapes |
| `/api/agentic/predict-next` | POST | Suggestions prédictives contextuelles |
| `/api/agentic/search-grounding` | POST | Recherche web pour grounding factuel |
| `/api/competition/analyze` | POST | Analyse forensics d'un fichier attaché |
| `/api/competition/execute` | POST | Exécution Python agentique (mode Phenix ODV) |
| `/api/ratiss-shell/chat` | POST | Chat synchrone du shell RATISS |
| `/api/tts/voices` | GET | Liste des voix TTS disponibles |
| `/api/tts/status` | GET | État du moteur TTS |
| `/api/terminal?command=...` | POST | Exécution directe terminal |
| `/api/browser` | POST | Browser automation (navigate, click, screenshot...) |
| `/api/python` | POST | Exécution Python sandbox |
| `/api/search` | POST | Recherche web (Tavily/DuckDuckGo) |
| `/api/file` | POST | Éditeur de fichiers (view, create, str_replace) |
| `/api/refine` | POST | Auto-amélioration : analyse une trajectoire, renvoie leçons + propositions (body: `{"apply": true}` pour appliquer) |
| `/api/harness` | GET | État du harnais d'auto-amélioration (version, mémoire, prompts, trajectoires) |
| `/api/harness/rollback` | POST | Restaure une version antérieure du harnais (body: `{"version": N}`) |
| `/api/integrations` | GET | Statut des 9 intégrations externes (GitHub, arXiv, Zenodo, OpenAlex, Crossref, PDB, IBM, Overleaf, Tavily) |
| `/api/integrations/connect` | POST | Connecte une intégration (body: `{integration_id, token}`) |
| `/api/integrations/disconnect` | POST | Déconnecte une intégration (body: `{integration_id}`) |
| `/api/integrations/{id}/{action}` | POST | Exécute une action d'intégration (ex: `github/search`, `arxiv/search`, `pdb/fetch`) |
| `/api/files/upload` | POST | Import universel de fichiers (multipart, tous types, détection automatique du format) |
| `/api/files` | GET | Liste des fichiers importés |
| `/api/files/{file_id}` | DELETE | Supprime un fichier importé |
| `/api/files/analyze` | POST | Analyse agentique d'un fichier importé (body: `{file_id, instruction}`) |
| `/api/preview/{filename}` | GET | Sert un artéfact (PDF, PNG, HTML) |
| `/api/artifacts/{session}` | GET | Liste des artéfacts |
| `/ws` | WebSocket | Canal multiplexé temps réel (chat + terminal + browser + python) |

## Compétences (23 actions)

### Scientifiques (6)
| Action | Description | Catégorie |
|--------|-------------|-----------|
| `load_pdb` | Chargement structure PDB | Biologie |
| `topology` | Homologie persistante (GUDHI / fallback natif) | Topologie |
| `quantum_ed` | Diagonalisation exacte Lanczos (modèle t-J) | Physique |
| `zk_proof` | Preuve ZK-STARK RISC Zero | Cryptographie |
| `full_pipeline` | Pipeline complet RATISS | Orchestration |
| `tryperposition` | Tryperposition unifiée Q ⊗ I ⊗ M | Orchestration |

### Terminal (2) — agent agentique souverain
| Action | Description | Catégorie |
|--------|-------------|-----------|
| `terminal` | Exécute une commande shell (streaming WebSocket temps réel) | Terminal |
| `git_clone` | Clone un dépôt Git dans le workspace | Terminal |

Commandes autorisées : git, pip, python, curl, wget, ls, cat, grep, find, tar, npm, node, dot, etc.
Sécurité : allowlist stricte, détection de patterns dangereux (rm -rf /, sudo, curl|bash), timeout 30s.

### Web scientifique (6)
| Action | Description | Catégorie |
|--------|-------------|-----------|
| `web_fetch` | Récupère le contenu d'une URL (HTML, JSON, texte) | Web |
| `web_arxiv` | Recherche sur arXiv (prépublications) | Web |
| `web_pubmed` | Recherche sur PubMed (E-utilities NCBI) | Web |
| `web_chembl` | Recherche de composés sur ChEMBL | Web |
| `web_pdb` | Récupère une structure PDB (RCSB API) | Web |
| `web_alphafold` | Récupère une prédiction AlphaFold DB | Web |

### Génération de contenu (4)
| Action | Description | Catégorie |
|--------|-------------|-----------|
| `generate_pdf` | Rapport scientifique PDF (fpdf2, en-tête RATISS, sections) | Contenu |
| `generate_chart` | Graphique PNG (bar, line, scatter, pie — matplotlib) | Contenu |
| `generate_webpage` | Page HTML previewable (style intégré) | Contenu |
| `generate_betti_diagram` | Diagramme de persistance (topologie) | Contenu |

### outils agentiques (5) — nouveaux en v9.1
| Action | Description | Catégorie |
|--------|-------------|-----------|
| `browser` | Navigation web Playwright (navigate, click, type, extract, screenshot, scroll, state, back) | Browser |
| `python_execute` | Exécution Python sandbox (numpy, scipy, matplotlib, timeout 30s) | Code |
| `google_search` | Recherche web générale (Tavily API + DuckDuckGo fallback) | Web |
| `file_editor` | Éditeur de fichiers (view, create, str_replace, insert, undo, list) | Files |
| `file_saver` | Sauvegarder du contenu arbitraire dans le workspace | Files |

Tous les artéfacts sont previewables directement dans l'UI (iframe pour HTML, embed pour PDF, img pour PNG/SVG).

## Connecteurs API

| Connecteur | Mode | Fallback |
|------------|------|----------|
| IBM Quantum | Live (si token) | Lanczos ED local |
| Quandela | Live (si token) | Simulateur photonique local |
| AlphaFold DB | API publique | — |
| RCSB PDB | API publique | — |
| OpenRouter (Nemotron) | Live (si clé) | Planificateur local déterministe |

## Sécurité

- **Memory Guard** : limite stricte 7500 Mo, surveillance temps réel
- **Sessions** : SQLite local, jetons PBKDF2-HMAC-SHA256 (600 000 itérations)
- **Isolation** : workspace physique par session
- **Sandbox** : NemoSandbox — Docker éphémère (réseau désactivé, mem 2g, read-only) ou Python restreint (liste blanche d'imports)
- **Souveraineté** : aucune donnée envoyée vers un service cloud sans clé API explicite

## Déploiement

```bash
./scripts/deploy.sh local    # serveur local
./scripts/deploy.sh docker   # conteneur Docker
./scripts/deploy.sh hf       # Hugging Face Spaces
./scripts/deploy.sh vercel   # UI statique Vercel
```

## Dépendances

Python 3.11+, dépendances minimales (frugal) : `fastapi`, `uvicorn`, `websockets`, `numpy`, `scipy`, `psutil`.

Optionnels (fallbacks natifs si absents) : `qiskit`, `qiskit-ibm-runtime`, `gudhi`, `perceval`, `biopython`.

## Licence

MIT — Jonathan Evina, 2025-2026
