import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { InscriptionDto } from './inscription.dto.js';

/**
 * Contrat du formulaire `/register` — anti-régression.
 *
 * Deux échecs réels protégés ici :
 * 1. Le DTO fermé ne déclarait pas `pays`/`ville`/`secteur` : `forbidNonWhitelisted`
 *    rejetait en 400 CHAQUE inscription venue du formulaire (silencieux, aucun
 *    test e2e ne couvrait ce chemin).
 * 2. Les champs texte acceptaient n'importe quoi : un `<script>` dans un nom
 *    serait stocké puis restitué (XSS stocké).
 *
 * Les options reproduisent exactement celles de `main.ts`
 * (`whitelist` + `forbidNonWhitelisted`).
 */
const options = { whitelist: true, forbidNonWhitelisted: true };

function valider(payload: Record<string, unknown>) {
  const dto = plainToInstance(InscriptionDto, payload);
  return validateSync(dto, options);
}

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

describe('InscriptionDto — contrat du formulaire /register', () => {
  it('accepte le payload complet du formulaire', () => {
    expect(valider(payloadFormulaire)).toEqual([]);
  });

  it("accepte l'option de secteur « BTP & construction » (esperluette)", () => {
    expect(valider({ ...payloadFormulaire, secteur: 'BTP & construction' })).toEqual([]);
  });

  it('accepte les champs optionnels absents ou vides', () => {
    const { pays, ville, secteur, devise, ...requis } = payloadFormulaire;
    expect(valider(requis)).toEqual([]);
    // Le formulaire envoie `secteur: ""` pour « Non précisé ».
    expect(valider({ ...requis, pays: '', ville: '', secteur: '', devise: '' })).toEqual([]);
  });

  it("accepte les noms accentués et apostrophés (utilisateurs réels)", () => {
    expect(
      valider({ ...payloadFormulaire, nom: "N'Guembi-Oyono", prenom: 'Émile André' }),
    ).toEqual([]);
  });

  it("refuse le XSS stocké dans le nom, le prénom et la raison sociale", () => {
    for (const champ of ['nom', 'prenom', 'raison_sociale'] as const) {
      const erreurs = valider({ ...payloadFormulaire, [champ]: '<script>alert(1)</script>' });
      expect(erreurs.map((e) => e.property)).toContain(champ);
    }
  });

  it('refuse le XSS dans pays, ville et secteur', () => {
    for (const champ of ['pays', 'ville', 'secteur'] as const) {
      const erreurs = valider({ ...payloadFormulaire, [champ]: '<img src=x onerror=alert(1)>' });
      expect(erreurs.map((e) => e.property)).toContain(champ);
    }
  });

  it("refuse toujours tout champ de privilège (role, tenant, id)", () => {
    for (const payload of [
      { ...payloadFormulaire, role: 'admin_compte' },
      { ...payloadFormulaire, tenant_id: 'autre-entreprise' },
      { ...payloadFormulaire, id: '00000000-0000-0000-0000-000000000000' },
    ]) {
      expect(valider(payload).length).toBeGreaterThan(0);
    }
  });

  it('refuse un e-mail, un mot de passe ou une devise invalides', () => {
    expect(valider({ ...payloadFormulaire, email: 'pas-un-email' }).length).toBeGreaterThan(0);
    expect(valider({ ...payloadFormulaire, mot_de_passe: 'court' }).length).toBeGreaterThan(0);
    expect(valider({ ...payloadFormulaire, devise: 'XAFRIC' }).length).toBeGreaterThan(0);
  });
});
