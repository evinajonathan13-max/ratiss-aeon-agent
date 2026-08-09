# Dockerfile — RATISS Aeon Prime
# Cible : Hugging Face Spaces / VPS (port 7860)
# CPU-only, Memory Guard 7500 Mo, no GPU
FROM python:3.11-slim

LABEL maintainer="Jonathan Evina <evinajonathan13@gmail.com>"
LABEL org.opencontainers.image.title="RATISS Aeon Prime"
LABEL org.opencontainers.image.description="Agent scientifique souverain : quantique, topologie, bio, crypto"
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

# Copier le code
COPY . .

# Créer les répertoires de travail
RUN mkdir -p /app/workspace /app/data/pdb /app/config

# Variables d'environnement par défaut
ENV RATISS_HOST=0.0.0.0
ENV RATISS_PORT=7860
ENV RATISS_RAM_LIMIT_MB=7500
ENV PYTHONUNBUFFERED=1

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:7860/api/health || exit 1

# Port HF Spaces standard
EXPOSE 7860

# Lancement du serveur
CMD ["python", "-m", "app.server"]
