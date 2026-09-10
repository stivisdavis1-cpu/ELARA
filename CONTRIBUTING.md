# Contribuer au projet ELARA

## 10 Invariants (Rappels)
1. **Multi-tenant :** `tenant_id` obligatoire partout (RLS).
2. **API-First :** Tout passe par `/v1` de NestJS. Jamais d'accès base direct depuis le front ou l'IA.
3. **Asynchrone :** Tâches longues via RabbitMQ obligatoires.
4. **Human-in-the-loop :** Actions sensibles toujours validées par l'humain.
5. **Grounding strict :** Zéro hallucination, RAG exclusif sur la base client (Business Memory).
6. **Traçabilité :** Audit trail pour tout.
7. **Sécurité :** Chiffrement, pas de secrets en clair, RBAC via Keycloak.
8. **Mobile-First :** Résilient aux pertes de réseau.
9. **Français d'abord :** UI en français par défaut.
10. **SaaS & On-Premise :** Même architecture portable (Docker/Helm).

## Process de développement
- Nommage des branches : `feature/nom`, `fix/nom`, `chore/nom`.
- Messages de commit : Standard Conventional Commits.
- Pull Requests : Validation CI obligatoire + 1 review humaine minimum.
