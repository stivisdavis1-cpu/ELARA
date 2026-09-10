# AI & OCR API (FastAPI)

- **Rôle :** Backend spécialisé en Intelligence Artificielle et Traitement Documentaire.
- **Couches :** Layer 2 (Document Intelligence - OCR/extraction), Layer 4 (Intelligence - LLM/RAG).
- **Détail :** Ne doit être appelé qu'en interne par l'API NestJS (jamais directement par les clients externes). Traite souvent de manière asynchrone via RabbitMQ.
