import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { vi } from 'vitest';
import { MarketingService, positionPour, LigneFile } from './marketing.service.js';
import { PrismaService } from '../prisma.service.js';
import { DemandeDemoDto, InscriptionListeAttenteDto } from './marketing.dto.js';

describe('MarketingService', () => {
  let service: MarketingService;
  let prisma: { listeAttente: any; demandeDemo: any };

  beforeEach(async () => {
    prisma = {
      listeAttente: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      demandeDemo: { create: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketingService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<MarketingService>(MarketingService);
  });

  describe('positionPour — logique pure de la file', () => {
    const ligne = (id: string, minutes: number, parrain_id: string | null = null): LigneFile => ({
      id,
      created_at: new Date(2026, 0, 1, 10, minutes),
      parrain_id,
    });

    it("sans invitation, la position est le rang d'arrivée", () => {
      const file = [ligne('a', 0), ligne('b', 1), ligne('c', 2)];
      expect(positionPour(file, 'a')).toBe(1);
      expect(positionPour(file, 'b')).toBe(2);
      expect(positionPour(file, 'c')).toBe(3);
    });

    it('deux invitations font passer le parrain devant la moitié de la file', () => {
      // f (6e) a parrainé g et h : score = 1 + floor(5/4) = 2, il passe
      // donc devant c (3e sans invitation, score 3).
      const file = [
        ligne('a', 0), ligne('b', 1), ligne('c', 2), ligne('d', 3),
        ligne('e', 4), ligne('f', 5), ligne('g', 6, 'f'), ligne('h', 7, 'f'),
      ];
      expect(positionPour(file, 'a')).toBe(1);
      expect(positionPour(file, 'f')).toBe(3);
      expect(positionPour(file, 'c')).toBe(4);
      expect(positionPour(file, 'h')).toBe(8);
    });

    it('ne renvoie jamais deux fois la même position', () => {
      const file = [
        ligne('a', 0), ligne('b', 1, 'a'), ligne('c', 2, 'a'),
        ligne('d', 3), ligne('e', 4),
      ];
      const positions = file.map((l) => positionPour(file, l.id));
      expect(positions).toEqual([1, 2, 3, 4, 5]);
      expect(new Set(positions).size).toBe(file.length);
    });

    it('refuse un inconnu de la file', () => {
      expect(() => positionPour([ligne('a', 0)], 'autre')).toThrow(NotFoundException);
    });
  });

  describe('inscrireListeAttente', () => {
    const dto = (surcharge: Partial<InscriptionListeAttenteDto> = {}): InscriptionListeAttenteDto => ({
      prenom: ' Amina ',
      email: 'Amina@Exemple.CM',
      ...surcharge,
    });

    it("normalise l'adresse et renvoie la position réelle lue en base", async () => {
      prisma.listeAttente.findUnique.mockResolvedValue(null);
      prisma.listeAttente.create.mockResolvedValue({ id: 'nouveau', code_parrain: 'XH3K9P' });
      prisma.listeAttente.findMany.mockResolvedValue([
        { id: 'a', created_at: new Date(), parrain_id: null },
        { id: 'b', created_at: new Date(), parrain_id: null },
        { id: 'nouveau', created_at: new Date(), parrain_id: null },
      ]);

      const resultat = await service.inscrireListeAttente(dto({ entreprise: ' Sanaga ' }));

      expect(resultat).toEqual({
        position: 3,
        code_parrain: 'XH3K9P',
        parrain_inconnu: false,
        deja_inscrit: false,
      });
      expect(prisma.listeAttente.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            prenom: 'Amina',
            email: 'amina@exemple.cm',
            entreprise: 'Sanaga',
            parrain_id: null,
          }),
        }),
      );
    });

    it("signale un code de parrainage inconnu sans bloquer l'inscription", async () => {
      // 1er appel : contrôle de l'adresse (libre) ; 2e : recherche du parrain.
      prisma.listeAttente.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      prisma.listeAttente.create.mockResolvedValue({ id: 'nouveau', code_parrain: 'ABCDEF' });
      prisma.listeAttente.findMany.mockResolvedValue([
        { id: 'nouveau', created_at: new Date(), parrain_id: null },
      ]);

      const resultat = await service.inscrireListeAttente(dto({ parrain: 'zzzzzz' }));

      expect(resultat.parrain_inconnu).toBe(true);
      expect(resultat.position).toBe(1);
      expect(prisma.listeAttente.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ parrain_id: null }) }),
      );
    });

    it("retourne l'inscription existante quand l'adresse est déjà prise", async () => {
      prisma.listeAttente.findUnique.mockResolvedValue({ id: 'deja', code_parrain: 'EXIST1' });
      prisma.listeAttente.findMany.mockResolvedValue([
        { id: 'autre', created_at: new Date(), parrain_id: null },
        { id: 'deja', created_at: new Date(), parrain_id: null },
      ]);

      const resultat = await service.inscrireListeAttente(dto());

      expect(resultat).toEqual({
        position: 2,
        code_parrain: 'EXIST1',
        parrain_inconnu: false,
        deja_inscrit: true,
      });
      expect(prisma.listeAttente.create).not.toHaveBeenCalled();
    });

    it("régénère le code après un écarton d'unique (P2002) au lieu de répondre 500", async () => {
      prisma.listeAttente.findUnique.mockResolvedValueOnce(null);
      prisma.listeAttente.create
        .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['liste_attente_code_parrain_key'] } })
        .mockResolvedValueOnce({ id: 'nouveau', code_parrain: 'SECON1' });
      prisma.listeAttente.findMany.mockResolvedValue([
        { id: 'nouveau', created_at: new Date(), parrain_id: null },
      ]);

      const resultat = await service.inscrireListeAttente(dto());

      expect(prisma.listeAttente.create).toHaveBeenCalledTimes(2);
      expect(resultat).toEqual({
        position: 1,
        code_parrain: 'SECON1',
        parrain_inconnu: false,
        deja_inscrit: false,
      });
    });
  });

  describe('restaurerPosition', () => {
    it('refuse un code malformé sans interroger la base', async () => {
      await expect(service.restaurerPosition('!!')).rejects.toThrow(NotFoundException);
      expect(prisma.listeAttente.findUnique).not.toHaveBeenCalled();
    });

    it('refuse un code inexistant', async () => {
      prisma.listeAttente.findUnique.mockResolvedValue(null);
      await expect(service.restaurerPosition('ZZZZZZ')).rejects.toThrow(NotFoundException);
    });

    it("relit position et parrainages réels depuis la base", async () => {
      prisma.listeAttente.findUnique.mockResolvedValue({ id: 'moi', code_parrain: 'XH3K9P' });
      prisma.listeAttente.findMany.mockResolvedValue([
        { id: 'moi', created_at: new Date(), parrain_id: null },
        { id: 'invite', created_at: new Date(), parrain_id: 'moi' },
      ]);
      prisma.listeAttente.count.mockResolvedValue(1);

      await expect(service.restaurerPosition('xh3k9p')).resolves.toEqual({
        code_parrain: 'XH3K9P',
        position: 1,
        parrainages: 1,
      });
    });
  });

  describe('demanderDemo', () => {
    it('normalise les champs, dépose la demande et renvoie sa référence', async () => {
      prisma.demandeDemo.create.mockResolvedValue({
        id: 'dem-1',
        created_at: new Date('2026-01-01T00:00:00Z'),
      });

      const resultat = await service.demanderDemo({
        prenom: ' Amina ',
        nom: ' Ngono ',
        email: 'Amina@Exemple.CM',
        telephone: '+237 6 00 00 00 00',
        entreprise: ' Sanaga ',
        formule: 'Pro (24 900 F/mois)',
        message: " Besoin d'aide. ",
      });

      expect(resultat.reference).toBe('dem-1');
      expect(prisma.demandeDemo.create).toHaveBeenCalledWith({
        data: {
          prenom: 'Amina',
          nom: 'Ngono',
          email: 'amina@exemple.cm',
          // Normalisation canonique : espaces et tirets supprimés au stockage.
          telephone: '+237600000000',
          entreprise: 'Sanaga',
          formule: 'Pro (24 900 F/mois)',
          message: "Besoin d'aide.",
        },
      });
    });
  });

  describe('Validation des DTO — anti-spam', () => {
    it('le pot de miel refuse toute valeur non vide', async () => {
      const dto = plainToInstance(InscriptionListeAttenteDto, {
        prenom: 'Amina',
        email: 'amina@exemple.cm',
        site_web: 'http://spam.example',
      });
      const erreurs = await validate(dto);
      expect(erreurs.map((e) => e.property)).toContain('site_web');
    });

    it('accepte un formulaire propre, champ de miel vide', async () => {
      const dto = plainToInstance(InscriptionListeAttenteDto, {
        prenom: 'Amina',
        email: 'amina@exemple.cm',
        site_web: '',
      });
      expect(await validate(dto)).toEqual([]);
    });

    it('refuse une formule absente de la liste réellement proposée', async () => {
      const dto = plainToInstance(DemandeDemoDto, {
        prenom: 'Amina',
        nom: 'Ngono',
        email: 'amina@exemple.cm',
        telephone: '+237 6 00 00 00 00',
        entreprise: 'Sanaga',
        formule: 'Palier inventé',
      });
      const erreurs = await validate(dto);
      expect(erreurs.map((e) => e.property)).toContain('formule');
    });

    it('refuse le XSS stocké dans le prénom (liste attente)', async () => {
      const dto = plainToInstance(InscriptionListeAttenteDto, {
        prenom: '<script>alert(1)</script>',
        email: 'amina@exemple.cm',
        site_web: '',
      });
      const erreurs = await validate(dto);
      expect(erreurs.map((e) => e.property)).toContain('prenom');
    });

    it("refuse le XSS stocké dans l'entreprise et le message (démo)", async () => {
      const dto = plainToInstance(DemandeDemoDto, {
        prenom: 'Amina',
        nom: 'Ngono',
        email: 'amina@exemple.cm',
        telephone: '+237 6 00 00 00 00',
        entreprise: 'Sanaga"><img src=x onerror=alert(1)>',
        formule: 'Pro (24 900 F/mois)',
        message: 'Bonjour <b>chef</b>',
        site_web: '',
      });
      const proprietes = (await validate(dto)).map((e) => e.property);
      expect(proprietes).toContain('entreprise');
      expect(proprietes).toContain('message');
    });

    it('refuse un téléphone fourre-tout (démo)', async () => {
      const dto = plainToInstance(DemandeDemoDto, {
        prenom: 'Amina',
        nom: 'Ngono',
        email: 'amina@exemple.cm',
        telephone: 'appelez-moi vite =CMD(1)',
        entreprise: 'Sanaga',
        formule: 'Pro (24 900 F/mois)',
        site_web: '',
      });
      const erreurs = await validate(dto);
      expect(erreurs.map((e) => e.property)).toContain('telephone');
    });

    it('accepte les prénoms accentués et les apostrophes légitimes', async () => {
      for (const prenom of ['Amina', 'Jean-Baptiste', "N'Djamena", 'François']) {
        const dto = plainToInstance(InscriptionListeAttenteDto, {
          prenom,
          email: 'amina@exemple.cm',
          site_web: '',
        });
        expect(await validate(dto)).toEqual([]);
      }
    });
  });
});