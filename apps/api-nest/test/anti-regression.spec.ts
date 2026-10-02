import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

describe('Anti-régression — interdictions absolues', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const webSrc = path.resolve(repoRoot, 'apps/web/src');
  const apiSrc = path.resolve(repoRoot, 'apps/api-nest/src');

  function scan(dir: string, exts: string[]) {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    const walk = (d: string) => {
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p);
        else if (exts.some(e => p.endsWith(e))) files.push(p);
      }
    };
    walk(dir);
    return files;
  }

  it("n'introduit JAMAIS test-token comme valeur de repli", () => {
    const files = [...scan(webSrc, ['.ts','.tsx']), ...scan(apiSrc, ['.ts'])];
    const bad = files.filter(f => {
      try {
        const c = fs.readFileSync(f, 'utf8');
        return /\btest-token\b/.test(c);
      } catch { return false; }
    });
    expect(bad).toEqual([]);
  });

  it("n'introduit JAMAIS test-tenant comme valeur de repli", () => {
    const files = [...scan(webSrc, ['.ts','.tsx']), ...scan(apiSrc, ['.ts'])];
    const bad = files.filter(f => {
      try {
        const c = fs.readFileSync(f, 'utf8');
        return /\btest-tenant\b/.test(c);
      } catch { return false; }
    });
    expect(bad).toEqual([]);
  });

  it("ne simule JAMAIS de données synthétiques présentées comme réelles", () => {
    const files = [...scan(webSrc, ['.ts','.tsx']), ...scan(apiSrc, ['.ts'])];
    const forbidden = [/Test OCR|données synthétiques|montant fictif|alerte factice|figé inventait/i];
    const bad = files.filter(f => {
      try {
        const c = fs.readFileSync(f, 'utf8');
        return forbidden.some(rx => rx.test(c));
      } catch { return false; }
    });
    expect(bad).toEqual([]);
  });
});
