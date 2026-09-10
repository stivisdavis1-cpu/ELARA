# Backend API (NestJS)

- **Rôle :** Backend métier principal
- **Couches :** Layer 3 (Business Memory), Layer 5 (AI Agents), Layer 6 (Action)
- **Détail :** Expose les contrôleurs via l'API versionnée `/v1/*`. Concentre toute la logique d'accès aux données. Seul service à interroger directement par les clients (Web, Mobile).
