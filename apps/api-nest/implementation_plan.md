# Traitement Lourd de PDF Scannés - Architecture Enterprise & Scalable

Ce document décrit l'architecture hautement scalable (conçue pour supporter des pics de charge et des milliers d'utilisateurs) pour traiter des PDF scannés très volumineux (jusqu'à 300 pages).

> [!IMPORTANT]
> Pour garantir la scalabilité et éviter que le traitement OCR de gros documents ne fasse crasher l'API principale (OOM - Out of Memory), l'architecture repose sur un découplage total via un Message Broker (RabbitMQ/Redis) et un stockage Cloud-Native (MinIO).

## 1. Architecture Scalable (Enterprise-Grade)

### A. Découplage par Message Broker (RabbitMQ / BullMQ)
- **File d'attente (Queue)** : Lorsqu'un utilisateur uploade un PDF scanné, l'API NestJS stocke immédiatement le fichier brut sur **MinIO (S3)**, crée une entrée en base de données avec le statut `En file d'attente`, et publie un message (Job) dans RabbitMQ (ou BullMQ avec Redis). L'API répond au frontend en quelques millisecondes.
- **Worker Indépendant (Scaling Horizontal)** : Un pool de "Workers OCR" (idéalement un microservice Python dédié, ou un processus Node séparé) écoute la file d'attente. Si la charge augmente, on peut lancer 10, 50 ou 100 instances de ce Worker OCR sur plusieurs serveurs sans impacter l'API NestJS.

### B. Traitement OCR Distribué (Phase 1)
- **Streaming & Chunking des pages** : Le Worker télécharge le fichier depuis MinIO. Si le PDF fait 300 pages, le script divise le PDF en lots (ex: 10 pages par lot) pour optimiser la consommation de RAM.
- **Génération du "PDF Normal"** : `ocrmypdf` (ou `PyMuPDF` + `pytesseract` optimisé) traite chaque lot pour générer un texte précis et un calque invisible (Searchable PDF). Les PDF résultants sont fusionnés et le fichier final est uploadé sur MinIO.

### C. Hachage Sémantique & Stockage Vectoriel (Phase 2)
- **Vectorisation (Embeddings)** : Pour une recherche "intelligente" et ultra-scalable, le texte extrait est haché en segments (chunks). Chaque chunk est envoyé à un modèle d'embedding (Ollama local ou API) pour générer un vecteur mathématique.
- **Stockage pgvector** : Ces vecteurs sont stockés dans PostgreSQL en utilisant l'extension `pgvector`. Cela permet de faire des recherches sémantiques (compréhension du sens) sur des millions de chunks en quelques millisecondes.

### D. Recherche & Temps Réel (Phase 3)
- **Recherche Hybride** : L'API exposera une route `/v1/scanner/search` qui combinera la recherche Full-Text classique de PostgreSQL et la recherche vectorielle (pgvector).
- **WebSockets / SSE** : Le frontend recevra des mises à jour en temps réel (via Server-Sent Events ou WebSockets) lorsque l'état du traitement passe de "En cours" à "Terminé", évitant ainsi le "polling" inutile qui sature les serveurs.

---

## 2. Modifications Prévues (Code)

### Base de données (Prisma)
#### [MODIFY] [schema.prisma](file:///d:/ELARA/apps/api-nest/prisma/schema.prisma)
Activation de `pgvector` et ajout de la table des chunks :
```prisma
// Nécessite l'extension vector sur PostgreSQL (CREATE EXTENSION IF NOT EXISTS vector;)
model DocumentChunk {
  id          String   @id @default(uuid())
  document_id String
  page_number Int
  content     String
  embedding   Unsupported("vector(768)")? // Pour stocker les vecteurs sémantiques
  
  document    Document @relation(fields: [document_id], references: [id], onDelete: Cascade)
  
  @@index([document_id])
  // Un index HNSW ou IVFFlat sera créé en SQL brut pour la scalabilité des recherches vectorielles
  @@map("document_chunks")
}
```

### Microservice Worker (Python ou NestJS séparé)
#### [NEW] `apps/ocr-worker/` (Nouveau module recommandé)
Création d'un module/script indépendant chargé uniquement d'écouter RabbitMQ (ou Redis), de faire tourner le processeur OCR de manière distribuée, et de mettre à jour PostgreSQL et MinIO.

### Backend (NestJS)
#### [MODIFY] `src/scanner/scanner.service.ts`
Refactorisation pour que l'upload pousse un évènement dans la Queue (RabbitMQ) au lieu de bloquer le thread ou d'utiliser `execSync`.

#### [NEW] `src/scanner/search.service.ts`
Implémentation de l'algorithme de recherche hybride (Full-Text + Semantic Vector Search).

### Frontend (Next.js)
#### [MODIFY] [ScannerPage.tsx](file:///d:/ELARA/apps/web/src/app/\(app\)/scanner/page.tsx)
- Ajout d'une barre de "Recherche Sémantique".
- Intégration d'un écouteur (Polling intelligent ou WebSocket) pour réagir quand un long traitement de 300 pages est terminé.

---

## 3. Validation et Décisions Architecturelles

> [!CAUTION]
> Ce plan implique de mettre en place une véritable architecture distribuée (Microservices). Merci de valider ces points :

1. **Microservice Python Dédié** : Es-tu d'accord pour que le traitement OCR soit isolé dans un service Python à part entière (idéal pour la scalabilité de l'IA et de l'OCR) qui communique avec NestJS via RabbitMQ ? (Au lieu d'exécuter l'OCR directement au sein de NestJS).
2. **Redis vs RabbitMQ** : Tu avais RabbitMQ de configuré (bien que commenté dans `main.ts`). Souhaites-tu que l'on réactive officiellement **RabbitMQ** pour distribuer la charge OCR, ou préfères-tu utiliser **Redis (BullMQ)** qui est plus simple à mettre en place dans l'écosystème Node ?
3. **Recherche Vectorielle** : L'utilisation de `pgvector` nécessite que PostgreSQL ait l'extension installée. Es-tu d'accord pour que l'on mette en place cette infrastructure pour une recherche sémantique ultra-scalable ?
