# Document de Candidature - DA SeedFund (Digital Africa / Fuzé)

**Nom de la startup :** ELARA  
**Pays d'implantation :** Cameroun  
**Pays d'opération :** Cameroun, Afrique Centrale (CEMAC)  
**Secteur d'activité :** IA, Fintech, Gestion d'entreprise / SaaS B2B  
**Statut juridique :** En cours d'incorporation (prévision : société camerounaise)  
**Date de création :** À définir  
**Site web :** https://elara.africa (à valider/activer)  
**Date de candidature :** 02 octobre 2026

## 1. Description du projet (Startup description)

**ELARA** est une plateforme intelligente de gestion documentaire, d'OCR et d'automatisation financière, pensée pour les PME africaines.

ELARA permet de transformer des documents physiques ou numériques (factures, relevés bancaires, bons de commande, notes de frais...) en données structurées exploitables, afin d'alimenter automatiquement la trésorerie, le CRM/comptabilité et la mémoire d'entreprise d'une organisation.

L'objectif est de **démocratiser l'automatisation financière et la GED intelligente** pour les PME subsahariennes, en leur donnant accès à un outil de niveau entreprise, 100 % local, souverain et abordable.

## 2. Problème adressé (The problem you are addressing)

Les PME africaines font face à plusieurs freins structurels :

- **Saisie manuelle chronophage** : traitement récurrent de factures, relevés, pièces justificatives (heures/jour perdues).
- **Perte et manque de traçabilité** : documents éparpillés (WhatsApp, e-mails, scans, dossiers physiques), sans historique fiable ni preuve immuable.
- **Visibilité financière dégradée** : retard dans la consolidation des encaissements/décaissements → trésorerie floue, BFR mal maîtrisé.
- **Coûts d'intégration élevés** : solutions ERP/comptables internationales peu adaptées au contexte CEMAC (NIU/RCCM, spécificités fiscales, faible connectivité).
- **Dépendance aux services tiers cloud** : données sensibles hébergées hors du continent, avec risques de souveraineté et de coût récurrent.
- **Friche de données non exploitée** : des milliers de documents transitent chaque mois mais ne sont jamais structurés pour générer des indicateurs décisionnels.

**Résultat** : décisions tardives, recouvrement difficile, risque accru de fraude/pertes et difficulté à accéder au financement (dossiers non traçables).

## 3. Solution innovante (What makes your solution innovative?)

ELARA apporte une approche **hybride IA + GED + Mémoire d'entreprise**, axée sur la **souveraineté des données** et le **mode offline-friendly**.

**Innovations clés :**

1. **Pipeline « Document → Données → Mémoire d'entreprise » unifié**  
   Contrairement aux outils OCR seuls (conversion PDF→texte), ELARA normalise automatiquement les données extraites vers une **Mémoire d'Entreprise multitenant** (clients, fournisseurs, factures, paiements, dépenses). L'archivage (preuve immuable) alimente directement les KPIs financiers (trésorerie, BFR, balance âgée, runway).

2. **Archival immuable + traçabilité complète (Audit)**  
   Tout document validé/archivé est copié dans un espace immuable (MinIO) avec checksum (SHA). Journal d'audit traçable par tenant. Conforme aux exigences de preuve et d'archivage à valeur probatoire.

3. **IA locale (on-prem/edge)**  
   API IA conteneurisée (FastAPI) avec OCR local (RapidOCR ONNX Runtime). Mode dégradé honnête : si aucun fournisseur d'embeddings n'est disponible → **retour explicite 503 (aucune simulation)**, bascule sur recherche lexicale. Aucun vecteur fictif n'est généré (respect strict de la règle « zéro donnée synthétique présentée comme réelle »).

4. **Multitenant natif + isolation stricte**  
   Tenant exclusivement déterminé par cookie serveur `elara_tenant`. Intercepteur NestJS impose isolation stricte (refus si tenant absent/invalide). Authentification Keycloak (OIDC RS256 + JWKS). RBAC granulaire.

5. **Workflow d'intégration pragmatique (WhatsApp, e-mails, scans)**  
   Conçu pour le mode de travail africain (documents reçus via WhatsApp, messageries). À chaque import (scanner, intégration tiers), le document passe par file d'analyse, validation puis **archivage + normalisation automatique vers la Mémoire** → les dashboards/CFO se mettent à jour **en temps réel (WebSocket)** sans rechargement manuel.

6. **100 % reproductible (Docker Compose)**  
   Stack complète conteneurisée (8 services) : `web` (Next.js), `api-nest` (NestJS), `api-ai` (FastAPI), `keycloak`, `postgres/pgvector`, `redis`, `rabbitmq`, `minio`. Profil local 100 % (`docker-compose.local.yml`) permet de fonctionner sans dépendre d'un cloud distant (souveraineté + résilience hors-ligne).

7. **Données réelles uniquement (principe de non-fiction)**  
   Interdiction stricte de données/fictions présentées comme réelles. En cas d'indisponibilité : erreur franche (503/422), jamais de simulation plausible. Garde-fous anti-régression intégrés (tests Vitest).

## 4. Équipe fondatrice (Founder)

- **Prénom :** Steve  
- **Nom :** Saurel  
- **Nationalité :** Cameroun  
- **Genre :** Homme  
- **LinkedIn :** [Lien à compléter]  
- **Co-fondateurs :** [À ajouter]

## 5. Revenus & traction (Revenue & Engagement)

- **Génère-t-on des revenus actuellement ?** Non (pré-revenu / MVP validé techniquement)
- **Revenu sur les 6 derniers mois (€) :** 0 €
- **Customer Engagement Score :** 0 (phase pré-commerciale)

