# Recette — Transverse (invariants du prompt-cadre)

Ces vérifications s'appliquent **à l'ensemble du périmètre MVP**, pas à un module seul.
Alignées sur les 3 règles du prompt-cadre (tenant_id systématique, API interne
systématique, traitement asynchrone systématique) + les invariants métier (sécurité,
validation humaine, traçabilité).

## Invariants vérifiés

### I. Isolation multi-tenant totale (RLS + tenant_id)
- [ ] Aucun module ne lit/écrit sans `tenant_id` (code + schéma DB).
- [ ] Un compte utilisateur d'un tenant A ne voit jamais les données du tenant B.
  *(Test « tenant croisé » : créer 2 tenants, s'authentifier en A, tenter d'accéder
  à une entité B → 404/403 + aucune fuite.)*

### II. Aucune action sensible sans validation humaine
- [ ] Aucune action sortante à impact financier/client ne passe sans validation explicite.
- [ ] Les actions à faible confiance (scanner) / sans réponse (assistant) sont soumises
      à l'humain et jamais traitées en silencieux.

### III. Traçabilité complète
- [ ] Chaque appel API entrant/sortant est journalisé (interceptor `audit`).
- [ ] Chaque modification d'entité est tracée (`historique_modifications`).
- [ ] Chaque import de document est tracé (`index.csv` + hash SHA-256).

## Statut recette
| Invariant | Méthode | Statut |
|---|---|---|
| RLS / tenant_id systématique | audit SQL + test tenant croisé | migration RLS en place · test croisé [DEMO] |
| Validation humaine invariantes | tests API (integrations/assistant/scanner) | à consolider en CI — [DEMO] |
| Traçabilité | interceptor audit + index.csv + historique | PASS unitaire (MinIO service + Assistant service) |

---

## Empreinte transverse à mesurer en démo
Sur l'environnement de démo, mesurer et committer le résultat dans
`docs/rapport-recette.md` (tableau §recette) :
- délais P95 des 3 healthchecks post-déploiement ;
- temps de rollout complet (`api-nest` + `api-ai` + `web`) depuis la release Octopus ;
- score LLM local (Ollama) sur le jeu anti-hallucination.