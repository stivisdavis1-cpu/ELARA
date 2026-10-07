import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

/**
 * Garde-fous SECURITE — anti-regression.
 *
 * Chaque test verifie qu'une mesure de durcissement reste en place : si un
 * developpement futur la retire (CORS rouvert, Swagger en prod, DTO elargi,
 * compteur throttler local...), la CI echoue AVANT le deploiement.
 */
describe('Securite - garde-fous anti-regression', () => {
  const apiSrc = path.resolve(__dirname, '../src');
  const mainTs = path.join(apiSrc, 'main.ts');

  function lire(relatif: string): string {
    return fs.readFileSync(path.join(apiSrc, relatif), 'utf8');
  }

  it('CORS ferme : jamais enableCors() sans liste blanche', () => {
    const c = fs.readFileSync(mainTs, 'utf8');
    expect(c).toMatch(/originesAutorisees/);
    expect(c).not.toMatch(/enableCors\(\s*\)/);
  });

  it('Swagger jamais en production + jamais sans garde hors prod', () => {
    const c = fs.readFileSync(mainTs, 'utf8');
    expect(c).toMatch(/NODE_ENV !== 'production'/);
    expect(c).toMatch(/DOCS_TOKEN/);
    expect(c).toMatch(/\.status\(404\)/);
  });

  it('corps JSON bornes (anti-DoS memoire)', () => {
    const c = fs.readFileSync(mainTs, 'utf8');
    expect(c).toMatch(/json\(\{\s*limit:/);
  });

  it('erreurs 500 jamais detaillees au client (reference opaque)', () => {
    const c = lire('common/filters/http-exception.filter.ts');
    expect(c).toMatch(/ERR-/);
    expect(c).toMatch(/rence/);
  });

  it('throttler adosse a Redis (pas de compteur local en multi-instance)', () => {
    const c = lire('app.module.ts');
    expect(c).toMatch(/ThrottlerStorageRedisService/);
    expect(c).toMatch(/storage:/);
    expect(c).toMatch(/REDIS_URL/);
  });

  it('tenantId : format strict avant toute requete Prisma', () => {
    const c = lire('tenant/tenant.interceptor.ts');
    expect(c).toMatch(/A-Za-z0-9/);
    expect(c).toMatch(/ForbiddenException/);
  });

  it('inscription : DTO ferme, aucun champ role/tenant/id accepte', () => {
    const dto = lire('utilisateurs/inscription.dto.ts');
    expect(dto).toMatch(/class InscriptionDto/);
    expect(dto).not.toMatch(/^\s*role\s*[?!]?:/m);
    expect(dto).not.toMatch(/^\s*tenant/m);
    expect(dto).not.toMatch(/^\s*(id|userId)\s*[?!]?:/m);
    const ctrl = lire('utilisateurs/inscription.controller.ts');
    expect(ctrl).toMatch(/InscriptionDto/);
    expect(ctrl).toMatch(/@Throttle/);
    expect(ctrl).not.toMatch(/@Body\(\) data: any/);
  });

  it('x-powered-by desactive (empreinte Express masquee)', () => {
    const c = fs.readFileSync(mainTs, 'utf8');
    expect(c).toMatch(/x-powered-by/);
  });

  it('en-tetes de durcissement poses (nosniff, DENY, HSTS conditionnel)', () => {
    const c = fs.readFileSync(mainTs, 'utf8');
    expect(c).toMatch(/X-Content-Type-Options/);
    expect(c).toMatch(/X-Frame-Options/);
    expect(c).toMatch(/Strict-Transport-Security/);
  });
});
