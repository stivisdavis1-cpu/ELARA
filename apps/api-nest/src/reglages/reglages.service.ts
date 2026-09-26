import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

/** Valeurs admises par l'enum PostgreSQL `statut_abonnement`. */
const STATUTS_ABONNEMENT = ['actif', 'suspendu', 'annule', 'essai'] as const;
const SYSTEMES_COMPTABLES = ['SYSCOHADA', 'PCG', 'IFRS', 'AUTRE'] as const;

type Parametres = {
  plan?: string;
  quotas?: { documents?: number; clients?: number; factures?: number; stockage_mo?: number };
  onboarding?: Record<string, unknown>;
  [cle: string]: unknown;
};

@Injectable()
export class ReglagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Profil de l'organisation : c'est la source des libellés affichés partout. */
  async profil(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Organisation introuvable.');
    const parametres = (tenant.parametres ?? {}) as Parametres;
    return {
      id: tenant.id,
      raison_sociale: tenant.raison_sociale,
      secteur: tenant.secteur,
      pays: tenant.pays,
      ville: tenant.ville,
      devise: tenant.devise,
      systeme_comptable: tenant.systeme_comptable,
      statut_abonnement: tenant.statut_abonnement,
      parametres,
      plan: parametres.plan ?? this.planImplicite(tenant.statut_abonnement),
      quotas: parametres.quotas ?? null,
      onboarding: parametres.onboarding ?? null,
    };
  }

  async modifierProfil(tenantId: string, data: any) {
    await this.profil(tenantId);
    if (data?.statut_abonnement && !STATUTS_ABONNEMENT.includes(data.statut_abonnement)) {
      throw new BadRequestException(`Statut d'abonnement invalide. Attendu : ${STATUTS_ABONNEMENT.join(', ')}.`);
    }
    if (data?.systeme_comptable && !SYSTEMES_COMPTABLES.includes(data.systeme_comptable)) {
      throw new BadRequestException(`Système comptable invalide. Attendu : ${SYSTEMES_COMPTABLES.join(', ')}.`);
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(data?.raison_sociale !== undefined ? { raison_sociale: String(data.raison_sociale).trim() || 'Entreprise' } : {}),
        ...(data?.secteur !== undefined ? { secteur: data.secteur || null } : {}),
        ...(data?.pays !== undefined ? { pays: data.pays || null } : {}),
        ...(data?.ville !== undefined ? { ville: data.ville || null } : {}),
        ...(data?.devise !== undefined ? { devise: data.devise || 'XAF' } : {}),
        ...(data?.systeme_comptable !== undefined ? { systeme_comptable: data.systeme_comptable } : {}),
        ...(data?.statut_abonnement !== undefined ? { statut_abonnement: data.statut_abonnement } : {}),
      },
    });
  }

  /**
   * Volumétrie réelle, calculée sur les tables métier. Comparée aux quotas
   * éventuellement déclarés dans `parametres.quotas` : tant qu'aucun quota
   * n'est configuré, `depassement` vaut `null` plutôt qu'un pourcentage
   * calculé sur une base inventée.
   */
  async usage(tenantId: string) {
    const [documents, clients, fournisseurs, factures, paiements, employes, workflows] = await Promise.all([
      this.prisma.document.count({ where: { tenant_id: tenantId, deleted_at: null } }),
      this.prisma.client.count({ where: { tenant_id: tenantId, deleted_at: null } }),
      this.prisma.fournisseur.count({ where: { tenant_id: tenantId, deleted_at: null } }),
      this.prisma.facture.count({ where: { tenant_id: tenantId, deleted_at: null } }),
      this.prisma.paiement.count({ where: { tenant_id: tenantId, deleted_at: null } }),
      this.prisma.employe.count({ where: { tenant_id: tenantId } }),
      this.prisma.workflow.count({ where: { tenant_id: tenantId } }),
    ]);

    const documentsAvecTaille = await this.prisma.document.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      select: { archive_size: true },
    });
    const octets = documentsAvecTaille.reduce((somme, d) => somme + (d.archive_size ?? 0), 0);

    const tenant = await this.profil(tenantId);
    const quotas = tenant.quotas ?? {};

    return {
      documents,
      clients,
      fournisseurs,
      factures,
      paiements,
      employes,
      workflows,
      stockage_octets: octets,
      stockage_mo: Number((octets / 1_048_576).toFixed(2)),
      quotas,
      depassement: {
        documents: this.taux(documents, quotas.documents),
        clients: this.taux(clients, quotas.clients),
        factures: this.taux(factures, quotas.factures),
        stockage_mo: this.taux(Number((octets / 1_048_576).toFixed(2)), quotas.stockage_mo),
      },
    };
  }

  /** Enregistre les réponses d'onboarding et active l'horodatage de fin. */
  async enregistrerOnboarding(tenantId: string, reponses: Record<string, unknown>) {
    const tenant = await this.profil(tenantId);
    const parametres: Parametres = {
      ...((tenant.parametres ?? {}) as Parametres),
      onboarding: { ...((tenant.parametres as Parametres)?.onboarding ?? {}), ...reponses, termine_le: new Date().toISOString() },
    };

    // Les réponses qui correspondent à une colonne de `tenants` sont
    // réellement écrites dans la colonne, pas seulement dans le JSON.
    const colonne: Record<string, unknown> = {};
    if (reponses['raison_sociale']) colonne.raison_sociale = String(reponses['raison_sociale']).trim();
    if (reponses['pays']) colonne.pays = String(reponses['pays']);
    if (reponses['ville']) colonne.ville = String(reponses['ville']);
    if (reponses['secteur']) colonne.secteur = String(reponses['secteur']);
    if (reponses['devise'] && /^[A-Z]{3}$/.test(String(reponses['devise']))) {
      colonne.devise = String(reponses['devise']);
    }
    if (reponses['systeme_comptable'] && SYSTEMES_COMPTABLES.includes(reponses['systeme_comptable'] as any)) {
      colonne.systeme_comptable = reponses['systeme_comptable'];
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { ...colonne, parametres: parametres as any },
    });
    return { ...(await this.profil(tenantId)), enregistre: true };
  }

  /** Définit le plan et les quotas affichés par la page Réglages. */
  async definirQuotas(tenantId: string, data: any) {
    const tenant = await this.profil(tenantId);
    const parametres: Parametres = {
      ...((tenant.parametres ?? {}) as Parametres),
      ...(data?.plan ? { plan: String(data.plan) } : {}),
      ...(data?.quotas ? { quotas: this.normaliserQuotas(data.quotas) } : {}),
    };
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { parametres: parametres as any } });
    return this.profil(tenantId);
  }

  private normaliserQuotas(brut: any) {
    const quotas: Record<string, number> = {};
    for (const [cle, valeur] of Object.entries(brut ?? {})) {
      const nombre = Number(valeur);
      // `null` retire volontairement un quota ; 0 ou négatif n'a pas de sens.
      quotas[cle] = valeur === null || valeur === '' ? (null as unknown as number) : Math.max(0, Number.isNaN(nombre) ? 0 : Math.floor(nombre));
    }
    return quotas as any;
  }

  private planImplicite(statut: string | null): string {
    if (statut === 'essai') return 'Découverte (essai)';
    if (statut === 'actif') return 'Scale';
    if (statut === 'suspendu') return 'Suspendu';
    if (statut === 'annule') return 'Résilié';
    return 'Non renseigné';
  }

  /** Pourcentage consommé, ou `null` si aucun quota n'est configuré. */
  private taux(consomme: number, quota?: number | null): number | null {
    if (quota === undefined || quota === null || quota <= 0) return null;
    return Number(((consomme / quota) * 100).toFixed(1));
  }
}
