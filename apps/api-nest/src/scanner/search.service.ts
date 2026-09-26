import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

/** Un passage de document retrouvé, avec de quoi le citer. */
export interface PassageCite {
  chunk_id: string;
  document_id: string;
  nom: string | null;
  type_document: string | null;
  page: number | null;
  extrait: string;
  score: number;
  rang: number;
  mode: 'hybride' | 'lexical' | 'semantique';
}

export interface ResultatRecherche {
  query: string;
  requete_reformulee: string;
  mode: 'hybride' | 'lexical' | 'semantique';
  passages: PassageCite[];
  /** Faux si l'IA ne dispose pas d'assez de matière pour répondre sans inventer. */
  suffisant: boolean;
  avertissements: string[];
}

export interface FiltresRecherche {
  limit?: number;
  types?: string[];
  du?: string;
  au?: string;
  /** true = archivés seulement, false = brouillons seulement, undefined = tous. */
  archives?: boolean;
}

/** Mots outils français écartés de la requête de reformulation. */
const MOTS_OUTILS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'au', 'aux', 'a', 'et', 'ou', 'que', 'qui',
  'quoi', 'dont', 'pour', 'par', 'sur', 'dans', 'avec', 'sans', 'en', 'est', 'sont', 'mon', 'ma',
  'mes', 'notre', 'nos', 'votre', 'vos', 'leur', 'plus', 'tout', 'tous', 'cette', 'ces', 'comment',
  'quelle', 'quel', 'quels', 'quelles', 'peut', 'savoir', 'besoin', 'faire', 'faut', 'y', 'aussi',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'ne', 'pas', 'plus', 'est', 'etre',
  'je', 'ce', 'se', 'on', 'si', 'il', 'ils', 'elles', 'nous', 'vous', 'leur', 'nos', 'votre',
]);

/** Développe les abréviations courantes du vocabulaire PME/finance. */
const ABREVIATIONS: Record<string, string> = {
  tva: 'tva taxe',
  is: 'impot societe',
  cae: 'chiffre affaires',
  bfr: 'besoin fonds roulement',
  treso: 'tresorerie',
  rh: 'ressources humaines',
  ged: 'gestion electronique documents',
  nc: 'note credit',
  fcfa: 'franc cfa',
  dsf: 'declaration fiscale',
  pcg: 'plan comptable general',
  bilan: 'bilan actif passif',
  resultat: 'resultat net',
  amort: 'amortissement dotation',
  emprunt: 'emprunt dette financiere',
};

/** Minuscules, sans accents ni ponctuation, pour comparer du texte. */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
/**
 * Normalise une requête pour la recherche : minuscules, sans accents, mots
 * outils retirés, abréviations développées. Les nombres sont conservés : un
 * montant ou une date est souvent le vrai critère de recherche.
 */
