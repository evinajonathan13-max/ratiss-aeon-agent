# AGENTS.md — RATISS Aeon Agent

## Contexte du projet
- **Auteur** : Jonathan Evina (18, Cameroun) · ORCID 0009-0000-4092-5313 · DOI 10.17605/OSF.IO/6JZMB
- **Objectif** : Agent scientifique autonome souverain (quantum + topology + bio + crypto + browser + terminal + python + web + contenu) pour incubateurs/investisseurs
- **Dépôt** : `ratiss-aeon-agent` (GitHub: evinajonathan13-max), branche `main`
- **Source** : extension de `ratiss-kkl` (PR #1 merged)
- **Version** : 9.4.0 (kernel ratiss_v9_aeon_prime) — UI React immersive + couche d'auto-amélioration RLM/Continual Harness + identité souveraine ancrée + mémoire persistante
- **Propriété intellectuelle** : JOHNKING0 & architecte Jonathan Evina

## Architecture (29 skills + couche RLM)
- `kernel/` — Noyau scientifique RATISS V9 (main.py, bridge.py, solvers/, connectors/, core/, system/, zk/)
  - `system/sovereign_memory.py` — **NOUVEAU v9.4** Mémoire personnelle persistante (hors contexte du modèle). Stocke identité, capacités, profil utilisateur, mode de sécurité, souvenirs datés dans `config/sovereign_memory.json`. `build_system_prefix()` reconstruit le préfixe (identité + mémoire) à chaque appel → Ratiss ne se perd jamais, même en travail long.
- `config/sovereign_identity.py` — **NOUVEAU v9.4** Identité souveraine ancrée (JohnKing0 / RATISS V9 Aeon Prime). `SOVEREIGN_PROMPT`, `build_system_prefix()`, `identity_signature()`, `who_am_i()`. Model-agnostic : peu importe le LLM branché, c'est Ratiss qui répond.
- `assets/` — **NOUVEAU v9.4** Logo + bannière (`ratiss_logo.svg/png`, `ratiss_banner.svg/png`). Servi via `GET /assets/logo.{svg,png}`.
- `orchestrator/` — Agent agentique avec **boucle ReAct** (agent.py, nemotron_client.py, skill_manager.py, cascade.py)
  - `llm_router.py` — Routeur LLM multi-fournisseurs : Anthropic (Claude), Google (Gemini), OpenAI (GPT), OpenRouter (Nemotron + **tout modèle personnalisé saisi par l'utilisateur**) + fallback souverain local. `complete()`, `plan()`, `set_api_key()`, catalogue de 14 modèles. `_parse_model_id()` route via le préfixe (`openrouter/<n'importe-quel-id>`). **v9.4** : `_sovereign_system_prefix()` injecte identité + mémoire à chaque appel ; le fallback local `_local_complete` parle en langage naturel au nom de Ratiss.
  - `nemotron_client.py` — Client OpenRouter (Nemotron) + planificateur local. **v9.4** : `SYSTEM_PROMPT` ancé « Tu es RATISS (instance JohnKing0) ».
  - `agent.py` — Boucle Plan → Execute → Certify → Artifact + refine(). **v9.4** : sauvegarde un souvenir en mémoire persistante à la fin de chaque `run()`.
  - `auto_improve.py` — **NOUVEAU v9.2** Couche RLM : analyze_trajectory, extract_lessons (pattern/heuristic/pitfall/memory), validate_lessons_with_zk, pipeline refine()
  - `harness_manager.py` — **NOUVEAU v9.2** Continual Harness : état persistant versionné (prompts/skills/memory/subagents), CRUD, snapshots + rollback, archive leçons & trajectoires
- `tools/` — outils agentiques :
  - `terminal_executor.py` — Shell sécurisé (allowlist, streaming, blocage rm -rf /)
  - `web_client.py` — arXiv, PubMed, ChEMBL, PDB, AlphaFold, fetch URL
  - `content_generator.py` — PDF (fpdf2), charts (matplotlib), pages HTML
  - `browser_tool.py` — **NOUVEAU** Browser Playwright (navigate, click, type, extract, screenshot, scroll, state, back) via subprocess one-shot
  - `python_executor.py` — **NOUVEAU** Exécution Python sandbox (numpy, scipy, matplotlib, timeout 30s)
  - `web_search.py` — **NOUVEAU** Recherche web générale (Tavily API + DuckDuckGo fallback)
  - `file_editor.py` — **NOUVEAU** Éditeur de fichiers (view, create, str_replace, insert, undo, list)
  - `file_saver.py` — **NOUVEAU** Sauvegarder du contenu arbitraire
- `app/` — FastAPI + WebSocket + UI React immersive
  - `server.py` — FastAPI (40+ routes), mount `/static` + `/assets`, SSE `/api/chat`. **v9.4** : endpoints identité/mémoire/onboarding (`/api/identity`, `/api/profile`, `/api/profile/onboard`, `/api/profile/security`, `/api/memory/state`, `/api/memory/remember`, `/api/memory/{id}`) + `/assets/logo.{svg,png}`.
  - `frontend/` — **NOUVEAU v9.3** UI React/TypeScript (Vite 6 + React 19 + Tailwind v4)
    - `src/App.tsx` — App principale, handleSend (SSE reader)
    - `src/components/` — Sidebar, MessageBubble, ThinkingLoader, ChatInput, PredictiveSuggestions, AgenticActionCard, RatissAgentViewer, SovereignLab, InteractiveTerminal, RatissLive, VoiceManager, SettingsBranch…
    - `src/components/OnboardingGate.tsx` — **NOUVEAU v9.4** Porte d'entrée : vérifie l'onboarding, affiche l'écran d'accueil si nécessaire.
    - `src/components/WelcomeScreen.tsx` — **NOUVEAU v9.4** Écran d'accueil (logo + collecte profil âge/métier + choix sécurité). Responsive, calibrage tactile.
    - `src/lib/` — browserTts, pdfReportGenerator
    - build → `app/static/` (servi par FastAPI)
- `security/` — Sessions, PBKDF2, isolation workspace, NemoSandbox
- `screenshots/` — 8 captures d'écran (UI React v9.3)

## 29 compétences
- **6 scientifiques** : load_pdb, topology, quantum_ed, zk_proof, full_pipeline, tryperposition
- **4 red-team P vs NP (NOUVEAU)** : redteam_circuit (CircuitLowerBoundAttacker), redteam_tsp (TSPAlgoAttacker), impossibility_solver (Margolus-Levitin/Landauer/Bekenstein), redteam_full
- **3 terminal** : terminal, git_clone (+ analyse auto de repo), repo_analyze, repo_register_skills
- **6 web scientifique** : web_fetch, web_arxiv, web_pubmed, web_chembl, web_pdb, web_alphafold
- **4 contenu** : generate_pdf, generate_chart, generate_webpage, generate_betti_diagram
- **5 agent agentique (NOUVEAU v9.1)** : browser, python_execute, google_search, file_editor, file_saver

## Vault de cles API persistant (v9.3.1 — environnement souverain)
- `security/api_vault.py` — Coffre-fort chiffré au repos (Fernet/cryptography). Stockage dans `config/api_vault.json` + cle maitre `config/api_vault.key` (ne jamais committer).
- **14 cles supportees** : anthropic, google, openai, openrouter, ibm_quantum, quandela, tavily, ncbi_api_key, alphafold_api_key, chembl_api_key, github_token, zenodo_token, overleaf_token, custom.
- **Endpoints** : `GET /api/vault/keys`, `POST /api/vault/key`, `DELETE /api/vault/key`, `POST /api/vault/load`.
- Chargement automatique au demarrage (startup event) dans `os.environ`.
- **Frontend** : onglet "Vault API" dans SettingsBranch (ApiVaultPanel.tsx) — ajout/suppression/visualisation, chiffre au repos, jamaais logge.

## Creation auto de competences (v9.3.1 — auto-apprentissage)
- `orchestrator/repo_skill_extractor.py` — Analyse un depot clone (langage, framework, points d'entree, categorie scientifique) et propose des skills sous validation utilisateur.
- `git_clone` enrichi : apres clone, analyse automatiquement le repo et propose des skills.
- **2 skills** : `repo_analyze`, `repo_register_skills` (validation requise avant enregistrement dans HarnessManager).
- **Endpoints** : `POST /api/repo/analyze`, `POST /api/repo/register-skills`.
- **Frontend** : onglet "Competences" dans SettingsBranch (RepoSkillPanel.tsx).

## Boucle ReAct (v9.1)
L'agent utilise désormais une boucle **Think → Act → Observe** au lieu de plan-then-execute :
- Think : l'agent réfléchit à chaque étape
- Act : exécute l'action (terminal, python, browser, scientifique...)
- Observe : analyse le résultat et adapte
- Détection de blocage : si la même action est répétée 3 fois, arrêt automatique

## Couche d'auto-amélioration RLM / Continual Harness (v9.2)
Boucle : Exécution → Validation ZK → Analyse trajectoire → Leçons → Validation ZK des leçons → Mise à jour du harnais.
- `agent.last_summary` / `agent.last_plan` capturés à la fin de `run()` + trajectoire persistée dans `harness/trajectories/`.
- `agent.refine(apply=False)` : analyse la trajectoire courante, propose des leçons + mises à jour (sans appliquer). Émet `refine_proposal`.
- `agent.refine(apply=True)` : applique les mises à jour au harnais (CRUD + versioning + snapshot) + génère un rapport PDF d'auto-amélioration.
- Commande chat `/refine` (dry-run) et `/refine apply` (applique) ; `/harness` affiche l'état.
- Endpoints REST : `POST /api/refine` (body `{"apply": true}`), `GET /api/harness`, `POST /api/harness/rollback`.
- Événements WebSocket : `refine_start`, `refine_proposal`, `refine_applied`, `refine_done`, `harness_state`.
- UI : bannière de proposition avec leçons (type/cible/confiance) + boutons Appliquer/Rejeter.
- Types de leçons : `pattern` (prompt), `heuristic` (skill), `pitfall` (prompt/subagent), `memory` (memory).
- Validation ZK : `validate_lessons_with_zk` génère une preuve ZK-STARK sur un payload d'invariants (énergie<0, entropie≥0, réseau valide) + hash des leçons ; aucune mise à jour si invalide.
- Souveraineté : analyse déterministe (heuristiques locales), aucun LLM externe requis.

## Identité souveraine & mémoire persistante (v9.4)
- **Principe** : Ratiss doit réécrire sa mémoire pour toujours se souvenir de qui il est et de ses capacités, peu importe le modèle branché. C'est Ratiss, ni GPT ni Gemini.
- `config/sovereign_identity.py` — `SOVEREIGN_PROMPT` (JohnKing0 / RATISS V9 Aeon Prime), `build_system_prefix()` (fusion identité + mémoire), `identity_signature()` (signature ZK), `who_am_i()`.
- `kernel/system/sovereign_memory.py` — `SovereignMemory` : `remember()`, `forget()`, `set_profile()`, `set_security_mode()`, `build_system_prefix()`, `snapshot_for_prompt()`. Persistance `config/sovereign_memory.json` (gitignoré). Max 200 souvenirs, 8 dans le snapshot injecté.
- **Ancrage** : `orchestrator/llm_router.py::_sovereign_system_prefix()` préfixe chaque `complete()` ; le fallback `_local_complete` parle en langage naturel au nom de Ratiss. `agent.py` sauvegarde un souvenir à la fin de chaque `run()`.
- **Calibrage** : langage naturel (pas de jargon), ton optimiste, UX responsive/tactile (téléphone + tablette) via `WelcomeScreen.tsx` + `index.css`.

## Onboarding & standard de sécurité d'entrée (v9.4)
- **Écran d'accueil** : `OnboardingGate.tsx` (vérifie l'onboarding) + `WelcomeScreen.tsx` (logo + collecte profil + choix sécurité). Synchronisation une fois via `POST /api/profile/onboard`.
- **Données collectées** : prénom, âge, rôle, domaine, objectif.
- **Standard de sécurité** : `sovereign` (fermé, défaut) ou `cloud_opt_in` (ouvert, explicite). Choix justifié : la souveraineté est fondatrice → fermé par défaut, cloud opt-in sur décision utilisateur.
- **Endpoints** : `GET /api/identity`, `GET /api/profile`, `POST /api/profile/onboard`, `POST /api/profile/security`, `GET /api/memory/state`, `POST /api/memory/remember`, `DELETE /api/memory/{id}`, `GET /assets/logo.{svg,png}`.

## Commandes utiles
```bash
pip install -r requirements.txt
python -m app.server              # UI: http://localhost:7860
python scripts/align_agent.py --check
python -m pytest tests/           # tests pipeline
```

## API REST
- `/api/health` — Santé
- `/api/skills` — 18 compétences
- `/api/run?task=...` — Exécution synchrone
- `/api/terminal?command=...` — Terminal direct
- `/api/preview/{filename}` — Preview artéfact (PDF, PNG, HTML)
- `/ws` — WebSocket multiplexé (chat + terminal streaming)

## Deploiement multi-environnements (v9.4)
- **Dockerfile** — Image multi-étapes CPU-only : stage `node:20-slim` qui build le frontend React (Vite → `app/static/`, gitignoré à la source) puis stage `python:3.11-slim` final (Memory Guard 7500 Mo, cible HuggingFace Spaces / VPS, port 7860). Healthcheck Python urllib (pas de curl). Sans le stage frontend, l'UI v9.4 (OnboardingGate/WelcomeScreen) ne serait pas servie.
- **docker-compose.yml** — 3 profils :
  - `ratiss-server` (VPS/production, port 7860) — `docker compose up ratiss-server -d`
  - `ratiss-hf` (HuggingFace Spaces) — `docker compose --profile huggingface up ratiss-hf -d`
  - `ratiss-dev` (dev local hot-reload, port 12000) — `docker compose --profile dev up ratiss-dev -d`
- **railway.json** — Deploiement Railway (backend FastAPI stateful).
- **vercel.json** — Frontend statique servi par Vercel + rewrites vers le backend (Railway/Render/VPS).
- Volumes persistants : `workspace/`, `data/`, `config/` (vault de cles API + `sovereign_memory.json` → la mémoire de Ratiss survit aux redémarrages du conteneur).
- **requirements.txt** — `python-multipart` ajouté (requis par FastAPI pour les routes `UploadFile`/`Form` de l'import universel `/api/files/upload`).

## Intégrations externes & import universel (v9.3)
- **Store souverain** : `kernel/connectors/integrations.py` — 9 intégrations (github, arxiv, zenodo, openalex, crossref, rcsb_pdb, overleaf, ibm_quantum, tavily). État persistant dans `workspace/integrations_state.json`.
- **Actions externes** : `kernel/connectors/integration_actions.py` — GitHub (search/repos/langages), arXiv (search), Zenodo, OpenAlex, Crossref, RCSB PDB (fetch), Overleaf. Toutes en HTTP via `httpx`/`urllib`, sans dépendance lourde.
- **Endpoints** : `GET /api/integrations`, `POST /api/integrations/connect|disconnect`, `POST /api/integrations/{id}/{action}`.
- **Import universel** : `POST /api/files/upload` (multipart, champ `file`) — détection MIME par extension, classification en `kind` (structure_*, data_*, array_*, code_*, document_*, latex, bibliography, image, video, audio, archive_*). Stockage dans `workspace/uploads/`.
- **Endpoints fichiers** : `GET /api/files`, `DELETE /api/files/{id}`, `POST /api/files/analyze` (passe le chemin absolu du fichier au pipeline agentique).
- **Frontend** : `lib/api.ts` (helpers HTTP), `components/FileManager.tsx` (drag & drop + liste + analyse), `components/IntegrationsPanel.tsx` (cartes par catégorie, connect/disconnect, actions). Onglets `models`/`agent`/`integrations`/`files` dans `SettingsBranch.tsx`.
- **GitHub d'abord** : l'intégration GitHub est marquée priorité et apparaît en tête du panneau. `GITHUB_TOKEN` détecté automatiquement.

## Découvertes clés
1. **quantum_solver.py** retourne un dict imbriqué : `tj_model`, `convergence`, `qubit_processing` (pas top-level)
2. **zk prover** utilise `proof_receipt_b64` / `public_commitment` — normalisé dans skill_manager
3. **GUDHI** non installé → fallback natif RATISS fonctionne (Betti [1,2,0] sur 4MZI)
4. **Memory Guard** : `get_current_memory_mb()` depuis `kernel.system.memory_guard`
5. **fpdf2** : caractères non latin-1 (em-dash —) → `_sanitize()` remplace par ASCII
6. **Terminal** : use `subprocess.Popen` avec `bufsize=1` pour streaming ligne par ligne
7. **arXiv API** : retourne Atom XML, parser avec `xml.etree.ElementTree` (namespace `{http://www.w3.org/2005/Atom}`)
8. **Dispatch intégrations** : `run_integration()` dans `integration_actions.py` doit lister TOUTES les intégrations déclarées dans `integrations.py`, sinon `unknown_integration` (bug "banque" RCSB PDB corrigé)
9. **generate_pdf** supporte `kind: "image"` (content = chemin fichier) pour embarquer graphiques/diagrammes dans le rapport
10. **Docker healthcheck** : l'image n'installe PAS `curl` — utiliser `python -c "urllib.request.urlopen(...)"` (cf. Dockerfile + docker-compose.yml)

## Sécurité terminal
- Allowlist : git, pip, python, curl, wget, ls, cat, grep, find, tar, npm, node, dot, echo, head, tail, wc
- Patterns bloqués : `rm -rf /`, `sudo`, `curl|bash`, `wget|sh`, `mkfs`, `dd if=`, `:(){:|:&};:`
- Timeout : 30s max par commande
- Working dir : workspace de la session isolée

## Tests validés (10/08/2026)
- 19/19 tests pytest passent (10 auto_improve + 9 agentique_pdb_pdf)
- Bug "banque" RCSB PDB : dispatch corrigé, fetch réel 4MZI OK (titre/méthode/résolution/download_url)
- Endpoint `/api/headless-browse` : ajouté (frontend InteractiveTerminal ne fait plus 404)
- Endpoint `/api/tts/download` : ajouté (bouton sync TTS ne fait plus 404)
- Pipeline agentique complet : Plan → load_pdb → topology → PDF enrichi → ZK, 4/4 étapes
- Rapport PDF enrichi : structure PDB 4MZI + nombres de Betti + graphique de visualisation embarqué (21286 octets en Docker avec image PNG)
- Build Docker : OK (frontend React + backend Python), conteneur démarre, /api/health 200
- Healthcheck Docker corrigé (python urllib au lieu de curl absent de l'image)
- ZK-STARK : vérifié 0.8ms

## Notes techniques additionnelles
- **Nemotron** : fallback local par heuristique de mots-clés si `OPENROUTER_API_KEY` absent
- **D3.js** servi localement (280 Ko) pour souveraineté — pas de CDN

## Sécurité
- Aucun secret dans le repo (placeholders `TON_JETON_ICI`)
- `.env` dans `.gitignore`
- Tokens jamais loggés
- Workspace isolé par session (`workspace/user_X/session_Y/`)

## Dépendances
- Hard : numpy, scipy, psutil, fastapi, uvicorn, websockets
- Optional (fallback natif) : qiskit, qiskit-ibm-runtime, gudhi, perceval, biopython
