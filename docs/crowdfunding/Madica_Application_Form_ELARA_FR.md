# Formulaire de Candidature - Madica

**Nom de la Startup :** ELARA  
**Date de candidature :** 02 octobre 2026

---

## SECTION 1 : DÉTAILS DE L'ÉQUIPE FONDATRICE

### Informations du candidat principal

- **Prénom :** Steve
- **Nom :** Saurel
- **Adresse e-mail :** [À renseigner]
- **Rôle dans la venture :** CEO & Co-fondateur
- **URL LinkedIn :** [À renseigner]
- **Nationalité :** Cameroun
- **Ville/Pays de localisation :** Yaoundé, Cameroun
- **Nombre d'autres co-fondateurs :** 0 (à compléter si applicable)
- **Biographie(s) des fondateurs et membres clés de l'équipe exécutive :**

Steve Saurel Moutouo est un entrepreneur et ingénieur technique spécialisé dans l'architecture logicielle, l'IA appliquée et la transformation numérique B2B. Fort d'une expérience dans la conception de plateformes multitenantes à fort trafic et dans l'automatisation de processus métier, il dirige la vision stratégique et technique d'ELARA. Son expertise porte sur les systèmes distribués, la sécurité, l'OCR/IA locale et la modélisation de données financières, avec pour ambition de rendre l'automatisation d'entreprise accessible et souveraine pour les PME africaines.

### Qualification de l'équipe

**Pourquoi votre équipe est-elle unique pour résoudre ce problème ?**

L'équipe ELARA combine une **forte expertise produit/technique (Full-Stack, IA, DevOps, architecture multitenant)** avec une **bonne compréhension du terrain opérationnel africain**. Le fait d'avoir conçu une pile 100 % reproductible (Docker Compose) avec IA locale, isolation multitenant stricte et principe « zéro donnée fictive » démontre une rigueur d'ingénierie rare pour un MVP early-stage. Cette combinaison entre excellence technique, pragmatisme (adaptation à WhatsApp comme canal documentaire) et éthique produit (souveraineté des données) rend l'équipe particulièrement bien positionnée pour résoudre les frictions documentaires/trésorerie des PME CEMAC.

**Quelles compétences ou expertises votre équipe possède-t-elle dans ce domaine que d'autres n'ont pas ?**

- **Maîtrise des contraintes réelles d'Afrique subsaharienne** : conception pensée pour faible connectivité, canaux non-traditionnels (WhatsApp) et spécificités locales (CEMAC : NIU/RCCM).
- **Approche « ingénierie honnête »** : mode dégradé explicite (erreurs franches 503/422, jamais de simulation) — rare dans les solutions IA grand public.
- **Expérience produit « Document → Données → Mémoire d'entreprise »** : au-delà de l'OCR, ELARA normalise directement vers entités métier (clients/factures/dépenses) et alimente les indicateurs CFO en temps réel (différenciant clé vs. outils OCR purs).
- **Souveraineté technique prouvée** : architecture 100 % local/reproductible, IA on-prem possible, sans dépendance critique à des APIs cloud non-maîtrisées.

### Diversité & Leadership

- **Considérez-vous votre équipe de direction comme diversifiée ?** Non (équipe actuelle réduite)
- **Considérez-vous votre venture comme dirigée par des fondateurs africains ?** Oui
- **À quoi ressemble votre table de capitalisation aujourd'hui, comment est répartie la participation entre les fondateurs et qui d'autre figure sur votre cap table ?**

Table de capitalisation actuelle (pré-levée) : 100 % détenue par les fondateurs (Steve Saurel Moutouo). Aucun investisseur, aucun salarié bénéficiant de BSPCE/ESOP n'est encore inscrit à ce jour. La répartition sera précisée à l'étape de closing selon les conditions de la levée envisagée.

- **Qui devrez-vous recruter au cours des 18 prochains mois pour réussir ?**

