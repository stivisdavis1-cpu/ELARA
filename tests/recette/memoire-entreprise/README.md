# Recette — Mémoire Entreprise

## Critère officiel
> Aucune duplication d'entité constatée ; historique de modification consultable pour toute entité.

## Métriques
- **Taux de doublons d'entité constatés** = **0** (sur l'ensemble du jeu de recette).
- **Taux d'entités disposant d'un historique de modification consultable** = **100 %**.

## Procédure (API Nest — module `memoire`)
```bash
# 1. Réessai d'une même création (le nom est déjà connu → pas de doublon)
curl -fsS -X POST http://localhost:3001/v1/memoire/entites \
  -H "content-type: application/json" -d '{
    "tenant_id":"tenant-demo","type":"client","nom":"Bouygues Telecom"}'
# → id **identique** au premier enregistrement (réutilisé, pas dupliqué)

# 2. Historique de modification
curl -fsS http://localhost:3001/v1/memoire/entites/<id>/historique \
  -H "x-tenant-id: tenant-demo"
# → 1 ligne minimum (création) ; chaque édition ajoute une ligne (who/when/what)
```

## Résultat attendu
- Création répétée → **même identifiant** (aucune création orpheline).
- `historique_modifications` : une entrée par création + par modification, horodatée
  et avec l'utilisateur Octopus/K8s responsable (traçabilité).
- RLS : une requête cross-tenant ne retourne **jamais** les entités d'un autre tenant.

## Statut recette
| Vérification | Méthode | Statut |
|---|---|---|
| Déduplication à la création | test automatisé `memoire` (CI) | [DEMO] sur cluster RLS |
| Historique consultable | API `historique_modifications` | [DEMO] |
| Isolation cross-tenant | requêtes RLS (PG) | [DEMO] |