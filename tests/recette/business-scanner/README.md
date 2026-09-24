# Recette — Business Scanner (Module OCR/Classification)

## Critère officiel
> Classification + extraction correctes ≥ 90 % des cas testés ; documents sous le seuil de
> confiance systématiquement soumis à validation.

## Métrique
- **Taux de classification correcte** (`nb_correctes / nb_teste * 100`) ≥ 90 %
- **Taux d'extraction correcte** (champs structurés exacts) ≥ 90 %
- **Ratio documents < seuil de confiance** routés vers validation humaine = **100 %**

## Jeu de test
- 20 documents fictifs « commerce/distribution » (factures, bons de livraison,
  relevés bancaires) — fixtures dans `apps/api-ai/test/data/` et `test/data/`.
- 2 documents délibérément flous/illisibles (seuil de confiance non atteint).

## Procédure
```bash
# OCR + classification via api-ai
curl -fsS -X POST http://localhost:8000/v1/scanner/classify \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test/data/05-versions-space.pdf" \
  -F "tenant_id=tenant-demo"
```

## Résultat attendu
- ≥ 18/20 documents : classification exacte.
- ≥ 18/20 documents : extraction (montant, date, fournisseur, devise) exacte.
- 2/2 documents flous : `confidence < seuil` et **explicitement** signalés
  (`requires_human_validation: true`) — jamais traités en silencieux.

## Critère transverse (scanner)
- **Déduplication par empreinte** : ré-import d'un document déjà scanné → reconnu comme
  doublon via `index.csv` / hash MinIO (cf. `minio.service.spec.ts`, tests couverts en CI).

## Statut recette
| Vérification | Méthode | Statut |
|---|---|---|
| Stockage + traçabilité (hash, `index.csv`) | `minio.service.spec.ts` (CI) | PASS (5/5) |
| OCR / classification ≥ 90 % | environnement démo live (LLM local) | **[DEMO]** |
| Routing < seuil de confiance | environnement démo live | **[DEMO]** |