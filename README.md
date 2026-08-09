# RATISS Aeon Agent

**Agent scientifique autonome souverain** — type Manus IA, combinant physique quantique (Lanczos ED), topologie computationnelle, biologie structurale, cryptographie (ZK-STARK), **terminal intégré**, **accès web scientifique** et **génération de contenu** (PDF, graphiques, pages web).

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
2. **Exécute** chaque étape via le noyau scientifique (Lanczos ED, GUDHI, PDB, ZK-STARK)
3. **Certifie** les résultats avec une preuve ZK-STARK RISC Zero (vérifiée en < 1 ms)
4. **Génère** des artéfacts téléchargeables (JSON, reçus ZK, diagrammes)

Le tout dans un Memory Guard strict (7500 Mo, CPU-only), 100 % souverain : aucune donnée ne quitte la machine sans clé API explicite.

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
    │   ├── agent.py            #   Boucle Plan → Execute → Certify → Artifact
    │   ├── nemotron_client.py  #   Client OpenRouter (Nemotron 3 Ultra)
    │   ├── skill_manager.py    #   Registre des compétences noyau
    │   └── cascade.py          #   Émetteur d'événements WebSocket
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
    ├── data/pdb/               # Structures PDB locales (4MZI, 4MZR)
    ├── config/                 # allowed_imports.txt, agent_aligned.json
    ├── tests/                  # Tests pipeline
    ├── Dockerfile              # HF Spaces / VPS (port 7860)
    ├── requirements.txt        # Dépendances minimales (frugal)
    └── .env.example            # Variables d'environnement (sans secrets)

## Démarrage rapide

```bash
pip install -r requirements.txt
cp .env.example .env   # optionnel : configurer les clés API
python -m app.server   # UI : http://localhost:7860
```

## Interface web (4 panneaux)

- **Chat** : Décrivez une tâche en langage naturel
- **Raisonnement en cascade** : Plan + étapes en temps réel + logs
- **Terminal** : Exécutez des commandes shell (git, pip, curl...) avec sortie streaming temps réel
- **Télémétrie & Artéfacts** : Memory Guard, CPU, connecteurs, artéfacts previewable, certification ZK

Exemples de tâches :
- `Analyse 4MZI, extrais les Betti, génère un graphique et un rapport PDF, certifie ZK`
- `Calcule l'état fondamental t-J sur grille 4×4`
- `Recherche arXiv sur quantum spin liquid et génère un rapport PDF`
- `Recherche PubMed sur p53 MDM2`
- `Recherche ChEMBL pour l'aspirine`
- `Exécute git --version dans le terminal`
- `Pipeline complet quantique + topologie + certification`
- `Tryperposition unifiée Q ⊗ I ⊗ M`

## API REST

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/health` | GET | Santé du système |
| `/api/memory` | GET | État du Memory Guard |
| `/api/connectors` | GET | Statut des connecteurs API |
| `/api/pdb` | GET | Structures PDB locales |
| `/api/skills` | GET | 18 compétences disponibles |
| `/api/run?task=...` | POST | Exécution synchrone |
| `/api/terminal?command=...` | POST | Exécution directe terminal |
| `/api/preview/{filename}` | GET | Sert un artéfact (PDF, PNG, HTML) |
| `/api/artifacts/{session}` | GET | Liste des artéfacts |
| `/ws` | WebSocket | Canal multiplexé temps réel (chat + terminal) |

## Compétences du noyau (18 actions)

### Scientifiques (6)
| Action | Description | Catégorie |
|--------|-------------|-----------|
| `load_pdb` | Chargement structure PDB | Biologie |
| `topology` | Homologie persistante (GUDHI / fallback natif) | Topologie |
| `quantum_ed` | Diagonalisation exacte Lanczos (modèle t-J) | Physique |
| `zk_proof` | Preuve ZK-STARK RISC Zero | Cryptographie |
| `full_pipeline` | Pipeline complet RATISS | Orchestration |
| `tryperposition` | Tryperposition unifiée Q ⊗ I ⊗ M | Orchestration |

### Terminal (2) — type Manus IA
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
