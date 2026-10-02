import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Isolation multi-tenant (E2E)', () => {
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

  it("refuse avec code d'auth/tenant cohérent et n'expose pas de stack trace", async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/scanner/documents/non-existent')
      .set('Authorization', 'Bearer dummy')
      .set('x-tenant-id', 'tenant-a');
    expect([401, 403]).toContain(res.status);
    if (res.body?.error) expect(typeof res.body.error).toBe('string');
    expect(res.body?.stack).toBeUndefined();
  });
});
