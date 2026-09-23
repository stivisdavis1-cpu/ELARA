import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { AssistantService } from './assistant.service.js';
import { CfoService } from '../cfo/cfo.service.js';
import { PrismaService } from '../prisma.service.js';

describe('AssistantService', () => {
  let service: AssistantService;
  let prisma: {
    conversation: any;
    message: any;
    companyMemory: any;
  };

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: CfoService, useValue: { getSyntheseTresorerie: vi.fn(), getBFR: vi.fn() } },
        { provide: PrismaService, useValue: prisma },
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
      expect(history[0].messages[1].aiResponse).toEqual({
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

      expect(history[0].messages[0].aiResponse).toBeUndefined();
      expect(history[0].messages[0].content).toBe('texte simple');
    });
  });

  describe('askAdvice', () => {
    it('sauvegarde user + assistant et expose memoire_entreprise_utilisee quand la mémoire est injectée', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue({ id: 'conv-new', tenant_id: 'tenant-1', titre: 'Conversation IA Principale' });
      prisma.companyMemory.findMany.mockResolvedValue([{ content: 'règle métier: TVA 19.25%' }]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: async () => ({ diagnostic: 'ok', actions_recommandees: [], alerte_tresorerie: false }),
      }) as any;

      const advice = await service.askAdvice('tenant-1', 'Question ?');

      expect(prisma.message.create).toHaveBeenCalledTimes(2);
      expect(prisma.message.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ role: 'user', content: 'Question ?' }) }));
      expect(advice).toMatchObject({ diagnostic: 'ok', memoire_entreprise_utilisee: true });
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
  });
});