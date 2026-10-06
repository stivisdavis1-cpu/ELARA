# DOSSIER DE CONCEPTION - ELARA

## 1. Introduction
ELARA est une plateforme de gestion documentaire (GED) complète intégrant :
- Numérisation et traitement de documents (Scanner OCR)
- Extraction intelligente et structuration (IA)
- Gestion multitenant avec isolation stricte
- Architecture 100% conteneurisée (Docker Compose)

## 2. Objectifs
- Fonctionnalité 100% locale et reproductible
- Sécurité maximale (zéro repli, principe de moindre privilège)
- Isolation multitenant stricte
- Traçabilité sans données fictives
- Robustesse (survie redémarrage, healthchecks)

## 3. Architecture technique

### 3.1 Vue d'ensemble
Monorepo TypeScript/Python :
- pps/web : Next.js 16.3.4 (App Router), React, TypeScript
- pps/api-nest : NestJS, Prisma, TypeScript (API REST)
- pps/api-ai : FastAPI, Python 3.11 (IA/OCR/Embeddings)

### 3.2 Services d'infrastructure (docker-compose.yml)
| Service | Image | Port | Rôle | Healthcheck |
|---|---|---|---|---|
| postgres | ankane/pgvector:latest | 5432 | BDD + pgvector (mémoires/embeddings) | pg_isready |
| redis | redis:alpine | 6379 | Cache/Session | redis-cli ping |
| rabbitmq | rabbitmq:3-management-alpine | 5672/15672 | Messages asynchrones (traitement docs lourds) | rabbitmq-diagnostics ping |
| keycloak | quay.io/keycloak/keycloak:latest | 8080 | Auth SSO/OIDC (Realm Elara) | JWKS /.well-known |
| minio | quay.io/minio/minio | 9000/9001 | Stockage objet S3 local | mc ready |
| api-ai | build local | 8000 | IA/OCR/extraction/embeddings | HTTP /health |
| api-nest | build local | 3001 | API métier (GED, scanner, utilisateurs) | HTTP /v1/health |
| web | build local | 3000 | Interface Next.js | HTTP /login |

Dépendances : services infra service_healthy → API Nest attend Keycloak/RabbitMQ → Web attend API Nest.
Tous avec estart: unless-stopped.

### 3.3 Modèle de données (Prisma)
Entités principales : Tenant, User, UserTenant, Invitation, PasswordResetToken, Document, etc. Migrations dans infra/db/migrations/.

## 4. Sécurité & Authentification

### 4.1 Authentification
- Keycloak (OIDC, RS256). JWKS récupéré dynamiquement (cache + rate-limit)
- NextAuth (Credentials) échange identifiants → tokens Keycloak
- session.accessToken exposé au 1er niveau (source). session.tenantId peut être null.

### 4.2 Multitenant
- Tenant courant = cookie serveur elara_tenant (résolu layout serveur, distribué via TenantContext)
- useEntetesApi() force Authorization: Bearer ... + X-Tenant-Id: ...
- Proxy Next.js ne réécrit pas auth/tenant (obligatoire côté navigateur)
- TenantInterceptor (NestJS) vérifie appartenance, refuse tenant absent/invalide (sauf /mes-organisations)
- Isolation stricte : utilisateur A ne peut accéder ressources tenant B (403)

### 4.3 Sécurité absolue (interdictions)
- **Aucun** 	est-token, **aucun** 	est-tenant comme repli (supprimés + tests garde-fou)
- Aucune donnée synthétique présentée comme réelle (503 honnête si indisponible)
- Mots de passe : validation stricte (DTO class-validator), confirmation vérifiée côté API
- Tokens (activation/réinitialisation) : hash SHA-256, usage unique, expiration courte (15min)
- Pas d'exposition stack trace côté client, format erreur JSON unifié

## 5. Composants clés

### 5.1 Scanner & GED
Upload, détection doublons, OCR, extraction structurée, éléments d'information, archivage/rejet, aperçu binaire (base64), historique.

### 5.2 IA (api-ai)
- /ai/embeddings : 768-d, renvoie 503 si aucun fournisseur (bascule lexicale). Jamais de vecteur factice.
- /ai/extract : extraction structurée factures/documents. Échec franc si illisible.
- Worker RabbitMQ : traitement asynchrone scanner.document.traite

### 5.3 Gestion utilisateurs
Invitations (lien affiché/copiable, empreinte côté API), activation, réinitialisation mot de passe (sans SMTP, lien explicite), RBAC (admin vs autres).

## 6. Développement & Qualité

### 6.1 Commandes
- Démarrage : docker compose up -d (tous healthy)
- Profil local 100% : docker compose -f docker-compose.yml -f docker-compose.local.yml up -d (Postgres+pgvector local 5433)
- Build/TS : 
pm run build, 
px tsc --noEmit (web + api-nest) → 0 erreur
- Tests API : cd apps/api-nest && npx vitest run
- Garde-fous : nti-regression, 	enant-isolation, ctivation

### 6.2 Qualité
- TypeScript strict, zéro erreur tsc
- DTOs validés (class-validator), pipes globaux
- Code mort nettoyé, imports cohérents
- Tests permanents (anti-régression interdisant replis interdits)

## 7. Déploiement & Exploitation
- Healthchecks complets (infra + applicatifs)
- Redémarrage automatique (unless-stopped)
- Ordonnancement par santé (depends_on service_healthy)
- Volumes persistants, logs structurés
- DNS interne Docker (résolution service names)

## 8. Points d'attention
- Base réelle : Supabase via DATABASE_URL (prod). Profil local proposé sans impacter distante.
- Tenant 	est (11 docs) : conservé, aucune purge sans accord explicite
- Aucun SMTP : liens affichés explicitement (activation + reset)
- Embeddings : 503 = comportement correct (fallback lexical)

## 9. Validation
- Redémarrage complet → 8 services healthy
- Parcours bout-en-bout : 0 requête /api/* >= 400
- Garde-fous tests OK, builds/tsc 0 erreur
