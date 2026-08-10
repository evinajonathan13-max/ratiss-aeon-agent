# Dockerfile — RATISS Aeon Prime (v9.5)
# Cible : Hugging Face Spaces / VPS (port 7860)
# CPU-only, Memory Guard 7500 Mo, no GPU
#
# Build multi-étapes :
#   1) stage "frontend" : compile l'UI React/TypeScript (Vite) -> app/static/
#      (app/static/ est gitignoré, donc on le reconstruit dans l'image)
#   2) stage final Python : copie le noyau scientifique + l'UI déjà buildée.
# Sans ça, le serveur FastAPI n'aurait ni index.html ni les assets : l'écran
# d'entrée v9.4 (OnboardingGate / WelcomeScreen) ne se chargerait pas.
#
# v9.5 : ajout des modules sécurité (vuln_scanner + transdisc_security).
#        Dépendances : cryptography (Fernet), fpdf2 (rapports PDF).
#        Les audits chiffrés sont stockés dans /app/audits (volume persistant).

# ── Stage 1 : build du frontend React/TS ────────────────────────────────────
FROM node:20-slim AS frontend

# On reproduit la structure du repo (app/frontend) pour que outDir "../static"
# (cf. vite.config.ts) se résolve en /build/app/static — comme en local.
WORKDIR /build/app/frontend
# Copier d'abord package.json + lockfile (cache Docker par dépendances)
COPY app/frontend/package.json app/frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copier le source du frontend et builder -> /build/app/static/
COPY app/frontend/ ./
RUN npm run build
# Résultat : /build/app/static/{index.html,assets/}

# ── Stage 2 : image Python finale ─────────────────────────────────────────────
FROM python:3.11-slim

LABEL maintainer="Jonathan Evina <evinajonathan13@gmail.com>"
LABEL org.opencontainers.image.title="RATISS Aeon Prime"
LABEL org.opencontainers.image.description="Agent scientifique souverain : quantique, topologie, bio, crypto + sécurité défensive (v9.5)"
LABEL org.opencontainers.image.version="9.5"
LABEL org.opencontainers.image.license="MIT"

# Dépendances système minimales (pour scipy/numpy compilés)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier requirements d'abord (cache Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code (noyau scientifique + config + assets logo)
COPY . .

# Copier l'UI déjà buildée depuis le stage frontend (gitignorée à la source)
COPY --from=frontend /build/app/static/ ./app/static/

# Créer les répertoires de travail
RUN mkdir -p /app/workspace /app/data/pdb /app/config /app/audits

# Variables d'environnement par défaut
ENV RATISS_HOST=0.0.0.0
ENV RATISS_PORT=7860
ENV RATISS_RAM_LIMIT_MB=7500
ENV PYTHONUNBUFFERED=1
# v9.5 : module sécurité désactivé par défaut (activation par mot de passe opérateur)
ENV RATISS_VULN_SCANNER_ENABLED=0
# v9.5 : répertoire des audits chiffrés (volume persistant)
ENV RATISS_AUDITS_DIR=/app/audits

# Healthcheck (sans curl : python urllib est toujours présent dans l'image)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request,sys; urllib.request.urlopen('http://localhost:7860/api/health', timeout=5); sys.exit(0)" || exit 1

# Port HF Spaces standard
EXPOSE 7860

# Lancement du serveur
CMD ["python", "-m", "app.server"]
