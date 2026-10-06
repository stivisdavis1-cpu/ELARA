import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma.service.js';
import { DemandeDemoDto, InscriptionListeAttenteDto } from './marketing.dto.js';

// Alphabet sans les paires faciles à confondre à l'affichage (O/0, I/1) :
// le code est recopié depuis des affiches et des messages WhatsApp.
const ALPHABET_PARRAINAGE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Une ligne de la file d'attente, telle que lue pour le calcul des positions. */
export interface LigneFile {
  id: string;
  created_at: Date;
  parrain_id: string | null;
}

export interface ResultatInscription {
  position: number;
  code_parrain: string;
  parrain_inconnu: boolean;
  deja_inscrit: boolean;
}

/**
 * Position réelle d'un inscrit dans la file d'attente.
 *
 * 1. Le rang d'arrivée (ordre chronologique) ne bouge jamais ;
 * 2. chaque invitation acceptée divise par deux la distance au sommet — c'est
 *    le « passer devant la moitié de la file » affiché sur la page ;
 * 3. les ex æquo sont départagés par le rang d'arrivée : deux inscrits ne
 *    peuvent pas afficher la même position.
 *
 * Fonction pure (aucun accès base), testable sans mock. `inscrits` est supposé
 * trié par ordre d'arrivée (index croissant).
 */
export function positionPour(inscrits: LigneFile[], id: string): number {
  const rangs = new Map<string, number>();
  inscrits.forEach((ligne, index) => rangs.set(ligne.id, index + 1));

  // Le nombre d'invitations n'est pas stocké en double : on le déduit des
  // `parrain_id` présents, ce qui évite tout écart entre les deux.
  const invitations = new Map<string, number>();
  for (const ligne of inscrits) {
    if (ligne.parrain_id) {
      invitations.set(ligne.parrain_id, (invitations.get(ligne.parrain_id) ?? 0) + 1);
    }
  }

  const score = (ligne: LigneFile): number => {
    const rang = rangs.get(ligne.id) ?? 0;
    const boost = Math.min(invitations.get(ligne.id) ?? 0, 30);
    return 1 + Math.floor((rang - 1) / 2 ** boost);
  };

  const rangMien = rangs.get(id);
  if (rangMien === undefined) throw new NotFoundException('Inscrit introuvable dans la file.');
  const monScore = score(inscrits[rangMien - 1]);

  return (
    1 +
    inscrits.filter((ligne) => {
      if (ligne.id === id) return false;
      const autre = score(ligne);
      return autre < monScore || (autre === monScore && (rangs.get(ligne.id) ?? 0) < rangMien);
    }).length
  );
}

/**
 * Formulaires publics du pré-lancement.
 *
 * Aucun tenant ni authentification : le visiteur n'a ni compte ni entreprise.
 * Trois barrières anti-spam empilées — pot de miel (voir DTO), limitation de
 * débit par adresse IP (`@Throttle` côté contrôleur) et adresse unique en
 * base — mais aucune simulation : chaque réponse provient de la base.
 */
