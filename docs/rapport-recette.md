# Rapport de recette — ELARA MVP

> **Portée :** vérification des 6 critères d'acceptation officiels du cahier des charges (§9),
> sur le périmètre MVP déployé (Partie 20).
> **Date de rédaction :** voir `git log -1 --format=%cs` · **Réf. commits :** cf. `git log`.
> **Méthode :** conformité = **mesurée** (test automatisé exécuté en CI, PASS/FAIL + métrique)
> ou **« à valider »** (recette humaine sur l'environnement de démonstration, pas supposée).

---

## Synthèse des 6 critères officiels

| # | Critère officiel | Périmètre MVP | Résultat mesuré | Statut |
|---|---|---|---|---|
| 1 | **Business Scanner** : classification + extraction correctes **≥ 90 %** ; documents sous le seuil de confiance systématiquement soumis à validation | `apps/api-ai` + `apps/api-nest` (scanner) | Unit (stockage/traçabilité **MinIO 5/5 PASS**) ; classification/extraction sur démo réelle | ⏳ **à valider (démo)** |
| 2 | **Mémoire Entreprise** : aucune duplication d'entité ; historique de modification consultable | `apps/api-nest` (memoire) | Déduplication à la création + `historique_modifications` — à confirmer sur cluster RLS | ⏳ **à valider (démo)** |
| 3 | **CFO IA** : indicateurs financiers exacts vs transactions enregistrées (centime près) | `apps/api-nest` (cfo) | Comparaison SQL indépendant — à exécuter sur jeu de démo | ⏳ **à valider (démo)** |
| 4 | **Rapport IA** : généré auto à la fréquence paramétrée, données à date de génération | `apps/api-nest` (rapport) | Job RabbitMQ + fraîcheur — à observer sur démo | ⏳ **à valider (démo)** |
| 5 | **Assistant IA** : **zéro hallucination** ; toute absence signalée | `apps/api-nest` (assistant) | **PASS unitaire 4/4** (fallback sûrs, `memoire_entreprise_utilisee`) | 🟢 **PASS (unitaire)** + ⏳ éval LLM démo |
| 6 | **Intégrations API** : action sortante à impact bloquée sans validation humaine ; chaque appel journalisé | `apps/api-nest` (integrations) | Blocage sans validation + audit — à consolider sur démo | ⏳ **à valider (démo)** |

---

## Détail par module

### 1. Business Scanner
- **Automatisé (CI) :** `scanner/minio.service.spec.ts` — 5 cas QA de stockage/traçabilité
  (upload `local://`, écriture physique, `readBuffer`, lecture fichier absent, trace `index.csv`). **PASS 5/5.**
- **À valider (démo) :** classification + extraction documentaires ≥ 90 % sur le jeu de 20
   documents de démo (`tests/recette/data/`) ; documents < seuil → validation humaine.
- **Procédure de mesure :** `tests/recette/business-scanner/README.md` (à exécuter sur la démo).

### 2. Mémoire Entreprise
- **Automatisé (CI) :** déduplication (une entité = un identifiant) + historique de
  modification — à relier aux spec `memoire` en cours d'écriture (controller actuellement `it.skip`).
- **À valider (démo) :** création en double → même `id` ; RLS : requête cross-tenant vide.

### 3. CFO IA
- **À valider (démo) :** sur transactions de référence, CA/marge/trésorerie = SQL indépendant
  au centime ; RLS multi-tenant respecté.
- **Script de mesure :** `tests/recette/cfo-ia/README.md` (procédure à exécuter sur la démo).

### 4. Rapport IA
- **À valider (démo) :** génération à la fréquence configurée (cron RabbitMQ) ; contenu
  reflet des données présentes à `date_generation`.
- **Script de mesure :** `tests/recette/rapport-ia/README.md` (procédure à exécuter sur la démo).

### 5. Assistant IA
- **Automatisé (CI) :** `assistant/assistant.service.spec.ts` — 4 cas PASS : parsing JSON
  réponse IA, fallback message brut, injection mémoire (`memoire_entreprise_utilisee`),
  réponse sûre si IA microservice indisponible. **PASS 4/4.**
- **À valider (démo) :** zéro hallucination sur jeu de test (Ollama local) ; toute absence
  de donnée signalée explicitement.

### 6. Intégrations API
- **À valider (démo) :** action sortante (virement/envoi) bloquée sans validation humaine ;
  journal d'audit complet par appel.
- Interceptor `audit` en place (`src/audit/audit.interceptor.ts`) — spec à écrire.

---

## Vérifications transverses (invariants du prompt-cadre)

| Invariant | Méthode | Statut |
|---|---|---|
| Isolation multi-tenant totale (RLS + `tenant_id` systématique) | migrations RLS + requêtes croisées | ⏳ démo |
| Aucune action sensible sans validation humaine | interceptor audit + blocage outbound | ⏳ démo |
| Traçabilité complète (chaque appel, chaque modification) | `audit` + `historique_modifications` + `index.csv` | ⏳ démo |

## Vérifications de déploiement (Partie 20)

| Vérification | Méthode | Statut |
|---|---|---|
| Helm chart lint (3 charts, 15 values files) | `helm lint` | 🟢 PASS |
| TLS Ingress rendu (staging/prod) | `helm template` | 🟢 PASS |
| Migration DB avant api-nest | étape Octopus OCL | ✅ configuré |
| Healthcheck post-déploiement | étape Octopus + rollout kubectl | ✅ configuré |
| Validation humaine avant production | `Octopus.ManualIntervention` scoped prod | ✅ configuré |

---

## Écarts / actions restantes avant déclaration RECETTABLE

1. **Recette humaine** sur l'environnement de démonstration public (6 critères, métriques
   mesurées) — bloquant pour déclarer le MVP **recettable** (§9). Les README de procédure
   `tests/recette/*/` et l'outil `tests/recette/run-recette.sh` sont prêts.
2. **Tests e2e/[spec] encore `it.skip`** (6 fichiers contrôleur) : lever les skips et
   finaliser les assertions métier (Mémoire, CFO, Rapport, Intégrations) pour fiabiliser
   la CI.
3. **test e2e obsolète** : `apps/api-nest/test/app.e2e-spec.ts` attend `Hello World!` sur
   `/` mais le contrôleur expose `GET /v1/health` → **corriger** avant recette.
4. **Lever les `<Réponse fictive>`** consignés en §5 (`infra/k8s/secret.yaml`, `apps/*/Dockerfile`
   placeholders) via les variables sensibles Octopus.
5. **Rotation des secrets** exposés dans l'historique git public (cf. `docs/deploiement.md` §12).
6. **CI recette obligatoire** avant release Octopus staging/production (Partie 21) : gate à
   brancher sur `.github/workflows/ci.yml`.

> ⚠️ Une réponse **conformité = PASS** ne pourra être portée au niveau du critère officiel que
> là où une **métrique mesurée** l'étaye. Les cases « à valider » sont décrites avec leur
> procédure de mesure pour qu'un responsable de recette puisse les exécuter sur la démo.