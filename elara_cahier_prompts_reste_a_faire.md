# 🚀 ELARA — Cahier de Prompts Mis à Jour (SaaS Haute Performance & Hybride)

> **📌 STATUT D'AVANCEMENT (2026-09)**
> - Partie A — Microservice FastAPI & routage hybride : ✅ implémenté (`apps/api-ai`, failover Groq→Groq→Ollama, worker RabbitMQ).
> - Partie B — Persistance Postgres + pgvector : ✅ `TaxRule`, `Conversation`, `Message`, `CompanyMemory`, `DocumentChunk` (vector 768). `TaxAgentService` persisté via Prisma.
> - Stockage documents **mode filesystem** : ✅ finalisé. `STORAGE_MODE=filesystem` (défaut `auto`) + `DOCUMENTS_DIR` (défaut `./local-ged`). Les documents sont reçus sur le **système de fichiers local organisé par tenant** (`local://tenant/...`) et non dans la base (BDD allégée = métadonnées uniquement). En Docker, le répertoire est monté en **volume partagé** `elara_documents:/data/documents` (api-nest écrit, api-ai worker lit pour le shadow processing). Endpoint de streaming GED : `GET /v1/scanner/archives/:id/raw`. MinIO reste disponible via `STORAGE_MODE=minio` (cloud / multi-réplicas).
> - Partie C — Chat Conseiller IA : ✅ exploite `/assistant`, endpoint `/v1/assistant/advice`. Historique de conversation exposé : ✅ endpoint `GET /v1/assistant/conversations` (API) + chargement de l'historique au montage côté frontend (restauration des messages user/assistant `aiResponse`). Bandeau « Mémoire entreprise synchronisée » : ✅ affiché quand `memoire_entreprise_utilisee` est présent dans la réponse (injecté par le backend quand du contenu RAG `CompanyMemory` est trouvé).
> - Partie D — Dashboard CFO : ✅ KPIs CFO, conformité fiscale, « Lancer l'Audit Fiscal ».
> - Partie E — Docker/K8s : ✅ Dockerfiles multi-stage, docker-compose appliquatif, charts Helm `infra/k8s/*`.
> - Tests : ✅ 10 tests unitaires passent (`minio.service.spec.ts` mode filesystem 5/5 ; `assistant.service.spec.ts` historique + badge mémoire 4/4) ; suite complète api-nest : 10 ✅ / 6 skippés (e2e) / 0 échec. Builds : `nest build` et `next build` ✅, `tsc --noEmit` ✅. Lint api-nest ✅ (avertissements préexistants). Lint web : erreurs préexistantes non liées à ces changements.
> - Sauvegarde documents (mode filesystem) : ✅ **vérifiée de bout en bout sur Docker** — upload PDF et DOCX ; fichier écrit dans `/data/documents/<tenant>/`, `index.csv` alimenté, partagé avec api-ai, streaming GED `GET /v1/scanner/archives/:id/raw` renvoie le binaire exact (MD5 identique). Correctifs au passage : `docx_to_pdf.py` (NameError `pdf_canvas` + blocs en double), `python-docx`/`reportlab` installés dans l'image api-nest, mime déduit de l'extension (ne plus utiliser `type_document` IA comme Content-Type), `TransformInterceptor` ne wrappe plus les `StreamableFile`.

---

Cette version intègre la nouvelle approche d'architecture hybride performante : Cloud LLM (Groq/Together AI) via API standardisée pour l'UI en temps réel + Ollama en tâche de fond (Background Worker RabbitMQ) pour la mémoire d'entreprise, les audits asynchrones et l'analyse de comportement (Shadow Processing).
Ce découpage garantit un SaaS ultra-rapide (faible latence UI), scalable, et facilement exportable (On-Premise ou Multi-Cloud) grâce à l'abstraction par variables d'environnement.

Ce document contient les prompts spécifiques pour finaliser l'intégration de la plateforme ELARA, en alignant l'implémentation sur l'architecture V2 : FastAPI + Cloud LLM + Worker Ollama Local + RabbitMQ + PostgreSQL.

