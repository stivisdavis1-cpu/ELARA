# Prompt de finalisation ELARA — à coller dans Claude Code

```
Tu es ingénieur full-stack senior. Tu finalises ELARA, une application de gestion
documentaire (GED + scanner OCR + IA) qui doit fonctionner intégralement en local
sur Docker Compose, sur tous les plans : fonctionnel, sécurité, données, IA, UX,
tests, documentation et exploitation.

═══════════════════════════════════════════════════════════════════
RÈGLES ABSOLUES — NE JAMAIS LES ENFREINDRE
═══════════════════════════════════════════════════════════════════

1. INTERDIT de données fictives présentées comme réelles. Aucun `test-token`,
   aucun `test-tenant` comme repli, aucune session factice, aucun texte OCR,
   montant, alerte ou « anomalie » synthétique. Si une donnée est indisponible,
   l'interface doit le dire explicitement et l'API doit renvoyer une erreur
   franche (503, 422...) — jamais un mensonge plausible.

2. INTERDIT de modifier ou supprimer des données de production existantes
   (la base est une Supabase distante via DATABASE_URL). Aucune purge, aucun
   DROP, aucun TRUNCATE sans demande explicite de ma part. Pose une question
   avant toute suppression.

3. NE JAMAIS exécuter `git reset --hard`, `git checkout --`, `git clean`,
   ni réécrire l'historique. Le worktree contient des centaines de
   modifications non commitées qui sont le fruit du travail en cours.
   Commence TOUJOURS par `git status` et `git diff` pour comprendre l'état.

4. Ne commite rien sans mon accord explicite.

5. Travaille de façon continue jusqu'au bout. Ne t'arrête pas pour demander
   des précisions sur des détails cosmétiques. N'interromps le flux que si un
   choix est réellement structurant (destruction de données, changement
   d'architecture, exposition de secrets).

6. Explique brièvement chaque modification : le problème, la cause, le fix.
   Pas de commentaire de code décoratif, pas de code mort, pas de TODO.

═══════════════════════════════════════════════════════════════════
ARCHITECTURE
═══════════════════════════════════════════════════════════════════

Monorepo : NestJS (api-nest) + Next.js 16 (web) + FastAPI (api-ai)
Infra : docker-compose, 8 services.

  web        Next.js 16.3.4  → http://localhost:3000
  api-nest   NestJS          → http://localhost:3001
  api-ai     FastAPI         → http://localhost:8000
  keycloak   Realm « Elara » → http://localhost:8080
  minio      S3 local        → 9000 / console 9001
  rabbitmq   AMQP            → 5672 / console 15672
  postgres   local, NON UTILISÉ (la base réelle est Supabase)
  redis      cache local

AUTHENTIFICATION ET TENANT — NE PAS CASSER :
- Session NextAuth (Credentials) contre Keycloak. Le `accessToken` est exposé
  au PREMIER niveau de l'objet session (`session.accessToken`). `session.tenantId`
  peut valoir `null` : ce n'est pas une source de vérité.
- Le tenant courant vient EXCLUSIVEMENT du cookie serveur `elara_tenant`, résolu
  dans `apps/web/src/app/(app)/layout.tsx` puis distribué par
  `apps/web/src/components/TenantContext.tsx`.
- `useEntetesApi()` retourne `{ Authorization: "Bearer ...", "X-Tenant-Id": ... }`.
- Le proxy `apps/web/next.config.ts` ne fait QUE du routage : il n'injecte ni
  jeton ni tenant. Tout appel navigateur vers `/api/*` DOIT envoyer les deux.
- Côté API, `TenantInterceptor` refuse tout tenant absent ou non valide, sauf
  `/mes-organisations`. Un même utilisateur peut appartenir à plusieurs
  organisations : c'est l'intercepteur, pas le jeton, qui tranche.

═══════════════════════════════════════════════════════════════════
PHASE 0 — ÉTAT DES LIEUX (obligatoire avant toute modification)
═══════════════════════════════════════════════════════════════════

Exécute et rapporte les résultats :

  git status --porcelain
  docker compose ps
  docker compose logs --tail=80 api-nest api-ai web
  docker exec elara-api-nest-1 node -e "['keycloak','rabbitmq','minio','redis','web'].forEach(h=>require('dns').lookup(h,(e,a)=>console.log(h,e?('ECHEC '+e.code):a)))"

Le dernier point est critique : si un nom de service ne résout pas, le service
dépendant est DOWN même si le conteneur affiche « healthy ». Compare avec
`docker ps -a` (cherche les conteneurs « Exited ») et relance au besoin avec
`docker compose up -d`.

═══════════════════════════════════════════════════════════════════
PHASE 1 — ROBUSTESSE DE LA PILE (bloquant : l'app est tombée)
═══════════════════════════════════════════════════════════════════

Incident observé : les 5 services d'infrastructure (postgres, redis, rabbitmq,
keycloak, minio) se sont arrêtés en Exited (255) alors que le moteur Docker
répondait encore. Conséquence : résolution DNS interne cassée, Keycloak
injoignable, `JwtStrategy` (validation RS256 via JWKS) incapable de vérifier les
jetons, API `unhealthy`, application hors service. Le port 3000 en forward host
accepte la connexion TCP mais la coupe immédiatement : symptôme du même
incident.

Tâches :
a) Ajouter `restart: unless-stopped` aux 5 services d'infrastructure qui
   n'en ont pas (seuls api-ai, api-nest et web en ont un aujourd'hui).
b) Ajouter un `healthcheck` et un `depends_on: condition: service_healthy` pour
   que l'API ne démarre pas avant Keycloak et RabbitMQ, et que le web n'attende
   pas l'API.
c) Vérifier que la résolution DNS entre conteneurs fonctionne et qu'un
   redémarrage complet de la pile (`docker compose down && docker compose up -d`)
   laisse l'application pleinement fonctionnelle sans intervention manuelle.
   C'est le critère de réussite de cette phase.

═══════════════════════════════════════════════════════════════════
PHASE 2 — SÉCURITÉ ET ISOLEMENT MULTI-TENANT
═══════════════════════════════════════════════════════════════════

a) Supprimer les derniers replis `test-token` :
   - apps/web/src/lib/ged-api.ts
   - apps/web/src/lib/ged-binary.ts
   Fais une recherche exhaustive dans tout `apps/web/src` et supprime chaque
   occurrence. Sans jeton, on n'appelle pas l'API : on affiche un état de
   chargement, jamais une 401 transformée en fausse donnée.

b) Vérifier que `TenantInterceptor` est bien global et qu'aucun contrôleur
   `/api/*` n'échappe à la vérification d'appartenance. Écris un test
   automatisé qui prouve qu'un utilisateur du tenant A obtient bien 403 sur une
   ressource du tenant B.

c) Remplacer les corps `any` de `activation.controller.ts` par un DTO validé
   (class-validator). La confirmation du mot de passe doit être vérifiée côté
   API, pas seulement dans le formulaire.

d) Masquer les commandes de gestion des comptes aux non-administrateurs dans
   `apps/web/src/app/(app)/users/page.tsx`. Masquer n'est pas protéger : vérifie
   aussi que chaque route serveur correspondante refuse un non-admin.

e) `apps/api-nest/.env` est suivi par Git. Audite ce qui y entre, déplace les
   secrets dans des fichiers non versionnés, et produis un `.env.example`
   documenté. Ne m'affiche jamais la valeur d'un secret dans ta réponse.

═══════════════════════════════════════════════════════════════════
PHASE 3 — CHAÎNE IA LOCALE (bloquant pour le MVP)
═══════════════════════════════════════════════════════════════════

Constat : le conteneur `elara-api-ai-1` est « healthy » mais tourne une IMAGE
ANCIENNE : les sources modifiées de `apps/api-ai` ne sont pas déployées. De plus
`docker compose build api-ai` échoue.

a) Corrige le build. La cause est identifiée : `opencv_python` n'est pas dans
   `requirements.txt`, il arrive en dépendance transitive de
   `rapidocr_onnxruntime`, et son téléchargement depuis files.pythonhosted.org
   dépasse le timeout pip par défaut (ReadTimeoutError). Solutions possibles :
   pinner la version, utiliser `opencv-python-headless` (plus adapté à un
   conteneur sans GUI), ou configurer `PIP_DEFAULT_TIMEOUT` / `PIP_RETRIES`.
   Choisis la plus robuste et explique pourquoi.

b) Reconstruis et redéploie `api-ai`. Vérifie ensuite que le code réellement
   modifié est bien celui qui s'exécute (ajoute un endpoint `/version` ou une
   info de build lisible, c'est utile en production).

c) Embeddings : aujourd'hui `POST /ai/embeddings` renvoie 503 parce qu'aucun
   fournisseur n'est joignable. Le 503 est un BON comportement (l'appelant
   bascule en recherche lexicale) — ne le supprime pas. Mais fais en sorte que
   l'application soit réellement utilisable en local :
   - propose un service d'embeddings local (Ollama + `nomic-embed-text` en 768
     dimensions, ou sentence-transformers) et un service optionnel pour le
     développement hors-ligne ;
   - si aucun modèle n'est disponible, le comportement doit rester le 503
     honnête et l'interface doit indiquer « recherche lexicale uniquement »,
     jamais simuler une similarité sémantique.
   Note : `OLLAMA_URL` pointe vers `host.docker.internal:11434` — vérifie que
   `extra_hosts` est déclaré dans le service, sinon rien ne sera joignable.

d) Extraction (`/ai/extract`) : le repli actuel produit un texte OCR dégradé
   ÉLAGUÉ. Vérifie que l'extraction structurée d'une facture réelle remonte des
   champs (montant, date, fournisseur) et non des libellés génériques. Exigence
   absolue : si l'extraction échoue, le dire — ne jamais produire de montants
   plausibles mais faux.

e) RabbitMQ : le handler `scanner.document.traite` n'est pas reconnu côté
   serveur (« There is no matching event handler defined »). Vérifie la
   topologie (exchange, routing key, pattern) et le registration pattern côté
   NestJS. Un document lourd doit finir analysé en tâche de fond, pas
   silencieusement.

═══════════════════════════════════════════════════════════════════
PHASE 4 — DONNÉES ET PILE 100 % LOCALE
═══════════════════════════════════════════════════════════════════

a) Aujourd'hui l'application dépend de Supabase. Le service `postgres` local
   existe dans le compose mais n'est pas câblé et ne contient aucune table.
   Propose un profil local complet (par exemple un fichier
   `docker-compose.local.yml` ou un override) qui utilise PostgreSQL + pgvector
   localement, applique les migrations, et qui ne touche jamais la base
   distante. Si un décalage de schéma est inévitable, documente-le précisément.

b) Audit des données : il reste 11 documents dans le tenant `test`
   (« Elara Test »), dont 10 archivés et 1 en attente, sans aucun utilisateur
   réel rattaché. NE LES SUPPRIME PAS. Rédige-moi une analyse (volume, types,
   dates) et présente tes options : conserver / archiver / purger. Je
   déciderai.

c) Vérifie qu'il n'existe plus de seed, de fixture ou de script de
   démonstration qui pollue la base au démarrage (`prisma/seed.ts`,
   `infra/db/seed.sql` ont déjà été supprimés — confirme qu'aucun autre
   subsiste).

d) Un mot de passe oublié n'existe pas. Implémente le flux complet, en tenant
   compte du fait qu'aucun SMTP n'est configuré en local : le lien doit être
   généré et présenté de façon explicite et sécurisée (jeton à usage unique,
   expiration courte, usage unique), jamais simplement affiché en clair dans
   une URL permanente.

═══════════════════════════════════════════════════════════════════
PHASE 5 — COHÉRENCE ET QUALITÉ
═══════════════════════════════════════════════════════════════════

a) Aligner le rôle d'invitation entre SQL (`invitations.role` en TEXT avec
   CHECK) et le schéma Prisma (enum). Une seule source de vérité, une migration
   appliquée et testée.

b) Nettoyer le code mort laissé par les correctifs : imports `useSession`
   inutilisés, dépendances d'effets qui n'incluent pas `entetes`, variables
   mortes. Le code doit compiler sans erreur.

c) `npx tsc --noEmit` doit passer SANS erreur dans `apps/api-nest`. Deux
   erreurs préexistantes sont à traiter : import de `prisma/config` dans
   `prisma.config.ts`, et import de `supertest/types` dans
   `test/app.e2e-spec.ts`.

d) Cohérence de l'API : un seul format d'erreur JSON global, des codes HTTP
   corrects, et des messages qui n'incluent jamais de stack trace ni de nom de
   table côté client.

═══════════════════════════════════════════════════════════════════
PHASE 6 — TESTS AUTOMATISÉS (livrable attendu, pas optionnel)
═══════════════════════════════════════════════════════════════════

Les contrôles faits jusqu'ici étaient des scripts temporaires : ils ont été
supprimés. Il faut de vrais tests qui restent dans le dépôt.

Écris et fais passer :
  1. Isolation tenant : utilisateur du tenant A → 403 sur une ressource du
     tenant B. Cas négatif ET positif.
  2. Chaîne d'invitation complète : identité Keycloak orpheline, ré-invitation,
     activation, connexion. Cas où un 409 réinitialise
     `mot_de_passe_defini_le` et invalide les anciens liens.
  3. Confirmation de mot de passe divergente rejetée par l'API.
  4. Scanner : import d'un vrai PDF, détection de doublon (réponse contenant
     l'identifiant et le nom réels, jamais « Test OCR »), archivage, rejet,
     relecture après rechargement, document archivé en consultation seule.
  5. Un test qui échoue si quelqu'un réintroduit `test-token`, `test-tenant`
     comme valeur de repli, ou une donnée synthétique. C'est la garde-fou la
     plus importante.

Pour le parcours navigateur, utilise Playwright. Crée un utilisateur de test
DURABLE et documenté, et un nettoyage automatique en fin de test (ou un
`docker compose -f docker-compose.test.yml` isolé qui ne touche jamais la base
réelle).

═══════════════════════════════════════════════════════════════════
PHASE 7 — VALIDATION FINALE
═══════════════════════════════════════════════════════════════════

Avant de me rendre le projet, exécute et montre les résultats :

  docker compose down && docker compose up -d          # doit repartir seul
  docker compose ps                                    # tous healthy
  npm run build   dans apps/web         → 0 erreur
  npx tsc --noEmit dans apps/web        → 0 erreur
  npm run build   dans apps/api-nest     → 0 erreur
  npx tsc --noEmit dans apps/api-nest    → 0 erreur
  la suite de tests complète → tout au vert

Puis un parcours navigateur réel de bout en bout, en surveillant le réseau :
connexion → tableau de bord → import d'un vrai PDF → consultation du document →
éléments extraits → archivage → page Documents → page Utilisateurs, en
confirmant ZÉRO requête `/api/*` en 4xx ou 5xx.

Et applique la consigne de propreté : supprime tous les scripts temporaires,
les comptes de test résiduels et les documents de test que TU auras créés.

═══════════════════════════════════════════════════════════════════
LIVRABLE FINAL
═══════════════════════════════════════════════════════════════════

Je veux :
  1. La liste des problèmes trouvés, avec pour chacun la cause racine.
  2. La liste des correctifs, avec les fichiers touchés.
  3. Les sorties de commande brutes des validations de la phase 7.
  4. La liste exacte de ce qui reste INACHEVÉ, et pourquoi. Sois honnête :
     un « ça marche » non démontré ne vaut rien.
  5. Une documentation de lancement local à jour (README ou docs/) : comment
     tout démarrer, quels comptes créer, comment activer une invitation, ce qui
     fonctionne et ce qui ne fonctionne pas encore.

Si un point de ce prompt est déjà satisfait, ne le réimplémente pas : vérifie,
constate-le, et passe à la suite. Commence par la phase 0 et donne-moi ton
diagnostic avant de coder.
```
