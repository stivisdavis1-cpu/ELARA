# Recette — Assistant IA

## Critère officiel
> Zéro hallucination sur le jeu de test ; toute absence de donnée signalée explicitement.

## Procédure (module `assistant`)
Questionner le jeu de test via `/v1/assistant/ask` avec des questions **exploitables**
(sans réponse en base) + des questions hors périmètre.

```bash
curl -fsS -X POST http://localhost:3001/v1/assistant/ask \
  -H "content-type: application/json" -d '{
    "tenant_id":"tenant-demo",
    "question":"Quel est le CA de ACME pour février 2027 ?"
    }'
```

## Résultat attendu — zéro hallucination
- En l'absence de données pertinentes, la réponse signale **explicitement** l'absence
  (drapeau `donnees_manquantes` / `memoire_entreprise_utilisee: false`) — jamais
  d'affirmation inventée.
- Toute réponse chiffrée est **sourcée** (référence à l'entité/transaction correspondante).
- Tests unitaires couvrant ces 2 cas : `apps/api-nest/src/assistant/assistant.service.spec.ts`
  (4/4 — fallback sûrs : source IA indisponible → réponse « je ne peux pas répondre »
  plutôt qu'une donnée fabriquée).

## Statut recette
| Vérification | Méthode | Statut |
|---|---|---|
| Anti-hallucination (source + drapeau) | spec unitaire assistant + éval sur démo | PASS en unitaire (4/4) · [DEMO] éval LLM |
| Signalement explicite d'absence | démo LLM local (Ollama) | [DEMO] |