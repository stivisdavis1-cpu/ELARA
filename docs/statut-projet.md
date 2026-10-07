# Statut du projet ELARA

> **Dernière mise à jour :** 6 octobre 2026 — commit `8a4b0c9` (pushé sur `main`)

## 1. Résumé général

ELARA est opérationnelle côté marketing : les pages d'accueil et de pré-lancement
n'utilisent **plus aucune donnée factice côté client**. Les formulaires sont branchés
sur un vrai backend NestJS (Prisma + PostgreSQL), avec anti-spam, parrainage,
SEO/légal et une couverture de tests complète — unitaires, e2e sur vraie base et
anti-régression.

| Domaine | Statut |
|---|---|
| Backend marketing (API) | ✅ Livré et testé |
| Migration base de données | ✅ Appliquée (idempotente) |
| Frontend (formulaires, SEO, légal) | ✅ Livré, build vert |
| Tests (unitaires + e2e + anti-régression) | ✅ 33 unitaires / 12 e2e — 0 échec |
| Dépôt GitHub | ✅ `main` synchronisé à `8a4b0c9` |
| Sécurité secrets `.env` | ⚠️ Action recommandée (voir §6) |

## 2. Livrés détaillés

### 2.1 Backend — `apps/api-nest/src/marketing/`
- Modèles Prisma `ListeAttente` + `DemandeDemo` (+ migration
  `infra/db/migrations/11_liste_attente.sql`, ré-exécution vérifiée sans effet).
- `POST /v1/marketing/liste-attente` : normalisation email, code de parrainage
  généré côté serveur (crypto, sans `Math.random`), retry P2002, e-mail déjà
  inscrit ⇒ renvoie l'inscription existante (position + code récupérables),
  drapeau honnête `parrain_inconnu`.
- `GET /v1/marketing/liste-attente/:code` : position réelle + nombre de parrainages.
- `POST /v1/marketing/demandes-demo` : référence réelle en base.
- Positions = rang d'arrivée + boost (distance ÷ 2 par invitation), avec
  re-classement garantissant des positions uniques.
- Anti-spam : honeypot `site_web` (`MaxLength(0)`, absent du Swagger), `@Throttle`
  par route (TTL ms), IP cliente via dernier `x-forwarded-for`.

### 2.2 Frontend — `apps/web`
- Split server/client pour les métadonnées (`page.tsx` + `landing.client.tsx` /
  `prelancement.client.tsx`), métadonnées par segment (title, description,
  canonical, Open Graph, Twitter).
- Formulaires branchés : chargement / erreur / succès, honeypot, désactivation du
  bouton, restauration `localStorage`, lecture `?p=`, lien `/r/[code]`,
  notices `parrain_inconnu` / `deja_inscrit`.
- Routes neuves : `/r/[code]` (force-dynamic, noindex), `/confidentialite`
  (10 sections : données, finalités, conservation, droits, Loi n° 2024/017,
  conditions, contact), `sitemap.xml`, `robots.txt`.
- JSON-LD (Organization / WebSite / SoftwareApplication), image `og-image.png`
  générée (script `generate_og_image.py`), liens légaux du footer tous résolus.
- `next.config.ts` : rewrite `/api/marketing/* → /v1/marketing/*` ;
  `middleware.ts` : routes publiques `/confidentialite` et `/r/*` ;
  nouvelle variable `NEXT_PUBLIC_SITE_URL` (`.env.example`).

### 2.3 Qualité
- `marketing.service.spec.ts` : 15 tests unitaires (algorithme, normalisation,
  retries, honeypot).
- `test/marketing.e2e-spec.ts` : 8 tests e2e sur la **vraie base** (insertion,
  restauration, 404, honeypot, validation stricte, démo, nettoyage).
- Anti-régression : scans insensibles aux commentaires (faux positifs corrigés) +
  garde `Math.random` sur les pages marketing.
- Corrections préexistantes : timeouts e2e relevés (60 s), route
  `tenant-isolation` corrigée (ciblait un endpoint inexistant), 48 entités
  non échappées et violations `set-state-in-effect` corrigées.

## 3. Validation (tout vert)

| Vérification | Résultat |
|---|---|
| `prisma validate` + `generate` | ✅ |
| api-nest `npm test` | ✅ 33 passés / 0 échec |
| api-nest suite e2e complète | ✅ 4 fichiers / 12 tests |
| `nest build` / `oxlint` | ✅ 0 erreur (29 warnings de base inchangés) |
| web `tsc --noEmit` | ✅ code 0 |
| web `eslint` (fichiers touchés) | ✅ 0 erreur |
| web `next build` | ✅ `/`, `/prelancement`, `/confidentialite`, `/r/[code]`, `/robots.txt`, `/sitemap.xml` générés |
| Migration 11 appliquée 2× à la base distante | ✅ idempotente |

## 4. Base de données
- Base de référence : **Supabase distante** (celle du `.env`, migrations 01–10 déjà
  en place). Le Postgres local Docker est vide/inutilisé.
- `11_liste_attente.sql` ajoutée et appliquée ; ré-exécution sans effet (`IF NOT
  EXISTS`, garde `DO $$`).

## 5. Dépôt GitHub
- Remote : `https://github.com/stivisdavis1-cpu/ELARA.git`, branche `main`.
- Dernier commit : `8a4b0c9 feat(marketing): backend reel, formulaires branches,
  SEO et confidentialite` (34 fichiers, +3301 / −868), **pushé et synchronisé**.
- Identité configurée : `user.name = stivisdavis1-cpu`,
  `user.email = stivisdavis1@gmail.com`.

## 6. Points d'attention
- ⚠️ **`apps/api-nest/.env` et `apps/web/.env` sont suivis par git** (depuis des
  commits antérieurs) et contiennent la chaîne de connexion Supabase avec mot de
  passe. Recommandé : (1) faire pivoter le mot de passe Supabase,
  (2) `git rm --cached` sur ces fichiers, (3) nettoyer l'historique
  (`git filter-repo`) si le dépôt est/pas privé.
- Limite connue : derrière un reverse proxy, l'IP anti-spam dépend de la
  dernière entrée `x-forwarded-for` (documentée en commentaire dans
  `app.module.ts`).
- `conditions d'utilisation` : publiées comme section de `/confidentialite`
  (ancre `#conditions`) — un éventuel contrat séparé reste à fournir par le
  juridique.

## 7. Prochaines étapes
1. Sécuriser les `.env` (voir §6).
2. Renseigner `NEXT_PUBLIC_SITE_URL` en production (défaut `https://www.elara.app`).
3. Revue juridique des textes `/confidentialite`.
4. Éventuel page `conditions` autonome + CGU/CGV si exigées.
