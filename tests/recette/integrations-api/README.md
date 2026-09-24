# Recette — Intégrations API

## Critère officiel
> Toute action sortante à impact financier/client bloquée sans validation humaine ;
> chaque appel journalisé.

## Procédure
1. Initier une action sortante (ex. `POST /v1/integrations/virement`, ou envoi facture
   client / déclenchement Swift) sans validation humaine.
   → **Doit être bloqué** : réponse `403`/`409` + état `pending_validation`.
2. Effectuer la validation humaine (via l'endpoint/UI de validation) → **puis** envoi.
3. Vérifier le journal d'audit : 1 entrée *déclenchement* + 1 entrée *validation* +
   1 entrée *exécution* (qui, quand, quelle action) — consultable, horodatée.

## Résultat attendu
- 0 action sortante exécutée sans validation humaine sur le jeu de test.
- 100 % des appels journalisés (traçabilité complète).

## Statut recette
| Vérification | Méthode | Statut |
|---|---|---|
| Blocage sans validation | API + interceptor `audit` | [DEMO] |
| Journalisation complète | audit interceptor (chaque appel) | test automate à créer — [DEMO] |