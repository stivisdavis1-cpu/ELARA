#!/bin/bash

echo "==> Configuration de l'environnement docker pour minikube..."
eval $(minikube docker-env)

echo "==> Création du namespace (si inexistant)..."
kubectl create namespace elara-prod || true

echo "==> Construction de l'image api-ai..."
cd apps/api-ai
docker build -t elara-api-ai:latest .
cd ../..

echo "==> Construction de l'image api-nest..."
cd apps/api-nest
docker build -t elara-api-nest:latest .
cd ../..

echo "==> Construction de l'image web..."
cd apps/web
docker build -t elara-web:latest .
cd ../..

echo "==> Déploiement des manifests Kubernetes..."
kubectl apply -f infra/k8s/

echo "==> Terminé ! 🚀"
echo "Vous pouvez accéder au frontend via l'IP de minikube et le NodePort."
minikube service web-service -n elara-prod --url
