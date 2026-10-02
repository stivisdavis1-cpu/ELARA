import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Activation (E2E)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejette une confirmation de mot de passe divergente (400)', async () => {
    const jeton = 'jeton-invalide-test';
    const res = await request(app.getHttpServer())
      .post(`/v1/activation/${encodeURIComponent(jeton)}`)
      .send({ mot_de_passe: 'MotDePasse123456', confirmation: 'Different123456' });
    expect(res.status).toBe(400);
    expect(res.body?.error || res.body?.message).toBeDefined();
  });

  it('rejette un mot de passe trop court (validation DTO)', async () => {
    const jeton = 'jeton-invalide-test';
    const res = await request(app.getHttpServer())
      .post(`/v1/activation/${encodeURIComponent(jeton)}`)
      .send({ mot_de_passe: 'court', confirmation: 'court' });
    expect([400, 422]).toContain(res.status);
  });
});
