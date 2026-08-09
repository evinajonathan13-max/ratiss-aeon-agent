#!/usr/bin/env bash
# deploy.sh — Déploiement automatisé de RATISS Aeon Prime
#
# Cibles :
#   local    : lance le serveur en local (défaut)
#   docker   : build + run conteneur Docker
#   hf       : prépare le déploiement Hugging Face Spaces (Docker, port 7860)
#   vercel   : déploie l'UI statique sur Vercel (complément léger)
#
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

TARGET="${1:-local}"
PORT="${RATISS_PORT:-7860}"

echo "============================================================"
echo "  RATISS Aeon Prime — Déploiement (cible: $TARGET)"
echo "============================================================"

case "$TARGET" in
  local)
    echo "[1/2] Vérification des dépendances Python..."
    python -c "import fastapi, uvicorn, numpy, scipy, psutil" 2>/dev/null || {
      echo "Installation des dépendances..."
      pip install -r requirements.txt
    }
    echo "[2/2] Lancement du serveur sur le port $PORT..."
    echo "  UI : http://localhost:$PORT"
    echo "  API : http://localhost:$PORT/api/health"
    echo "  WebSocket : ws://localhost:$PORT/ws"
    exec python -m app.server
    ;;

  docker)
    echo "[1/3] Build de l'image Docker..."
    docker build -t ratiss-aeon-prime .
    echo "[2/3] Lancement du conteneur (port $PORT)..."
    docker run -d --name ratiss \
      -p "$PORT:7860" \
      -e RATISS_PORT=7860 \
      -v "$ROOT/workspace:/app/workspace" \
      -v "$ROOT/data:/app/data" \
      --env-file "$ROOT/.env" \
      ratiss-aeon-prime
    echo "[3/3] Conteneur lancé. UI : http://localhost:$PORT"
    echo "  Logs : docker logs -f ratiss"
    ;;

  hf)
    echo "[1/2] Préparation du déploiement Hugging Face Spaces..."
    echo "  Le Dockerfile est configuré pour HF Spaces (port 7860)."
    echo "  PUSH le dépôt vers Hugging Face Spaces :"
    echo "    git remote add space https://huggingface.co/spaces/VOTRE_USER/ratiss-aeon-prime"
    echo "    git push space main"
    echo "[2/2] Vérification du Dockerfile..."
    [ -f Dockerfile ] && echo "  ✓ Dockerfile présent" || echo "  ✗ Dockerfile manquant"
    [ -f README.md ] && head -5 README.md
    ;;

  vercel)
    echo "[1/2] Déploiement de l'UI statique sur Vercel..."
    if ! command -v vercel >/dev/null 2>&1; then
      echo "  Vercel CLI non installé. Installation..."
      npm install -g vercel
    fi
    echo "[2/2] Lancement du déploiement Vercel..."
    echo "  Note : Vercel est serverless. Seule l'UI statique est déployée."
    echo "  Le noyau Python scientifique doit tourner sur HF Spaces ou un VPS."
    vercel --prod
    ;;

  *)
    echo "Cible inconnue: $TARGET"
    echo "Usage: $0 {local|docker|hf|vercel}"
    exit 1
    ;;
esac