export function reformuler(question: string): string {
  const brut = normaliser(question);
  const jetons = brut
    .split(/[^a-z0-9%.,+-]+/)
    .map((t) => t.replace(/^[.,+-]+|[.,+-]+$/g, ''))
    .filter(Boolean);
  const significatifs = jetons.filter((t) => !MOTS_OUTILS.has(t));
  const developpes = significatifs.flatMap((t) =>
    ABREVIATIONS[t] ? [t, ...ABREVIATIONS[t].split(' ')] : [t],
  );
  return [...new Set(developpes)].join(' ').trim();
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly aiUrl = process.env.API_AI_INTERNAL_URL || 'http://localhost:8000';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Embedding via l'API IA interne.
   *
   * Retourne `null` si le service est injoignable : l'appelant bascule alors en
   * recherche lexicale. On ne renvoie jamais de vecteur aléatoire — une
   * similarité calculée sur du bruit produit des résultats silencieusement
   * faux, ce qui est plus dangereux qu'une absence de résultat.
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const reponse = await fetch(`${this.aiUrl}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
        signal: AbortSignal.timeout(8000),
      });
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
      const data = (await reponse.json()) as { embedding?: number[]; data?: number[][] };
      const vecteur = data.embedding ?? data.data?.[0];
      if (!Array.isArray(vecteur) || !vecteur.length) throw new Error('réponse sans embedding');
      return vecteur;
    } catch (e) {
      this.logger.warn(`Embeddings indisponibles, repli lexical : ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * Recherche documentaire : plein texte (BM25 via ts_rank_cd) + similarité
   * vectorielle, fusionnés par RRF, puis rerankés sur des signaux
   * déterministes (couverture des termes, phrase exacte, type connu).
   *
   * Le reranker est heuristique et non un cross-encoder : il est explicable,
   * gratuit, et suffisant pour départager les candidats déjà filtrés par la
   * fusion. La frontière est nette pour qu'un vrai reranker le remplace.
   */
  async rechercher(
    tenantId: string,
    question: string,
    filtres: FiltresRecherche = {},
  ): Promise<ResultatRecherche> {
    const limit = Math.min(Math.max(filtres.limit ?? 8, 1), 25);
    const avertissements: string[] = [];
    const requete = reformuler(question);

    if (!requete) {
      return {
        query: question,
        requete_reformulee: '',
        mode: 'lexical',
        passages: [],
        suffisant: false,
        avertissements: ['Question trop vague pour une recherche documentaire.'],
      };
    }

    const [lexicale, semantique] = await Promise.all([
      this.rechercheLexicale(tenantId, requete, limit, filtres, avertissements),
      this.rechercheSemantique(tenantId, question, limit, filtres),
    ]);

    const mode: ResultatRecherche['mode'] =
      semantique.length && lexicale.length ? 'hybride' : semantique.length ? 'semantique' : 'lexical';
    if (!semantique.length) {
      avertissements.push('Recherche sémantique indisponible : réponse fondée sur les seuls libellés.');
    }

    const rerankes = this.reranker(this.fusionRRF(lexicale, semantique), requete);

    return {
      query: question,
      requete_reformulee: requete,
      mode,
      passages: rerankes.slice(0, limit),
      // Sous trois passages, l'IA complète plutôt qu'elle n'invente : on
      // l'invite explicitement à s'abstenir.
      suffisant: rerankes.length >= 3 && rerankes[0].score > 0.05,
      avertissements,
    };
  }

  /** Fragment WHERE commun, les placeholders commençant à `depart`. */
  private filtresSql(filtres: FiltresRecherche, depart: number): { sql: string; params: unknown[] } {
    const conditions = ['d.tenant_id = $1', 'd.deleted_at IS NULL'];
    const params: unknown[] = [];
    let index = depart;

    if (filtres.types?.length) {
      conditions.push(`d.type_document = ANY($${index})`);
      params.push(filtres.types);
      index += 1;
    }
    if (filtres.archives === true) conditions.push('d.archived_at IS NOT NULL');
    if (filtres.archives === false) conditions.push('d.archived_at IS NULL');
    if (filtres.du) {
      conditions.push(`d.created_at >= $${index}`);
      params.push(new Date(filtres.du));
      index += 1;
    }
    if (filtres.au) {
      conditions.push(`d.created_at <= $${index}`);
      params.push(new Date(filtres.au));
      index += 1;
    }
    return { sql: conditions.join(' AND '), params };
  }

  private projection(): string {
    return `
      SELECT c.id, c.document_id, c.page_number, c.content,
             d.type_document,
             COALESCE(c.titre_document, d.type_document) AS nom
      FROM document_chunks c
      JOIN documents d ON c.document_id = d.id`;
  }

  /**
   * Plein texte PostgreSQL sur la colonne `tcv` (migration 04). Si la colonne
   * n'existe pas encore, repli paramétré sur ILIKE : la recherche reste
   * utilisable sur une base migrée partiellement, en le signalant.
   */
  private async rechercheLexicale(
    tenantId: string,
    requete: string,
    limit: number,
    filtres: FiltresRecherche,
    avertissements: string[],
  ): Promise<PassageCite[]> {
    const { sql: conditions, params } = this.filtresSql(filtres, 3);
    try {
      const lignes = await this.prisma.$queryRawUnsafe(
        `${this.projection()}
         WHERE ${conditions}
           AND c.tcv @@ websearch_to_tsquery('simple', $2)
         ORDER BY ts_rank_cd(c.tcv, websearch_to_tsquery('simple', $2)) DESC
         LIMIT $${params.length + 3}`,
        tenantId,
        requete,
        ...params,
        limit,
      );
      return (lignes as any[]).map((l) => this.enPassage(l, requete, 'lexical'));
    } catch (e) {
      avertissements.push("Index plein texte indisponible : recherche par mot-clé simplifiée.");
      const motifs = requete.split(' ').filter((t) => t.length > 2).slice(0, 6);
      if (!motifs.length) return [];

      // Les motifs occupent $3..$3+n, les filtres recommencent après.
      const filtresRepli = this.filtresSql(filtres, 3 + motifs.length);
      const ou = motifs.map((_, i) => `c.content ILIKE $${i + 3}`).join(' OR ');
      try {
        const lignes = await this.prisma.$queryRawUnsafe(
          `${this.projection()}
           WHERE ${conditions} AND (${ou})
           ORDER BY d.created_at DESC
           LIMIT $${filtresRepli.params.length + motifs.length + 3}`,
          tenantId,
          ...motifs.map((m) => `%${m}%`),
          ...filtresRepli.params,
          limit,
        );
        return (lignes as any[]).map((l) => this.enPassage(l, requete, 'lexical'));
      } catch (e2) {
        this.logger.warn(`Recherche lexicale impossible : ${(e2 as Error).message}`);
        return [];
      }
    }
  }

  /** Similarité cosinus sur pgvector, cloisonnée par tenant. */
  private async rechercheSemantique(
    tenantId: string,
    question: string,
    limit: number,
    filtres: FiltresRecherche,
  ): Promise<PassageCite[]> {
    const vecteur = await this.generateEmbedding(question);
    if (!vecteur) return [];
    const { sql: conditions, params } = this.filtresSql(filtres, 2);
    try {
      const lignes = await this.prisma.$queryRawUnsafe(
        `SELECT c.id, c.document_id, c.page_number, c.content,
                d.type_document,
                COALESCE(c.titre_document, d.type_document) AS nom,
                1 - (c.embedding <=> $1::vector) AS similarite
         FROM document_chunks c
         JOIN documents d ON c.document_id = d.id
         WHERE ${conditions} AND c.embedding IS NOT NULL
         ORDER BY c.embedding <=> $1::vector
         LIMIT $${params.length + 2}`,
        `[${vecteur.join(',')}]`,
        tenantId,
        ...params,
        limit,
      );
      return (lignes as any[]).map((l) => ({
        ...this.enPassage(l, question, 'semantique'),
        score: Number(l.similarite ?? 0),
      }));
    } catch (e) {
      this.logger.warn(`Recherche vectorielle impossible : ${(e as Error).message}`);
      return [];
    }
  }

  private enPassage(ligne: any, requete: string, mode: 'lexical' | 'semantique'): PassageCite {
    return {
      chunk_id: ligne.id,
      document_id: ligne.document_id,
      nom: ligne.nom ?? null,
      type_document: ligne.type_document ?? null,
      page: ligne.page_number ?? null,
      extrait: this.extrait(ligne.content, requete),
      score: 0,
      rang: 0,
      mode,
    };
  }

  /**
   * Fusion RRF : somme de 1/(k + rang) sur chaque liste. Robuste à des scores
   * non comparables (BM25 vs cosinus), contrairement à un mélange de scores
   * bruts.
   */
  private fusionRRF(lexicale: PassageCite[], semantique: PassageCite[]): PassageCite[] {
    const K = 60;
    const fusion = new Map<string, PassageCite & { rrf: number }>();

    const charger = (liste: PassageCite[]) => {
      liste.forEach((passage, index) => {
        const apport = 1 / (K + index + 1);
        const existant = fusion.get(passage.chunk_id);
        if (existant) {
          existant.rrf += apport;
          existant.score = Math.max(existant.score, passage.score);
          if (existant.mode !== passage.mode) existant.mode = 'hybride';
        } else {
          fusion.set(passage.chunk_id, { ...passage, rang: index + 1, rrf: apport });
        }
      });
    };
    charger(lexicale);
    charger(semantique);

    return [...fusion.values()]
      .sort((a, b) => b.rrf - a.rrf)
      .map(({ rrf: _rrf, ...passage }) => passage);
  }

  /**
   * Reranking déterministe : la fusion RRF décide du rappel, ce score décide de
   * la précision. On recompte la couverture réelle des termes dans le
   * passage, on bonus la phrase exacte, puis on pondère par le type connu.
   */
  private reranker(passages: PassageCite[], requete: string): PassageCite[] {
    const termes = requete.split(' ').filter((t) => t.length > 2);
    const cibleRequete = normaliser(requete);

    return passages
      .map((passage) => {
        const texte = normaliser(passage.extrait);
        const trouves = termes.filter((t) => texte.includes(t));
        const couverture = termes.length ? trouves.length / termes.length : 0;
        const phraseExacte = termes.length > 1 && texte.includes(cibleRequete) ? 0.25 : 0;
        const bonusType = passage.type_document ? 0.05 : 0;
        const score = Math.min(1, couverture * 0.6 + phraseExacte + bonusType) + passage.score * 0.2;
        return { ...passage, score: Number(Math.min(1, score).toFixed(4)) };
      })
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ ...p, rang: i + 1 }));
  }

  /** Réduit le passage à l'entourage des termes cherchés, pour citer utilement. */
  private extrait(contenu: string, requete: string, marge = 320): string {
    if (!contenu) return '';
    if (contenu.length <= marge * 2) return contenu.trim();
    const cible = normaliser(contenu);
    const termes = requete.split(' ').filter((t) => t.length > 2);
    let position = -1;
    for (const terme of termes) {
      const trouve = cible.indexOf(normaliser(terme));
      if (trouve >= 0 && (position < 0 || trouve < position)) position = trouve;
    }
    if (position < 0) return `${contenu.slice(0, marge * 2).trim()}…`;
    const debut = Math.max(0, position - marge);
    const fin = Math.min(contenu.length, position + marge);
    return `${debut > 0 ? '…' : ''}${contenu.slice(debut, fin).trim()}${fin < contenu.length ? '…' : ''}`;
  }
}
