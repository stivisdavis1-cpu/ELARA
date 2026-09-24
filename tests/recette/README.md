# /tests/recette — Suite de recette ELARA

Ce dossier contient la **suite de recette MVP** : un scénario par module, correspondant
**exactement** aux 6 critères d'acceptation officiels du cahier des charges (§9), plus un
jeu de scénarios transverses (invariants du prompt-cadre).

## Exécution

Chaque scénario est exécutable **en CI GitHub Actions** avant toute création de release
Octopus vers `staging`/`production` (cf. `.github/workflows/ci.yml`, workflow `recette`).

```bash
# Depuis la racine du dépôt
# 1. Tests automatisés (code) — covers Scanner (stockage) + Assistant (service)
cd apps/api-nest && npm test

# 2. Lint + build (rien ne part en prod s'il ne compile pas)
cd apps/api-nest && npm run lint && npm run build
```

Les scénarios marqués **[DEMO]** nécessitent l'environnement de démonstration public
(LLM, RLS PostgreSQL actif, Keycloak) : ils sont mesurés manuellement et consignés dans
`docs/rapport-recette.md`.

## Contenu

| Dossier | Critère officiel couvert |
|---|---|
| `business-scanner/` | Classification + extraction ≥ 90 % ; seuil de confiance |
| `memoire-entreprise/` | Zéro doublon d'entité ; historique de modification |
| `cfo-ia/` | Indicateurs financiers exacts vs transactions |
| `rapport-ia/` | Rapport auto à la fréquence paramétrée, données à date |
| `assistant-ia/` | Zéro hallucination ; absence de donnée signalée |
| `integrations-api/` | Action sortante bloquée sans validation humaine ; journalisation |
| `transverse/` | Isolation multi-tenant ; invariants du prompt-cadre |

## Règles

- Un scénario = un fichier `README.md` (contexte + procédure + métrique attendue) +
  éventuellement un script/requête d'exécution versionné.
- Le verdict final (PASS/FAIL + métrique mesurée) est reporté dans
  `docs/rapport-recette.md` — **jamais** déduit à l'aveugle : mesuré sur l'environnement
  correspondant (CI pour le code, démo pour les modules IA/métier).