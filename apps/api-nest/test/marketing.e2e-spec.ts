import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MarketingModule } from '../src/marketing/marketing.module.js';
import { PrismaService } from '../src/prisma.service.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

/**
 * E2E réel : module marketing isolé (démarrage rapide, sans les dépendances
 * externes qui font échouer les autres suites e2e), mais branché sur la
 * VRAIE base via DATABASE_URL. Même ValidationPipe, même filtre et même
 * enveloppe { data, error } que `main.ts`.
 *
 * Toute ligne créée est supprimée en fin de suite : aucune pollution de la
 * file d'attente réelle.
 */
describe('Marketing (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const horodatage = Date.now();
  const email = `e2e-marketing-${horodatage}@exemple.test`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MarketingModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);
  }, 60_000);

  afterAll(async () => {
    await prisma.listeAttente.deleteMany({ where: { email } });
    await prisma.demandeDemo.deleteMany({ where: { email } });
    await app.close();
  });

  it('inscrit un visiteur : position et code réellement calculés en base', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/marketing/liste-attente')
      .send({ prenom: 'E2E', email, entreprise: 'Suite automatique', site_web: '' });

    expect(res.status).toBe(201);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toMatchObject({ parrain_inconnu: false, deja_inscrit: false });
    expect(res.body.data.position).toBeGreaterThan(0);
    expect(res.body.data.code_parrain).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("ré-inscription avec casse différente : déjà inscrit, un seul compte rendu", async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/marketing/liste-attente')
      .send({ prenom: 'E2E', email: email.toUpperCase(), site_web: '' });

    expect(res.status).toBe(201);
    expect(res.body.data.deja_inscrit).toBe(true);
    expect(res.body.data.code_parrain).toMatch(/^[A-Z0-9]{6}$/);
    expect(await prisma.listeAttente.count({ where: { email } })).toBe(1);
  });

  it('relit position et parrainages via GET /liste-attente/:code', async () => {
    const enregistre = await prisma.listeAttente.findUnique({ where: { email } });
    expect(enregistre).not.toBeNull();

    const res = await request(app.getHttpServer()).get(
      `/v1/marketing/liste-attente/${enregistre!.code_parrain}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ code_parrain: enregistre!.code_parrain, parrainages: 0 });
    expect(res.body.data.position).toBeGreaterThan(0);
  });

  it('404 honnête pour un code de parrainage inconnu', async () => {
    const res = await request(app.getHttpServer()).get('/v1/marketing/liste-attente/ZZZZZZ');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('pot de miel rempli : 400 et aucune ligne en base', async () => {
    const spam = `e2e-spam-${horodatage}@exemple.test`;
    const res = await request(app.getHttpServer())
      .post('/v1/marketing/liste-attente')
      .send({ prenom: 'Robot', email: spam, site_web: 'http://spam.example' });

    expect(res.status).toBe(400);
    expect(await prisma.listeAttente.count({ where: { email: spam } })).toBe(0);
  });

  it('champ inconnu refusé par la whitelist du DTO', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/marketing/liste-attente')
      .send({ prenom: 'X', email: `e2e-x-${horodatage}@exemple.test`, site_web: '', champ_invente: 'non' });

    expect(res.status).toBe(400);
  });

  it('dépose une demande de démo réelle (201) puis la nettoie', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/marketing/demandes-demo')
      .send({
        prenom: 'E2E',
        nom: 'Recette',
        email,
        telephone: '+237 6 00 00 00 00',
        entreprise: 'Suite automatique',
        formule: 'Pro (24 900 F/mois)',
        message: 'Vérification automatique.',
        site_web: '',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.reference).toBeDefined();

    const ligne = await prisma.demandeDemo.findUnique({ where: { id: res.body.data.reference } });
    expect(ligne?.email).toBe(email);
    expect(ligne?.formule).toBe('Pro (24 900 F/mois)');
    await prisma.demandeDemo.delete({ where: { id: res.body.data.reference } });
  });

  it('formule hors liste réelle : 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/marketing/demandes-demo')
      .send({
        prenom: 'E2E',
        nom: 'Recette',
        email: `e2e-formule-${horodatage}@exemple.test`,
        telephone: '+237 6 00 00 00 00',
        entreprise: 'Suite automatique',
        formule: 'Palier inventé',
        site_web: '',
      });

    expect(res.status).toBe(400);
  });
});