| Poste | Priorité | Justification |
|---|---|---|
| **Head of Growth / Sales (B2B)** | Haute | Déploiement PoC pilotes (PME), conversion essais→clients, structuration canal partenaires (comptables/cabinets). |
| **Product Designer (UX/UI)** | Haute | Optimiser parcours scan/validation (workflow documentaire), améliorer UX mobile (WhatsApp-first). |
| **AI/ML Engineer (OCR/Extraction)** | Moyenne-Haute | Améliorer précision extraction (factures multiformats CEMAC), affiner règles métier, réduire faux positifs. |
| **Full-Stack Engineer (Integrations)** | Moyenne | Intégrations comptables (API), webhooks, robustesse file RabbitMQ, scaling multi-tenant. |
| **Customer Success / Onboarding** | Moyenne | Accompagnement PME pilotes, documentation, réduction TTV (Time-to-Value). |

---

## SECTION 2 : DÉTAILS DE L'ENTREPRISE

### Informations générales

- **Nom de la venture :** ELARA
- **Date de début de construction de l'entreprise :** [À définir – Q4 2025/Q1 2026]
- **Pays où est basé le siège social de votre venture :** Cameroun
- **Pays dans lesquels votre entreprise opère actuellement :** Cameroun
- **Étape de développement de votre venture :** MVP validé (Pre-Seed / Early Traction Technique)
- **URL du site web :** https://elara.africa (à activer)

### Secteur & Modèle économique

- **Secteur qui décrit le mieux votre venture :** Fintech / SaaS B2B / AI (Gestion Documentaire & Automatisation Financière)
- **Modèle économique :** SaaS B2B (Abonnement par tenant/organisation) – Freemium/Pilotes → Abonnements mensuels/annuels (basés sur volume documents/utilisateurs)

### Problème & Solution

- **Quel problème résolvez-vous, et comment fonctionne le monde aujourd'hui sans votre solution ?**

Les PME africaines traitent encore manuellement factures, relevés, pièces justificatives (e-mails, WhatsApp, scans, papier). Sans automatisation structurée, cette saisie est chronophage, non traçable, source d'erreurs et empêche une vue consolidée temps réel de la trésorerie. Résultat : décisions tardives, recouvrement dégradé (DSO élevé), BFR mal maîtrisé et difficulté à préparer des dossiers de financement dûment traçables.

**En une phrase, décrivez brièvement votre entreprise/solution :**

ELARA transforme les documents reçus (scans, WhatsApp, imports) en données structurées exploitables, les archive de manière immuable, les normalise automatiquement dans une Mémoire d'entreprise multitenant et alimente les indicateurs CFO en temps réel.

- **Comment exploitez-vous la technologie pour résoudre ce problème ? Qu'y a-t-il de unique dans cette technologie ?**

ELARA combine **OCR local (RapidOCR ONNX Runtime)**, **IA d'extraction** et **normalisation métier** dans un pipeline unifié « Document → Données → Mémoire d'entreprise ». L'originalité est de **lier directement l'archivage immuable (preuve) à la création d'entités structurées** (clients/factures/dépenses) sans jamais créer de données fictives. L'architecture est 100 % conteneurisée, multitenante stricte, avec IA exécutable localement (edge/on-prem) — ce qui garantit souveraineté, résilience hors-ligne et coût maîtrisé. Mode dégradé honnête (503 explicite si embeddings indisponibles) constitue un différenciant éthique/technique fort.

### Monétisation & Traction

- **Comment et auprès de qui générez-vous des revenus ?**

Modèle **SaaS B2B par organisation (tenant)** : abonnements mensuels/annuels selon volume de documents traités, nombre d'utilisateurs et fonctionnalités (GED avancée, exports comptables, analytics CFO). Génération de revenus envisagée à l'issue des PoC pilotes (conversion essais payants). Actuellement pré-revenu.

- **Pourquoi cela peut-il être fait avec une rentabilité unitaire positive ?**

