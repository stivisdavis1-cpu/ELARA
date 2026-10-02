import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class BusinessMemoryService {
  private readonly logger = new Logger(BusinessMemoryService.name);

  constructor(private prisma: PrismaService) {}

  // ==========================================
  // DÉDUPLICATION (La méthode phare demandée)
  // ==========================================
  async trouverOuCreerEntite(tenantId: string, type: 'client' | 'fournisseur', criteres: { nom?: string, telephone?: string, identifiant_fiscal?: string, niu?: string, rccm?: string }) {
    this.logger.debug(`Recherche déduplication [${type}] : ${JSON.stringify(criteres)}`);
    
    // 1. Recherche par NIU (très fiable en zone CEMAC)
    if (criteres.niu) {
      const match = type === 'client' 
        ? await this.prisma.client.findFirst({ where: { tenant_id: tenantId, niu: criteres.niu } })
        : await this.prisma.fournisseur.findFirst({ where: { tenant_id: tenantId, niu: criteres.niu } });
      if (match) return match;
    }

    // 2. Recherche par RCCM
    if (criteres.rccm) {
      const match = type === 'client' 
        ? await this.prisma.client.findFirst({ where: { tenant_id: tenantId, rccm: criteres.rccm } })
        : await this.prisma.fournisseur.findFirst({ where: { tenant_id: tenantId, rccm: criteres.rccm } });
      if (match) return match;
    }

    // 3. Recherche par identifiant fiscal (générique)
    if (criteres.identifiant_fiscal) {
      const match = type === 'client' 
        ? await this.prisma.client.findFirst({ where: { tenant_id: tenantId, identifiant_fiscal: criteres.identifiant_fiscal } })
        : await this.prisma.fournisseur.findFirst({ where: { tenant_id: tenantId, identifiant_fiscal: criteres.identifiant_fiscal } });
      if (match) return match;
    }

    // 2. Recherche par téléphone
    if (criteres.telephone) {
      const match = type === 'client'
        ? await this.prisma.client.findFirst({ where: { tenant_id: tenantId, telephone: criteres.telephone } })
        : await this.prisma.fournisseur.findFirst({ where: { tenant_id: tenantId, telephone: criteres.telephone } });
      if (match) return match;
    }

    // 3. Recherche par nom (fuzzy / case insensitive)
    if (criteres.nom) {
      const match = type === 'client'
        ? await this.prisma.client.findFirst({
            where: { tenant_id: tenantId, nom: { equals: criteres.nom, mode: 'insensitive' } }
          })
        : await this.prisma.fournisseur.findFirst({
            where: { tenant_id: tenantId, nom: { equals: criteres.nom, mode: 'insensitive' } }
          });
      if (match) return match;
    }

    // Aucun match trouvé, création de l'entité
    this.logger.debug(`Aucune correspondance trouvée, création du ${type}.`);
    const data = {
      tenant_id: tenantId,
      nom: criteres.nom || 'Inconnu',
      telephone: criteres.telephone,
      identifiant_fiscal: criteres.identifiant_fiscal,
      niu: criteres.niu,
      rccm: criteres.rccm
    };

    if (type === 'client') {
      return await this.prisma.client.create({ data });
    } else {
      return await this.prisma.fournisseur.create({ data });
    }
  }

  // ==========================================
  // CRUD : CLIENTS
  // ==========================================
  async listClients(tenantId: string, limit: number = 50, offset: number = 0) {
    return this.prisma.client.findMany({ where: { tenant_id: tenantId }, take: limit, skip: offset, orderBy: { created_at: 'desc' } });
  }
  async getClient(tenantId: string, id: string) {
    return this.prisma.client.findFirst({ where: { id, tenant_id: tenantId } });
  }
  async createClient(tenantId: string, data: any) {
    return this.prisma.client.create({ data: { ...data, tenant_id: tenantId } });
  }
  async updateClient(tenantId: string, id: string, data: any) {
    return this.prisma.client.update({ where: { id }, data }); // Le guard garantit le tenant
  }

  // ==========================================
  // CRUD : FOURNISSEURS
  // ==========================================
  async listFournisseurs(tenantId: string, limit: number = 50, offset: number = 0) {
    return this.prisma.fournisseur.findMany({ where: { tenant_id: tenantId }, take: limit, skip: offset, orderBy: { created_at: 'desc' } });
  }
  async getFournisseur(tenantId: string, id: string) {
    return this.prisma.fournisseur.findFirst({ where: { id, tenant_id: tenantId } });
  }
  async createFournisseur(tenantId: string, data: any) {
    return this.prisma.fournisseur.create({ data: { ...data, tenant_id: tenantId } });
  }
  async updateFournisseur(tenantId: string, id: string, data: any) {
    return this.prisma.fournisseur.update({ where: { id }, data });
  }

  // ==========================================
  // CRUD : PRODUITS
  // ==========================================
  async listProduits(tenantId: string) {
    return this.prisma.produit.findMany({ where: { tenant_id: tenantId }, orderBy: { nom: 'asc' } });
  }
  async getProduit(tenantId: string, id: string) {
    return this.prisma.produit.findFirst({ where: { id, tenant_id: tenantId }, include: { stocks: true } });
  }
  async createProduit(tenantId: string, data: any) {
    return this.prisma.produit.create({ data: { ...data, tenant_id: tenantId } });
  }

  // ==========================================
  // CRUD : COMMANDES
  // ==========================================
  async listCommandes(tenantId: string) {
    return this.prisma.commande.findMany({ where: { tenant_id: tenantId }, include: { client: true, fournisseur: true }, orderBy: { created_at: 'desc' } });
  }
  async getCommande(tenantId: string, id: string) {
    return this.prisma.commande.findFirst({ where: { id, tenant_id: tenantId }, include: { client: true, fournisseur: true, factures: true } });
  }
  async createCommande(tenantId: string, data: any) {
    return this.prisma.commande.create({ data: { ...data, tenant_id: tenantId } });
  }

  // ==========================================
  // CRUD : FACTURES
  // ==========================================
  async listFactures(tenantId: string) {
    return this.prisma.facture.findMany({ where: { tenant_id: tenantId }, include: { client: true, fournisseur: true }, orderBy: { date_emission: 'desc' } });
  }
  async getFacture(tenantId: string, id: string) {
    return this.prisma.facture.findFirst({ where: { id, tenant_id: tenantId }, include: { client: true, fournisseur: true, paiements: true } });
  }
  /**
   * Crée une facture, de façon idempotente.
   *
   * Un même document est analysé plusieurs fois dans une vie : le chemin
   * synchrone le délègue aussi à la file d'analyse de fond, et un client
   * rescane un document ou en réimporte une copie. Sans garde ici, chaque
   * passage créait une nouvelle ligne : les créances gonflaient, le BFR
   * dérive d'un document unique et aucun montant ne correspondait à une
   * pièce identifiable.
   *
   * Deux clés, dans cet ordre : le document d'origine (preuve absolue), puis le
   * numéro de facture (le même numéro émis par le même tiers est la même pièce).
   */
  async createFacture(tenantId: string, data: {
    fournisseur_id?: string;
    client_id?: string;
    numero?: string;
    categorie?: string;
    montant_ht?: number;
    taux_tva?: number;
    montant_tva?: number;
    montant_total: number;
    date_emission?: Date;
    date_echeance?: Date;
    statut?: string;
    document_id?: string;
  }) {
    if (data.document_id) {
      const depuisDocument = await this.prisma.facture.findFirst({
        where: { tenant_id: tenantId, document_id: data.document_id },
      });
      if (depuisDocument) return depuisDocument;
    }
    if (data.numero) {
      const depuisNumero = await this.prisma.facture.findFirst({
        where: {
          tenant_id: tenantId,
          numero: data.numero,
          ...(data.fournisseur_id ? { fournisseur_id: data.fournisseur_id } : {}),
          ...(data.client_id ? { client_id: data.client_id } : {}),
        },
      });
      if (depuisNumero) return depuisNumero;
    }

    return this.prisma.facture.create({
      data: {
        tenant_id: tenantId,
        fournisseur_id: data.fournisseur_id,
        client_id: data.client_id,
        numero: data.numero,
        categorie: data.categorie,
        montant_ht: data.montant_ht,
        taux_tva: data.taux_tva,
        montant_tva: data.montant_tva,
        montant_total: data.montant_total,
        date_emission: data.date_emission,
        date_echeance: data.date_echeance,
        statut: (data.statut as any) || 'brouillon',
        document_id: data.document_id
      }
    });
  }

  // ==========================================
  // CRUD : PAIEMENTS
  // ==========================================
  async listPaiements(tenantId: string) {
    return this.prisma.paiement.findMany({ where: { tenant_id: tenantId }, include: { facture: true }, orderBy: { date_paiement: 'desc' } });
  }
  async getPaiement(tenantId: string, id: string) {
    return this.prisma.paiement.findFirst({ where: { id, tenant_id: tenantId } });
  }
  async createPaiement(tenantId: string, data: any) {
    return this.prisma.paiement.create({ data: { ...data, tenant_id: tenantId } });
  }

  // ==========================================
  // CRUD : DÉPENSES
  // ==========================================
  async listDepenses(tenantId: string) {
    return this.prisma.depense.findMany({ where: { tenant_id: tenantId }, include: { fournisseur: true }, orderBy: { date_depense: 'desc' } });
  }
  async getDepense(tenantId: string, id: string) {
    return this.prisma.depense.findFirst({ where: { id, tenant_id: tenantId } });
  }
  async createDepense(tenantId: string, data: any) {
    return this.prisma.depense.create({ data: { ...data, tenant_id: tenantId } });
  }

  // ==========================================
  // CRUD : STOCKS
  // ==========================================
  async listStocks(tenantId: string) {
    return this.prisma.stock.findMany({ where: { produit: { tenant_id: tenantId } }, include: { produit: true } });
  }
  async updateStock(tenantId: string, id: string, quantite: number) {
    return this.prisma.stock.update({ where: { id }, data: { quantite } });
  }
}