## 6. Statut actuel du projet (Current status)

**Phase : MVP technique validé – Prêt pour PoC pilote**

- **Produit** : Plateforme ELARA fonctionnelle (Scanner GED, Archivage immuable, Mémoire d'entreprise, Dashboards CFO, Auth/RBAC, IA locale). Builds TypeScript 0 erreur (web + api-nest). Conteneurisation validée (8 services healthy).
- **Architecture** : Docker Compose 100 % local/reproductible, multitenant strict, isolation par tenant, audit trail.
- **Données & intégration** : Pipeline Document→Mémoire opérationnel (normalisation automatique à l'archivage). Rafraîchissement temps réel (WebSocket) validé sur dashboards.
- **Sécurité** : Keycloak OIDC, JWKS, tokens hashés (reset mot de passe), validation stricte DTO, isolation tenant.
- **Qualité** : Tests de garde-fous (anti-régression) ajoutés (Vitest). Codebase sans données fictives, erreurs franches en cas d'indisponibilité.
- **Marché** : Ciblage initial PME (commerces, cabinets, distributeurs, agences) au Cameroun/CEMAC. Besoin validé (saisie manuelle, WhatsApp comme canal documentaire, visibilité trésorerie).
- **Partenaires** : À identifier (comptables, incubateurs, partenaires tech locaux).
- **Prochaine étape** : PoC avec 2–3 PME pilotes pour valider cas d'usage réels (factures/rapprochements) + collecte feedback UX.

## 7. Pitch vidéo (YouTube)

**Lien YouTube (vidéo pitch FR/EN – Unlisted/Public) :**  
[À insérer – Lien vidéo pitch ELARA]

## 8. Récompenses, prix, labels, articles (Awards)

**À renseigner** (aucune pour le moment – MVP technique)

## 9. Levées de fonds (Funds raised or committed)

- **Avez-vous déjà levé ou reçu des engagements de fonds ?** Non
- **Détails** : 0 €

## 10. Documents à joindre (Uploads)

- **Pitch Deck** : `ELARA_PitchDeck_DA_SeedFund.pdf` *(à uploader)*
- **K-bis / justificatif d'incorporation** : *(à uploader dès obtention – statut « en cours d'incorporation »)*
- **Autres fichiers** : Dossier technique (`DOSSIER_DE_CONCEPTION_ELARA.md`), Schéma d'architecture, Captures UI (à joindre si souhaité)

## 11. Comment avez-vous connu Fuzé ? (How did you know Fuzé?)

Réseau Digital Africa / Fuzé, via appels à candidatures DA SeedFund.

## 12. Diversité (Diversity)

**L'équipe fondatrice inclut-elle une personne issue d'un contexte de réfugié ou de déplacé ?** Non

## 13. Positionnement stratégique & Impact

- **Souveraineté numérique** : pile 100 % local/reproductible, évite verrouillage cloud, préserve souveraineté des données africaines.
- **Impact opérationnel** : gain de temps estimé 10–20h/semaine/PME sur traitement documentaire, réduction erreurs de saisie, amélioration DSO (recouvrement) via visibilité balance âgée.
- **Impact économique** : renforce résilience financière PME, facilite préparation dossiers financement (traçabilité/preuves).
- **Alignement Digital Africa** : répond aux priorités « Digital for Development », inclusion numérique, renforcement écosystèmes tech africains, solutions adaptées au contexte local.

## 14. Argument de vente (Elevator pitch)

> **ELARA transforme des documents (factures, relevés, pièces) reçus via scans/WhatsApp en données structurées exploitables, les archive de façon immuable, les alimente automatiquement dans une Mémoire d'entreprise multitenant et rafraîchit les indicateurs CFO en temps réel.**  
> L'objectif : donner aux PME africaines une GED + IA + CFO léger, souverain, honnête (zéro donnée fictive) et abordable, fonctionnant même en contexte de connectivité partielle.

## 15. Besoins pour la levée (Use of funds – prévision)

*(à affiner selon montant DA SeedFund)*

| Poste | Estimation (EUR/USD) | Détail |
|---|---|---|
| Développement produit (UX, intégrations WhatsApp/e-mail, tests E2E Playwright) | ~30–40% | Finalisation PoC pilotes, robustesse |
| Déploiement/infra + hébergement souverain (préprod/prod) | ~20–25% | Stacks conteneurisées, monitoring, sauvegardes |
| Commercialisation & PoC pilotes (PME 2–3) | ~20–25% | Acquisition pilotes, onboarding, feedback, cas d'usage réels |
| Légal/incorporation, conformité, branding | ~10–15% | K-bis, statuts, pitch deck/design, protection IP |
| **Total indicatif** | **~50k–100k €** | Échelle raisonnée, focus validation marché |

## 16. Points forts pour candidature

- **Produit techniquement abouti (MVP solide)** : code production-ready, builds propres, Docker reproductible.
- **Principe éthique fort** : « données réelles uniquement », erreurs franches (pas de simulation) – différenciant crédible face à investisseurs/partenaires.
- **Problème marché réel + canal d'adoption (WhatsApp)** : adapté au contexte opérationnel africain.
- **Souveraineté & résilience** : 100 % local possible, IA locale, multitenant strict.
- **Architecture modulaire/scalable** (NestJS + Next.js + FastAPI) + fondations solides (audit, RBAC, isolation).
- **Focus B2B PME + CFO** : monétisation claire (SaaS par tenant/abonnements) alignée avec besoin visibilité trésorerie.

---

**Signature/Candidat :** Steve Saurel Moutouo  
**Startup :** ELARA  
**Contact :** [email/téléphone à renseigner]  
**Pays :** Cameroun