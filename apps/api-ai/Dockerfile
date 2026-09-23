# syntax=docker/dockerfile:1
# ============================================================
# ELARA api-ai — Microservice IA (FastAPI) — Image multi-stage
# Build context : apps/api-ai
# ============================================================

# ---------- Stage 1 : Builder (dépendances Python + code) ----------
FROM python:3.11-slim AS builder

WORKDIR /build

# Dépendances système pour OCR (Tesseract), PDF (Poppler)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY . .

# ---------- Stage 2 : Production (image r�duite, process non-root) ----------
FROM python:3.11-slim AS production

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 elara \
    && useradd --system --uid 1001 --gid elara elara \
    && mkdir -p /data/documents && chown -R elara:elara /data

# Environnement Python isolé depuis le builder (portable sur la même base)
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /build/ ./

ENV PATH="/opt/venv/bin:$PATH"

USER elara

EXPOSE 8000

# Healthcheck HTTP natif (sans binaire supplémentaire)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]