Coûts variables maîtrisés (traitement IA optimisé localement, pas facturation API externe systématique). Effet de réseau/volume par client (PME avec fort volume documentaire récurrent). Marge logicielle élevée (SaaS). Focus sur automatisation vs. saisie manuelle (ROI mesurable pour client) facilite adoption + rétention. Architecture conteneurisée permet coûts infra raisonnables par tenant.

- **Votre entreprise génère-t-elle déjà des revenus ?** Non

- **Qu'avez-vous accompli jusqu'à présent ? Dites-nous-en plus sur votre produit, vos revenus et votre traction clients.**

**Réalisations techniques (MVP validé) :**

- **Plateforme fonctionnelle** : Scanner GED, archivage immuable (checksum), Mémoire d'entreprise (clients/fournisseurs/factures/paiements/dépenses), Dashboards CFO, RBAC, Auth Keycloak (OIDC RS256).
- **Architecture production-ready** : 8 services Docker Compose (web/api-nest/api-ai/keycloak/postgres+pgvector/redis/rabbitmq/minio), `healthchecks` + `depends_on: service_healthy`, `restart: unless-stopped`.
- **Pipeline Document→Mémoire opérationnel** : normalisation automatique à la validation/archivage + rafraîchissement temps réel (WebSocket) des KPIs Dashboard.
- **Qualité & sécurité** : TypeScript strict, `tsc --noEmit` 0 erreur (web + api-nest), builds OK. Isolation multitenant stricte (cookie `elara_tenant` source unique), flux reset mot de passe (jeton hashé SHA-256, usage unique, 15 min), audit trail.
- **IA locale & honnêteté** : `/ai/embeddings` → 503 explicite si indisponible (aucune simulation). Aucun vecteur fictif. Garde-fous anti-régression Vitest (tests structurels + anti-régression).
- **Données réelles uniquement** : principe appliqué systématiquement (interdiction données synthétiques présentées comme réelles).
- **Reproductibilité** : Profil 100 % local `docker-compose.local.yml` (Postgres+pgvector local sur 5433).

**Traction** : 0 clients payants (phase technique validée). Préparation PoC pilotes (2–3 PME ciblées Cameroun/CEMAC).

### Go-to-Market & Opportunité

- **Comment ciblez-vous vos clients et à quoi ressemble votre cycle de vente aujourd'hui ?**

Ciblage **Bottom-Up B2B** : PME (commerces, distributeurs, cabinets comptables, agences, import-export) au Cameroun/CEMAC avec fort volume documentaire récurrent (factures/relevés). **Canal d'adoption pragmatique** : WhatsApp (point d'entrée naturel pour documents) → onboarding Scanner/Web. Stratégie initiale **Land & Expand** via PoC pilotes (gratuit/à durée limitée) pour valider cas d'usage réels, convertir en abonnements + lever effet réseau (recommandations/comptables). Cycle vente court prévu (PME) vs. entreprise.

- **Quelle est l'ampleur de l'opportunité ? Veuillez nous parler du marché total adressable et nous aider à comprendre l'échelle de cette opportunité.**

