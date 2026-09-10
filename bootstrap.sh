#!/bin/bash
echo "Démarrage de l'infrastructure locale (PostgreSQL, Redis, RabbitMQ, Keycloak, MinIO)..."
docker-compose up -d postgres redis rabbitmq keycloak minio

echo "Attente de l'initialisation des services (10 secondes)..."
sleep 10

echo "Lancement des tests API NestJS..."
(cd apps/api-nest && npm install && npm run test)

echo "Lancement des tests API AI FastAPI..."
(cd apps/api-ai && poetry install && poetry run pytest)

echo "Lancement du lint Next.js..."
(cd apps/web && npm install && npm run lint)

echo "✅ Bootstrap terminé avec succès !"
