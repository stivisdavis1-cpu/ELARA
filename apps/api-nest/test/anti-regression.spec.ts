import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

describe('Anti-régression — interdictions absolues', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const webSrc = path.resolve(repoRoot, 'apps/web/src');
  const apiSrc = path.resolve(repoRoot, 'apps/api-nest/src');

  /**
   * Retire les lignes de commentaire avant toute recherche : sans cela, une
   * simple mention documentée de `test-token` dans la docstring d'une
   * fonction déclenchait le test — faux positif constaté sur
   * `assistant/actions.ts`. Les commentaires en fin de ligne restent
   * détectés (limite assumée).
   */
  function sansCommentaires(contenu: string): string {
    return contenu
      .split('\n')
      .filter((ligne) => {
        const t = ligne.trim();
        return !(t.startsWith('//') || t.startsWith('/*') || t.startsWith('*'));
      })
      .join('\n');
  }

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
        return /\btest-token\b/.test(sansCommentaires(c));
      } catch { return false; }
    });
    expect(bad).toEqual([]);
  });

  it("n'introduit JAMAIS test-tenant comme valeur de repli", () => {
    const files = [...scan(webSrc, ['.ts','.tsx']), ...scan(apiSrc, ['.ts'])];
    const bad = files.filter(f => {
      try {
        const c = fs.readFileSync(f, 'utf8');
        return /\btest-tenant\b/.test(sansCommentaires(c));
      } catch { return false; }
    });
    expect(bad).toEqual([]);
  });

  it("les pages marketing ne fabriquent JAMAIS d'aléa côté client (Math.random)", () => {
    // Positions, codes de parrainage et compteurs affichés au visiteur doivent
    // venir de la base : un résultat déterminé dans le navigateur serait une
    // donnée présentée comme réelle sans l'être.
    const marketing = path.resolve(webSrc, 'app/(marketing)');
    const fichiers = scan(marketing, ['.ts', '.tsx']);
    expect(fichiers.length).toBeGreaterThan(0);
    const bad = fichiers.filter(f => {
      try {
        return /Math\.random\s*\(/.test(sansCommentaires(fs.readFileSync(f, 'utf8')));
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
        return forbidden.some(rx => rx.test(sansCommentaires(c)));
      } catch { return false; }
    });
    expect(bad).toEqual([]);
  });
});
