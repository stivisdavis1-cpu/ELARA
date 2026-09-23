# syntax=docker/dockerfile:1
# ============================================================
# ELARA api-nest — API NestJS — Image multi-stage
# ⚠️ CONTEXTE DE BUILD REQUIS : racine du monorepo
#   docker build -f apps/api-nest/Dockerfile -t elara/api-nest .
# (nécessaire pour embarquer les scripts Python OCR partagés
#  avec api-ai dans apps/api-ai/services)
# ============================================================

# ---------- Stage 1 : Builder ----------
FROM node:20-alpine AS builder

WORKDIR /workspace/apps/api-nest

COPY apps/api-nest/package.json apps/api-nest/package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copie du code source et schéma Prisma
COPY apps/api-nest ./

# Génération du client Prisma + build
# openssl requis pour que Prisma détecte OpenSSL 3.x (par défaut 1.1.x sur Alpine)
RUN apk add --no-cache openssl && npx prisma generate && npm run build

# ---------- Stage 2 : Production ----------
FROM node:20-alpine AS production

# Python + Tesseract pour le fallback OCR local (Partie A)
# et outils de signature réseau pour le healthcheck
# openssl requis pour que Prisma (OpenSSL 3.x) retrouve son moteur au runtime
# python-docx + reportlab : conversion DOCX → PDF (script docx_to_pdf.py)
RUN apk add --no-cache python3 py3-pip tesseract-ocr tesseract-ocr-data-fra tesseract-ocr-data-eng poppler-utils imagemagick openssl \
    && python3 -m pip install --no-cache-dir --break-system-packages python-docx reportlab

RUN addgroup --system --gid 1001 elara \
    && adduser --system --uid 1001 --ingroup elara elara

WORKDIR /app

# Répertoire d'upload temporaire (multer) et répertoire documents local (mode filesystem),
# accessibles par l'utilisateur non-root (volume monté sur /data/documents)
RUN mkdir -p /app/tmp /data/documents && chown -R elara:elara /app /data

COPY apps/api-nest/package.json apps/api-nest/package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /workspace/apps/api-nest/dist ./dist
COPY --from=builder /workspace/apps/api-nest/prisma ./prisma
COPY --from=builder /workspace/apps/api-nest/node_modules/.prisma ./node_modules/.prisma

# Scripts Python OCR/PDF partagés avec api-ai (pdf_to_img, crop, docx_to_pdf)
COPY apps/api-ai/services ./scripts

ENV NODE_ENV=production \
    PORT=3001 \
    OCR_SCRIPTS_DIR=/app/scripts

USER elara

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/v1/health || exit 1

CMD ["npm", "run", "start:prod"]