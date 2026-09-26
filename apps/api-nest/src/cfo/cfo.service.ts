import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class CfoService {
  private readonly logger = new Logger(CfoService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================================================
  // 1. SANTÉ & LIQUIDITÉ (CASH MANAGEMENT)
  // ==================================================

  async getSyntheseTresorerie(tenantId: string) {
    // Calcul simplifié: Encaissements totaux - Dépenses totales
    const paiements = await this.prisma.paiement.aggregate({
      where: { tenant_id: tenantId },
      _sum: { montant: true },
    });
    
    const depenses = await this.prisma.depense.aggregate({
      where: { tenant_id: tenantId },
      _sum: { montant: true },
    });

    const encaissements = Number(paiements._sum.montant || 0);
    const sorties = Number(depenses._sum.montant || 0);

    return {
      encaissements_totaux: encaissements,
      sorties_totales: sorties,
      solde_theorique: encaissements - sorties,
    };
  }

  async getBFR(tenantId: string) {
    // BFR = Créances clients + Stocks - Dettes fournisseurs
    
    // Créances Clients (Factures non payées)
    const facturesClient = await this.prisma.facture.aggregate({
      where: { tenant_id: tenantId, client_id: { not: null }, statut: { not: 'payee' } },
      _sum: { montant_total: true }
    });

    // Dettes fournisseurs (Factures fournisseurs non payées)
    const facturesFournisseur = await this.prisma.facture.aggregate({
      where: { tenant_id: tenantId, fournisseur_id: { not: null }, statut: { not: 'payee' } },
      _sum: { montant_total: true }
    });

    // Valeur du stock
    const stocks = await this.prisma.stock.findMany({
      where: { produit: { tenant_id: tenantId } },
      include: { produit: true }
    });
    
    const valeurStock = stocks.reduce((acc, stock) => {
      return acc + (stock.quantite * Number(stock.produit.prix_unitaire));
    }, 0);

    const creances = Number(facturesClient._sum.montant_total || 0);
    const dettes = Number(facturesFournisseur._sum.montant_total || 0);
    const bfr = creances + valeurStock - dettes;

    return {
      creances_clients: creances,
      valeur_stocks: valeurStock,
      dettes_fournisseurs: dettes,
      bfr: bfr
    };
  }

  async getCashRunway(tenantId: string) {
    // Runway = Solde Théorique / Moyenne des dépenses mensuelles (Cash Burn).
    // Sans historique de dépenses, le runway est indéterminé (null) plutôt que
    // simulé : les tableaux de bord affichent l'état réel de la base.
    const synthese = await this.getSyntheseTresorerie(tenantId);

    const sorties = synthese.sorties_totales;
    const cashBurnMensuel = sorties > 0 ? (sorties / 12) : 0;

    const runwayMois = cashBurnMensuel > 0 && synthese.solde_theorique > 0
      ? Number((synthese.solde_theorique / cashBurnMensuel).toFixed(1))
      : null;

    return {
      solde_actuel: synthese.solde_theorique,
      cash_burn_mensuel_estime: cashBurnMensuel,
      runway_en_mois: runwayMois,
      alerte: runwayMois === null ? 'OK' : (runwayMois < 3 ? 'CRITIQUE' : 'OK')
    };
  }

  // ==================================================
  // 2. RISQUES & CONFORMITÉ (OHADA / CEMAC)
  // ==================================================

  async getBalanceAgee(tenantId: string) {
    // Liste des factures impayées par client avec calcul du retard
    const factures = await this.prisma.facture.findMany({
      where: { 
        tenant_id: tenantId, 
        client_id: { not: null },
        statut: { in: ['envoyee', 'impayee'] }
      },
      include: { client: true }
    });

    const now = new Date();
    const balance = {
      '0_30j': 0,
      '31_60j': 0,
      '61_90j': 0,
      '90j_plus': 0,
      'details': [] as any[]
    };

    factures.forEach(f => {
      if (!f.date_echeance) return;
      const daysOverdue = Math.floor((now.getTime() - f.date_echeance.getTime()) / (1000 * 3600 * 24));
      
      if (daysOverdue <= 0) return; // Pas encore en retard

      const montant = Number(f.montant_total);
      if (daysOverdue <= 30) balance['0_30j'] += montant;
      else if (daysOverdue <= 60) balance['31_60j'] += montant;
      else if (daysOverdue <= 90) balance['61_90j'] += montant;
      else balance['90j_plus'] += montant;

      balance.details.push({
        facture_id: f.id,
        client: f.client?.nom,
        retard_jours: daysOverdue,
        montant: montant
      });
    });

    return balance;
  }

  async getTvaEstimee(tenantId: string) {
    // Calcul de TVA collectée (sur factures clients) et déductible (sur factures fournisseurs)
    const tvaCollecteeAggr = await this.prisma.facture.aggregate({
      where: { tenant_id: tenantId, client_id: { not: null } },
      _sum: { montant_tva: true }
    });

    const tvaDeductibleAggr = await this.prisma.facture.aggregate({
      where: { tenant_id: tenantId, fournisseur_id: { not: null } },
      _sum: { montant_tva: true }
    });

    const collectee = Number(tvaCollecteeAggr._sum.montant_tva || 0);
    const deductible = Number(tvaDeductibleAggr._sum.montant_tva || 0);

    return {
      tva_collectee: collectee,
      tva_deductible: deductible,
      solde_tva: collectee - deductible, // Si > 0, à payer à l'état
      conseil: (collectee - deductible) > 0 ? 'Provisionnez ce montant pour le 15 du mois prochain.' : 'Crédit de TVA en votre faveur.'
    };
  }

  async getAnomalies(tenantId: string) {
    // Récupère les documents marqués "a_auditer" ou à fort niveau de risque (Shadow Alerts de l'IA)
    const anomalies = await this.prisma.document.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { statut_validation: 'a_auditer' },
          { niveau_risque: { gte: 8 } }
        ]
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    return anomalies.map(doc => ({
      id: doc.id,
      date: doc.created_at,
      type: doc.type_document,
      risque: doc.niveau_risque,
      message: doc.statut_validation === 'a_auditer' 
        ? "Anomalie détectée (Montant inhabituel ou fournisseur suspect)"
        : "Risque de conformité ou fraude détecté par l'IA",
      lien: doc.lien_minio
    }));
  }

  // ==================================================
  // 3. APPRENTISSAGE CONTINU & STRATÉGIE
  // ==================================================

  async setStrategieTenant(tenantId: string, strategie: string) {
    // Stockage de la stratégie dans le JSON parametres du Tenant
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return null;

    const currentParams = typeof tenant.parametres === 'object' && tenant.parametres !== null ? tenant.parametres : {};
    
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        parametres: {
          ...currentParams,
          cfo_strategie: strategie
        }
      }
    });

    return { message: `Stratégie mise à jour : ${strategie}`, active: true };
  }

  async getStrategieTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.parametres) return { strategie: 'croissance' }; // par défaut

    const params = tenant.parametres as any;
    return { strategie: params.cfo_strategie || 'croissance' };
  }
}
