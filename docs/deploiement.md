# ELARA — Déploiement & trajectoires (SaaS & On-Premise)

> Statut : **documentation de référence** du déploiement ELARA via **Octopus Deploy (Config as Code)** sur **Kubernetes**.
> Process versionné dans `.octopus/` (process, variables, settings) et déclaré en YAML structuré dans `infra/octopus/` (lecture humaine), les deux devant rester synchronisés.

---

## 1. Vue d'ensemble

Une seule base de code et les mêmes charts Helm servent **deux trajectoires** :

| Trajectoire | Modèle | Déploiement | Éléments distinctifs |
|---|---|---|---|
| **SaaS géré** | Multi-tenant (dev/staging/production) | Octopus push → cluster Kubernetes (EKS/GKE/AKS) central | Valeurs Helm par environnement, Ingress public + TLS (cert-manager/Let's Encrypt), migrations auto |
| **On-Premise** | Mono-tenant chez le client banque | Octopus push → cluster client (K3s/K8s + Traefik) | `values-onpremise.yaml`, Ollama local (aucun LLM cloud), aucun trafic sortant, gabarit `onpremise-template` |

**Règle d'or du prompt-cadre (réaffirmée) :** les trois invariants transverses — `tenant_id` systématique, API interne systématique, traitement asynchrone systématique — sont portés par le code applicatif (NestJS) et non par l'infrastructure. Aucune des deux trajectoires ne nécessite donc de **réécriture de la logique métier** : seule la *configuration* (values Helm, variables Octopus, TLS) change.

---

## 2. Architecture du déploiement

```
┌──────────────┐   push image + release    ┌──────────────────────────┐
│ GitHub repo  │ ────────────────────────▶ │  Octopus Deploy (SaaS)   │
│  (Config)    │   (GitHub Actions)        │  Config as Code (.octopus)│
└──────────────┘                           └────────────┬─────────────┘
                                                        │ push Helm (octopus)
                                                        ▼
                                        ┌──────────────────────────────┐
                                        │      Kubernetes / EKS        │
                                        │  ┌───────────┐ ┌──────────┐  │
                                        │  │ namespace │ │ namespace│  │
                                        │  │ elara-dev │ │ elara-prod│ │
                                        │  └───────────┘ └──────────┘  │
                                        │  Ingress-nginx + cert-manager │
                                        │  PostgreSQL + pgvector (+pooler)│
                                        │  MinIO · Redis · RabbitMQ     │
                                        └──────────────────────────────┘
```

**Composants Octopus versionnés (Config as Code, dossier `.octopus/`) :**
- `deployment_process.ocl` — process de déploiement (étapes : migration SQL, Helm api-nest, Helm api-ai, Helm web, healthcheck, validation humaine avant production).
- `variables.ocl` — variables par environnement (namespace Kubernetes, fichier de values Helm, connexion DB en **sensible** → jamais commitée).
- `deployment_settings.ocl` — politiques (guidance en cas d'échec, connectivité, stratégie de versioning).
- `schema_version.ocl` — version du format OCL (15).

**Composants Octopus déclaratifs (lecture humaine, `infra/octopus/`) :** `deploy-api-nest.yaml`, `deploy-api-ai.yaml`, `deploy-web.yaml` — miroir YAML du process, maintenu en parallèle de l'OCL.

---

## 3. Environnements Octopus

| Environnement | Usage | Promotion | Déploiement |
|---|---|---|---|
| `dev` | Intégration continue | automatique à chaque merge sur `main` | auto |
| `staging` | Recette interne / pré-prod | manuelle depuis `dev` | manuelle avec validation |
| `production` | Clients SaaS | manuelle depuis `staging` + **validation humaine obligatoire** | manuelle, étape de validation humaine bloque toute promotion |
| `onpremise-template` | Gabarit mono-tenant client banque | **jamais** promu automatiquement | via modèle de déploiement rejoué par client |

> Variables formulées par environnement (`environment = [...]`) : `Elara.ValuesEnv`, `Elara.Kubernetes.Namespace`, `Elara.Database.ConnectionString` (sensible, à créer dans l'UI Octopus, hors git).

---

## 4. Process de déploiement (configuré dans `.octopus/deployment_process.ocl`)

1. **Migration PostgreSQL** (script) — applique `infra/db/migrations/*.sql` (schéma, RLS, pgvector, trigrammes) **avant** tout déploiement. Avant/pendant exécutées sur le worker Octopus (`psql` requis).
2. **Helm api-nest** (`Octopus.HelmChartUpgrade`) — chart `infra/k8s/api-nest`, release `elara-api-nest`, values `values-#{Elara.ValuesEnv}.yaml`, `--atomic --install --timeout=600s` (rollback Helm automatique en cas d'échec de healthcheck).
3. **Helm api-ai** — chart `infra/k8s/api-ai`, release `elara-api-ai`, même stratégie.
4. **Helm web** — chart `infra/k8s/web`, release `elara-web`, même stratégie.
5. **Healthcheck post-déploiement** — `kubectl rollout status` des 3 déploiements + vérification HTTP des endpoints (`/v1/health`, `/health`, `/`) via `kubectl port-forward`.
6. **Validation humaine obligatoire (production)** — `Octopus.ManualIntervention`, **uniquement** rattachée à l'environnement `production` : aucune promotion ne passe sans validation humaine explicite.

> **Note Config as Code :** la valeur exacte du property `Octopus.Action.Helm.ChartSource` pour un chart issu du dépôt Git du projet doit être confirmée dans l'UI Octopus lors de la première importation du process (`ProjectGitRepository` attendu). Les YAML `infra/octopus/*.yaml` servent de référence lisible en cas d'écart.

---

## 5. Secrets & sécurité

| Secret | Gestion | Statut |
|---|---|---|
| `Elara.Database.ConnectionString` | Variable **sensible** Octopus, scoped par environnement | à créer dans l'UI (jamais commitée) |
| `Elara.ValuesEnv` / `Elara.Kubernetes.Namespace` | Variables non sensibles versionnées (`variables.ocl`) | ✅ versionnées |
| Secrets applicatifs (Keycloak, Supabase, MinIO, Groq, RabbitMQ…) | `infra/k8s/secret.yaml` = **placeholders** ; vraies valeurs en `kubectl create secret elara-secrets` ou variables Octopus sensibles | placeholders ✅ |
| `.env` locaux | **jamais commités** (`.gitignore` + fichier `.env.example`) | ✅ |

**Mesures :**
- **Jamais de secret dans `variables.ocl`** : tout secret doit passer par l'UI Octopus en tant que variable sensible, ou par le secret Kubernetes `elara-secrets` (créé hors git via un runbook/valeurs réelles du cluster).
- TLS obligatoire partout (HTTPS) via Ingress + `cert-manager` (ClusterIssuer `letsencrypt-prod`), aucune route HTTP non chiffrée.
- Les secrets exposés avant la mise en place du `.gitignore` doivent être **rotés** (voir §9).

---

## 6. TLS / HTTPS (Ingress)

Les 3 charts (`api-nest`, `api-ai`, `web`) exposent des Ingress avec support TLS conditionnel :

```yaml
# values-<env>.yaml
ingress:
  enabled: true
  className: nginx
  host: elara.app            # ou staging.elara.app / elara-app.local
  path: /api                # ou /ai, /
  tls:
    enabled: true
    clusterIssuer: letsencrypt-prod
    secretName: elara-tls-api-nest
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$1
    # (ajoutées automatiquement si tls.enabled)
    #   cert-manager.io/cluster-issuer: letsencrypt-prod
    #   nginx.ingress.kubernetes.io/ssl-redirect: "true"
```

- **Environnements cloud (staging/production)** : `tls.enabled: true`, ClusterIssuer Let's Encrypt prod, secret TLS dédié (ex. `elara-tls-api-nest`).
- **Environnements locaux (dev/onpremise)** : `tls.enabled: false` (certificat du client ou autosigné en on-premise) ; la infrastructure cert-manager/cluster-issuer n'est alors pas déclenchée.

Le template `templates/ingress.yaml` de chaque chart rend automatiquement le bloc `spec.tls` + les annotations cert-manager lorsque `.Values.ingress.tls.enabled` est vrai, et reste un simple Ingress HTTP sinon.

---

## 7. Trajectoire SaaS gérée (cloud)

1. **Cluster** : EKS (ou GKE/AKS), nœuds typés (app / db / ai), namespace par environnement (`elara-dev`, `elara-staging`, `elara-prod`).
2. **Ingress** : controller `nginx` + `cert-manager` (ClusterIssuer `letsencrypt-prod`), Ingress TLS comme au §6.
3. **Base de données** : PostgreSQL + `pgvector` managé (Supabase/Neon/RDS) ; pooler (`pgbouncer`) pour `api-nest`, connexion directe pour les migrations.
4. **Déploiement** : process Octopus (§4). Diffusion images via chart Helm `values-production.yaml` (`replicaCount: 2`).
5. **Observabilité** : healthchecks HTTP + `kubectl rollout status` ; logs via le cluster (Loki/EFK optionnel).

---

## 8. Trajectoire On-Premise (mono-tenant banque)

Même process/process, même chart — **configuration** uniquement différente (`values-onpremise.yaml`) :

| Élément | Cloud SaaS | On-Premise |
|---|---|---|
| LLM | LLM cloud (Groq/Together/Ollama selon env) | **Ollama local** uniquement — aucune donnée ne sort du réseau client |
| Stockage | MinIO cloud | MinIO / volumes K8s dédiés, isolés par client |
| Registre | Registre central | Registre privé client ou chart local (`pullPolicy: IfNotPresent`) |
| Ingress/TLS | nginx + Let's Encrypt | Traefik (ou nginx) + certificat client fourni (pas de cert public) |
| Base | cloud managée | PostgreSQL on-premise (mêmes migrations) |
| Déploiement | Octopus push cloud | Octopus (trajectoire push) ou **Argo CD (GitOps pull)** pour tenant isolés |

**Gabarit :** l'environnement `onpremise-template` d'Octopus sert de modèle rejouable pour chaque nouveau client : dupliquer l'environnement, ajuster les values (`values-onpremise.yaml`) et les variables, déployer. Aucune modification du code.

> **Ollama obligatoire** : en on-premise, `api-ai` doit pointer vers un Ollama local ; aucun appel vers un fournisseur LLM cloud ne doit être possible (variable `OLLAMA_BASE_URL` locale, blocage réseau sortant vers les endpoints LLM cloud).

---

## 9. Évaluation Argo CD (GitOps pull — non activé)

**Constat** : pour un SaaS centralisé multi-tenant piloté par Octopus (push), Argo CD n'apporte pas de valeur immédiate : Octopus gère déjà environnements + promotion + validation humaine + rollback.

**Point d'extension futur** (documenté, **non mis en œuvre** par défaut) : dès que le nombre de clients on-premise mono-tenant devient conséquent (>3–5), le modèle **pull** (Argo CD application par tenant, repo Git par client, `ApplicationSet`) réduit la charge opérationnelle :
- 1 application Argo CD par client, déclarative, auto-réparatrice (drift detect).
- Octopus conserve le pilotage des releases/migrations ; Argo CD assure la convergence d'état du cluster client.
- Seuil d'activation à confirmer avec l'équipe ops (charge administrative vs gain).

**Décision documentée : rester sur Octopus pull pour le MVP ; Argo CD évalué, pas activé.**

---

## 10. Migration de base de données

- Fichiers SQL versionnés : `infra/db/migrations/` (fondations, RLS/triggers, pgvector/IA, etc.), ordonnés (préfixe `01_`, `02_`, …).
- Exécutées par l'étape 1 du process Octopus (**avant** le déploiement Helm) via `psql`, avec `ON_ERROR_STOP=1`.
- Idempotence : à garantir dans les fichiers (les triggers/RLS utilisent `IF NOT EXISTS` / `CREATE OR REPLACE`).
- Aucune migration au démarrage des conteneurs : les images `api-nest` démarrent sur `node dist/main` sans `prisma migrate` — la migration est pilotée par Octopus (source unique de vérité pour l'ordre et le moment).

---

## 11. Récapitulatif des étapes d'activation (checklist opérationnel)

- [ ] **Octopus** : créer le projet `ELARA` (Config as Code) relié au dépôt Git ; créer les 4 environnements (dev/staging/production/onpremise-template) ; enregistrer le cluster Kubernetes comme cible de déploiement.
- [ ] **Importer** l'OCL (`.octopus/`) et **valider** le property `Octopus.Action.Helm.ChartSource`.
- [ ] **Créer** les variables sensibles dans l'UI Octopus (connexion DB par environnement).
- [ ] **Cluster** : cert-manager + Ingress-nginx + ClusterIssuer `letsencrypt-prod` ; secret `elara-secrets` avec les valeurs réelles.
- [ ] **CI/CD** : GitHub Actions (build images → push registre) + création de release Octopus automatique à chaque merge sur `main` (Partie 20/21).
- [ ] **Recette** : exécuter `/tests/recette/` + `docs/rapport-recette.md` avant toute release vers `staging`/`production`.
- [ ] **Trajectoire on-premise** : images + chart + values `values-onpremise.yaml` déployés sur un cluster de test isolé avant engagement client.

---

## 12. Sécurité — rotation des secrets exposés

Les secrets d'environnement (variables réelles de `apps/*/.env`) ont été **exposés dans l'historique git public** avant mise en place du `.gitignore` (ils ont depuis été détrackés, mais restent visibles dans l'historique). **Action recommandée avant mise en production :**
- Regénérer la clé API **Groq/Together** (`apps/api-ai/.env`).
- Réinitialiser le mot de passe **Supabase/PostgreSQL** + clé `anon` + `AUTH_SECRET` Keycloak/NextAuth (`apps/web/.env`, `apps/api-nest/.env`).
- Remplacer ensuite ces valeurs dans `elara-secrets` (K8s) et les variables sensibles Octopus.

> Voir aussi `/docs/guide-utilisateur.md` et `/docs/rapport-recette.md`.
