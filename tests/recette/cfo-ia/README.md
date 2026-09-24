# Recette — CFO IA

## Critère officiel
> Indicateurs financiers exacts par rapport aux transactions enregistrées sur la période
> (au centime près).

## Procédure (module `cfo`)
1. Charger un jeu de transactions de référence (factures + paiements) dans la période
   `T` (via `infra/db/migrations` + fixtures de démo `tests/recette/data/transactions-*.csv`).
2. Interroger les indicateurs :
```bash
curl -fsS "http://localhost:3001/v1/cfo/indicateurs?debut=2026-01-01&fin=2026-01-31&tenant_id=tenant-demo" \
  -H "x-tenant-id: tenant-demo"
```
3. Comparer **chaque** ligne au total calculé **par SQL indépendant** sur la même période
   (`SELECT SUM(...) ... WHERE date BETWEEN ... AND ... GROUP BY categorie`).

## Résultat attendu
- Différence CA / charges / marge vs SQL indépendant : **0,00 €** sur chaque poste.
- RLS : les transactions d'un autre tenant sont invisibles (périmètre = tenant demandé).

## Statut recette
| Vérification | Méthode | Statut |
|---|---|---|
| Exactitude au centime (CA/marge/poste) | comparaison SQL indépendant | [DEMO] |
| Périmètre multi-tenant | RLS | [DEMO] |