---

## PARTIE A — Refactoring Architectural : Microservice FastAPI & Routage LLM Hybride

### Objectif
Séparer la logique IA/OCR du monolithe NestJS vers un microservice FastAPI. Mettre en place un système de bascule (failover) entre deux fournisseurs Cloud LLM (Groq / Together AI) pour l'UI en temps réel, et délester l'analyse de fond (mémoire, ombre) sur un Worker Ollama asynchrone piloté par RabbitMQ.

### 🔧 PROMPT
Tu es l'agent d'infrastructure ELARA. Nous devons aligner notre codebase actuelle sur l'architecture SaaS V2 (Haute Performance & Multi-LLM).

1. Initialise un nouveau projet FastAPI dans le dossier `apps/api-ai`.
2. Déplace les scripts de traitement de documents (`docx_to_pdf.py`, `crop.py`, et l'appel à Tesseract) depuis `apps/api-nest/src/scanner` vers `apps/api-ai`.
3. Crée un routeur de complétion dans FastAPI utilisant le SDK `openai` standardisé. Implémente une logique de bascule automatique (Failover) : le service tente d'appeler l'API principale (Groq avec Llama-3.3-70b-specdec) et bascule instantanément sur l'API secondaire (Together AI avec DeepSeek-R1 ou Llama-3.3-70b-instruct) en cas d'erreur de timeout ou de Rate Limit. Force le format de sortie en JSON (`response_format={"type": "json_object"}`).
4. Dans le backend NestJS, installe et configure `amqplib` (RabbitMQ).
5. Modifie le `ScannerController` : l'upload d'un document appelle de façon synchrone/rapide l'endpoint de l'IA en ligne pour l'extraction immédiate (Moins de 500ms pour l'UI), puis publie immédiatement un message asynchrone dans la file RabbitMQ `document_shadow_processing` pour le traitement lourd.
6. Crée un Worker asynchrone dans `apps/api-ai` qui écoute la file `document_shadow_processing`. Ce worker appelle Ollama en local (modèle Mistral/Llama) pour analyser en tâche de fond le comportement utilisateur, mettre à jour le système RAG (mémoire de l'entreprise) et calculer les métriques pour les dashboards sans impacter l'utilisateur.

Assure-toi de respecter le typage strict, de configurer les clés API (Groq/Together) via variables d'environnement pour l'exportabilité, et de logger chaque étape.

---

## PARTIE B — Persistance & Base de Données Vectorielle (PostgreSQL + pgvector)

### Objectif
Sécuriser la persistance des données et stocker la mémoire de l'entreprise apprise par Ollama. Remplacer les stockages temporaires par des modèles de base de données relationnelle et vectorielle sécurisés par tenant_id.

### 🔧 PROMPT
Tu es l'expert Data d'ELARA. Nous devons fiabiliser notre couche de persistance multi-tenant avec Prisma et PostgreSQL (incluant pgvector).

1. Modifie le fichier `schema.prisma` pour ajouter un modèle `TaxRule` (pays, taux standard, date de vérification, source) avec une relation obligatoire vers un `tenant_id` (Row Level Security ready).
2. Ajoute un modèle `Conversation` et `Message` pour stocker l'historique du chat avec le Conseiller IA.
3. Ajoute un modèle `CompanyMemory` pour stocker la mémoire d'entreprise générée en tâche de fond par Ollama. Active l'extension `pgvector` dans Prisma pour stocker les embeddings des vecteurs de connaissances associés à chaque `tenant_id`.
4. Génère et applique la migration Prisma (`npx prisma migrate dev`).
5. Refactore `TaxAgentService` pour utiliser `PrismaService` au lieu du fichier JSON temporaire.
6. Inspecte et corrige le module MinIO dans NestJS (résolution de la `S3Error` de credentials) pour garantir le stockage cloud ou on-premise des documents.

---

## PARTIE C — Frontend : Interface du Conseiller IA (Chat)

### Objectif
Offrir une interface de discussion intuitive au micro-entrepreneur pour échanger avec le Conseiller IA, traduisant les JSON bruts et affichant les insights de la mémoire d'entreprise.

### 🔧 PROMPT
Tu es l'expert Frontend d'ELARA. Nous devons construire l'interface de l'Assistant IA dans le dashboard en exploitant le flux hybride de données.

Règles de design "Pro Soft" :
- Cartes très arrondies (rounded-3xl).
- Beaucoup d'espace blanc, transitions douces.

Tâches :
1. Exploite la page existante `/assistant` dans Next.js sans modifier sa route.
2. Développe un composant de chat UI en réutilisant exclusivement les composants existants (champs de texte, boutons "pilule").
3. Connecte ce chat au endpoint backend `/v1/assistant/advice`.
4. Formate la réponse de l'IA (issue de la compilation Cloud LLM + contexte Mémoire Ollama) :
   - Affiche le "diagnostic" dans une bulle de texte classique.
   - Si `alerte_tresorerie` est détecté par l'IA, ajoute un badge visuel d'urgence rouge/orange doux.
   - Affiche le tableau `actions_recommandees` sous forme de petites cartes actionnables cliquables (Action, Impact, Délai).
   - Intègre un petit indicateur discret "Mémoire entreprise synchronisée" lorsque la réponse s'appuie sur l'historique local traité par Ollama.

Vérifie l'absence d'erreurs ESLint et garantis un affichage parfait sur mobile.

---

## PARTIE D — Frontend : Dashboard CFO (Règles Fiscales & Statistiques d'Ombre)

### Objectif
Permettre au CFO de visualiser la santé financière (BFR, trésorerie) et de consulter les analyses de comportement générées en tâche de fond par Ollama.

### 🔧 PROMPT
Tu es l'expert Frontend d'ELARA. Nous devons intégrer le module CFO et Dashboard décisionnel.

Tâches :
1. Exploite la vue existante `/cfo` sans en modifier l'architecture.
2. Intègre des cartes de KPIs appelant l'API de synthèse de trésorerie et de BFR. Applique la fonction `formatCFA` pour tous les montants.
3. Ajoute un panneau "Conformité Fiscale & Anomalies" listant les règles actuelles (TVA, cotisations) et affichant les alertes de comportement (Shadow Alerts) générées en arrière-plan par le worker Ollama (ex: détection d'une facture inhabituelle).
4. Ajoute un bouton "Lancer l'Audit Fiscal" appelant l'endpoint `/v1/cfo/tax-rules/update` avec un spinner élégant et des animations douces pendant le traitement.
5. Respecte scrupuleusement la Règle "Pro Soft" : ombres légères, bordures arrondies, couleurs pastel.

---

## PARTIE E — Déploiement Cloud & On-Premise (Docker & Helm pour K8s)

### Objectif
Préparer les applications à être déployées de manière hautement portable sur un cluster Kubernetes, validant la promesse d'un SaaS performant en ligne, exportable instantanément en On-Premise.

### 🔧 PROMPT
Tu es l'ingénieur DevOps d'ELARA. Prépare la plateforme pour une scalabilité SaaS (Kubernetes / Helm).

1. Rédige un `Dockerfile` optimisé (multi-stage) pour l'application NestJS (`api-nest`).
2. Rédige un `Dockerfile` optimisé pour le frontend Next.js (`web`).
3. Rédige un `Dockerfile` pour le service FastAPI (`api-ai`) incluant les dépendances nécessaires pour Tesseract-OCR, le SDK OpenAI pour le cloud LLM, et la connectivité RabbitMQ/Ollama.
4. Crée une charte Helm (`infra/helm/elara`) ou des manifests Kubernetes de base (Deployment, Service, ConfigMap, Ingress, HPA pour l'auto-scaling de FastAPI) pour ces trois applications.
5. Centralise toutes les configurations de bascule dans des ConfigMaps/Secrets (URLs des API Groq/Together, clés d'API, chaînes de connexion PostgreSQL avec pgvector, et endpoint du serveur Ollama local/distant) pour permettre d'exporter le SaaS chez n'importe quel client d'un simple clic.
