import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { AssistantService } from './assistant.service.js';
import { CfoService } from '../cfo/cfo.service.js';
import { PrismaService } from '../prisma.service.js';
import { SearchService } from '../scanner/search.service.js';

describe('AssistantService', () => {
  let service: AssistantService;
  let prisma: {
    conversation: any;
    message: any;
    companyMemory: any;
  };
  let recherche: { rechercher: any };

  beforeEach(async () => {
    prisma = {
      conversation: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      message: {
        create: vi.fn(),
      },
      companyMemory: {
        findMany: vi.fn(),
      },
    };

    // La recherche documentaire est désormais une dépendance de l'assistant :
    // on la stubbe pour tester l'orchestration, pas la récupération.
    recherche = {
      rechercher: vi.fn().mockResolvedValue({
        query: 'Question ?',
        requete_reformulee: 'question',
        mode: 'hybride',
        passages: [],
        suffisant: false,
        avertissements: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: CfoService, useValue: { getSyntheseTresorerie: vi.fn(), getBFR: vi.fn() } },
        { provide: PrismaService, useValue: prisma },
        { provide: SearchService, useValue: recherche },
      ],
    }).compile();

    service = module.get<AssistantService>(AssistantService);
  });

  describe('getConversationHistory', () => {
    it('restitue les messages en parsant la réponse IA JSON (aiResponse)', async () => {
      prisma.conversation.findMany.mockResolvedValue([
        {
          id: 'conv-1',
          titre: 'Conversation IA Principale',
          created_at: new Date('2026-01-01'),
          messages: [
            { id: 'm1', role: 'user', content: 'Bonjour', created_at: new Date('2026-01-01T10:00:00') },
            {
              id: 'm2',
              role: 'assistant',
              content: JSON.stringify({
                diagnostic: 'Situation stable',
                actions_recommandees: [],
                memoire_entreprise_utilisee: true,
              }),
              created_at: new Date('2026-01-01T10:00:05'),
            },
          ],
        },
      ]);

      const history = await service.getConversationHistory('tenant-1');

      expect(history).toHaveLength(1);
      expect(history[0].conversation.id).toBe('conv-1');
      expect(history[0].messages[0]).toMatchObject({ role: 'user', content: 'Bonjour' });
      expect((history[0].messages[1] as { aiResponse?: unknown }).aiResponse).toEqual({
        diagnostic: 'Situation stable',
        actions_recommandees: [],
        memoire_entreprise_utilisee: true,
      });
    });

    it('retourne un message assistant brut quand le content n\'est pas du JSON', async () => {
      prisma.conversation.findMany.mockResolvedValue([
        {
          id: 'conv-2',
          titre: 'Conv brute',
          created_at: new Date('2026-01-01'),
          messages: [{ id: 'm3', role: 'assistant', content: 'texte simple', created_at: new Date('2026-01-01T10:00:00') }],
        },
      ]);

      const history = await service.getConversationHistory('tenant-1');

      expect((history[0].messages[0] as { aiResponse?: unknown }).aiResponse).toBeUndefined();
      expect(history[0].messages[0].content).toBe('texte simple');
    });
  });

  describe('askAdvice', () => {
    it('n’injecte que la mémoire d’entreprise pertinente à la question', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 'conv-1' });
      prisma.companyMemory.findMany.mockResolvedValue([
        { content: 'règle métier: la TVA appliquée est de 19,25 %' },
        { content: 'note de service nettoyage des bureaux' },
      ]);
      recherche.rechercher.mockResolvedValue({
        query: 'Quelle TVA ?',
        requete_reformulee: 'tva',
        mode: 'lexical',
        passages: [],
        suffisant: false,
        avertissements: [],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: async () => ({ diagnostic: 'ok', actions_recommandees: [], alerte_tresorerie: false }),
      }) as any;

      const advice = await service.askAdvice('tenant-1', 'Quelle TVA ?');

      const corps = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      // Seul l'énoncé contenant « tva » est transmis : le reste est du bruit.
      expect(corps.company_memory).toEqual(['règle métier: la TVA appliquée est de 19,25 %']);
      expect(advice).toMatchObject({ diagnostic: 'ok', memoire_entreprise_utilisee: true });
      expect(prisma.message.create).toHaveBeenCalledTimes(2);
      expect(prisma.message.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: expect.objectContaining({ role: 'user', content: 'Quelle TVA ?' }) }),
      );
    });

    it('retourne un conseil de repli si le microservice IA est indisponible', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue({ id: 'conv-new', tenant_id: 'tenant-1', titre: 'Conversation IA Principale' });
      prisma.companyMemory.findMany.mockResolvedValue([]);

      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;

      const advice = await service.askAdvice('tenant-1', 'Question ?');

      expect(advice).toHaveProperty('diagnostic');
      expect(advice).toHaveProperty('incertitudes');
    });

    it('transmet les passages cités et signale une réponse non fondée quand la matière manque', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 'conv-1' });
      prisma.companyMemory.findMany.mockResolvedValue([]);
      recherche.rechercher.mockResolvedValue({
        query: 'Résultat net ?',
        requete_reformulee: 'resultat net',
        mode: 'hybride',
        suffisant: false,
        avertissements: ['Index plein texte indisponible.'],
        passages: [
          {
            chunk_id: 'c1',
            document_id: 'd1',
            nom: 'Bilan 2025',
            type_document: 'bilan',
            page: 2,
            extrait: "Résultat net de l'exercice : 8 765 250",
            score: 0.8,
            rang: 1,
            mode: 'hybride',
          },
        ],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: async () => ({ diagnostic: 'incertain', actions_recommandees: [] }),
      }) as any;

      const advice = await service.askAdvice('tenant-1', 'Résultat net ?');

      // Le payload IA doit porter les sources citables.
      const corps = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(corps.sources[0]).toMatchObject({ nom: 'Bilan 2025', page: 2 });
      expect(corps.materia_suffisante).toBe(false);
      expect(advice).toMatchObject({
        reponse_fondee: false,
        mode_recherche: 'hybride',
        avertissements: ['Index plein texte indisponible.'],
      });
      expect((advice as { sources: unknown[] }).sources).toHaveLength(1);
    });
  });
});