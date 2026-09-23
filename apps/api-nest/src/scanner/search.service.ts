import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appelle l'API d'IA interne pour générer un embedding vectoriel
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const aiUrl = process.env.API_AI_INTERNAL_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${aiUrl}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur API IA: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.embedding; // Doit retourner un array de 768 dimensions
    } catch (error) {
      this.logger.warn(`L'API d'embeddings est injoignable, utilisation d'un mock pour le dev: ${(error as Error).message}`);
      // Mock de 768 dimensions pour permettre de tester la BDD en local
      return Array(768).fill(0).map(() => Math.random() - 0.5);
    }
  }

  /**
   * Recherche hybride : Combine la recherche vectorielle avec un filtre par tenant
   */
  async hybridSearch(tenantId: string, query: string, limit = 5) {
    this.logger.log(`Recherche sémantique pour le tenant ${tenantId}: "${query}"`);
    
    // 1. Générer le vecteur pour la requête de recherche
    const queryVector = await this.generateEmbedding(query);
    const vectorString = `[${queryVector.join(',')}]`;

    // 2. Requête PostgreSQL avec pgvector
    // On utilise la distance cosinus (<=>)
    const results = await this.prisma.$queryRawUnsafe(`
      SELECT 
        c.id,
        c.document_id,
        c.page_number,
        c.content,
        d.lien_minio,
        1 - (c.embedding <=> $1::vector) as similarity
      FROM document_chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE d.tenant_id = $2
      ORDER BY c.embedding <=> $1::vector
      LIMIT $3
    `, vectorString, tenantId, limit);

    return results;
  }
}
