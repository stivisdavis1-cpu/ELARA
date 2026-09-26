import { Injectable, Logger } from '@nestjs/common';
import { CfoService } from '../cfo/cfo.service.js';
import { PrismaService } from '../prisma.service.js';
import { SearchService, ResultatRecherche } from '../scanner/search.service.js';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly aiUrl = process.env.API_AI_INTERNAL_URL || 'http://localhost:8000';

  constructor(
    private readonly cfoService: CfoService,
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
  ) {}

  async askAdvice(tenantId: string, question: string) {
    this.logger.log(`Question de l'utilisateur (Tenant: ${tenantId}): ${question}`);

    // Trouver ou créer une conversation pour ce tenant (simplifié pour l'instant)
    let conversation = await this.prisma.conversation.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' }
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenant_id: tenantId,
          titre: 'Conversation IA Principale'
        }
      });
    }

    // Sauvegarder la question de l'utilisateur
    await this.prisma.message.create({
      data: {
        conversation_id: conversation.id,
        role: 'user',
        content: question
      }
    });

    // 1. Récupération du contexte financier réel de l'utilisateur
    // Cela empêche l'IA d'halluciner des chiffres et l'ancre dans la réalité
    let contextData = {};
    try {
      const tresorerie = await this.cfoService.getSyntheseTresorerie(tenantId);
      const bfr = await this.cfoService.getBFR(tenantId);
      contextData = {
        tresorerie_actuelle: tresorerie.solde_theorique || 0,
        flux_entrants_recents: tresorerie.encaissements_totaux || 0,
        flux_sortants_recents: tresorerie.sorties_totales || 0,
        besoin_fonds_roulement: bfr.bfr || 0
      };
    } catch (e) {
      this.logger.warn(`Impossible de récupérer le contexte financier pour ${tenantId}`, e);
    }

    // 2. Récupération de la mémoire de l'entreprise (RAG)
    //
    // Avant : les 10 derniers enregistrements, sans pertinence ni citation.
    // L'IA recevait donc un contexte arbitraire, et pouvait répondre « je n'ai
    // pas trouvé » alors que la pièce existait, ou l'inverse.
    // Maintenant : recherche hybride (plein texte + vectorielle) sur les
    // documents réels, avec abstention explicite si la matière est insuffisante.
    let recherche: ResultatRecherche = {
      query: question,
      requete_reformulee: '',
      mode: 'lexical',
      passages: [],
      suffisant: false,
      avertissements: [],
    };
    try {
      recherche = await this.searchService.rechercher(tenantId, question, { limit: 6 });
      this.logger.log(
        `Recherche « ${question} » : ${recherche.passages.length} passage(s), mode ${recherche.mode}, suffisant=${recherche.suffisant}`,
      );
    } catch (e) {
      this.logger.warn(`Recherche documentaire indisponible : ${(e as Error).message}`);
    }

    // Extrait la mémoire d'entreprise uniquement si elle est pertinente, pour
    // ne plus noyer la requête sous du bruit.
    const companyMemory: string[] = [];
    try {
      const memories = await this.prisma.companyMemory.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        take: 20,
      });
      // reformuler() a déjà retiré les mots outils : ce qui reste est
      // significatif, y compris les sigles courts (TVA, BFR, IS) qui portent
      // l'essentiel du vocabulaire PME.
      const termes = recherche.requete_reformulee.split(' ').filter(Boolean);
      for (const memoire of memories) {
        const contenu = memoire.content.toLowerCase();
        if (termes.some((t) => contenu.includes(t))) {
          companyMemory.push(memoire.content);
        }
        if (companyMemory.length >= 5) break;
      }
    } catch (e) {
      this.logger.warn(`Impossible de récupérer la mémoire pour ${tenantId}`, e);
    }

    // 3. Appel au microservice FastAPI (api-ai)
    try {
      this.logger.log(`Envoi de la requête au microservice IA (FastAPI)...`);
      const response = await fetch(`${this.aiUrl}/ai/advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          tenant_id: tenantId,
          financial_data: contextData,
          company_memory: companyMemory,
          // Sources citables : le prompt impose de s'y référer.
          sources: recherche.passages.map((p) => ({
            document_id: p.document_id,
            nom: p.nom,
            type: p.type_document,
            page: p.page,
            extrait: p.extrait,
          })),
          // materialsuffisantes:false oblige le modèle à s'abstenir plutôt
          // que de compléter avec des connaissances génériques.
          materia_suffisante: recherche.suffisant,
          consignes: [
            "Réponds uniquement à partir des sources fournies et des données financières.",
            "Cite chaque affirmation en indicating le document et la page.",
            "Si les sources ne permettent pas de répondre, dis-le explicitement.",
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur réseau FastAPI: ${response.statusText}`);
      }

      const aiAdvice = await response.json();

      // Marquage fiable : la mémoire d'entreprise est utilisée si du contexte RAG a été injecté
      const memoireUtilisee = companyMemory.length > 0;
      const finalAdvice = {
        ...(typeof aiAdvice === 'object' && aiAdvice !== null ? aiAdvice : { diagnostic: aiAdvice }),
        memoire_entreprise_utilisee: memoireUtilisee,
        sources: recherche.passages.map((p) => ({
          document_id: p.document_id,
          nom: p.nom,
          type: p.type_document,
          page: p.page,
          extrait: p.extrait,
          score: p.score,
        })),
        mode_recherche: recherche.mode,
        reponse_fondee: recherche.suffisant,
        ...(recherche.avertissements.length ? { avertissements: recherche.avertissements } : {}),
      };

      // Sauvegarder la réponse de l'IA
      await this.prisma.message.create({
        data: {
          conversation_id: conversation.id,
          role: 'assistant',
          content: JSON.stringify(finalAdvice)
        }
      });

      return finalAdvice;

    } catch (e: any) {
      this.logger.error(`Erreur lors de la génération de conseil IA: ${e.message}`);
      return {
        diagnostic: "Désolé, je n'arrive pas à analyser vos données pour le moment (Service IA indisponible).",
        actions_recommandees: [],
        alerte_tresorerie: false,
        incertitudes: ["Connexion au cerveau IA perdue."],
        verification_web_effectuee: false,
        sources: recherche.passages,
        mode_recherche: recherche.mode,
        reponse_fondee: false,
      };
    }
  }

  /**
   * Enregistre le retour utilisateur sur une réponse. Sans ce signal, aucune
   * amélioration du RAG n'est mesurable.
   */
  async enregistrerFeedback(tenantId: string, input: {
    message_id?: string;
    question?: string;
    note: number;
    commentaire?: string;
    reponse?: unknown;
  }) {
    if (input.note !== 1 && input.note !== -1) {
      return { enregistre: false, motif: 'note doit valoir 1 ou -1' };
    }
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO assistant_feedback (tenant_id, message_id, question, note, commentaire, reponse)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      tenantId,
      input.message_id ?? null,
      input.question ?? null,
      input.note,
      input.commentaire ?? null,
      JSON.stringify(input.reponse ?? null),
    );
    return { enregistre: true };
  }

  async getConversationHistory(tenantId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      include: {
        messages: {
          orderBy: { created_at: 'asc' }
        }
      },
      take: 5
    });

    return conversations.map((conversation) => {
      const messages = conversation.messages.map((message) => {
        const base = {
          id: message.id,
          role: message.role, // 'user' | 'assistant'
          content: message.content,
          created_at: message.created_at
        };

        // Les réponses de l'IA sont stockées en JSON (conseil structuré) :
        // on les restitue telles quelles pour que le front puisse les ré-afficher
        if (message.role === 'assistant') {
          try {
            const parsed = JSON.parse(message.content);
            return { ...base, aiResponse: parsed };
          } catch {
            return base;
          }
        }
        return base;
      });

      return {
        conversation: { id: conversation.id, titre: conversation.titre, created_at: conversation.created_at },
        messages
      };
    });
  }
}
