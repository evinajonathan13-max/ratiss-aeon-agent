# AGENTS.md — RATISS Aeon Agent

## Contexte du projet
- **Auteur** : Jonathan Evina (18, Cameroun) · ORCID 0009-0000-4092-5313 · DOI 10.17605/OSF.IO/6JZMB
- **Objectif** : Agent scientifique autonome souverain (quantum + topology + bio + crypto + browser + terminal + python + web + contenu) pour incubateurs/investisseurs
- **Dépôt** : `ratiss-aeon-agent` (GitHub: evinajonathan13-max), branche `main`
- **Source** : extension de `ratiss-kkl` (PR #1 merged)
- **Version** : 9.3.0 (kernel ratiss_v9_aeon_prime) — UI React immersive + couche d'auto-amélioration RLM/Continual Harness

## Architecture (23 skills + couche RLM)
- `kernel/` — Noyau scientifique RATISS V9 (main.py, bridge.py, solvers/, connectors/, core/, system/, zk/)
- `orchestrator/` — Agent agentique avec **boucle ReAct** (agent.py, nemotron_client.py, skill_manager.py, cascade.py)
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
  - `server.py` — FastAPI (40 routes), mount `/static` + `/assets`, SSE `/api/chat`
  - `frontend/` — **NOUVEAU v9.3** UI React/TypeScript (Vite 6 + React 19 + Tailwind v4)
    - `src/App.tsx` — App principale, handleSend (SSE reader)
    - `src/components/` — Sidebar, MessageBubble, ThinkingLoader, ChatInput, PredictiveSuggestions, AgenticActionCard, RatissAgentViewer, SovereignLab, InteractiveTerminal, RatissLive, VoiceManager, SettingsBranch…
    - `src/lib/` — browserTts, pdfReportGenerator
    - build → `app/static/` (servi par FastAPI)
- `security/` — Sessions, PBKDF2, isolation workspace, NemoSandbox
- `screenshots/` — 4 captures d'écran (dashboard, arXiv+PDF, preview, terminal)

## 23 compétences
- **6 scientifiques** : load_pdb, topology, quantum_ed, zk_proof, full_pipeline, tryperposition
- **2 terminal** : terminal, git_clone
- **6 web scientifique** : web_fetch, web_arxiv, web_pubmed, web_chembl, web_pdb, web_alphafold
- **4 contenu** : generate_pdf, generate_chart, generate_webpage, generate_betti_diagram
- **5 agent agentique (NOUVEAU v9.1)** : browser, python_execute, google_search, file_editor, file_saver

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

## Découvertes clés
1. **quantum_solver.py** retourne un dict imbriqué : `tj_model`, `convergence`, `qubit_processing` (pas top-level)
2. **zk prover** utilise `proof_receipt_b64` / `public_commitment` — normalisé dans skill_manager
3. **GUDHI** non installé → fallback natif RATISS fonctionne (Betti [1,2,0] sur 4MZI)
4. **Memory Guard** : `get_current_memory_mb()` depuis `kernel.system.memory_guard`
5. **fpdf2** : caractères non latin-1 (em-dash —) → `_sanitize()` remplace par ASCII
6. **Terminal** : use `subprocess.Popen` avec `bufsize=1` pour streaming ligne par ligne
7. **arXiv API** : retourne Atom XML, parser avec `xml.etree.ElementTree` (namespace `{http://www.w3.org/2005/Atom}`)

## Sécurité terminal
- Allowlist : git, pip, python, curl, wget, ls, cat, grep, find, tar, npm, node, dot, echo, head, tail, wc
- Patterns bloqués : `rm -rf /`, `sudo`, `curl|bash`, `wget|sh`, `mkfs`, `dd if=`, `:(){:|:&};:`
- Timeout : 30s max par commande
- Working dir : workspace de la session isolée

## Tests validés (13/13/2026)
- Full pipeline 4MZI + Betti + PDF + Chart + ZK : 5/5 étapes, 2.1s
- arXiv "t-J model Lanczos" : 5 résultats
- Terminal WebSocket streaming : git --version, pip list (stdout ligne par ligne)
- `rm -rf /` : BLOQUÉ
- Preview PDF : HTTP 200, application/pdf, 1589 bytes
- E₀ t-J 4×4 : -3.513677
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