**Marché Total Adressable (TAM)** estimé sur PME CEMAC + marché francophone subsaharien (Afrique de l'Ouest/Centrale). Les PME représentent >90% tissu économique SSA, avec besoin croissant d'automatisation/comptabilité numérique. Marché GED/OCR + Fintech B2B pour PME est sous-desservi (solutions adaptées contexte local, souveraineté, connectivité). Opportunité régionale (CEMAC d'abord) extensible vers UEMOA/CEEAC. Échelle significative à moyen/long terme (marché adressable multi-milliards USD segment SMB SaaS Afrique).

- **Comment atteignez-vous 1M$ de ARR ou 10M$ de revenus totaux ? Veuillez nous aider à comprendre votre feuille de route de croissance pour construire une entreprise à 1M$ ARR.**

**Feuille de route croissance (path to $1M ARR)** :

1. **Phase 0–6 mois (Validation)** : 3–5 PoC pilotes payants/convertis (Cameroun). Focus rétention + cas d'usage « factures→balance âgée/trésorerie » (painkiller CFO).
2. **Phase 6–12 mois (Traction)** : 20–40 clients PME + 1–2 partenariats (cabinets comptables/réseaux). Expansion douce CEMAC (Gabon/Tchad/RCA). Monétisation volume + upsell fonctionnalités.
3. **Phase 12–18 mois (Scale)** : 100–250 clients → viser ~$500k–$1M ARR (ARPA raisonnable PME SSA). Canaux : références pilotes, partenaires comptables, SEO/content + intégrations. Focus **gross margin SaaS élevé**, LTV/CAC sain.

Croissance organique + partenariale (plutôt que CAC massivement élevé). WhatsApp-first réduit friction acquisition.

- **Quelles sont vos 3 principales priorités commerciales au cours des 18 prochains mois pour débloquer ce niveau de croissance ?**

1. **Valider & convertir PoC pilotes (Product-Market Fit)** – Sécuriser 3–5 PME pilotes réelles, mesurer TTV, taux d'activation, rétention 30–90j, taux conversion essai→payant.
2. **Développer canal Partenaires (Comptables/Cabinets)** – Déployer stratégie « ELARA pour cabinets » (accélérateur adoption B2B2B), clé pour pénétration CEMAC (confiance locale).
3. **Industrialiser Onboarding + Intégrations** – Automatiser import WhatsApp/scans, enrichir mapping exports comptables, fiabiliser extraction (OCR) pour réduire temps onboarding < 1h/client.

- **Quelle est votre vision à long terme pour cette venture et à quoi ressemble le monde dans le futur avec votre solution à grande échelle ?**

Vision : **Devenir la couche de « Mémoire d'entreprise + GED intelligent » souveraine de référence pour les PME africaines**. À grande échelle, ELARA devient l'infrastructure de structuration documentaire/trésorerie (data layer) permettant aux PME d'accéder plus facilement au crédit (dossiers traçables, preuves immuables, KPIs financiers fiables), réduisant la fracture numérique/comptable. Monde futur : des millions de PME africaines transforment automatiquement leurs flux documentaires en données décisionnelles exploitables, en temps réel, **sans sacrifier leur souveraineté numérique**.

- **Pourquoi cette solution n'a-t-elle pas fonctionné/été faite par le passé ? Pourquoi va-t-elle fonctionner maintenant ou pourquoi est-ce le bon moment pour la déployer à grande échelle ?**

**Pourquoi pas avant :** solutions GED/OCR globales conçues pour marchés matures (cloud-first, coûts API élevés, peu adaptées canaux locaux WhatsApp, spécificités CEMAC, problématique souveraineté). ERP/comptables lourds/coûteux pour micro/PME. IA souvent livrée avec données synthétiques/black-box peu adaptées exigences « preuve » africaine.

**Pourquoi maintenant :**

- **Maturité IA locale (ONNX)** permet OCR précis hors-ligne/coûts maîtrisés (edge-first).
- **Demande souveraineté numérique** croissante (Afrique numérique, préférence solutions locales/continentales).
- **Explosion documents numériques/messageries (WhatsApp)** devenu outil business non structuré.
- **Pression trésorerie PME post-COVID + besoin financement** (nécessite dossiers traçables, KPIs fiables).
- **Digital Africa/Fuzé/Madica** + écosystème VC tech africain renforcé (timing favorable).
- **Pragmatisme produit** (Docker reproductible, local-first) répond enfin contraintes terrain réelles.

### Concurrents & Avantage Concurrentiel

- **Qui sont vos 3 principaux concurrents ?**

| Concurrent | Remarques |
|---|---|
| **Dext / Receipt Bank (Dext)** | Fort en automatisation factures (UK/Europe), cloud-first, prix peu adaptés PME SSA, pas optimisé WhatsApp/CEMAC, souveraineté non prioritaire. |
| **Rossum / Klippa** | Excellente extraction IA, orienté entreprise/IDP, coût API élevé, nécessite connectivité, peu adapté bottom-up PME africaines. |
| **Wave (Sendwave/SMB Accounting)** | Fort ancrage Afrique/US, focus comptabilité paiements, moins fort sur GED archivage immuable + pipeline Document→Mémoire unifié + IA locale on-prem. |

- **Quel est votre avantage injuste (unfair advantage) ?**

**Avantage injuste composite :**

1. **Local-first + Souveraineté prouvée** (Docker 100% reproductible, IA on-prem, isolation multitenant stricte) — positionnement difficilement réplicable par acteurs cloud-only.
2. **« Document → Données → Mémoire d'entreprise » intégré** (vs. OCR seul) : crée valeur décisionnelle CFO immédiate (trésorerie/BFR/balance âgée) — lock-in usage (données structurées métier).
3. **WhatsApp-first + contexte CEMAC (NIU/RCCM)** : adapté flux documentaire réel africain (moat produit/adoption).
4. **Principe « Données réelles uniquement » + erreurs franches** (trust moat) : crédibilité technique/compliance, différenciant face clients exigeants + investisseurs.
5. **Architecture honnête (mode dégradé explicite)** + fondations sécurité/audit solides (Keycloak/JWKS, isolation, checksum immutabilité) — barrière d'entrée technique non négligeable.

### Uploads & Liens

- **Upload Deck :** `ELARA_PitchDeck_DA_SeedFund.pdf` *(À uploader)*
- **Liens vers démo ou autres documents pertinents :** [À renseigner] (peut inclure captures UI, lien démo staging, `DOSSIER_DE_CONCEPTION_ELARA.md` si demandé)

---

## SECTION 3 : LEVÉE DE FONDS

### Historique & Besoins

- **Votre venture a-t-elle déjà levé des fonds externes à ce jour ?** Non

- **Combien envisagez-vous de lever, et quel type de financement espérez-vous obtenir ?**

**Montant visé :** 50 000 € – 100 000 €  
**Type de financement :** Pre-Seed (équité + programme d'investissement structuré Madica). Préférence pour investissement structuré (accompagnement + capital) aligné phase MVP→PoC.

- **Combien de mois de trésorerie ce montant vous permettra-t-il d'assurer ?** 12 – 18 mois

- **Combien d'engagements avez-vous reçus à ce jour, et combien reste-t-il à clôturer dans ce tour aujourd'hui ?**

0 engagement reçu à ce jour. Reste à clôturer : 100 % du tour visé.

- **Sur quelles conditions envisagez-vous de lever votre tour actuel ? Êtes-vous flexible ou ces conditions sont-elles fixes ?**

Conditions flexibles, ouvertes à structure standard Pre-Seed proposée par Madica (lead/terms alignés programme structuré). Priorité : **accompagnement stratégique + réseau** plutôt que conditions uniquement financières.

- **Quelle est l'utilisation prévue des fonds et quels jalons ce tour de financement vous permettra-t-il d'atteindre ?**

| Utilisation des fonds | % estimé | Détails | Jalons associés |
|---|---|---|---|
| **Développement produit (UX, intégrations WhatsApp/e-mail, tests E2E Playwright)** | 35% | Finalisation parcours validation, robustesse extraction, qualité E2E | MVP stabilisé + parcours onboarding < 15 min |
| **PoC pilotes & Go-to-Market** | 30% | Acquérir/convertir 3–5 PME pilotes (onboarding, support, success), cas d'usage réels | 3–5 pilotes actifs + taux conversion cible défini + 1–2 références |
| **Déploiement/Infra + Monitoring** | 20% | Hébergement souverain préprod/prod, sauvegardes, observabilité, sécurité hardening | Environnements stables, monitoring + procédures sauvegarde |
| **Légal, incorporation, branding, conformité** | 10% | Incorporation société (Cameroun), K-bis/statuts, pitch deck, identité, IP basique | Structure juridique formalisée |
| **Frais divers/admin (buffer)** | 5% | Imprévus | Buffer de sécurité |

**Jalons clés atteignables avec ce tour (18 mois)** : 3–5 pilotes convertis payants, 20–40 clients PME, 1–2 partenariats cabinets comptables, rétention 90j > 70%, première traction revenus + métriques d'activation validées.

- **Quel est votre taux de brûlure mensuel actuel ?** $0 – $500 USD/mois (phase MVP, infra dev principalement locale + coûts minimes)

- **Veuillez télécharger un modèle financier détaillé montrant les revenus historiques, les facteurs/drivers de revenus futurs et l'utilisation proposée des fonds si vous en avez un.**

*[À uploader si disponible]* (peut être complété ultérieurement si non finalisé)

---

## SECTION 4 : INFORMATIONS COMPLÉMENTAIRES

- **Avez-vous des références à lister ? Veuillez inclure leur nom, organisation et coordonnées.**

Aucune référence formelle à lister pour le moment.

- **Veuillez télécharger tout document supplémentaire que vous souhaitez partager ici.**

Documents disponibles : `DOSSIER_DE_CONCEPTION_ELARA.md`, Schéma d'architecture, Captures d'écran UI, `DA_SeedFund_Candidature_ELARA_FR.md` *(à joindre selon opportunité)*

- **Autre que le capital, comment un investisseur comme Madica peut-il vous aider à accélérer votre parcours ?**

Madica peut accélérer ELARA via :

1. **Mentorat stratégique & Go-to-Market** – Accès à mentors expérimentés B2B SaaS/Afrique, affiner positioning, pricing, sales motion PME.
2. **Réseau & Partenariats** – Connexions clients pilotes (PME), cabinets comptables, écosystème fintech africain, partenaires stratégiques CEMAC/UEMOA.
3. **Structuration & Bonnes pratiques** – Gouvernance, métriques SaaS (ARR, CAC/LTV, gross retention), préparation scale, discipline financière.
4. **Visibilité & Crédibilité** – Légitimation programme Madica renforce confiance partenaires/pilotes (Cameroun + régional).
5. **Opérations & Talent** – Aide recrutement clés (Growth/CS), partage templates, intros investisseurs futurs si extension tour.

- **Pourquoi pensez-vous que Madica est un bon fit pour votre venture, pourquoi voulez-vous rejoindre le programme maintenant et comment pouvons-nous exactement vous aider à réussir et à développer votre entreprise ?**

ELARA est parfaitement aligné avec la **mission Madica** (investir dans startups africaines à fort potentiel, structurées, prêtes à scaler). Points de fit :

- **Fondée par Africain, marché africain prioritaire** (Cameroun/CEMAC) + problème adressant frictions réelles PME.
- **MVP technique solide, prêt à passer PoC→traction** (bon timing « now ») — besoin passage validation marché + structuration GTM.
- **Focus impact + viabilité commerciale** (automatisation financière souveraine, inclusion numérique, renforcement résilience PME).
- **Alignement valeurs** : rigueur (zéro donnée fictive), souveraineté, pragmatisme terrain.
- **Madica idéal** pour structurer croissance early-stage (B2B SaaS), donner crédibilité, réseau partenaires régionaux + accompagnement opérationnel pour franchir cap pilot→premiers clients payants.

Rejoindre Madica maintenant permet de **convertir capital technique (MVP) en traction commerciale structurée** avec accompagnement méthodique, réduisant risque early-stage.

- **Les fondateurs des startups sélectionnées devront s'engager à consacrer 10–20 heures par mois au programme (avec déplacements occasionnels) pendant au moins 18 mois. Êtes-vous disposé/able à vous engager à cela ?** Oui

- **Comment avez-vous entendu parler de nous ?**

**Event** / **Madica Newsletters** / **Incubator/Accelerator/Hub Referral** (à préciser selon origine exacte)

- **Inscription à la mailing list ?** Oui

---

**Candidat :** Steve Saurel Moutouo  
**Startup :** ELARA  
**Email :** [À renseigner]  
**LinkedIn :** [À renseigner]  
**Localisation :** Yaoundé, Cameroun