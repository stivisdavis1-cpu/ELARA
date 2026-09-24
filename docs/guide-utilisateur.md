# Guide utilisateur — ELARA

> Aide de prise en main des modules MVP. Complément humain des docs techniques
> (`docs/api.md`, `docs/deploiement.md`, `docs/securite.md`).

---

## 1. Connexion

1. Ouvrir l'URL de l'environnement :
   - **Dev / démo** : `https://elara-app.local` (ou l'URL indiquée par un admin).
   - **SaaS production** : `https://elara.app`.
2. Se connecter via le SSO **Keycloak** (« Se connecter »). Un compte Elara est créé
   par un administrateur (ne pas s'auto-inscrire sur l'environnement de démo sans accord).
3. Une fois connecté, l'espace de travail est **scopé à votre ténant** (banque/client).
   Vous ne voyez que les données de votre ténant.

---

## 2. Modules quotidiens

### Business Scanner
- Glissez/déposez des documents (factures, bons de livraison, relevés) dans la zone
  d'import, ou utilisez l'API (`POST /v1/scanner/scan`).
- La classification + extraction se font automatiquement. Les documents sous le **seuil
  de confiance** sont marqués « à valider » : ouvrez-les et corrigez si besoin.
- Pour revoir un document : menu **Scanner → Historique** (chaque import est tracé).

### Mémoire Entreprise
- Recherchez une entité (client, fournisseur, produit) dans **Mémoire → Recherche**.
- En cas de doublon, utilisez « Fusionner » (l'historique de modification reste
  consultable).

### CFO IA
- Accédez aux indicateurs financiers dans **CFO → Tableau de bord** : chiffre d'affaires,
  charges, marge, trésorerie, périodicité configurable.
- Les montants affichés sont **exacts au centime** par rapport aux transactions
  enregistrées sur la période.

### Rapport IA
- Dans **Rapports → Générer**, lancez la génération immédiate ou paramétrez une fréquence
  automatique (ex. tous les lundis 06:00).
- Le rapport généré reflète les données **réellement présentes à la date de génération**.

### Assistant IA
- Posez une question en langage naturel dans l'onglet **Assistant**.
- L'assistant répond **uniquement à partir des données ELARA** ; si une information est
  absente, il le signale explicitement (pas d'invention).

### Intégrations API (actions sortantes)
- Toute action à impact financier/client (virement, envoi facture, API tierce) exige une
  **validation humaine** : elle apparaît dans **Intégrations → Validations** et reste
  **à l'état bloqué** tant qu'un humain ne l'a pas validée.
- Chaque appel est journalisé (qui, quand, quelle action) — consultable dans
  **Intégrations → Journal**.

---

## 3. Déclaration d'un problème

| Symptôme | Action |
|---|---|
| Document mal classé / extraction faible | Envoyer les valeurs réelles dans **Scanner → Historique** (bouton « Signaler ») |
| Donnée inexistante inventée | Noter la question + réponse, signaler dans **Assistant → Signaler** |
| Indicateur incohérent | Vérifier les transactions de la période ; sinon ouvrir un ticket avec la période |
| Impossible de se connecter | Contacter l'administrateur ELARA (pas d'auto-récupération visible) |

---

## 4. Disponibilité & support

- SLA : voir `docs/deploiement.md` (environnements affichés selon le contrat).
- En situation de **dégradation IA** (OCR/Ollama indisponible), le système bascule sur des
  réponses sûres : documents marqués « à valider », assistant répondant « données
  indisponibles » — **jamais d'hallucination**.