# Architecture Technique — ELARA

## 1. Choix de la Stack Technique

Le projet ELARA repose sur une stack moderne, robuste et portable, conçue pour supporter un déploiement SaaS multi-tenant sur notre cluster cloud, mais également un déploiement on-premise mono-tenant chez des clients réglementés (tels que des banques), sans nécessiter de réécriture.

*   **Backend Métier :** NestJS (TypeScript)
    *   **Rôle :** Point d'entrée exclusif pour la logique métier via une API REST versionnée (`/v1`).
    *   **Avantage :** Typage strict, architecture modulaire orientée entreprise, idéal pour structurer les règles métier et l'API de manière maintenable.
*   **Backend IA / OCR / RAG :** FastAPI (Python)
    *   **Rôle :** Traitement des tâches intensives (OCR, extraction, appels LLM, indexation RAG). Il n'est appelé *qu'en interne* par NestJS, jamais directement par le frontend.
    *   **Avantage :** Écosystème Python incontournable pour l'IA, hautes performances via l'asynchronisme de FastAPI.
*   **Base de Données :** PostgreSQL + pgvector
    *   **Rôle :** Stockage relationnel et vectoriel unifié. Utilisation stricte de la Row Level Security (RLS) pour l'isolation multi-tenant.
*   **Gestion des Identités et des Accès (IAM) :** Keycloak
    *   **Rôle :** Authentification forte, MFA, RBAC (Role-Based Access Control) et SSO.
*   **Stockage Objet :** MinIO
    *   **Rôle :** Stockage des fichiers (documents, images) compatible S3, chiffré au repos, facilitant le déploiement on-premise sans dépendance à AWS.
*   **Cache & Bus d'Événements :** Redis & RabbitMQ
    *   **Rôle :** Redis pour le cache court, RabbitMQ pour la gestion asynchrone des tâches longues (OCR, appels LLM).
*   **Conteneurisation & Orchestration :** Docker & Kubernetes
    *   **Rôle :** Garantir que chaque service tourne de manière isolée et scalable. Kubernetes (ou K3s pour on-premise léger) gère le cycle de vie.
*   **Déploiement Continu :** Octopus Deploy
    *   **Rôle :** Config as Code, source du process de déploiement stockée dans Git. Gestion de la promotion entre environnements et validation manuelle avant la production.

**Justification de la portabilité :** Cette stack, entièrement conteneurisée (images Docker + charts Helm), permet de passer du SaaS cloud (Kubernetes managé) à un déploiement on-premise (K3s ou docker-compose) de manière fluide. Les LLM peuvent être basculés sur des instances auto-hébergées (Ollama) pour les données sensibles, respectant ainsi les contraintes des environnements bancaires. L'absence d'extraction de service future réduit drastiquement la dette technique.

## 2. Architecture en 6 Couches

L'architecture d'ELARA est modélisée selon 6 couches logiques qui se reflètent directement dans la structure du monorepo :

1.  **Ingestion :** Collecte des données dispersées (fichiers, API, saisie).
2.  **Document Intelligence :** OCR, extraction de données non structurées (géré par FastAPI).
3.  **Business Memory :** Stockage persistant, indexation vectorielle, RLS PostgreSQL (client partagé `packages/business-memory`).
4.  **Intelligence :** Modèles LLM, RAG pour l'analyse (FastAPI).
5.  **AI Agents :** Agents intelligents agissant sur les données.
6.  **Action :** Prise de décision, interaction avec l'utilisateur via le Dashboard ou Mobile (NestJS + Frontends).

## 3. Trajectoire de Montée en Charge (SANS réécriture)

L'architecture est pensée "Start Simple, Design for Scale". La montée en charge suit ces étapes, utilisant la même base de code :

*   **10 entreprises pilotes :** Déploiement standard sur un cluster Kubernetes. Ressources partagées, isolation logique stricte (RLS + `tenant_id`).
*   **1 000 utilisateurs :** Scaling horizontal des pods Kubernetes (ex: augmentation du nombre de réplicas NestJS et FastAPI). Dimensionnement de la base PostgreSQL.
*   **100 000 utilisateurs :** Renforcement de l'isolation par tenant pour les très gros comptes (schémas ou bases PostgreSQL dédiés si nécessaire), sharding possible, tout en conservant la même logique d'accès aux données.
*   **Millions d'utilisateurs :** Scaling massif via l'event bus RabbitMQ, distribution géographique.
*   **Déploiement On-Premise (Clients Bancaires) :** Réutilisation stricte des mêmes images Docker et charts Helm, appliqués sur des clusters locaux (ex: K3s). Seuls les fichiers de configuration (values Helm) diffèrent.

## 4. Les 3 Règles Structurantes Invariables

| Règle | Description | Impact Technique |
| :--- | :--- | :--- |
| **Multi-Tenant Systematique** | Chaque entité métier possède un `tenant_id`. | Sécurité garantie par la Row Level Security (RLS) PostgreSQL au plus bas niveau, en plus des filtres applicatifs. |
| **API-First (NestJS)** | Toute action métier transite par l'API interne versionnée (`/v1`) de NestJS. | Aucun accès direct à la base de données depuis les frontends (Web/Mobile) ou FastAPI. Centralisation de la logique métier. |
| **Asynchrone par Défaut** | Tout traitement long (OCR, LLM) est non-bloquant. | Dépôt d'un message sur RabbitMQ par NestJS, traitement par un worker (NestJS ou FastAPI), notification en retour. |
