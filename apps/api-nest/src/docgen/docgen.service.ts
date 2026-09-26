import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { MinioService } from '../scanner/minio.service.js';
import { Bloc, construireDocx } from './docx.builder.js';

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Champs fusionnés par défaut dans tous les gabarits. */
export interface ContexteDocument {
  entreprise?: string | null;
  devise?: string | null;
  [cle: string]: unknown;
}

@Injectable()
export class DocgenService {
  private readonly logger = new Logger(DocgenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockage: MinioService,
  ) {}

  /* ---------------------------------------------------------------- */
  /* Gabarits                                                          */
  /* ---------------------------------------------------------------- */

  async listerTemplates(tenantId: string) {
    return this.prisma.documentTemplate.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ actif: 'desc' }, { nom: 'asc' }],
    });
  }

  async creerTemplate(tenantId: string, data: any) {
    const nom = String(data?.nom ?? '').trim();
    if (!nom) throw new BadRequestException('Le nom du gabarit est obligatoire.');
    return this.prisma.documentTemplate.create({
      data: {
        tenant_id: tenantId,
        nom,
        type: data?.type ?? 'autre',
        description: data?.description ?? null,
        corps: this.defautCorps(data?.type, data?.corps),
        champs: this.defautChamps(data?.champs),
        actif: data?.actif ?? true,
      },
    });
  }

  async modifierTemplate(tenantId: string, id: string, data: any) {
    await this.exigerTemplate(tenantId, id);
    return this.prisma.documentTemplate.update({
      where: { id },
      data: {
        ...(data?.nom !== undefined ? { nom: String(data.nom).trim() } : {}),
        ...(data?.type !== undefined ? { type: data.type } : {}),
        ...(data?.description !== undefined ? { description: data.description } : {}),
        ...(data?.corps !== undefined ? { corps: String(data.corps) } : {}),
        ...(data?.champs !== undefined ? { champs: this.defautChamps(data.champs) } : {}),
        ...(data?.actif !== undefined ? { actif: Boolean(data.actif) } : {}),
      },
    });
  }

  async supprimerTemplate(tenantId: string, id: string) {
    const template = await this.exigerTemplate(tenantId, id);
    // Les documents déjà produits sont conservés : la relation est ON DELETE SET NULL.
    await this.prisma.documentTemplate.delete({ where: { id: template.id } });
    return { supprime: true, id: template.id };
  }

  private async exigerTemplate(tenantId: string, id: string) {
    const template = await this.prisma.documentTemplate.findFirst({ where: { id, tenant_id: tenantId } });
    if (!template) throw new NotFoundException('Gabarit introuvable pour cette organisation.');
    return template;
  }

  /**
   * Propose un corps et une liste de champs quand l'appelant n'en fournit pas.
   * Le corps est un squelette générique, pas un document d'exemple : les
   * balises {{cle}} sont ce que la page de génération remplit réellement.
   */
  private defautCorps(type: string | undefined, fourni: unknown): string {
    if (typeof fourni === 'string' && fourni.trim()) return fourni;
    switch (type) {
      case 'facture':
        return '{{titre}}\n\nClient : {{client_nom}}\nAdresse : {{client_adresse}}\n\n Désignation\t Quantité\t Prix unitaire\t Montant\n{{lignes}}\n\nTotal : {{montant_total}} {{devise}}';
      case 'devis':
        return '{{titre}}\n\nClient : {{client_nom}}\n\n{{lignes}}\n\nTotal estimé : {{montant_total}} {{devise}}';
      case 'bon_commande':
        return '{{titre}}\n\nFournisseur : {{fournisseur_nom}}\n\n{{lignes}}\n\nTotal : {{montant_total}} {{devise}}';
      case 'releve':
        return '{{titre}}\n\nPériode : {{periode}}\n\nSolde d\'ouverture : {{solde_ouverture}} {{devise}}\nSolde de clôture : {{solde_cloture}} {{devise}}';
      case 'contrat':
        return '{{titre}}\n\nEntre les soussignés : {{entreprise}} et {{client_nom}}\n\n{{corps_contrat}}';
      default:
        return '{{titre}}\n\n{{client_nom}}\n\n{{corps}}';
    }
  }

  private defautChamps(fourni: unknown): any[] {
    const defauts = [
      { cle: 'titre', label: 'Titre du document', type: 'texte' },
      { cle: 'client_nom', label: 'Client', type: 'texte' },
      { cle: 'client_adresse', label: 'Adresse du client', type: 'texte' },
      { cle: 'lignes', label: 'Lignes (séparées par despoints-virgules)', type: 'texte' },
      { cle: 'montant_total', label: 'Montant total', type: 'nombre' },
    ];
    if (Array.isArray(fourni) && fourni.length) return fourni;
    if (typeof fourni === 'string' && fourni.trim()) {
      try {
        const parse = JSON.parse(fourni);
        if (Array.isArray(parse)) return parse;
      } catch {
        throw new BadRequestException('Le champ « champs » doit être un tableau JSON valide.');
      }
    }
    return defauts;
  }

  /* ---------------------------------------------------------------- */
  /* Documents générés                                                 */
  /* ---------------------------------------------------------------- */

  async listerDocuments(tenantId: string) {
    return this.prisma.documentGenere.findMany({
      where: { tenant_id: tenantId },
      include: { template: { select: { id: true, nom: true, type: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Produit un vrai .docx : fusion du gabarit, écriture du conteneur
   * WordprocessingML, dépôt dans le stockage objet, puis enregistrement de
   * la ligne `documents` (binaire) et de la ligne `documents_generes`
   * (métadonnées métier). Le fichier est donc téléchargeable depuis la GED
   * comme n'importe quel document scanné.
   */
  async generer(tenantId: string, data: any, auteurId?: string) {
    const template = await this.exigerTemplate(tenantId, String(data?.template_id ?? ''));
    const numero = String(data?.numero ?? '').trim() || (await this.prochainNumero(tenantId, template.type));

    const client = data?.client_id
      ? await this.prisma.client.findFirst({ where: { id: data.client_id, tenant_id: tenantId } })
      : null;
    const fournisseur = data?.fournisseur_id
      ? await this.prisma.fournisseur.findFirst({ where: { id: data.fournisseur_id, tenant_id: tenantId } })
      : null;
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });

    const donnees = this.construireDonnees(data?.donnees, {
      titre: `${this.libelleType(template.type)} ${numero}`,
      client_nom: client?.nom ?? null,
      client_adresse: client?.adresse ?? null,
      fournisseur_nom: fournisseur?.nom ?? null,
      entreprise: tenant?.raison_sociale ?? null,
      devise: tenant?.devise ?? 'XAF',
    });

    const buffer = construireDocx(this.versBlocs(template.corps ?? '', donnees, template.type));
    const fichier = `${this.sanitiser(numero)}.docx`;

    const televersement = await this.stockage.uploadFile(tenantId, {
      buffer,
      originalname: fichier,
      mimetype: MIME_DOCX,
      size: buffer.length,
    });

    const document = await this.prisma.document.create({
      data: {
        tenant_id: tenantId,
        lien_minio: televersement.url,
        type_document: template.type,
        score_confiance: 1,
        niveau_risque: 0,
        statut_validation: 'genere',
        hash_document: televersement.hash,
      },
    });

    return this.prisma.documentGenere.create({
      data: {
        tenant_id: tenantId,
        template_id: template.id,
        document_id: document.id,
        numero,
        type: template.type,
        client_id: client?.id ?? null,
        fournisseur_id: fournisseur?.id ?? null,
        destinataire: (client?.nom ?? fournisseur?.nom ?? null) as string | null,
        montant: data?.montant != null ? Number(data.montant) : null,
        statut: 'genere',
        donnees: donnees as any,
        fichier,
        created_by: auteurId ?? null,
      },
      include: { template: { select: { id: true, nom: true } } },
    });
  }

  /** Récupère le binaire généré pour téléchargement. */
  async telecharger(tenantId: string, id: string) {
    const genere = await this.prisma.documentGenere.findFirst({
      where: { id, tenant_id: tenantId },
      include: { document: true },
    });
    if (!genere?.document?.lien_minio) {
      throw new NotFoundException('Document généré introuvable ou binaire absent.');
    }
    const buffer = await this.stockage.readBuffer(genere.document.lien_minio);
    return { nom: genere.fichier ?? `${genere.numero}.docx`, buffer };
  }

  async changerStatut(tenantId: string, id: string, statut: string) {
    await this.exigerDocument(tenantId, id);
    const autorises = ['brouillon', 'genere', 'valide', 'envoye'];
    if (!autorises.includes(statut)) {
      throw new BadRequestException(`Statut invalide. Attendu : ${autorises.join(', ')}.`);
    }
    return this.prisma.documentGenere.update({ where: { id }, data: { statut } });
  }

  async supprimerDocument(tenantId: string, id: string) {
    const genere = await this.exigerDocument(tenantId, id);
    await this.prisma.documentGenere.delete({ where: { id: genere.id } });
    return { supprime: true, id: genere.id };
  }

  private async exigerDocument(tenantId: string, id: string) {
    const genere = await this.prisma.documentGenere.findFirst({ where: { id, tenant_id: tenantId } });
    if (!genere) throw new NotFoundException('Document généré introuvable pour cette organisation.');
    return genere;
  }

  private async prochainNumero(tenantId: string, type: string): Promise<string> {
    const annee = new Date().getFullYear();
    const prefixe = { facture: 'FAC', devis: 'DEV', bon_commande: 'BC', releve: 'REL', contrat: 'CTR' }[type] ?? 'DOC';
    const dernier = await this.prisma.documentGenere.findFirst({
      where: { tenant_id: tenantId, numero: { startsWith: `${prefixe}-${annee}-` } },
      orderBy: { created_at: 'desc' },
      select: { numero: true },
    });
    const sequence = dernier ? Number(dernier.numero.split('-').pop()) + 1 || 1 : 1;
    return `${prefixe}-${annee}-${String(sequence).padStart(4, '0')}`;
  }

  private libelleType(type: string): string {
    return (
      { facture: 'FACTURE', devis: 'DEVIS', bon_commande: 'BON DE COMMANDE', releve: 'RELEVE', contrat: 'CONTRAT' }[
        type
      ] ?? 'DOCUMENT'
    );
  }

  private sanitiser(valeur: string): string {
    return String(valeur).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'document';
  }

  /** Fusionne les données fournies avec le contexte par défaut. */
  private construireDonnees(fourni: unknown, defauts: Record<string, unknown>): Record<string, unknown> {
    const base: Record<string, unknown> = { ...defauts };
    if (fourni && typeof fourni === 'object' && !Array.isArray(fourni)) {
      for (const [cle, valeur] of Object.entries(fourni as Record<string, unknown>)) {
        if (valeur !== undefined && valeur !== null && String(valeur) !== '') base[cle] = valeur;
      }
    }
    return base;
  }

  /**
   * Transforme le corps du gabarit en blocs Word.
   *
   * `{{lignes}}` est le cas particulier : la valeur est une liste de
   * descriptions séparées par des points-virgules qui devient un tableau Word,
   * pas une phrase illisible.
   */
  private versBlocs(corps: string, donnees: Record<string, unknown>, type: string): Bloc[] {
    const titre = String(donnees.titre ?? this.libelleType(type));
    const blocs: Bloc[] = [{ type: 'titre', texte: titre }];

    const lignes = String(donnees.lignes ?? '')
      .split(';')
      .map((l) => l.trim())
      .filter(Boolean);

    // Le reste du corps, balise {{lignes}} exclue, garde ses sauts de ligne.
    const reste = corps.replace(/\{\{\s*lignes\s*\}\}/g, '');
    for (const paragraphe of reste.split(/\n{2,}/)) {
      const texte = this.fusionner(paragraphe, donnees).replace(/^[ \t]+|[ \t]+$/gm, '').trim();
      if (!texte) continue;
      blocs.push({ type: texte === this.fusionner(titre, donnees) ? 'sous_titre' : 'paragraphe', texte });
    }

    if (lignes.length) {
      blocs.push({
        type: 'tableau',
        entetes: ['Désignation', 'Quantité', 'Montant'],
        lignes: lignes.map((l) => this.enCellules(l)),
      });
    }

    return blocs;
  }

  /** « Prestation ; 2 ; 150000 » → trois cellules. */
  private enCellules(ligne: string): string[] {
    const morceaux = ligne.split('|').map((c) => c.trim());
    if (morceaux.length >= 3) return morceaux.slice(0, 3);
    const [designation, ...reste] = morceaux;
    return [designation ?? '', reste[0] ?? '', reste.slice(1).join(' ')];
  }

  /** Remplace `{{cle}}` par sa valeur ; une balise inconnue reste visible. */
  private fusionner(texte: string, donnees: Record<string, unknown>): string {
    return texte.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (balise, cle: string) => {
      const valeur = donnees[cle];
      return valeur === undefined || valeur === null ? balise : String(valeur);
    });
  }
}
