import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InscriptionController } from '../src/utilisateurs/inscription.controller.js';
import { UtilisateursService } from '../src/utilisateurs/utilisateurs.service.js';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

/**
 * E2E de route `POST /v1/inscription` — sans Keycloak ni base (service mocké).
 *
 * La couche protégée ici est le ValidationPipe : c'est lui qui, en production,
 * rejetait en 400 « property pays should not exist » le payload exact du
 * formulaire `/register` (DTO fermé ne déclarant pas les champs envoyés),
 * cassant toute inscription depuis le navigateur alors que les suites restaient
 * vertes (aucun e2e ne couvrait ce chemin).
 *
 * Pipes, filtre et intercepteur sont identiques à `main.ts`.
 */
describe('Inscription (E2E route)', () => {
  let app: INestApplication;
  const inscrire = vi.fn().mockResolvedValue({ inscrit: true });

  beforeEach(async () => {
    inscrire.mockClear();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InscriptionController],
      providers: [{ provide: UtilisateursService, useValue: { inscrire } }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  /** Payload exact envoyé par `apps/web/src/app/(auth)/register/actions.ts`. */
  const payloadFormulaire = {
    email: 'amina@exemple.cm',
    mot_de_passe: 'motdepasse123',
    prenom: 'Amina',
    nom: 'Ngono',
    raison_sociale: 'SARL Afrik Distribution',
    pays: 'Cameroun',
    ville: 'Douala',
    secteur: 'Commerce',
    devise: 'XAF',
    systeme_comptable: 'SYSCOHADA',
  };

  it('accepte le payload complet du formulaire /register (pays, ville, secteur)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/inscription')
      .send(payloadFormulaire);

    expect(res.status).toBe(201);
    expect(inscrire).toHaveBeenCalledTimes(1);
    expect(inscrire.mock.calls[0][0]).toMatchObject({
      email: 'amina@exemple.cm',
      pays: 'Cameroun',
      ville: 'Douala',
      secteur: 'Commerce',
    });
  });

  it('accepte un champ optionnel vidé (secteur « Non précisé » → "")', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/inscription')
      .send({ ...payloadFormulaire, secteur: '', pays: '', ville: '', devise: '' });

    expect(res.status).toBe(201);
    expect(inscrire).toHaveBeenCalledTimes(1);
    // `@Transform` convertit "" en undefined : la clé peut subsister, la
    // valeur, elle, ne doit jamais repasser au service.
    expect(inscrire.mock.calls[0][0].secteur).toBeUndefined();
    expect(inscrire.mock.calls[0][0].devise).toBeUndefined();
  });

  it('refuse un champ de privilège (role) même si tout le reste est valide', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/inscription')
      .send({ ...payloadFormulaire, role: 'admin_compte' });

    expect(res.status).toBe(400);
    expect(inscrire).not.toHaveBeenCalled();
  });

  it('refuse le XSS stocké dans le nom sans jamais atteindre le service', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/inscription')
      .send({ ...payloadFormulaire, nom: '<script>alert(1)</script>' });

    expect(res.status).toBe(400);
    expect(inscrire).not.toHaveBeenCalled();
  });

  it('refuse un e-mail invalide avant tout appel au service', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/inscription')
      .send({ ...payloadFormulaire, email: 'pas-un-email' });

    expect(res.status).toBe(400);
    // ValidationPipe renvoie un tableau de messages, le service, une string.
    const erreur = Array.isArray(res.body.error) ? res.body.error.join(' ') : res.body.error;
    expect(erreur).toContain('Adresse e-mail invalide.');
    expect(inscrire).not.toHaveBeenCalled();
  });
});