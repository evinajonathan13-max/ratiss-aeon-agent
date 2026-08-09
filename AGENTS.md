# AGENTS.md — RATISS Aeon Prime

## Contexte du projet
- **Auteur** : Jonathan Evina (18, Cameroun) · ORCID 0009-0000-4092-5313 · DOI 10.17605/OSF.IO/6JZMB
- **Objectif** : Agent scientifique souverain (quantum + topology + bio + crypto) pour incubateurs/investisseurs
- **Dépôt** : `ratiss-kkl` (GitHub: evinajonathan13-max), branche `feat/agent-orchestration`
- **Source noyau** : `ratiss-scientist-agent` (privé, 16 Mo, ~15.7K lignes Python)
- **NE PAS répliquer** : `ratiss-cypher-odv-scientist` (tentative échouée, 116 Mo)

## Architecture
- `kernel/` — Noyau scientifique RATISS V9 (main.py, bridge.py, solvers/, connectors/, core/, system/, zk/)
- `orchestrator/` — Agent agentique (agent.py, nemotron_client.py, skill_manager.py, cascade.py)
- `app/` — FastAPI + WebSocket + UI statique (app/server.py, app/static/)
- `security/` — Sessions, PBKDF2, isolation workspace, NemoSandbox
- `scripts/` — init_vault, import_skill, align_agent, deploy.sh

## Commandes utiles
```bash
pip install -r requirements.txt
python -m app.server              # UI: http://localhost:7860
python scripts/align_agent.py --check
python scripts/init_vault.py --username admin --password "..."
python -m pytest tests/           # tests pipeline
```

## Découvertes clés
1. **quantum_solver.py** retourne un dict imbriqué : `tj_model`, `convergence`, `qubit_processing` (pas top-level)
2. **zk prover** utilise `proof_receipt_b64` / `public_commitment` (pas `receipt_b64` / `zk_commitment`) — normalisé dans skill_manager
3. **GUDHI** non installé → fallback natif RATISS fonctionne (Betti [1,2,0] sur 4MZI)
4. **Memory Guard** : `get_current_memory_mb()` depuis `kernel.system.memory_guard`
5. **Nemotron** : fallback local par heuristique de mots-clés si `OPENROUTER_API_KEY` absent
6. **D3.js** servi localement (280 Ko) pour souveraineté — pas de CDN

## Sécurité
- Aucun secret dans le repo (placeholders `TON_JETON_ICI`)
- `.env` dans `.gitignore`
- Tokens jamais loggés
- Workspace isolé par session (`workspace/user_X/session_Y/`)

## Dépendances
- Hard : numpy, scipy, psutil, fastapi, uvicorn, websockets
- Optional (fallback natif) : qiskit, qiskit-ibm-runtime, gudhi, perceval, biopython