@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inscrit un visiteur à la liste d'attente. L'adresse est normalisée
   * d'abord (minuscules, espaces rognés) : c'est la même clé unique en base,
   * sinon « Amina@Exemple.cm » contournerait « amina@exemple.cm ».
   */
  async inscrireListeAttente(dto: InscriptionListeAttenteDto): Promise<ResultatInscription> {
    const email = dto.email.trim().toLowerCase();

    const existant = await this.prisma.listeAttente.findUnique({ where: { email } });
    if (existant) return this.reponseDejaInscrit(existant);

    const codeParrain = dto.parrain?.trim().toUpperCase() || null;
    let parrain_id: string | null = null;
    if (codeParrain) {
      const parrain = await this.prisma.listeAttente.findUnique({
        where: { code_parrain: codeParrain },
        select: { id: true },
      });
      parrain_id = parrain?.id ?? null;
    }

    const creation = await this.creerListeAttente({
      prenom: dto.prenom.trim(),
      email,
      entreprise: dto.entreprise?.trim() || null,
      parrain_id,
    });
    if ('deja' in creation) return this.reponseDejaInscrit(creation.deja);

    const position = await this.calculerPosition(creation.inscrit.id);
    return {
      position,
      code_parrain: creation.inscrit.code_parrain,
      // Un code inconnu ne bloque pas l'inscription : on le signale
      // honnêtement pour que le visiteur sache qu'il n'a pas de parrain.
      parrain_inconnu: Boolean(codeParrain) && parrain_id === null,
      deja_inscrit: false,
    };
  }

  /**
   * Relit la position actuelle d'un code de parrainage (restauration après
   * passage sur un autre appareil, vérification du lien partagé).
   */
  async restaurerPosition(code: string) {
    const codePropre = (code ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4,16}$/.test(codePropre)) {
      throw new NotFoundException('Code de parrainage introuvable.');
    }

    const inscrit = await this.prisma.listeAttente.findUnique({
      where: { code_parrain: codePropre },
    });
    if (!inscrit) throw new NotFoundException('Code de parrainage introuvable.');

    const [position, parrainages] = await Promise.all([
      this.calculerPosition(inscrit.id),
      this.prisma.listeAttente.count({ where: { parrain_id: inscrit.id } }),
    ]);

    return { code_parrain: inscrit.code_parrain, position, parrainages };
  }

  /** Dépose une demande de démonstration réelle et renvoie sa référence. */
  async demanderDemo(dto: DemandeDemoDto) {
    const demande = await this.prisma.demandeDemo.create({
      data: {
        prenom: dto.prenom.trim(),
        nom: dto.nom.trim(),
        email: dto.email.trim().toLowerCase(),
        telephone: dto.telephone.trim(),
        entreprise: dto.entreprise.trim(),
        formule: dto.formule,
        message: dto.message?.trim() || null,
      },
    });
    return { reference: demande.id, recu_le: demande.created_at };
  }

  private async reponseDejaInscrit(existant: {
    id: string;
    code_parrain: string;
  }): Promise<ResultatInscription> {
    return {
      position: await this.calculerPosition(existant.id),
      code_parrain: existant.code_parrain,
      parrain_inconnu: false,
      deja_inscrit: true,
    };
  }

  /**
   * Insertion avec régénération du code en cas de collision : la probabilité
   * d'écarton sur un code à 6 caractères est faible mais non nulle, et une
   * 500 pour contrainte unique serait injuste.
   */
  private async creerListeAttente(donnees: {
    prenom: string;
    email: string;
    entreprise: string | null;
    parrain_id: string | null;
  }): Promise<{ inscrit: { id: string; code_parrain: string } } | { deja: { id: string; code_parrain: string } }> {
    for (let tentative = 0; tentative < 5; tentative++) {
      try {
        const inscrit = await this.prisma.listeAttente.create({
          data: { ...donnees, code_parrain: this.genererCodeParrain() },
        });
        return { inscrit };
      } catch (e: any) {
        if (e?.code !== 'P2002') throw e;
        const cible = Array.isArray(e?.meta?.target)
          ? e.meta.target.join('|')
          : String(e?.meta?.target ?? '');
        if (cible.includes('email')) {
          // Course avec une autre requête : l'adresse est déjà prise.
          const existant = await this.prisma.listeAttente.findUnique({
            where: { email: donnees.email },
          });
          if (existant) return { deja: existant };
        }
        // Sinon : collision sur `code_parrain` → nouvelle génération.
      }
    }
    throw new BadRequestException("Enregistrement impossible : réessayez dans un instant.");
  }

  private async calculerPosition(id: string): Promise<number> {
    const inscrits = await this.prisma.listeAttente.findMany({
      select: { id: true, created_at: true, parrain_id: true },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });
    return positionPour(inscrits, id);
  }

  /** `crypto.randomInt` — jamais `Math.random` (garde-fou anti-régression). */
  private genererCodeParrain(): string {
    let code = '';
    for (let i = 0; i < 6; i++) code += ALPHABET_PARRAINAGE[randomInt(ALPHABET_PARRAINAGE.length)];
    return code;
  }
}