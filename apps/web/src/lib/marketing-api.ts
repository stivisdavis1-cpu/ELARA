/**
 * Appels aux formulaires marketing (liste d'attente, demandes de démo).
 *
 * Tout passe par la réécriture Next `/api/marketing/*` → API Nest
 * `/v1/marketing/*` : le navigateur ne connaît jamais l'adresse interne de
 * l'API (voir `next.config.ts` et `api-url.ts`).
 *
 * L'enveloppe de l'API est `{ data, error, meta }` — succès comme erreur.
 * Une erreur de validation arrive sous forme de tableau de messages : on en
 * expose le premier, formulé en français par class-validator.
 */
export class ErreurMarketing extends Error {
  constructor(message: string, readonly statut: number) {
    super(message);
    this.name = 'ErreurMarketing';
  }
}

interface Enveloppe<T> {
  data: T | null;
  error: string | string[] | null;
}

export interface CorpsInscription {
  prenom: string;
  email: string;
  entreprise?: string;
  parrain?: string;
  site_web?: string;
}

export interface CorpsDemo {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  entreprise: string;
  formule: string;
  message?: string;
  site_web?: string;
}

export interface ResultatInscription {
  position: number;
  code_parrain: string;
  parrain_inconnu: boolean;
  deja_inscrit: boolean;
}

export interface ResultatDemo {
  reference: string;
  recu_le: string;
}

export interface ResultatLien {
  code_parrain: string;
  position: number;
  parrainages: number;
}

function messageDerreur(enveloppe: Enveloppe<unknown> | null, statut: number): string {
  const brut = enveloppe?.error;
  if (Array.isArray(brut)) {
    const premier = brut.find((m) => typeof m === 'string' && m.trim().length > 0);
    if (premier) return premier;
  } else if (typeof brut === 'string' && brut.trim().length > 0) {
    return brut;
  }
  if (statut === 429) return 'Trop de tentatives : patientez une minute puis réessayez.';
  if (statut === 400) return 'Formulaire invalide : vérifiez les informations saisies.';
  return 'Envoi impossible pour le moment : vérifiez votre connexion puis réessayez.';
}

async function exploiter<T>(reponse: Response): Promise<T> {
  let enveloppe: Enveloppe<T> | null = null;
  try {
    enveloppe = (await reponse.json()) as Enveloppe<T>;
  } catch {
    enveloppe = null;
  }
  if (!reponse.ok || !enveloppe || enveloppe.data === null) {
    throw new ErreurMarketing(messageDerreur(enveloppe, reponse.status), reponse.status);
  }
  return enveloppe.data;
}

async function poster<T>(url: string, corps: unknown): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
    });
  } catch {
    throw new ErreurMarketing('Connexion impossible : vérifiez votre réseau puis réessayez.', 0);
  }
  return exploiter<T>(reponse);
}

export function inscrireListeAttente(corps: CorpsInscription): Promise<ResultatInscription> {
  return poster<ResultatInscription>('/api/marketing/liste-attente', corps);
}

export function demanderDemo(corps: CorpsDemo): Promise<ResultatDemo> {
  return poster<ResultatDemo>('/api/marketing/demandes-demo', corps);
}

/** Relit la position réelle liée à un code de parrainage (`/r/CODE`). */
export async function restaurerPosition(code: string): Promise<ResultatLien> {
  const codePropre = encodeURIComponent(code.trim().toUpperCase());
  let reponse: Response;
  try {
    reponse = await fetch(`/api/marketing/liste-attente/${codePropre}`);
  } catch {
    throw new ErreurMarketing('Connexion impossible : vérifiez votre réseau puis réessayez.', 0);
  }
  return exploiter<ResultatLien>(reponse);
}