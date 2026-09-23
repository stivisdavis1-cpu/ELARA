# ELARA — Cahier de Prompts de Développement Fullstack (v2 — stack cible unifiée)

admin-free@elara.test (Tenant: Startup L'Aurore)
admin-pro@elara.test (Tenant: Cabinet Pro Consulting)
admin-enterprise@elara.test (Tenant: Holding Internationale)

*Régénération intégrale du cahier v1.0 (Septembre 2026). Remplace le chemin MVP Next.js + Supabase + Vercel par un démarrage direct sur la stack cible : NestJS (backend métier) + FastAPI (backend IA/OCR) + PostgreSQL + Keycloak + MinIO + Redis + RabbitMQ + Kubernetes, frontend Next.js conteneurisé sur le même cluster, CI/CD et release management via Octopus Deploy (Config as Code, Git Repository).*

*Version 2.0 — Septembre 2026*

---

## 0. Comment utiliser ce document

Structure inchangée par rapport au v1.0 : 22 parties, chacune avec Objectif, Contexte, 🔧 PROMPT prêt à copier-coller, Livrables & critères d'acceptation. Injecter systématiquement le Prompt-cadre global (section 1) en début de session, avant tout prompt de partie.

Les règles métier, entités, invariants et critères de recette officiels du cahier des charges **n'ont pas changé** — seule la couche technique/infrastructure est révisée dans ce document. Les parties sont exécutées dans l'ordre.

---

## 1. Prompt-cadre global (à injecter en premier, dans chaque session)

### Contexte

Elara est « le système d'exploitation intelligent des PME africaines », lancé au Cameroun. Chaîne de valeur : **Données dispersées → Information → Connaissance → Décision → Action**. Architecture en 6 couches (Ingestion → Document Intelligence → Business Memory → Intelligence → AI Agents → Action) — inchangée.

### 🔧 PROMPT

```
Tu es l'agent de développement fullstack du projet ELARA — le système d'exploitation
intelligent des PME africaines (marché de lancement : Cameroun, secteurs prioritaires :
commerce/distribution et services). Avant d'écrire la moindre ligne de code, respecte ces
invariants non négociables, sur TOUTE la durée du projet et pour TOUTE partie du code :

1. MULTI-TENANT DÈS LA PREMIÈRE TABLE — tenant_id sur toute entité, isolation renforcée par
   Row Level Security PostgreSQL, pas seulement par filtre applicatif.
2. API-FIRST DÈS LA PREMIÈRE FONCTIONNALITÉ — toute action métier transite par l'API interne
   versionnée /v1 exposée par le service NestJS, jamais d'accès direct à la base depuis un
   frontend ou un autre service.
3. ASYNCHRONE DÈS L'ORIGINE — tout traitement long (OCR, extraction, appel LLM, appel API
   tierce) transite par une file RabbitMQ, jamais de blocage de l'UI ni de la requête HTTP.
4. HUMAN-IN-THE-LOOP SUR TOUTE ACTION SENSIBLE — aucune action à impact financier ou client
   n'est jamais exécutée automatiquement ; elle est proposée puis attend une validation
   explicite.
5. GROUNDING STRICT — ZÉRO HALLUCINATION — toute réponse IA s'appuie exclusivement sur la
   Business Memory du tenant, avec citation systématique de la source.
6. TRAÇABILITÉ COMPLÈTE — toute action métier et toute action IA journalisées dans un audit
   trail consultable et horodaté.
7. SÉCURITÉ BY DESIGN — chiffrement au repos (PostgreSQL, MinIO) et en transit (TLS partout,
   Ingress Kubernetes), authentification forte + MFA via Keycloak, RBAC, secrets gérés
   centralement (Kubernetes Secrets / coffre dédié, jamais dans le code ou les logs).
8. MOBILE-FIRST & TOLÉRANT AUX INTERRUPTIONS — usable depuis un smartphone, imports en attente
   conservés localement et synchronisés à la reconnexion.
9. FRANÇAIS D'ABORD — interface et contenus en français dès le MVP, internationalisation
   prévue dès l'architecture.
10. START SIMPLE, DESIGN FOR SCALE — le MVP démarre déjà en services conteneurisés
    indépendants (NestJS, FastAPI) sur Kubernetes, base relationnelle unique avec tenant_id ;
    la trajectoire vers l'architecture cible (event bus complet, isolation renforcée par
    tenant, observabilité complète, déploiement on-premise mono-tenant pour les banques via
    les mêmes images Docker) ne nécessite donc plus d'extraction ultérieure de services —
    seulement une montée en charge et un durcissement progressifs.

Stack technique retenue dès le premier commit (SaaS multi-tenant ET portable on-premise) :
- Backend métier : NestJS (TypeScript), API REST versionnée /v1.
- Backend IA/OCR/RAG : FastAPI (Python), appelé en interne par NestJS, jamais directement par
  le frontend.
- Base de données : PostgreSQL + pgvector, Row Level Security multi-tenant.
- Stockage objet : MinIO. Cache/queues courtes : Redis. Event bus asynchrone : RabbitMQ.
- Auth/RBAC/SSO : Keycloak. API Gateway/Ingress : Traefik (ou Ingress NGINX).
- OCR : Tesseract. LLM : Ollama (Llama 3/Mistral, self-hosted) via LiteLLM (routage
  multi-fournisseur). RAG : LangChain ou LlamaIndex.
- Frontend web : Next.js (App Router), conteneurisé, déployé sur le même cluster Kubernetes.
- Mobile : React Native / PWA.
- Orchestration : Kubernetes. CI (build/test/images) : GitHub Actions. CD/release management :
  Octopus Deploy (process versionné en Config as Code dans le repo Git, déploiement vers les
  environnements Kubernetes dev/staging/production, promotion contrôlée, validation manuelle
  obligatoire avant production).
- Observabilité : Prometheus + Grafana + Loki.

La même base de code (images Docker + charts Helm) doit supporter, sans réécriture, un mode
SaaS multi-tenant sur ce cluster ET un mode on-premise mono-tenant chez un client réglementé
(banque), avec LLM auto-hébergé quand les données ne peuvent pas sortir de son infrastructure.

Confirme avoir intégré ces 10 principes et cette stack avant de traiter la prochaine
instruction. Applique-les systématiquement même si un prompt de partie ne les répète pas.
```

---

## 2. Vue d'ensemble — Architecture & pile technique

### Contexte

Une seule pile, dès le premier commit — plus de distinction MVP / cible : **NestJS + FastAPI + PostgreSQL + Keycloak + MinIO + Redis + RabbitMQ**, conteneurisés, orchestrés par **Kubernetes**, déployés via **Octopus Deploy** (Config as Code, Git Repository comme source du process). La même base de code doit rester portable vers un déploiement on-premise mono-tenant (docker-compose ou K3s selon la taille du client bancaire) sans réécriture.

### 🔧 PROMPT

```
En te basant sur le Prompt-cadre global déjà injecté, initialise le document d'architecture
technique du projet ELARA (fichier ARCHITECTURE.md à la racine du monorepo) qui décrit :

1. Le choix de stack : NestJS (backend métier, TypeScript) + FastAPI (backend IA/OCR, Python)
   + PostgreSQL/pgvector + Keycloak + MinIO + Redis + RabbitMQ, conteneurisés et orchestrés par
   Kubernetes dès le premier environnement. Justifie ce choix par la portabilité SaaS ↔
   on-premise immédiate (clients bancaires réglementés) et l'absence d'extraction de service à
   prévoir plus tard.
2. Le schéma des 6 couches (Ingestion → Document Intelligence → Business Memory →
   Intelligence → AI Agents → Action) et la manière dont l'arborescence du monorepo
   (/apps/api-nest, /apps/api-ai, /apps/web, /packages/*) reflète cette séparation dès le
   MVP.
3. La trajectoire de montée en charge SANS réécriture : 10 entreprises pilotes → 1 000 →
   100 000 → millions d'utilisateurs, via scaling horizontal des pods Kubernetes par service,
   isolation renforcée par tenant (schémas/bases dédiés pour les comptes à fort volume), et
   portabilité vers un cluster on-premise (K3s) chez les clients bancaires en réutilisant les
   mêmes charts Helm avec des values distinctes.
4. Un tableau des trois règles structurantes à respecter dès le premier commit : (a) tenant_id
   sur chaque entité, (b) toute action métier passe par l'API NestJS versionnée /v1, (c) tout
   traitement long est publié sur une file RabbitMQ et traité par un worker (NestJS ou FastAPI
   selon la nature du traitement).

Structure ensuite le monorepo avec :
/apps/api-nest        → Backend métier NestJS (Layer 3, 5, 6 ; contrôleurs /v1/*)
/apps/api-ai          → Backend FastAPI (Layer 2 OCR/extraction, Layer 4 LLM/RAG)
/apps/web             → Frontend Next.js (dashboard, marketing, onboarding)
/apps/mobile          → React Native / PWA
/packages/shared-types → Types/DTO partagés entre api-nest, web, mobile
/packages/business-memory → Client d'accès PostgreSQL partagé (Layer 3), consommé par api-nest
/infra/k8s            → Manifests/Helm charts par service et par environnement
/infra/octopus        → Définitions de process Octopus (Config as Code)
/infra/db             → Migrations SQL versionnées (schéma + politiques RLS)
/docs                 → ce cahier de prompts et les documents sources

Ne code rien d'autre à cette étape : produis uniquement ARCHITECTURE.md et l'arborescence de
dossiers vide (fichiers .gitkeep et README.md par dossier expliquant son rôle et sa couche).
```

### Livrables & critères d'acceptation
- `ARCHITECTURE.md` complet et cohérent avec les 10 invariants du prompt-cadre.
- Arborescence de dossiers créée, chaque dossier documentant sa couche.
- Repo Git initialisé et connecté à Octopus Deploy (projet ELARA, Config as Code) ; cluster Kubernetes cible enregistré comme deployment target.

---

## PARTIE 1 — Fondations & Setup du monorepo, CI/CD

### Objectif
Poser le socle technique : monorepo NestJS + FastAPI + Next.js configuré, environnements (dev/staging/production), CI GitHub Actions + CD Octopus Deploy vers Kubernetes, conventions de code, secrets.

### Contexte
Gestion de code : GitHub. CI (build/test/images Docker) : GitHub Actions. CD (release, promotion d'environnement, déploiement Kubernetes) : Octopus Deploy, process versionné en Config as Code dans `/infra/octopus`. Secrets jamais dans le code ni les logs — gérés via Kubernetes Secrets et les variables sensibles Octopus.

### 🔧 PROMPT

```
Initialise le projet ELARA sur la base de l'arborescence définie dans ARCHITECTURE.md :

1. Crée le service NestJS (/apps/api-nest, TypeScript strict, ESLint + Prettier) avec un
   module de santé exposant GET /v1/health (vérifie la connectivité PostgreSQL, Redis,
   RabbitMQ, Keycloak).
2. Crée le service FastAPI (/apps/api-ai, Python, Poetry ou pip-tools) avec un endpoint
   GET /health, appelé uniquement par api-nest en interne (jamais exposé publiquement via
   l'Ingress).
3. Crée le projet Next.js (/apps/web, App Router, TypeScript strict, Tailwind CSS — voir
   Partie 14 pour les tokens de design), consommant exclusivement l'API NestJS /v1/*.
4. Dockerfile multi-stage pour chacun des trois services (api-nest, api-ai, web), images
   optimisées (taille réduite, utilisateur non-root, healthcheck intégré).
5. Charts Helm de base (/infra/k8s) pour chaque service : Deployment, Service, ConfigMap,
   HorizontalPodAutoscaler minimal, valeurs distinctes par environnement
   (values-dev.yaml, values-staging.yaml, values-production.yaml, values-onpremise.yaml).
6. Process Octopus (/infra/octopus, Config as Code) : étapes de déploiement Kubernetes par
   service (déploiement du chart Helm avec les valeurs de l'environnement ciblé), variables
   sensibles gérées côté Octopus (jamais commitées), étape de validation manuelle obligatoire
   avant promotion vers `production`.
7. Workflow GitHub Actions (.github/workflows/ci.yml) qui, à chaque pull request : lint,
   type-check, tests unitaires (api-nest, api-ai, web), build + push des trois images Docker
   vers le registre de conteneurs, puis déclenche la création d'une release Octopus.
8. Fichier CONTRIBUTING.md : convention de nommage des branches, format des commits,
   obligation de revue de code, rappel des 10 invariants du prompt-cadre global.
9. .env.example par service documentant chaque variable attendue (DATABASE_URL, REDIS_URL,
   RABBITMQ_URL, MINIO_ENDPOINT, KEYCLOAK_URL, API_AI_INTERNAL_URL, etc.) — aucun secret réel
   commité.

Ne code aucune fonctionnalité métier à cette étape.
```

### Livrables & critères d'acceptation
- Les trois services buildent et démarrent localement (docker-compose de développement) et via les charts Helm sur un cluster de test.
- CI GitHub Actions fonctionnelle, bloquante sur erreurs de lint/type/tests ; scan `gitleaks` sans détection.
- Release Octopus créée automatiquement à chaque merge sur `main`, déploiement `dev` automatique, `staging`/`production` avec validation manuelle.
- `/v1/health` répond 200 avec statut de connexion à PostgreSQL, Redis, RabbitMQ, Keycloak.

---

## PARTIE 2 — Modèle de données & Base de données (schéma multi-tenant + RLS)

### Objectif
Concevoir et implémenter le schéma PostgreSQL complet de la Business Memory (Layer 3), avec `tenant_id` sur chaque table et Row Level Security dès la première migration.

### Contexte (inchangé sur le fond)
Entités : Entreprise (tenant), Utilisateurs, Clients, Prospects, Fournisseurs, Produits, Services, Commandes, Factures, Paiements, Dépenses, Stocks, Documents, Conversations, Événements, Tâches, Contrats, Historique. Déduplication automatique, historisation, transaction toujours rattachée à une entité, cabinet comptable multi-tenant.

### 🔧 PROMPT

```
En respectant le Prompt-cadre global, crée les migrations SQL (/infra/db/migrations, outil de
migration au choix : Prisma, TypeORM ou Flyway — cohérent avec NestJS) du schéma complet de la
Business Memory ELARA, appliquées à un PostgreSQL autonome (self-hosted ou managé) :

1. Table `tenants` (id, raison_sociale, secteur, pays, ville, devise, statut_abonnement,
   parametres jsonb, created_at).
2. Table `users` (id, tenant_id, nom, email, role enum [admin_compte, utilisateur_standard],
   keycloak_subject_id — identité gérée par Keycloak, cette table ne stocke pas de mot de
   passe) — table `user_tenants` (user_id, tenant_id, role) pour l'accès multi-tenant (cabinet
   comptable).
3. Entités métier, TOUTES avec tenant_id NOT NULL, created_at, updated_at, deleted_at (soft
   delete) : clients, prospects, fournisseurs, produits, services, commandes, factures (statut
   brouillon/envoyee/payee/impayee/annulee), lignes_facture, paiements, depenses, stocks,
   documents (lien vers l'objet MinIO, type_document, score_confiance, statut_validation),
   conversations, evenements, taches, contrats.
4. Table `historique_modifications` alimentée par des triggers PostgreSQL sur chaque table
   d'entité (pas par du code applicatif).
5. Table `audit_trail` (tenant_id, acteur_type [utilisateur, systeme_ia, integration],
   acteur_id, action, entite_concernee, statut, metadata jsonb, created_at), distincte de
   l'historisation, couvrant TOUTE action métier et IA.
6. Contraintes de cohérence : CHECK sur factures/commandes exigeant client_id ou
   fournisseur_id non nul ; index unique partiel (tenant_id, hash_document) sur `documents`.
7. Row Level Security activée sur chaque table métier, policy générique via une fonction SQL
   `current_user_tenant_ids()` alimentée par le contexte de session injecté par NestJS (le
   backend positionne `SET app.current_user_id` à chaque requête, résolu depuis le token
   Keycloak vérifié en amont). Tests SQL (pgTAP) prouvant l'absence de fuite inter-tenant.
8. Index de performance sur (tenant_id, created_at) pour les tables à fort volume.
9. Script de seed (/infra/db/seed.sql) avec un tenant de démonstration secteur
   commerce/distribution et des données fictives représentatives.

Documente le schéma final dans /docs/schema.md avec un diagramme ERD (Mermaid).
```

### Livrables & critères d'acceptation
- Migrations idempotentes s'appliquant proprement sur une base vierge, exécutées automatiquement par le job de déploiement Octopus avant le déploiement de `api-nest`.
- RLS activée et testée : aucune fuite inter-tenant même via un rôle applicatif compromis.
- Triggers d'historisation fonctionnels sur au moins clients, factures, fournisseurs.
- Jeu de données de démonstration chargé. `docs/schema.md` à jour avec ERD.

---

## PARTIE 3 — Authentification, RBAC & Multi-tenant

### Objectif
Implémenter l'authentification (via Keycloak, MFA), les rôles applicatifs et l'isolation multi-tenant côté application, en complément de la RLS base de données.

### Contexte (inchangé sur le fond)
Rôles : admin_compte, utilisateur_standard, assistant_ia_systeme (lecture seule, jamais d'écriture directe), integration_externe. MFA disponible. RBAC jusqu'au niveau de l'entité. Cabinet comptable multi-tenant.

### 🔧 PROMPT

```
Implémente le module d'authentification et d'autorisation ELARA, adossé à Keycloak :

1. Réalm Keycloak dédié ELARA : clients OIDC pour `web` (Authorization Code + PKCE) et pour
   `api-nest` (Bearer token validation) ; MFA (TOTP) activable par utilisateur ; mapping des
   rôles applicatifs (admin_compte, utilisateur_standard) en tant que rôles Keycloak ou
   attributs personnalisés synchronisés vers la table `user_tenants`.
2. Guard NestJS (`JwtAuthGuard`) validant le token Keycloak sur chaque route protégée,
   résolvant le(s) tenant_id accessibles par l'utilisateur via `user_tenants`, et injectant le
   tenant actif dans le contexte de la requête (support multi-tenant pour les cabinets
   comptables via un en-tête `X-Tenant-Id` validé contre les tenants autorisés).
3. Module `RbacModule` (/apps/api-nest/src/rbac) définissant les rôles et un service
   `peut(utilisateur, action, ressource)` utilisé par tous les contrôleurs avant d'exécuter une
   action. Le rôle assistant_ia_systeme n'a JAMAIS de droit d'écriture directe.
4. Policies RLS complémentaires pour restreindre un utilisateur_standard à un sous-ensemble de
   données au sein de son tenant, si des droits granulaires sont paramétrés.
5. Journalisation dans `audit_trail` de chaque connexion, changement de rôle et action
   d'administration.
6. Tests d'intégration prouvant : (a) impossibilité d'accéder à un tenant non rattaché même en
   modifiant l'en-tête tenant, (b) impossibilité pour utilisateur_standard d'exécuter une
   action réservée à admin_compte, (c) échec systématique de toute tentative d'écriture directe
   du rôle assistant_ia_systeme.

Aucun secret Keycloak (client secret, clé de signature) exposé côté frontend ; le client `web`
utilise le flow public PKCE, aucun secret confidentiel dans le bundle Next.js.
```

### Livrables & critères d'acceptation
- Connexion, inscription, activation MFA fonctionnels via Keycloak.
- Sélecteur de tenant actif opérationnel pour un compte multi-tenant.
- Tests d'isolation multi-tenant et de RBAC tous verts.
- Chaque connexion et action d'administration tracée dans `audit_trail`.

---

## PARTIE 4 — API interne (backend métier NestJS)

### Objectif
Construire la couche d'API interne versionnée (`/v1/*`) exposée par NestJS, par laquelle transite TOUTE action métier.

### Contexte
NestJS est déjà le service cible — pas d'extraction future à prévoir, l'architecture modulaire NestJS (modules/contrôleurs/services/DTO) répond nativement à l'exigence de découplage entre transport HTTP et logique métier.

### 🔧 PROMPT

```
Construis la couche API interne ELARA sur /apps/api-nest, un module NestJS par domaine
métier :

1. Convention : chaque endpoint est une méthode de contrôleur qui (a) s'appuie sur le
   JwtAuthGuard de la Partie 3 pour authentifier et résoudre le tenant, (b) valide le payload
   via un DTO (class-validator), (c) délègue toute la logique métier à un service injecté
   (aucune règle métier dans le contrôleur), (d) journalise l'action via un intercepteur
   d'audit générique, (e) retourne une réponse JSON standardisée ({ data, error, meta }) avec
   pagination cursor-based.
2. Filtre d'exception global NestJS : catch toute exception, ne fuite jamais de détail
   d'implémentation, journalise l'erreur (pour l'observabilité, Partie 19), retourne un code
   HTTP + message en français cohérent avec le glossaire fonctionnel.
3. Rate limiting par tenant (module `@nestjs/throttler` adossé à Redis) sur les routes
   sensibles et les webhooks, avec en-têtes X-RateLimit-* (préparant la Partie 12).
4. Documente chaque route au format OpenAPI (module `@nestjs/swagger`, génère
   /docs/api-interne.yaml au fur et à mesure) afin de garder une source de vérité alignée avec
   Elara_API_openapi.yaml (spécification des API tierces).
5. Squelette de contrôleurs pour les modules à venir (Business Scanner, Mémoire Entreprise,
   CFO IA, Rapport IA, Assistant IA, Intégrations) avec un statut "not_implemented" — structure
   de routing existante dès maintenant.

Ne code pas encore la logique métier des modules : uniquement l'ossature API, la validation, la
gestion d'erreurs, le rate limiting et la journalisation.
```

### Livrables & critères d'acceptation
- Toute route respecte guard → DTO → service → audit → réponse standardisée.
- Aucune règle métier écrite directement dans un contrôleur.
- `docs/api-interne.yaml` généré et à jour via Swagger.
- Test de charge simple prouvant que le rate limiting par tenant fonctionne.

---

## PARTIE 5 — Module Business Scanner (ingestion & Document Intelligence)

### Objectif
Implémenter Layer 1 (Ingestion) + Layer 2 (Document Intelligence) : upload de documents, OCR, classification, extraction de champs, détection d'anomalies, archivage.

### Contexte (inchangé sur le fond — critère d'acceptation officiel ≥ 90 %, priorité critique bloquante)

### 🔧 PROMPT

```
Implémente le module Business Scanner d'ELARA, point d'entrée critique du système, réparti
entre NestJS (orchestration, API, persistance) et FastAPI (traitement IA lourd) :

1. Contrôleur NestJS POST /v1/scanner/documents (multipart) acceptant PDF, image (jpg/png/
   heic), Excel (.xlsx), CSV. Stocke le fichier original dans MinIO (bucket privé, un préfixe
   par tenant), calcule un hash du contenu pour la déduplication, crée une ligne `documents`
   (statut `en_traitement`), publie un message sur une file RabbitMQ
   (`scanner.document.recu`) et répond immédiatement avec l'id du document.
2. Worker FastAPI consommant la file RabbitMQ, exécutant le pipeline ASYNCHRONE (ne bloque
   jamais la requête d'upload) :
   a. OCR sur les documents image/PDF via Tesseract (abstraction permettant de brancher un
      moteur OCR alternatif sans changer l'appelant).
   b. Classification automatique du type de document (facture/reçu/relevé/autre) via règles +
      LLM (Ollama via LiteLLM), avec score de confiance (0 à 1).
   c. Extraction des champs clés (montant, date, fournisseur, client, numéro de facture,
      lignes de produits) en JSON normalisé.
   d. Pour Excel/CSV : parseur mappant chaque ligne à une transaction structurée (pas d'OCR,
      même pipeline de validation en sortie).
   e. Détection d'anomalies (montant incohérent, date invalide, doublon par hash ou triplet
      montant+date+fournisseur).
   Le worker publie le résultat sur une file `scanner.document.traite`, consommée par NestJS
   qui met à jour la ligne `documents` et notifie le frontend via WebSocket (Gateway NestJS
   `@nestjs/websockets`, remplaçant Supabase Realtime) pour un statut temps réel.
3. Règle de seuil : si score_confiance < seuil paramétrable par tenant (0.85 par défaut),
   statut `en_attente_validation` (écran de validation) ; sinon intégration automatique
   (statut `valide_automatiquement`, modifiable a posteriori).
4. Contrôleur NestJS PATCH /v1/scanner/documents/{id}/valider permettant la correction des
   champs extraits avant intégration définitive — alimente `historique_modifications`.
5. Sur intégration définitive, appel au service Mémoire Entreprise (Partie 6) pour
   créer/relier les entités — ne code ici que l'appel, pas la logique de déduplication.
6. Empêche la double création de transaction pour un document déjà importé (hash + index
   unique partiel de la Partie 2).
7. Jeu de tests avec au moins 20 documents représentatifs, taux de classification/extraction
   ≥ 90 % (critère de recette officiel).

Respecte l'invariant asynchrone : aucune opération OCR/extraction ne s'exécute en synchrone
dans un contrôleur NestJS — tout transite par RabbitMQ vers le worker FastAPI.
```

### Livrables & critères d'acceptation
- Upload PDF/image/Excel/CSV fonctionnel, traitement asynchrone visible en temps réel (WebSocket) côté UI.
- Taux de classification + extraction correcte ≥ 90 % sur le jeu de test.
- Aucune double transaction créée pour un document déjà importé.
- Documents sous le seuil de confiance systématiquement routés vers validation manuelle.

---

## PARTIE 6 — Module Mémoire Entreprise (Business Memory)

### Objectif
Implémenter Layer 3 : API de lecture/écriture des entités centrales, déduplication automatique, historisation complète.

### Contexte (inchangé sur le fond)

### 🔧 PROMPT

```
Implémente le module Mémoire Entreprise (module NestJS `business-memory`), socle consommé par
CFO IA, Rapport IA, Assistant IA et les API sortantes :

1. Service `BusinessMemoryService` exposant des méthodes CRUD pour chaque entité (clients,
   fournisseurs, produits, commandes, factures, paiements, dépenses, stocks), utilisées à la
   fois par les contrôleurs /v1/memoire/* et par le Business Scanner (Partie 5) via injection
   de dépendance NestJS (même processus, pas d'appel réseau superflu).
2. Méthode de déduplication `trouverOuCreerEntite(type, criteres)` : recherche par nom (fuzzy
   matching), téléphone normalisé, ou identifiant fiscal (dans cet ordre). Si trouvée, met à
   jour les champs manquants sans écraser les données valides ; sinon crée une nouvelle
   entité. Appelée obligatoirement par le Business Scanner.
3. Toute mutation passe par ce service, jamais par une requête SQL directe ailleurs, pour que
   le trigger d'historisation (Partie 2) capture systématiquement le changement.
4. Contrôleurs REST : GET/POST/PATCH sur /v1/memoire/clients, /memoire/fournisseurs,
   /memoire/produits, /memoire/factures, /memoire/paiements, /memoire/depenses — filtres
   (période, statut, texte libre) et pagination.
5. GET /v1/memoire/{type}/{id}/historique exposant l'historique complet des modifications.
6. Contrainte applicative en plus de la contrainte SQL : impossible de créer une transaction
   sans client_id ou fournisseur_id valide.
7. Tests prouvant l'absence de duplication (import deux fois la même facture sous des formes
   légèrement différentes → une seule entité fournisseur, historique des deux transactions
   rattaché).
```

### Livrables & critères d'acceptation
- Zéro duplication sur un jeu de test volontairement bruité.
- Historique consultable pour toute entité modifiée. Aucune transaction orpheline en base.

---

## PARTIE 7 — AI Platform commune (Layer 4)

### Objectif
Construire la plateforme IA commune partagée par tous les agents, répartie entre NestJS (orchestration, guardrails, gouvernance) et FastAPI (calcul IA lourd : embeddings, LLM, RAG).

### Contexte (inchangé sur le fond — gouvernance IA : grounding, versioning des prompts, monitoring, cost control)

### 🔧 PROMPT

```
Construis l'AI Platform commune d'ELARA :

1. AI Gateway côté FastAPI (/apps/api-ai/ai_platform/gateway.py) : point d'entrée UNIQUE pour
   tout appel LLM, routé via LiteLLM (abstraction multi-fournisseur : Ollama self-hosted par
   défaut, bascule possible vers un fournisseur cloud sans changer le code appelant). NestJS
   n'appelle JAMAIS un LLM directement — uniquement via l'API interne exposée par api-ai.
2. Prompt management (/apps/api-ai/ai_platform/prompts/) : chaque prompt système versionné en
   fichier (pas en dur dans le code), avec changelog.
3. Couche RAG (/apps/api-ai/ai_platform/rag.py) : indexation des documents et entités de la
   Business Memory dans pgvector (même instance PostgreSQL, extension pgvector activée),
   génération d'embeddings à l'ingestion (branchée sur le pipeline du Business Scanner) et
   recherche sémantique à la requête.
4. Tool calling / orchestration (/apps/api-ai/ai_platform/tools.py) : registre d'outils
   exposés aux agents (ex. `rechercher_factures_impayees`, `calculer_marge`,
   `rechercher_client`) — chaque outil interroge exclusivement la Business Memory via un appel
   interne à l'API NestJS (jamais de génération de données inventées).
5. Guardrails de grounding (/apps/api-ai/ai_platform/guardrails.py) : fonction obligatoire
   `verifier_grounding(reponse, sources_utilisees)` appelée avant toute réponse générée — si
   aucune source vérifiable, la réponse est rejetée/reformulée pour signaler l'absence de
   donnée. Score de confiance (0-1) associé.
6. Monitoring & cost control : journalise chaque appel LLM (tenant_id, agent, modèle, tokens,
   coût estimé, latence, score de confiance) dans une table `ai_usage_log` (PostgreSQL,
   accessible depuis NestJS pour la Partie 19).
7. Jeu de données d'évaluation (/tests/ai-eval/) exécutable en CI pour la non-régression de la
   qualité IA à chaque changement de prompt ou de modèle.

Aucun agent métier (Parties 8, 9, 10, implémentés côté NestJS) n'appelle un LLM autrement qu'à
travers l'API interne exposée par api-ai (jamais d'appel direct à Ollama/LiteLLM depuis
NestJS).
```

### Livrables & critères d'acceptation
- Aucun appel LLM en dehors du gateway FastAPI dans tout le code base.
- Chaque réponse générée porte un score de confiance et ses sources citées.
- `ai_usage_log` alimentée pour chaque appel, avec coût estimé.
- Jeu d'évaluation exécutable en CI, détectant une régression de qualité.

---

## PARTIE 8 — Module CFO IA

### Objectif
Fournir les indicateurs et analyses financières de premier niveau, calculés automatiquement.

### Contexte (inchangé sur le fond — critère d'acceptation officiel : exactitude au centime près)

### 🔧 PROMPT

```
Implémente l'agent CFO IA (module NestJS `agents/cfo-ia`), consommateur de la Mémoire
Entreprise (Partie 6) et, pour les recommandations, de l'AI Platform (Partie 7) :

1. Fonctions de calcul déterministes (PAS de LLM — agrégations SQL exactes, précision critère
   de recette strict) : chiffre_affaires(periode), depenses(periode), marge(periode),
   tresorerie_actuelle(), creances(), dettes(), factures_impayees() avec ancienneté calculée
   par rapport au délai de règlement paramétrable par tenant.
2. GET /v1/cfo/indicateurs (paramètre période) retournant l'ensemble des indicateurs en une
   réponse structurée.
3. GET /v1/cfo/analyse?dimension=client|produit|categorie.
4. Détection d'anomalies financières : montant de dépense atypique (écart-type), facture
   impayée dépassant largement le délai moyen, pic/creux inhabituel de trésorerie — chaque
   anomalie crée un événement dans `evenements` et déclenche une notification.
5. Génération de recommandations via un appel interne à l'API FastAPI (AI Platform, Partie 7) :
   chaque recommandation explicitement rattachée à l'anomalie/donnée qui la justifie (guardrail
   de grounding).
6. Recalcul déclenché à chaque nouvelle transaction validée : le service Mémoire Entreprise
   publie un événement RabbitMQ (`memoire.transaction.validee`) consommé par CFO IA pour
   invalider/recalculer le cache d'indicateurs.
7. Test de non-régression exact : indicateurs calculés correspondant AU CENTIME PRÈS aux
   valeurs attendues sur un jeu de transactions connu.
```

### Livrables & critères d'acceptation
- Indicateurs financiers exacts (test automatisé à zéro écart).
- Facture marquée impayée uniquement au-delà du délai paramétré.
- Chaque recommandation cite la donnée/anomalie qui la justifie.
- Recalcul automatique et immédiat après toute nouvelle transaction validée.

---

## PARTIE 9 — Module Rapport IA (Business Health Score)

### Objectif
Générer automatiquement un rapport périodique structuré autour d'un score de santé global.

### Contexte (inchangé sur le fond)

### 🔧 PROMPT

```
Implémente l'agent Rapport IA (module NestJS `agents/rapport-ia`), dépendant de CFO IA
(Partie 8) et de la Mémoire Entreprise (Partie 6) :

1. Calcul du Business Health Score : fonction pure et déterministe combinant santé financière,
   santé commerciale, recouvrement, qualité des données (100 - % documents_en_attente -
   % anomalies_non_traitees), gestion documentaire, rentabilité — pondération par défaut
   stockée en base, modifiable par tenant sans redéploiement.
2. Génération du rapport (partie rédactionnelle via appel interne à l'AI Platform FastAPI
   UNIQUEMENT pour la rédaction — les chiffres restent calculés en dur, jamais générés par
   LLM) : Problèmes détectés, Risques, Opportunités, Recommandations, Actions prioritaires
   (3 maximum, triées par impact).
3. Persistance immuable : chaque rapport stocké tel quel dans une table `rapports` (snapshot
   JSON) — ne jamais recalculer un rapport passé silencieusement.
4. Planification : job planifié via un **Kubernetes CronJob** (remplace pg_cron) déclenchant
   un message RabbitMQ consommé par le service NestJS pour générer le rapport à la fréquence
   paramétrée par tenant (hebdomadaire par défaut), plus POST /v1/rapport/generer pour une
   génération à la demande.
5. Export PDF (librairie de génération PDF côté NestJS) et GET /v1/rapport/{id}/export.
6. GET /v1/rapport/{id} et GET /v1/rapport (liste historique).
```

### Livrables & critères d'acceptation
- Score de santé calculé de façon reproductible et documentée.
- Rapport généré à la fréquence paramétrée sans intervention manuelle, et à la demande.
- Aucun rapport passé ne change de valeur après coup. Export PDF fonctionnel.

---

## PARTIE 10 — Module Assistant IA

### Objectif
Permettre l'interrogation en langage naturel des données réelles de l'entreprise, zéro hallucination tolérée.

### Contexte (inchangé sur le fond — critère d'acceptation officiel : zéro hallucination sur le jeu de test)

### 🔧 PROMPT

```
Implémente l'agent Assistant IA : orchestration côté NestJS (module `agents/assistant-ia`),
consommant la couche RAG et le tool calling exposés par l'AI Platform FastAPI (Partie 7) :

1. POST /v1/assistant/conversations (nouvelle question), GET pour l'historique par tenant.
   Chaque échange stocké dans `conversations`.
2. Orchestration : (a) analyse l'intention (appel interne à api-ai), (b) appel des outils
   pertinents du registre de tool calling — JAMAIS de réponse sans passage par un outil
   interrogeant réellement la Business Memory (via l'API NestJS interne), (c) composition de
   la réponse en langage naturel à partir des résultats des outils uniquement, (d) passage
   obligatoire par le guardrail `verifier_grounding` avant retour : si aucune donnée, réponse
   « Je n'ai pas cette information dans vos données », (e) citation systématique de la source
   et score de confiance pour toute réponse chiffrée.
3. Couvre nativement les questions représentatives (CA du mois, créances, meilleur client,
   dépenses principales, produits les plus rentables, problèmes de la semaine).
4. Interface web (chat) et ingestion de captures d'écran/exports WhatsApp comme entrée
   alternative (réutilise le pipeline Business Scanner).
5. Jeu de test d'évaluation « zéro hallucination » (au moins 30 questions, dont des cas où la
   donnée n'existe pas volontairement) — 100 % de signalement explicite de l'absence de
   donnée.
```

### Livrables & critères d'acceptation
- Zéro hallucination constatée sur le jeu de test d'évaluation.
- Chaque réponse chiffrée traçable jusqu'aux transactions sous-jacentes.
- Absence de donnée toujours signalée explicitement. Historique consultable par tenant.

---

## PARTIE 11 — Mini-GED native (gestion documentaire)

### Objectif
Classement, indexation et recherche des documents importés — capacité transverse.

### Contexte (inchangé sur le fond)

### 🔧 PROMPT

```
Implémente la Mini-GED native (module NestJS `documents`), réutilisant le stockage MinIO déjà
mis en place par le Business Scanner (Partie 5) :

1. Classement automatique par type, entité liée et période, à partir des métadonnées
   extraites (pas de duplication physique du fichier dans MinIO).
2. Indexation : métadonnées de base recherchables + indexation dans pgvector (Partie 7) pour
   une recherche sémantique transversale.
3. GET /v1/documents/recherche : recherche par entité et filtres de métadonnées.
4. Contrôle d'accès conforme au RBAC (Partie 3) ; chaque consultation journalisée dans
   `audit_trail`.
5. Interface de consultation (Partie 16) : document original (récupéré via une URL signée
   MinIO à durée limitée) à côté des données structurées extraites.
6. Documente, sans l'implémenter, le point d'extension vers une GED complète (workflows
   documentaires avancés, versionning, signature) dans /docs/schema.md.
```

### Livrables & critères d'acceptation
- Tout document du Business Scanner automatiquement classé et retrouvable par entité.
- Recherche par client/fournisseur/numéro de facture fonctionnelle.
- Chaque consultation de document tracée dans l'audit trail. RBAC appliqué.

---

## PARTIE 12 — Intégrations API (entrantes / sortantes / webhooks / gouvernance)

### Objectif
Connecter Elara aux systèmes déjà utilisés par l'entreprise, en conformité stricte avec `Elara_API_openapi.yaml`.

### Contexte (inchangé sur le fond)

### 🔧 PROMPT

```
Implémente la couche d'intégrations API (module NestJS `integrations`) en conformité STRICTE
avec Elara_API_openapi.yaml :

1. Authentification : POST /oauth/token (client_credentials) émettant un token scopé à un
   tenant_id + des scopes, mécanisme alternatif par clé API. Table `integrations_tierces`
   (tenant, scopes, quotas).
2. API entrantes (GET écritures comptables, transactions bancaires/Mobile Money, commandes
   ERP, contacts CRM) : chaque appel alimente la Business Memory via
   `trouverOuCreerEntite`, pagination conforme au schéma `ReponsePaginee`.
3. API sortantes (POST/PATCH factures, PATCH statut commande, POST contact CRM, POST relance,
   POST paiement). RÈGLE ABSOLUE : toute action à impact financier/client créée avec statut
   `en_attente_validation`, jamais transmise au système tiers avant validation humaine
   explicite (PATCH /v1/actions/{id}/valider, distinct de l'API externe).
4. Webhooks : POST /webhooks (enregistrement), émission sortante avec retry exponentiel et
   journalisation de chaque tentative (aucune perte silencieuse de donnée).
5. GET /audit/evenements exposant `audit_trail` filtré par tenant et plage de dates.
6. Gouvernance transverse : authentification stricte par tenant, rate limiting/quotas par
   intégration, versionnage /v1 figé (breaking change → /v2 uniquement).
7. Suite de tests de contrat validant la conformité exacte à Elara_API_openapi.yaml.
```

### Livrables & critères d'acceptation
- Conformité totale (contract testing) avec `Elara_API_openapi.yaml`.
- Aucune action sortante à impact financier/client n'atteint le système tiers sans validation humaine préalable.
- Chaque appel entrant et sortant journalisé individuellement. Aucune perte silencieuse de donnée.

---

## PARTIE 13 — Sécurité, conformité & audit trail

### Objectif
Consolider transversalement sécurité et conformité, en couvrant ce qui n'est plus géré nativement par une plateforme managée (contrairement à Supabase, chaque brique — PostgreSQL, MinIO, Keycloak — est ici opérée par l'équipe).

### Contexte
- Chiffrement au repos : PostgreSQL (chiffrement disque/volume Kubernetes) et MinIO (SSE) à configurer explicitement — plus de garantie fournisseur managé automatique.
- Chiffrement en transit : TLS partout via l'Ingress/Traefik, y compris en interne entre services si le cluster l'exige (mTLS optionnel).
- Cadre juridique camerounais inchangé (Loi n° 2024/017 protection des données personnelles, Loi n° 2010/012 cybersécurité/ANTIC). TVA mensuelle DGI.
- Plan de sauvegarde et reprise après sinistre à définir explicitement (plus de sauvegarde automatique fournisseur) : sauvegardes PostgreSQL (pg_dump/pgBackRest) et MinIO (réplication/versioning bucket).

### 🔧 PROMPT

```
Complète le socle de sécurité et conformité d'ELARA, en couvrant explicitement ce qui n'est
plus géré par une plateforme managée :

1. Chiffrement au repos : active le chiffrement de volume Kubernetes pour PostgreSQL, active
   le Server-Side Encryption MinIO ; implémente en plus un chiffrement applicatif
   supplémentaire (module NestJS `security/chiffrement`) sur les documents sensibles (pièces
   d'identité, relevés bancaires) avant stockage, clé par tenant gérée via un coffre de
   secrets Kubernetes (ou Vault si disponible), jamais en dur dans le code.
2. Droits RGPD/loi camerounaise (/v1/conformite/*) : export complet des données du tenant,
   rectification (déjà couvert par les modules CRUD), suppression avec délai de grâce et
   anonymisation en cascade.
3. Politique de rétention (job planifié via Kubernetes CronJob) appliquant les règles par type
   de donnée, journalisant chaque purge.
4. Registre des sous-traitants techniques (/docs/sous-traitants.md) : lister l'hébergeur du
   cluster Kubernetes, le registre de conteneurs, Octopus Deploy, et tout fournisseur LLM
   cloud éventuel utilisé en secours de Ollama, avec leur rôle et les données concernées.
5. Conformité fiscale : champ `taux_tva` par produit/service, rapport mensuel de TVA
   collectée/déductible exportable (sans automatiser la télédéclaration).
6. Plan de sauvegarde et reprise (/docs/continuite-activite.md) : fréquence des sauvegardes
   PostgreSQL (pgBackRest ou équivalent) et MinIO (versioning/réplication), objectifs RTO/RPO
   formalisés, procédure de restauration testée sur l'environnement `staging`.
7. Scan de sécurité automatisé en CI : absence de secret commité, audit de dépendances
   (npm audit, pip-audit), non-régression sur les tests d'isolation RLS.
```

### Livrables & critères d'acceptation
- Documents sensibles chiffrés avec clé par tenant. Chiffrement au repos et en transit vérifié explicitement (plus de présomption fournisseur managé).
- Export et suppression de données personnelles opérationnels, avec délai de grâce documenté.
- Politique de rétention exécutée et journalisée.
- `docs/sous-traitants.md` et `docs/continuite-activite.md` produits, restauration de sauvegarde testée.
- CI bloquante en cas de secret commité ou de policy RLS désactivée.

---

## PARTIE 14 — Design system frontend (tokens, composants)

### Objectif
Porter dans le code Next.js/Tailwind le design system déjà maquetté (« Elara — Design System 2.0 »). *Section inchangée — indépendante du choix d'infrastructure backend.*

### 🔧 PROMPT

```
En partant du fichier Tableaux_de_bord.html fourni (maquette validée), porte le design system
dans /apps/web (Next.js/Tailwind) :

1. Configure tailwind.config.ts avec les tokens exacts de la maquette (couleurs, rayons,
   ombres) recopiés sans réinterprétation.
2. Polices : titres Tahoma (fallback Trebuchet MS), corps Gill Sans MT (fallback Gill Sans,
   Calibri, Trebuchet MS) via variables CSS --font-heading / --font-body.
3. Extrais les composants UI récurrents (cartes KPI, badges de statut, tableau, formulaire,
   sidebar, en-tête de section, jauge) en composants React réutilisables sous
   /apps/web/components/ui/*.
4. Reconstitue la structure de navigation observée (sidebar + vues) comme layout
   /apps/web/app/(dashboard)/layout.tsx.
5. Documente dans /docs/design-system.md la correspondance token/composant ↔ source.

Ne dévie jamais des couleurs, espacements, typographies observés sans justification
documentée.
```

### Livrables & critères d'acceptation
- Comparaison visuelle démontrant une fidélité de rendu à la maquette.
- `docs/design-system.md` à jour. Composants UI réutilisés de manière cohérente.

---

## PARTIE 15 — Frontend : sites marketing (Prélancement + Lancement)

### Objectif
Porter les deux pages marketing déjà maquettées. *Logique inchangée — seule la persistance change de client (API NestJS au lieu de Supabase).*

### 🔧 PROMPT

```
Porte Prélancement.html et Lancement.html dans /apps/web, en réutilisant le design system
(Partie 14) et en écrivant via des endpoints NestJS dédiés (pas d'accès direct à la base
depuis le frontend, cohérent avec l'invariant API-first) :

1. /app/(marketing)/liste-attente/page.tsx — formulaire d'inscription appelant
   POST /v1/marketing/liste-attente (table `liste_attente`, hors périmètre multi-tenant),
   calcul de position dans la file, lien de parrainage unique, écran de succès identique à la
   maquette.
2. /app/(marketing)/page.tsx — sections Problème/Produit/Tarifs/Confiance + formulaire de
   démo appelant POST /v1/marketing/demandes-demo (table `demandes_demo`), notification email
   interne à l'équipe commerciale.
3. Fidélité visuelle stricte aux maquettes (migration technique, pas de refonte).
4. Validation serveur des formulaires et protection anti-spam (honeypot ou rate limiting par
   IP au niveau du contrôleur NestJS).
5. SEO : métadonnées, Open Graph, sitemap pour ces pages publiques non authentifiées.
```

### Livrables & critères d'acceptation
- Rendu visuel identique aux fichiers HTML source.
- Formulaires fonctionnels, données persistées via l'API NestJS, protection anti-spam active.

---

## PARTIE 16 — Frontend : application (tableau de bord, vues du MVP)

### Objectif
Construire les écrans applicatifs authentifiés exposant les modules du MVP.

### 🔧 PROMPT

```
Construis les écrans applicatifs authentifiés d'ELARA sous /apps/web/app/(dashboard)/*, en
consommant UNIQUEMENT les endpoints /v1/* de l'API NestJS (aucun accès direct à PostgreSQL ou
MinIO depuis un composant client) :

1. dashboard (v-dashboard) — Business Health Score du dernier rapport, indicateurs CFO IA
   clés, alertes/anomalies récentes, raccourci Assistant IA.
2. scanner (v-scanner) — zone de dépôt (drag & drop + photo mobile), liste des documents en
   traitement avec statut temps réel via WebSocket (connexion au Gateway NestJS de la
   Partie 5, remplaçant Supabase Realtime), écran de validation manuelle.
3. cfo (v-cfo) — tableaux et graphiques des indicateurs financiers.
4. rapport (v-report) — Business Health Score détaillé, contenu du dernier rapport, historique,
   export PDF.
5. assistant (v-assistant) — chat avec citations de sources et score de confiance, historique.
6. clients (v-clients) — fiche client avec historique complet, listing recherche/filtres.
7. documents (v-documents) et docgen (v-docgen) — consultation Mini-GED, document original
   (URL signée MinIO) + données extraites côte à côte.
8. Gestion d'état : React Query pour la synchronisation avec l'API NestJS, connexion WebSocket
   persistante pour le statut de traitement des documents (vue Scanner).
9. Tolérance à la connectivité variable : formulaires critiques mettent en cache localement une
   saisie non synchronisée et la renvoient à la reconnexion, avec indicateur hors-ligne.

Respecte fidèlement le rendu de chaque vue source de la maquette.
```

### Livrables & critères d'acceptation
- Chaque vue consomme exclusivement l'API NestJS, jamais PostgreSQL/MinIO directement côté client.
- Statut de traitement des documents visible en temps réel via WebSocket.
- Comportement dégradé correct en cas de connectivité intermittente.

---

## PARTIE 17 — Frontend : Onboarding, Settings, Team, Users

### Objectif
Construire les écrans de configuration et d'administration du compte entreprise.

### Contexte (inchangé sur le fond — deux parcours d'entrée A/B, gestion utilisateurs réservée admin_compte)

### 🔧 PROMPT

```
Construis les écrans de configuration d'ELARA (vues v-onboarding, v-settings, v-team,
v-users), consommant l'API NestJS et Keycloak (invitation/gestion utilisateurs via l'Admin
API Keycloak, appelée côté serveur uniquement, jamais depuis le frontend) :

1. onboarding (v-onboarding) — parcours bifurquant selon le profil (Parcours A : connecter des
   intégrations existantes ou importer via le Scanner ; Parcours B : création manuelle
   guidée des premiers clients/produits).
2. settings — paramétrage du seuil de confiance du Scanner, délai de règlement, fréquence du
   Rapport IA, pondération du Business Health Score (persistés via /v1/settings).
3. team/users — gestion des utilisateurs et rôles réservée à admin_compte : invitation d'un
   utilisateur (création côté Keycloak via l'Admin API appelée par un service NestJS dédié,
   puis rattachement dans `user_tenants`), désactivation, changement de rôle.
4. Chaque action d'administration passe par le RBAC (Partie 3) et journalise dans
   `audit_trail`.
```

### Livrables & critères d'acceptation
- Les deux parcours d'onboarding fonctionnels et distincts.
- Paramétrage persistant et pris en compte par les modules concernés (Scanner, CFO IA, Rapport IA).
- Gestion des utilisateurs opérationnelle via Keycloak, réservée à admin_compte, tracée.

---

## PARTIE 18 — Mobile / PWA

### Objectif
Rendre Elara utilisable comme application mobile principale, cohérent avec l'invariant mobile-first.

### 🔧 PROMPT

```
Configure /apps/web comme Progressive Web App (installable, offline-first sur les écrans
critiques) et prépare l'architecture pour une future application React Native native
consommant la même API NestJS /v1 :

1. Service worker : mise en cache des ressources statiques, file d'attente locale pour les
   captures de documents effectuées hors connexion (Scanner), synchronisation automatique à la
   reconnexion vers POST /v1/scanner/documents.
2. Capture photo directe sur l'écran Scanner (API navigateur caméra), envoi direct au pipeline
   d'ingestion de la Partie 5.
3. Scénario de test : scan hors-ligne avec synchronisation différée validé manuellement.
4. Test de performance mobile (Lighthouse) sur connexion 3G simulée.
5. Documente dans /docs/architecture.md le chemin d'évolution vers React Native natif : le
   futur client consommera la même API NestJS /v1, aucune remise en cause de l'architecture
   API-first.
```

### Livrables & critères d'acceptation
- Application installable comme PWA, fonctionnelle en usage mobile principal.
- Capture photo directe opérationnelle. Scénario hors-ligne/synchronisation différée validé.
- Score Lighthouse mobile documenté.

---

## PARTIE 19 — Observabilité & exploitation

### Objectif
Mettre en place logs, métriques, alertes et tableaux de bord techniques.

### Contexte
Stack d'observabilité désormais explicite (plus de tableau de bord fournisseur managé) : **Prometheus** (métriques), **Grafana** (tableaux de bord), **Loki** (logs centralisés), déployés sur le même cluster Kubernetes.

### 🔧 PROMPT

```
Mets en place l'observabilité d'ELARA sur Kubernetes :

1. Instrumente api-nest et api-ai avec des métriques Prometheus (latence par endpoint, taux
   d'erreur, throughput) via un exporter dédié à chaque service.
2. Centralise les logs applicatifs (JSON structuré, incluant systématiquement tenant_id,
   route, durée, code retour) via Loki (agent Promtail sur chaque pod).
3. Tableaux de bord Grafana : latence moyenne/p95 par endpoint, uptime, précision
   OCR/extraction mesurée sur les validations manuelles (comparaison extraction automatique vs
   correction utilisateur), qualité des réponses IA (jeu d'évaluation Partie 7), coût IA par
   tenant et par document traité (agrégation `ai_usage_log`), taux d'erreur global et par
   module.
4. Alertes Grafana/Alertmanager : seuils sur taux d'erreur, coût IA anormal, latence anormale,
   notification à l'équipe technique.
5. Indicateur de qualité des données par tenant, réutilisé du sous-score « Qualité des
   données » du Business Health Score (Partie 9), exposé côté monitoring plateforme.
6. Tableau de bord des indicateurs d'usage produit (KPI d'usage, taux de validation
   documentaire), distinct du tableau technique — orienté équipe produit/business, consultable
   par les administrateurs de compte pour leur propre tenant (module NestJS `admin/observabilite`,
   sans vision cross-tenant pour eux).
```

### Livrables & critères d'acceptation
- Tableaux de bord Grafana opérationnels avec l'ensemble des KPI officiels.
- Alertes déclenchées correctement sur dépassement de seuil.
- Indicateur de qualité des données visible par tenant, cohérent avec le Rapport IA.

---

## PARTIE 20 — Déploiement Kubernetes via Octopus Deploy (SaaS & trajectoire On-Premise)

### Objectif
Finaliser le déploiement production sur Kubernetes via Octopus Deploy, et préparer la portabilité vers un déploiement on-premise mono-tenant chez les clients bancaires.

### Contexte
Écran de configuration Octopus déjà initié : projet ELARA, process en **Git Repository** (Config as Code), cible **Kubernetes**, sans Argo CD dans un premier temps (modèle push direct Octopus → cluster). La même base de code (images Docker + charts Helm) supporte SaaS multi-tenant ET on-premise mono-tenant via des values Helm distinctes.

### 🔧 PROMPT

```
Finalise la chaîne de déploiement d'ELARA sur Kubernetes via Octopus Deploy :

1. Environnements Octopus : `dev` (déploiement automatique à chaque merge sur main), `staging`
   (promotion manuelle depuis dev), `production` (promotion manuelle depuis staging, validation
   explicite obligatoire — cohérent avec l'invariant human-in-the-loop appliqué à l'infra).
   Ajoute un environnement `onpremise-template`, jamais promu automatiquement, servant de
   gabarit pour les déploiements client bancaire.
2. Process de déploiement (Config as Code, /infra/octopus) par service (api-nest, api-ai, web) :
   déploiement du chart Helm correspondant avec les values de l'environnement ciblé,
   application des migrations PostgreSQL avant le déploiement de api-nest, healthcheck
   post-déploiement, rollback automatique si le healthcheck échoue.
3. Domaine et certificats : Ingress Kubernetes (Traefik) avec certificats TLS automatiques
   (cert-manager + Let's Encrypt ou certificat fourni), HTTPS obligatoire partout, aucun accès
   HTTP non chiffré.
4. Variantes de values Helm (/infra/k8s/values-onpremise.yaml) : bascule vers Ollama local
   obligatoire (pas de fournisseur LLM cloud), volumes de stockage dédiés, aucune donnée sortant
   du réseau du client — même chart, mêmes images, configuration différente uniquement.
5. Documente dans /docs/deploiement.md les deux trajectoires (SaaS géré sur ce cluster vs
   on-premise chez le client) et confirme que les trois règles du prompt-cadre (tenant_id
   systématique, API interne systématique, traitement asynchrone systématique) garantissent
   qu'aucune des deux trajectoires ne nécessite de réécriture de la logique métier.
6. Environnement de démonstration (`dev` ou un environnement dédié `demo`) avec les données
   fictives du secteur commerce/distribution (Partie 2), accessible publiquement en lecture aux
   prospects.
7. Évalue, sans l'activer par défaut, l'introduction future d'Argo CD (pattern GitOps pull) une
   fois le nombre d'environnements/clients on-premise suffisant pour justifier la charge
   opérationnelle supplémentaire — documente ce point d'extension dans /docs/deploiement.md
   sans le mettre en œuvre à ce stade.
```

### Livrables & critères d'acceptation
- Déploiement production accessible en HTTPS via Octopus, migrations automatisées et sûres, rollback testé.
- `docs/deploiement.md` présentant clairement les deux trajectoires de déploiement.
- Values Helm on-premise documentées et testées sur un cluster de test isolé.
- Environnement de démonstration public fonctionnel.

---

## PARTIE 21 — Tests, recette & critères d'acceptation

### Objectif
Consolider, module par module, la vérification des critères de recette officiels avant la déclaration du MVP comme recettable. *Critères officiels inchangés.*

| Module | Critère d'acceptation |
|---|---|
| Business Scanner | Classification + extraction correctes ≥ 90 % des cas testés ; documents sous le seuil de confiance systématiquement soumis à validation. |
| Mémoire Entreprise | Aucune duplication d'entité constatée ; historique de modification consultable pour toute entité. |
| CFO IA | Indicateurs financiers exacts par rapport aux transactions enregistrées sur la période. |
| Rapport IA | Rapport généré automatiquement à la fréquence paramétrée, reflétant les données réellement présentes à la date de génération. |
| Assistant IA | Zéro hallucination sur le jeu de test ; toute absence de donnée signalée explicitement. |
| Intégrations API | Toute action sortante à impact financier/client bloquée sans validation humaine ; chaque appel journalisé. |

### 🔧 PROMPT

```
Constitue la suite de recette finale d'ELARA, consolidant les tests déjà écrits dans chaque
partie précédente en un plan de recette unique et exécutable, exécuté en CI GitHub Actions
avant toute création de release Octopus vers `staging`/`production` :

1. Crée /tests/recette/ regroupant, module par module, les scénarios de test correspondant
   EXACTEMENT à chacun des six critères d'acceptation officiels, avec un rapport de résultat
   clair (pass/fail + métrique mesurée).
2. Ajoute des tests transverses vérifiant les invariants du prompt-cadre global sur
   l'ensemble de l'application : isolation multi-tenant totale (NestJS + RLS PostgreSQL),
   aucune action sensible exécutée sans validation humaine, traçabilité complète.
3. Génère un rapport de recette /docs/rapport-recette.md résumant, pour chacun des six modules
   du périmètre MVP, le statut de conformité au critère d'acceptation officiel.
4. Vérifie les livrables attendus du cahier des charges §7 dans leur ensemble : application
   web et mobile fonctionnelle (Parties 15-18), documentation d'API à jour (Partie 12),
   environnement de démonstration (Partie 20), guide de prise en main utilisateur
   (/docs/guide-utilisateur.md), journal d'audit et tableau de bord des indicateurs techniques
   (Partie 19).
```

### Livrables & critères d'acceptation
- `docs/rapport-recette.md` démontrant la conformité aux 6 critères d'acceptation officiels.
- Tous les livrables du cahier des charges §7 présents et vérifiés.
- Aucune régression sur les invariants transverses.

---

## PARTIE 22 — Préparation roadmap V2-V4 (prompts préparatoires, hors périmètre MVP)

### Objectif
Documenter, sans les développer, les points d'extension architecturaux à préserver. *Contenu métier inchangé — le socle NestJS/FastAPI/Kubernetes rend l'extraction de service V2-V4 encore plus directe qu'avec le chemin MVP d'origine, puisqu'elle est déjà la forme cible.*

| Phase | Contenu |
|---|---|
| V2 — Commercial Intelligence | Commercial IA, intégration WhatsApp Business API complète, relances automatisées. |
| V3 — Operations Intelligence | COO IA : stocks, fournisseurs, achats, délais, anomalies opérationnelles. |
| V4 — Automation / Agents | Agents exécutant des workflows complets, toujours avec validation humaine sur les actions sensibles. |

### 🔧 PROMPT

```
Sans développer de fonctionnalité V2-V4, documente dans /docs/roadmap-technique.md les points
d'extension que l'architecture doit préserver :

1. Vérifie que Commercial IA (V2) pourra se brancher comme nouveau module NestJS
   (`agents/commercial-ia`) sur le socle commun (Business Memory, RBAC, AI Platform) sans
   modification du noyau — documente les entités `prospects` (déjà présentes) qui
   l'accueilleront.
2. Vérifie que le pipeline d'ingestion WhatsApp (Layer 1) pourra évoluer du Parcours import
   manuel actuel vers une intégration API officielle (nouveau worker FastAPI ou module NestJS
   dédié consommant la même file RabbitMQ) sans changer la structure de la Business Memory.
3. Documente l'ajout futur de COO IA (V3) comme nouvel agent consommant les tables `stocks`
   déjà présentes mais non encore exploitées.
4. Documente le principe du futur Agent Manifest (V4+) : chaque agent déclarera ses capacités
   et les outils qu'il utilise (registre de tool calling déjà posé en Partie 7), soumis au
   même mécanisme de validation humaine que la Partie 12, sans modification du noyau.
5. Documente également l'introduction future d'Argo CD (GitOps, évoquée en Partie 20) et
   l'éventuelle isolation renforcée par tenant (bases/schémas dédiés pour les comptes à fort
   volume, ou clusters K3s dédiés pour les clients on-premise) comme points d'extension
   d'infrastructure à ne pas fermer.
6. Liste explicitement, en fin de document, les décisions qui NE devront PAS être remises en
   cause par les phases suivantes (les 10 invariants du prompt-cadre global) et celles qui
   restent volontairement ouvertes (pondération du Business Health Score, catalogue d'outils
   exposés aux agents, choix du fournisseur LLM via le model routing, choix éventuel d'Argo CD).
```

### Livrables & critères d'acceptation
- `docs/roadmap-technique.md` démontrant, module V2-V4 par module, l'absence de dette architecturale prévisible.
- Aucune fonctionnalité V2-V4 codée à ce stade — ce prompt est strictement documentaire.

---

## Conclusion — Ordre d'exécution recommandé

```
1  → Prompt-cadre global + Vue d'ensemble architecture   (sections 1-2)
2  → Partie 1  : Fondations & Setup monorepo, CI GitHub Actions / CD Octopus
3  → Partie 2  : Modèle de données & RLS (PostgreSQL)
4  → Partie 3  : Authentification, RBAC & Multi-tenant (Keycloak)
5  → Partie 4  : API interne NestJS (ossature)
6  → Partie 5  : Business Scanner (NestJS + worker FastAPI)     ─┐
7  → Partie 6  : Mémoire Entreprise                              │  cœur du MVP,
8  → Partie 7  : AI Platform commune (FastAPI)                   │  dépendances strictes
9  → Partie 8  : CFO IA                                          │  dans cet ordre
10 → Partie 9  : Rapport IA                                      │
11 → Partie 10 : Assistant IA                                    │
12 → Partie 11 : Mini-GED native (MinIO)                        ─┘
13 → Partie 12 : Intégrations API
14 → Partie 13 : Sécurité & conformité (transverse, à affiner en continu)
15 → Partie 14 : Design system frontend
16 → Partie 15 : Frontend marketing
17 → Partie 16 : Frontend application (dashboard)
18 → Partie 17 : Frontend Onboarding/Settings/Team/Users (Keycloak Admin API)
19 → Partie 18 : Mobile / PWA
20 → Partie 19 : Observabilité (Prometheus/Grafana/Loki)
21 → Partie 20 : Déploiement Kubernetes via Octopus Deploy + trajectoire On-Premise
22 → Partie 21 : Tests, recette & critères d'acceptation officiels
23 → Partie 22 : Documentation roadmap V2-V4 (préparatoire uniquement)
```

**Checklist finale avant recette MVP** :
- [ ] Les 10 invariants du prompt-cadre global sont respectés sur 100 % du code produit.
- [ ] Les 6 critères d'acceptation officiels du cahier des charges (§9) sont vérifiés et documentés.
- [ ] Les 5 livrables du cahier des charges (§7) sont produits.
- [ ] Le design system est fidèle aux maquettes validées.
- [ ] Le projet Octopus ELARA est configuré (Git Repository, Kubernetes, environnements dev/staging/production/onpremise-template) et une release complète a transité par les trois premiers environnements.
- [ ] La trajectoire de portabilité on-premise (mêmes charts Helm, values distinctes) est documentée et testée sur un cluster isolé.

*Fin du document.*
