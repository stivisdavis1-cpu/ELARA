import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { IntegrationsService } from '../integrations/integrations.service.js';
import { DocgenService } from '../docgen/docgen.service.js';

/* ------------------------------------------------------------------ */
/* Types du moteur                                                     */
/* ------------------------------------------------------------------ */

export interface Condition {
  champ: string;
  operateur: '>' | '>=' | '<' | '<=' | '==' | '!=' | 'contient';
  valeur: string | number;
}

export interface ActionWorkflow {
  type: 'creer_validation' | 'webhook' | 'generer_document' | 'marquer_statut';
  template_id?: string;
  statut?: string;
  message?: string;
  evenement?: string;
}

/** Une unitÃ© de travail que le moteur sait Ã©valuer. */
export interface Cible {
  type: string;
  id: string;
  libelle: string;
  /** Champs exposÃ©s aux conditions, rÃ©solus par chemin pointÃ©. */
  contexte: Record<string, unknown>;
}

const TYPES_CIBLES = ['facture', 'paiement', 'document', 'client', 'fournisseur'] as const;

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
    private readonly docgen: DocgenService,
  ) {}

  /* ---------------------------------------------------------------- */
  /* CRUD                                                              */
  /* ---------------------------------------------------------------- */

  async lister(tenantId: string) {
    return this.prisma.workflow.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ actif: 'desc' }, { nom: 'asc' }],
      include: { _count: { select: { executions: true } } },
    });
  }

  async creer(tenantId: string, data: any) {
    const nom = String(data?.nom ?? '').trim();
    if (!nom) throw new BadRequestException('Le nom du workflow est obligatoire.');
    return this.prisma.workflow.create({
      data: {
        tenant_id: tenantId,
        nom,
        description: data?.description ?? null,
        declencheur: data?.declencheur ?? 'manuel',
        evenement: data?.evenement ?? null,
        frequence: data?.frequence ?? null,
        conditions: this.validerConditions(data?.conditions) as unknown as Prisma.InputJsonValue,
        actions: this.validerActions(data?.actions) as unknown as Prisma.InputJsonValue,
        actif: data?.actif ?? true,
      },
    });
  }

  async modifier(tenantId: string, id: string, data: any) {
    await this.exiger(tenantId, id);
    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...(data?.nom !== undefined ? { nom: String(data.nom).trim() } : {}),
        ...(data?.description !== undefined ? { description: data.description } : {}),
        ...(data?.declencheur !== undefined ? { declencheur: data.declencheur } : {}),
        ...(data?.evenement !== undefined ? { evenement: data.evenement } : {}),
        ...(data?.frequence !== undefined ? { frequence: data.frequence } : {}),
        ...(data?.conditions !== undefined
          ? { conditions: this.validerConditions(data.conditions) as unknown as Prisma.InputJsonValue }
          : {}),
        ...(data?.actions !== undefined
          ? { actions: this.validerActions(data.actions) as unknown as Prisma.InputJsonValue }
          : {}),
        ...(data?.actif !== undefined ? { actif: Boolean(data.actif) } : {}),
      },
    });
  }

  async supprimer(tenantId: string, id: string) {
    const workflow = await this.exiger(tenantId, id);
    await this.prisma.workflow.delete({ where: { id: workflow.id } });
    return { supprime: true, id: workflow.id };
  }

  async historique(tenantId: string, limit = 50) {
    return this.prisma.workflowExecution.findMany({
      where: { tenant_id: tenantId },
      orderBy: { debut: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      include: { workflow: { select: { id: true, nom: true } } },
    });
  }

  private async exiger(tenantId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({ where: { id, tenant_id: tenantId } });
    if (!workflow) throw new NotFoundException('Workflow introuvable pour cette organisation.');
    return workflow;
  }

  private validerConditions(brut: unknown): Condition[] {
    if (brut === undefined || brut === null) return [];
    const liste = typeof brut === 'string' ? JSON.parse(brut) : brut;
    if (!Array.isArray(liste)) throw new BadRequestException('Â« conditions Â» doit Ãªtre un tableau.');
    return liste.map((c: any) => {
      const operateur = c?.operateur;
      if (!c?.champ) throw new BadRequestException('Chaque condition doit nommer un Â« champ Â».');
      if (!['>', '>=', '<', '<=', '==', '!=', 'contient'].includes(operateur)) {
        throw new BadRequestException(`OpÃ©rateur d'automatisation non pris en charge : ${operateur}`);
      }
      return { champ: String(c.champ), operateur, valeur: c.valeur };
    });
  }

  private validerActions(brut: unknown): ActionWorkflow[] {
    if (brut === undefined || brut === null) return [];
    const liste = typeof brut === 'string' ? JSON.parse(brut) : brut;
    if (!Array.isArray(liste)) throw new BadRequestException('Â« actions Â» doit Ãªtre un tableau.');
    return liste.map((a: any) => {
      if (!['creer_validation', 'webhook', 'generer_document', 'marquer_statut'].includes(a?.type)) {
        throw new BadRequestException(`Type d'action non pris en charge : ${a?.type}`);
      }
      return a as ActionWorkflow;
    });
  }

  /* ---------------------------------------------------------------- */
  /* Moteur                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * ExÃ©cute un workflow : collecte les cibles de son Ã©vÃ©nement, ne retient
   * que celles qui satisfont toutes les conditions, puis applique chaque
   * action. Chaque passage produit une ligne `workflow_executions` avec le
   * dÃ©tail de ce qui a rÃ©ellement Ã©tÃ© fait â€” un workflow qui ne fait rien
   * est enregistrÃ© comme `ignore`, pas comme un succÃ¨s silencieux.
   */
  async executer(tenantId: string, id: string, declencheur = 'manuel') {
    const workflow = await this.exiger(tenantId, id);
    const debut = Date.now();
    const conditions = (workflow.conditions ?? []) as unknown as Condition[];
    const actions = (workflow.actions ?? []) as unknown as ActionWorkflow[];

    const cibles = await this.cibles(tenantId, workflow.evenement);
    const retenues = cibles.filter((cible) => this.satisfait(cible, conditions));
    const journal: any[] = [];
    const erreurs: string[] = [];

    for (const cible of retenues) {
      for (const action of actions) {
        try {
          journal.push(await this.appliquer(tenantId, workflow, cible, action));
        } catch (e: any) {
          erreurs.push(`${cible.libelle} â†’ ${action.type} : ${e?.message ?? e}`);
        }
      }
    }

    const statut = erreurs.length ? (journal.length ? 'succes_partiel' : 'echec') : retenues.length ? 'succes' : 'ignore';

    const execution = await this.prisma.workflowExecution.create({
      data: {
        tenant_id: tenantId,
        workflow_id: workflow.id,
        statut,
        declencheur,
        cible: `${retenues.length}/${cibles.length} cible(s)`,
        resultat: { cibles_examinees: cibles.length, retenues: retenues.length, actions: journal, erreurs } as Prisma.InputJsonValue,
        erreur: erreurs.length ? erreurs.join(' | ') : null,
        debut: new Date(debut),
        fin: new Date(),
      },
    });

    await this.prisma.workflow.update({
      where: { id: workflow.id },
      data: { derniere_execution: new Date() },
    });

    return execution;
  }

  /** ExÃ©cute tous les workflows actifs d'un Ã©vÃ©nement donnÃ©. */
  async executerTous(tenantId: string, evenement?: string) {
    const workflows = await this.prisma.workflow.findMany({
      where: { tenant_id: tenantId, actif: true, ...(evenement ? { evenement } : {}) },
    });
    const executions = [];
    for (const workflow of workflows) {
      executions.push(await this.executer(tenantId, workflow.id, evenement ?? workflow.declencheur ?? 'manuel'));
    }
    return executions;
  }

  private async appliquer(
    tenantId: string,
    workflow: { id: string; nom: string },
    cible: Cible,
    action: ActionWorkflow,
  ): Promise<Record<string, unknown>> {
    switch (action.type) {
      case 'creer_validation': {
        const validation = await this.prisma.validation.create({
          data: {
            tenant_id: tenantId,
            type: cible.type,
            titre: `${workflow.nom} â€” ${cible.libelle}`,
            detail:
              action.message ??
              `DÃ©clenchÃ© automatiquement par Â« ${workflow.nom} Â» sur ${cible.type} ${cible.id}.`,
            cible_type: cible.type,
            cible_id: cible.id,
            montant: Number(cible.contexte['montant_total'] ?? cible.contexte['montant'] ?? 0) || null,
            donnees: cible.contexte as any,
            statut: 'en_attente',
          },
        });
        return { action: 'creer_validation', validation_id: validation.id, cible: cible.id };
      }

      case 'webhook': {
        const resultat = await this.integrations.diffuser(tenantId, action.evenement ?? workflow.id, {
          workflow: workflow.nom,
          type: cible.type,
          id: cible.id,
          libelle: cible.libelle,
          contexte: cible.contexte,
        });
        return { action: 'webhook', evenement: action.evenement ?? workflow.id, ...resultat };
      }

      case 'generer_document': {
        if (!action.template_id) {
          return { action: 'generer_document', ignore: 'aucun gabarit sÃ©lectionnÃ©' };
        }
        const genere = await this.docgen.generer(tenantId, {
          template_id: action.template_id,
          client_id: cible.contexte['client_id'] ?? null,
          fournisseur_id: cible.contexte['fournisseur_id'] ?? null,
          montant: cible.contexte['montant_total'] ?? cible.contexte['montant'] ?? null,
          donnees: Object.fromEntries(
            Object.entries(cible.contexte).map(([k, v]) => [k, v == null ? '' : String(v)]),
          ),
        });
        return { action: 'generer_document', document_id: genere.id, numero: genere.numero };
      }

      case 'marquer_statut': {
        const statut = action.statut ?? 'relance';
        if (cible.type === 'facture') {
          const facture = await this.prisma.facture.findFirst({ where: { id: cible.id, tenant_id: tenantId } });
          if (!facture) return { action: 'marquer_statut', ignore: 'facture introuvable' };
          const modifiee = await this.prisma.facture.update({
            where: { id: facture.id },
            data: { categorie: facture.categorie ? `${facture.categorie}` : statut },
          });
          return { action: 'marquer_statut', facture_id: modifiee.id, categorie: modifiee.categorie };
        }
        if (cible.type === 'document') {
          const modifie = await this.prisma.document.update({
            where: { id: cible.id },
            data: { statut_validation: statut },
          });
          return { action: 'marquer_statut', document_id: modifie.id, statut: modifie.statut_validation };
        }
        return { action: 'marquer_statut', ignore: `type ${cible.type} non pris en charge` };
      }

      default:
        return { action: (action as any).type, ignore: 'action inconnue' };
    }
  }

  /* ---------------------------------------------------------------- */
  /* Ã‰valuation des conditions                                         */
  /* ---------------------------------------------------------------- */

  /** Toutes les conditions doivent Ãªtre vraies (ET logique). */
  private satisfait(cible: Cible, conditions: Condition[]): boolean {
    return conditions.every((condition) => this.evaluer(cible, condition));
  }

  private evaluer(cible: Cible, condition: Condition): boolean {
    const brut = this.resoudre(cible.contexte, condition.champ);
    const attendu = condition.valeur;

    switch (condition.operateur) {
      case 'contient':
        return String(brut ?? '').toLowerCase().includes(String(attendu ?? '').toLowerCase());
      case '==':
        return Number(brut) === Number(attendu) || String(brut) === String(attendu);
      case '!=':
        return !(Number(brut) === Number(attendu) || String(brut) === String(attendu));
      default: {
        const gauche = Number(brut);
        const droite = Number(attendu);
        if (Number.isNaN(gauche) || Number.isNaN(droite)) return false;
        if (condition.operateur === '>') return gauche > droite;
        if (condition.operateur === '>=') return gauche >= droite;
        if (condition.operateur === '<') return gauche < droite;
        if (condition.operateur === '<=') return gauche <= droite;
        return false;
      }
    }
  }

  /** RÃ©sout `client.nom`, `retard_jours`â€¦ en parcours d'objet. */
  private resoudre(contexte: Record<string, unknown>, chemin: string): unknown {
    return chemin
      .split('.')
      .reduce<any>((accumulateur, segment) => (accumulateur == null ? undefined : accumulateur[segment]), contexte);
  }

  /* ---------------------------------------------------------------- */
  /* Collecte des cibles                                               */
  /* ---------------------------------------------------------------- */

  private async cibles(tenantId: string, evenement?: string | null): Promise<Cible[]> {
    switch (evenement) {
      case 'facture_impayee':
        return this.ciblesFacturesImpayees(tenantId);
      case 'echeance_proche':
        return this.ciblesEcheancesProches(tenantId);
      case 'paiement_non_lie':
        return this.ciblesPaiementsNonLies(tenantId);
      case 'document_a_risque':
        return this.ciblesDocumentsARisque(tenantId);
      default:
        // Â« tous Â» (ou Ã©vÃ©nement inconnu) : on balaie les quatre familles.
        const [factures, echeances, paiements, documents] = await Promise.all([
          this.ciblesFacturesImpayees(tenantId),
          this.ciblesEcheancesProches(tenantId),
          this.ciblesPaiementsNonLies(tenantId),
          this.ciblesDocumentsARisque(tenantId),
        ]);
        return [...factures, ...echeances, ...paiements, ...documents];
    }
  }

  private async ciblesFacturesImpayees(tenantId: string): Promise<Cible[]> {
    const factures = await this.prisma.facture.findMany({
      where: { tenant_id: tenantId, statut: { in: ['impayee', 'envoyee'] }, deleted_at: null },
      include: { client: true, paiements: true },
    });
    return factures.map((f) => this.cibleFacture(tenantId, f));
  }

  private async ciblesEcheancesProches(tenantId: string): Promise<Cible[]> {
    const factures = await this.prisma.facture.findMany({
      where: { tenant_id: tenantId, statut: { in: ['impayee', 'envoyee'] }, deleted_at: null },
      include: { client: true, paiements: true },
    });
    return factures
      .filter((f) => (f.date_echeance ? this.joursDepuis(f.date_echeance) <= 0 : false))
      .map((f) => this.cibleFacture(tenantId, f));
  }

  private async ciblesPaiementsNonLies(tenantId: string): Promise<Cible[]> {
    const paiements = await this.prisma.paiement.findMany({
      where: { tenant_id: tenantId, facture_id: null, deleted_at: null },
      include: { client: true },
    });
    return paiements.map((p) => ({
      type: 'paiement',
      id: p.id,
      libelle: `Paiement ${p.id.slice(0, 8)} de ${Number(p.montant).toLocaleString('fr-FR')} (non rapprochÃ©)`,
      contexte: {
        id: p.id,
        client_id: p.client_id,
        client_nom: p.client?.nom ?? null,
        montant: Number(p.montant),
        mode_paiement: p.mode_paiement,
        date_paiement: p.date_paiement?.toISOString?.() ?? null,
        // Une relance est justifiÃ©e au-delÃ  de 7 jours sans rapprochement.
        age_paiement_jours: this.joursDepuis(p.date_paiement),
      },
    }));
  }

  private async ciblesDocumentsARisque(tenantId: string): Promise<Cible[]> {
    const documents = await this.prisma.document.findMany({
      where: { tenant_id: tenantId, deleted_at: null, NOT: { niveau_risque: null } },
    });
    return documents
      .filter((d) => (d.niveau_risque ?? 0) > 0)
      .map((d) => ({
        type: 'document',
        id: d.id,
        libelle: `Document Ã  risque (niveau ${d.niveau_risque})`,
        contexte: {
          id: d.id,
          type_document: d.type_document,
          niveau_risque: d.niveau_risque ?? 0,
          score_confiance: d.score_confiance ?? 0,
          statut_validation: d.statut_validation,
          lien_minio: d.lien_minio,
        },
      }));
  }

  private cibleFacture(
    tenantId: string,
    f: {
      id: string;
      numero: string | null;
      montant_total: unknown;
      date_echeance: Date | null;
      client_id: string | null;
      client?: { nom: string } | null;
      paiements: { montant: unknown }[];
    },
  ): Cible {
    const montant = Number(f.montant_total);
    const paye = (f.paiements ?? []).reduce((somme, p) => somme + Number(p.montant), 0);
    const reste = Math.max(montant - paye, 0);
    return {
      type: 'facture',
      id: f.id,
      libelle: `Facture ${f.numero ?? f.id.slice(0, 8)} â€” ${f.client?.nom ?? 'client inconnu'}`,
      contexte: {
        id: f.id,
        numero: f.numero,
        client_id: f.client_id,
        client_nom: f.client?.nom ?? null,
        montant_total: montant,
        montant_paye: paye,
        montant_restant: reste,
        // Retard positif = en retard. C'est la condition que l'on teste
        // le plus souvent (Â« retard_jours > 30 Â»).
        retard_jours: f.date_echeance ? -this.joursDepuis(f.date_echeance) : 0,
        taux_recouvrement: montant ? Number(((paye / montant) * 100).toFixed(1)) : 0,
      },
    };
  }

  /** Nombre de jours Ã©coulÃ©s depuis `date` (nÃ©gatif si la date est future). */
  private joursDepuis(date: Date | string): number {
    const cible = date instanceof Date ? date : new Date(date);
    return Math.floor((Date.now() - cible.getTime()) / 86_400_000);
  }

  /** Familles de cibles exposÃ©es Ã  l'interface pour construire un workflow. */
  async catalogueCibles(tenantId: string) {
    const cibles = await this.cibles(tenantId, null);
    const champsParType = new Map<string, Set<string>>();
    for (const cible of cibles) {
      if (!champsParType.has(cible.type)) champsParType.set(cible.type, new Set());
      Object.keys(cible.contexte).forEach((c) => champsParType.get(cible.type)!.add(c));
    }
    return {
      evenements: [
        { cle: 'facture_impayee', libelle: 'Facture impayÃ©e' },
        { cle: 'echeance_proche', libelle: 'Ã‰chÃ©ance Ã  venir ou dÃ©passÃ©e' },
        { cle: 'paiement_non_lie', libelle: 'Paiement non rapprochÃ©' },
        { cle: 'document_a_risque', libelle: 'Document Ã  risque' },
        { cle: 'tous', libelle: 'Toutes les cibles' },
      ],
      types: Object.fromEntries([...champsParType].map(([type, champs]) => [type, [...champs]])),
      types_connus: TYPES_CIBLES,
    };
  }
}

