# AGENTS.md — RATISS Aeon Agent

## Contexte du projet
- **Auteur** : Jonathan Evina (18, Cameroun) · ORCID 0009-0000-4092-5313 · DOI 10.17605/OSF.IO/6JZMB
- **Objectif** : Agent scientifique autonome souverain type Manus IA (quantum + topology + bio + crypto + terminal + web + contenu) pour incubateurs/investisseurs
- **Dépôt** : `ratiss-aeon-agent` (GitHub: evinajonathan13-max), branche `ratiss-aeon-agent` (PR #2 sur ratiss-kkl)
- **Source** : extension de `ratiss-kkl` (PR #1 merged)
- **Version** : 9.0.0 (kernel ratiss_v9_aeon_prime)

## Architecture (18 skills)
- `kernel/` — Noyau scientifique RATISS V9 (main.py, bridge.py, solvers/, connectors/, core/, system/, zk/)
- `orchestrator/` — Agent agentique (agent.py, nemotron_client.py, skill_manager.py, cascade.py)
- `tools/` — **NOUVEAU** Manus AI tools :
  - `terminal_executor.py` — Shell sécurisé (allowlist, streaming, blocage rm -rf /)
  - `web_client.py` — arXiv, PubMed, ChEMBL, PDB, AlphaFold, fetch URL
  - `content_generator.py` — PDF (fpdf2), charts (matplotlib), pages HTML
- `app/` — FastAPI + WebSocket + UI 4-panneaux (server.py, static/index.html|style.css|app.js)
- `security/` — Sessions, PBKDF2, isolation workspace, NemoSandbox
- `screenshots/` — 4 captures d'écran (dashboard, arXiv+PDF, preview, terminal)

## 18 compétences
- **6 scientifiques** : load_pdb, topology, quantum_ed, zk_proof, full_pipeline, tryperposition
- **2 terminal** : terminal, git_clone
- **6 web** : web_fetch, web_arxiv, web_pubmed, web_chembl, web_pdb, web_alphafold
- **4 contenu** : generate_pdf, generate_chart, generate_webpage, generate_betti_diagram

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
