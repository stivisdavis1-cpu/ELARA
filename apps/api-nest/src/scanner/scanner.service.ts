import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MinioService } from './minio.service.js';
import { PrismaService } from '../prisma.service.js';
import { ScannerGateway } from './scanner.gateway.js';
import { BusinessMemoryService } from '../memoire/memoire.service.js';
import { CfoService } from '../cfo/cfo.service.js';
import { OcrService } from './ocr.service.js';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service.js';
import { SearchService } from './search.service.js';

/**
 * Comparaison de termes pour la validation : minuscules, sans accents ni
 * ponctuation. Deux écritures d'un même terme (« Échéance » / « echeance »)
 * ne doivent pas compter comme deux termes différents.
 */
function normaliserComparaison(texte: string): string {
  return (texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
}

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private readonly aiUrl = process.env.API_AI_INTERNAL_URL || 'http://localhost:8000';
  private readonly archiveMemory = new Map<string, any>();

  constructor(
    private readonly minioService: MinioService,
    private readonly prisma: PrismaService,
    private readonly gateway: ScannerGateway,
    private readonly memoireService: BusinessMemoryService,
    private readonly cfoService: CfoService,
    public readonly ocrService: OcrService,
    private readonly rabbitmqService: RabbitMQService,
    private readonly searchService: SearchService,
  ) {}

  async processNewDocument(tenantId: string, file: any) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    const fs = await import('fs');
    const fileBuffer = file.buffer || fs.readFileSync(file.path);
    // Date.now() seul suffit pas : deux envois dans la même milliseconde
    // (import en masse, deux onglets) se disputaient la même clé primaire et le
    // second insert échouait.
    const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // MinioService gère lui-même le repli local si MinIO est indisponible
    const uploadResult = await this.minioService.uploadFile(tenantId, { ...file, buffer: fileBuffer });
    const url = uploadResult.url;
    const hash = uploadResult.hash;

    let totalPages = 1;
    if (file.mimetype === 'application/pdf') {
      try {
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        totalPages = pdfDoc.getPageCount();
      } catch (e) {
        this.logger.warn("Erreur lors de la lecture du nombre de pages PDF", e);
      }
    }

    // DÉTECTION DOCUMENT LOURD (ex: > 20MB)
    // On conserve le Worker lourd existant pour le moment s'il est spécifique, 
    // ou on peut tout envoyer au worker Python.
    // Pour simplifier l'architecture, envoyons TOUT au worker Python asynchrone.
    
    let dbDoc;
    try {
      dbDoc = await this.prisma.document.create({
        data: {
          id: docId,
          tenant_id: tenantId,
          lien_minio: url,
          // Type laissé vide tant que la classification n'a pas abouti : on
          // n'écrit jamais « Inconnu » en base, ce qui se retrouvait ensuite
          // dans le nom du document et le rendait intitulé « Inconnu ».
          type_document: null,
          score_confiance: 0,
          niveau_risque: 0,
          statut_validation: 'en_cours',
          hash_document: hash ? `${hash}-${docId}` : docId
        }
      });
    } catch (e: any) {
      this.logger.warn("Erreur création document DB: " + e.message);
      throw e;
    }

    // DÉTECTION DOCUMENT LOURD (ex: > 5 pages ou > 5MB)
    if (totalPages > 5 || fileBuffer.length > 5 * 1024 * 1024) {
      this.logger.log(`Document complexe détecté (${totalPages} pages, ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB). Délégation totale de l'extraction OCR au worker via RabbitMQ pour ${docId}...`);
      await this.rabbitmqService.publishDocumentTask(docId, url, file.mimetype, tenantId);
      
      return {
        message: 'Le document est volumineux. Un traitement approfondi est en cours en arrière-plan.',
        documentId: docId,
        url: url,
        name: file.originalname,
        type: 'Traitement Lourd',
        status: 'En file d\'attente IA',
        statusColor: 'var(--amber)',
        statusBg: 'rgba(245, 158, 11, 0.1)',
        extractedData: { 'Analyse': 'Extraction multi-pages en cours sur nos serveurs...' },
        alert: null,
        ocrText: ''
      };
    }

    this.logger.log(`Extraction OCR synchrone en cours pour le document ${docId}...`);
    let ocrText = '';
    let analysis: {
      smartName: string; type: string; status: string; statusColor: string; statusBg: string;
      extractedData: Record<string, unknown>; alert: unknown; mots_cles?: number; mots_cles_a_valider?: number;
    } = {
      smartName: file.originalname,
      type: '',
      status: 'Analyse Terminée',
      statusColor: 'var(--blue)',
      statusBg: 'var(--blue-light)',
      extractedData: {},
      alert: null
    };

    try {
      ocrText = await this.ocrService.extractText(fileBuffer, file.mimetype);
      
      this.logger.log(`Appel à FastAPI (Cloud LLM) pour extraction rapide JSON...`);
      // Appel API FastAPI (routeur hybride Groq/Together AI avec failover)
      const axios = (await import('axios')).default;
      const response = await axios.post(`${this.aiUrl}/ai/extract`, {
         text: ocrText,
         tenant_id: tenantId
      }, { timeout: 15000 });
      const aiData = response.data;
      
      analysis = {
          smartName: file.originalname,
          // Le type renvoyé par le LLM n'est pas fiable : on le recoupe
          // avec le texte avant de le persister.
          type: this.classerDocument(ocrText, aiData.type),
          status: 'Analyse Terminée',
          statusColor: 'var(--blue)',
          statusBg: 'var(--blue-light)',
          extractedData: aiData,
          alert: null
      };
      
      // Update DB with results if possible
      try {
        await this.prisma.document.update({
          where: { id: docId },
          data: {
            type_document: analysis.type,
            statut_validation: 'traite'
          }
        });
      } catch (dbErr: any) {
        this.logger.warn(`Impossible de mettre à jour le document en BDD (probablement un doublon): ${dbErr.message}`);
      }

      // Les éléments typés portent les mots-clés *avec leur valeur*, comme
      // les dates, et seuls ceux que le texte du document confirme sont
      // validés automatiquement. C'est ce qui permet à la fiche document
      // d'afficher « mot-clé → valeur » au lieu d'une liste de termes nus.
      const semis = await this.semerElements(docId, tenantId, aiData as Record<string, unknown>, ocrText)
        .catch((e) => {
          this.logger.warn(`Semis des éléments impossible pour ${docId}: ${e.message}`);
          return { total: 0, valides: 0, aValider: 0 };
        });
      analysis.mots_cles = semis.valides;
      analysis.mots_cles_a_valider = semis.aValider;

      // Publish shadow task to RabbitMQ for memory and background analysis
      this.logger.log(`Publication dans RabbitMQ (document_shadow_processing) pour l'analyse de fond de ${docId}...`);
      await this.rabbitmqService.publishDocumentTask(docId, url, file.mimetype, tenantId);

    } catch (e) {
      this.logger.error(`Erreur d'extraction OCR/IA: ${e}`);
      // Fallback: Délégation à RabbitMQ si l'extraction locale échoue
      this.logger.log(`Délégation de l'extraction OCR au worker FastAPI via RabbitMQ pour ${docId}...`);
      await this.rabbitmqService.publishDocumentTask(docId, url, file.mimetype, tenantId);
      
      return {
        message: 'Le document a été mis en file d\'attente pour le traitement OCR asynchrone.',
        documentId: docId,
        url: url,
        name: file.originalname,
        type: 'Analyse en cours',
        status: 'En file d\'attente IA',
        statusColor: 'var(--amber)',
        statusBg: 'rgba(245, 158, 11, 0.1)',
        extractedData: { 'Analyse': 'Extraction OCR en cours sur nos serveurs...' },
        alert: null,
        ocrText: ''
      };
    }

    // 5. Retour direct de l'analyse OCR pour la réactivité Frontend
    return {
      message: 'Document traité avec succès par le moteur OCR.',
      documentId: docId,
      url: url,
      name: analysis.smartName || file.originalname,
      type: analysis.type,
      status: analysis.status,
      statusColor: analysis.statusColor,
      statusBg: analysis.statusBg,
      extractedData: analysis.extractedData,
      alert: analysis.alert,
      ocrText: ocrText
    };
  }

  async handleDocumentProcessed(data: any) {
    this.logger.log(`Résultat IA reçu pour le document ${data.document_id} (Routeur Expert)`);

    // --- ÉCHEC DÉFINITIF (3 retries du worker épuisées) ---
    if (data.status === 'ERROR') {
      this.logger.error(`Document ${data.document_id} en échec d'analyse : ${data.erreur}`);
      let doc;
      try {
        doc = await this.prisma.document.update({
          where: { id: data.document_id },
          data: { statut_validation: 'echec', niveau_risque: 10 }
        });
      } catch (e: any) {
        this.logger.warn(`Impossible de marquer ${data.document_id} comme en échec : ${e.message}`);
        return;
      }
      this.gateway.notifyDocumentStatus(doc.tenant_id, doc.id, 'Échec de l\'analyse', {
        extractedData: data.extracted_data,
        ocrText: data.ocr_text || '',
        alert: data.erreur,
        statusColor: 'var(--red)',
        statusBg: 'rgba(162, 59, 59, 0.1)'
      });
      return;
    }

    // Conversion de date prudente : ignore les valeurs LLM aberrantes (« Invalid Date »)
    const safeDate = (value: any): Date | undefined => {
      if (!value) return undefined;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    };
    
    // Niveau de risque déduit par l'IA
    const risqueIa = data.extraction?.niveau_risque_fraude || 0;
    
    let statutDoc = data.score_confiance >= 0.85 ? 'valide_automatiquement' : 'en_attente_validation';
    let alertMessage = null;

    // --- 1. CONTRÔLE DE CONFORMITÉ OHADA ---
    if (data.type_document === 'facture' && data.extraction?.montant_total > 100000) {
        // En CEMAC, pour de gros montants, NIU obligatoire
        if (!data.extraction.niu_fournisseur) {
            statutDoc = 'non_conforme';
            alertMessage = 'Facture bloquée : NIU obligatoire absent pour ce montant (Règles OHADA).';
            this.logger.warn(`Conformité: Facture ${data.document_id} bloquée (pas de NIU).`);
        }
    }

    // --- 2. DÉTECTION D'ANOMALIES (Google/Big4 Style) ---
    // Requête SQL pour vérifier si la dépense est aberrante comparée à l'historique du fournisseur
    if (data.type_document === 'facture' && data.extraction?.nom_fournisseur && data.extraction?.montant_total) {
       const fournisseurNom = data.extraction.nom_fournisseur;
       const history = await this.prisma.facture.aggregate({
           where: { 
               tenant_id: data.tenant_id || '', 
               fournisseur: { nom: { equals: fournisseurNom, mode: 'insensitive' } } 
           },
           _avg: { montant_total: true }
       });
       
       const avg = Number(history._avg.montant_total || 0);
       // Si montant > 3x la moyenne historique, flag d'audit
       if (avg > 0 && data.extraction.montant_total > (avg * 3)) {
           statutDoc = 'a_auditer';
           alertMessage = `Alerte Fraude: Montant de ${data.extraction.montant_total} anormalement élevé comparé à la moyenne (${avg}).`;
           this.logger.warn(`Anomalie: Montant suspect pour ${fournisseurNom}.`);
       }
    }

    // Mise à jour du Document (avec niveau de risque)
    const doc = await this.prisma.document.update({
      where: { id: data.document_id },
      data: {
        type_document: data.type_document,
        score_confiance: data.score_confiance,
        niveau_risque: risqueIa > 7 || statutDoc === 'a_auditer' ? 10 : risqueIa,
        statut_validation: statutDoc,
      }
    });

    // --- Persistance de l'extraction : permet de rejouer la consultation
    // « comme après le scan » après un rechargement (visionneuse + données).
    try {
      const extractionPayload = data.extraction || data.extracted_data || null;
      await this.prisma.$executeRawUnsafe(
        `UPDATE documents SET extraction_data = $1::jsonb, ocr_text = $2, updated_at = NOW() WHERE id = $3`,
        extractionPayload == null ? null : JSON.stringify(extractionPayload),
        typeof data.ocr_text === 'string' ? data.ocr_text : '',
        data.document_id,
      );
    } catch (e: any) {
      this.logger.warn(`Persistance de l'extraction impossible pour ${data.document_id}: ${e.message}`);
    }

    // --- 3. INTÉGRATION INTELLIGENTE (Mémoire + P&L) ---
    if (data.extraction && statutDoc !== 'non_conforme') {
        const fournisseur = await this.memoireService.trouverOuCreerEntite(doc.tenant_id, 'fournisseur', {
            nom: data.extraction.nom_fournisseur,
            niu: data.extraction.niu_fournisseur,
            rccm: data.extraction.rccm_fournisseur
        });

        if (data.type_document === 'facture') {
            await this.memoireService.createFacture(doc.tenant_id, {
                fournisseur_id: fournisseur.id,
                numero: data.extraction.numero_facture,
                categorie: data.extraction.categorie || 'Non classé',
                montant_ht: data.extraction.montant_ht,
                taux_tva: data.extraction.taux_tva,
                montant_tva: data.extraction.montant_tva,
                montant_total: data.extraction.montant_total,
                date_emission: safeDate(data.extraction.date_emission),
                date_echeance: safeDate(data.extraction.date_echeance),
                statut: doc.statut_validation === 'valide_automatiquement' ? 'envoyee' : 'brouillon',
                document_id: doc.id
            });

            // --- 4. ALERTE CFO IMMÉDIATE (Cash Runway) ---
            if (doc.statut_validation === 'valide_automatiquement' && data.extraction.montant_total > 500000) {
               // On check l'impact sur le Runway
               const runway = await this.cfoService.getCashRunway(doc.tenant_id);
               if (runway.alerte === 'CRITIQUE') {
                   alertMessage = `Alerte CFO: Cette facture réduit votre Runway en dessous de 3 mois (${runway.runway_en_mois} mois restants). Action requise.`;
               }
            }

        } else if (data.type_document === 'recu' || data.type_document === 'depense') {
            await this.memoireService.createDepense(doc.tenant_id, {
                fournisseur_id: fournisseur.id,
                montant: data.extraction.montant_total,
                categorie: data.extraction.categorie || 'Autre',
                date_depense: data.extraction.date_emission ? new Date(data.extraction.date_emission) : new Date(),
                description: `Secteur AI: ${data.extraction.secteur_fournisseur || 'Inconnu'}`,
                document_id: doc.id
            });
        } else if (data.type_document === 'commande') {
            await this.memoireService.createCommande(doc.tenant_id, {
                fournisseur_id: fournisseur.id,
                numero: data.extraction.numero_facture,
                montant_total: data.extraction.montant_total,
                date_commande: data.extraction.date_emission ? new Date(data.extraction.date_emission) : null,
                statut: 'validee',
                document_id: doc.id
            });
        }
    }

    // Notification Frontend avec l'enrichissement (Alertes, Fraude) — libellé FR + données d'affichage
    const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
      valide_automatiquement: { label: 'Validé automatiquement', color: 'var(--teal)', bg: 'rgba(20, 184, 166, 0.1)' },
      en_attente_validation: { label: 'En attente de validation', color: 'var(--blue)', bg: 'var(--blue-light)' },
      a_auditer: { label: 'À auditer', color: 'var(--red)', bg: 'rgba(162, 59, 59, 0.1)' },
      non_conforme: { label: 'Non conforme', color: 'var(--red)', bg: 'rgba(162, 59, 59, 0.1)' },
    };
    const statusKey = doc.statut_validation || '';
    const statusMeta = statusLabels[statusKey] || { label: statusKey, color: 'var(--blue)', bg: 'var(--blue-light)' };
    this.gateway.notifyDocumentStatus(doc.tenant_id, doc.id, statusMeta.label, {
        extractedData: data.extracted_data || data.extraction,
        ocrText: data.ocr_text,
        alert: alertMessage,
        statusColor: statusMeta.color,
        statusBg: statusMeta.bg
    });

    // --- 5. RAG : Enrichissement de la Mémoire d'Entreprise (Shadow Processing Ollama) ---
    await this.persistCompanyMemory(doc.tenant_id, doc, data.extraction);
  }

  /**
   * Enrichit la business memory (pgvector) avec l'analyse IA du document.
   * Non bloquant : tout échec est journalisé sans casser le pipeline.
   */
  private async persistCompanyMemory(tenantId: string, doc: any, extraction: any) {
    try {
      const typeDoc = extraction?.type || extraction?.['Type de Document'] || doc.type_document || 'document';
      const resume = extraction?.Résumé || extraction?.resume_document || '';
      const contenu = `${typeDoc}${resume ? ' — ' + resume : ''}`;
      if (!resume && !typeDoc) return;

      const embedding = await this.searchService.generateEmbedding(contenu);
      // Sans embedding, la mémoire est indexée sans vecteur : la recherche
      // plein texte la trouvera, la sémantique non. Mieux vaut un index
      // partiel qu'un vecteur de bruit.
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO company_memories (id, tenant_id, content, type_info, embedding, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())`,
        tenantId,
        contenu,
        'document',
        embedding ? `[${embedding.join(',')}]` : null,
      );
      this.logger.log(
        embedding
          ? `Mémoire d'entreprise enrichie (document ${doc.id}).`
          : `Mémoire d'entreprise indexée sans vecteur (embeddings indisponibles).`,
      );
    } catch (e: any) {
      this.logger.warn(`Impossible d'enrichir la mémoire d'entreprise (RAG): ${e.message}`);
    }
  }

  handleDocumentProgress(tenantId: string, documentId: string, progress: number, message: string) {
    this.gateway.notifyDocumentProgress(tenantId, documentId, progress, message);
  }

  async getArchiveUrl(tenantId: string, documentId: string) {
    const doc = await this.findDocumentWithArchive(documentId);

    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }

    return {
      url: doc.archive_path || doc.lien_minio,
      statut: doc.statut_validation,
      niveau_risque: doc.niveau_risque,
      archive_path: doc.archive_path ?? null,
      archived_at: doc.archived_at ?? null,
    };
  }

  /**
   * Streaming du contenu binaire d'un document (mode filesystem OU MinIO).
   * Si le document est archivé, la lecture se fait sur la copie sécurisée
   * du diskgroup (immuable) plutôt que sur le fichier de travail.
   */
  async downloadDocumentFile(tenantId: string, documentId: string) {
    const doc = await this.findDocumentWithArchive(documentId);

    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }

    const sourceUrl = doc.archive_path || doc.lien_minio;
    const buffer = await this.minioService.readBuffer(sourceUrl);
    return {
      buffer,
      type_document: this.guessMimeType(doc.archive_path || doc.lien_minio),
      statut: doc.statut_validation,
      archive_path: doc.archive_path ?? null,
    };
  }

  /**
   * Artifacts nécessaires à l'export (conversion PDF/Word/Image) côté serveur :
   * binaire, MIME, nom logique, texte OCR et champs extraits.
   */
  async getExportArtifacts(tenantId: string, documentId: string) {
    const doc = await this.findDocumentWithArchive(documentId);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }
    const sourceUrl = doc.archive_path || doc.lien_minio;
    const buffer = await this.minioService.readBuffer(sourceUrl);
    return {
      buffer,
      mime: this.guessMimeType(sourceUrl),
      name: this.displayNameOf(sourceUrl),
      statut: doc.statut_validation,
      ocrText: doc.ocr_text || null,
      extraction: doc.extraction_data || null,
    };
  }

  /**
   * Mise à jour des champs extraits d'un document.
   *
   * Ouverte à tout utilisateur du tenant : la correction d'une valeur lue de
   * travers est un acte métier normal, pas une opération d'administration.
   * fermée une fois le document archivé : l'archive est la copie figée qui
   * fait foi, la modifier après coup cassait la piste d'audit.
   */
  async updateExtraction(tenantId: string, documentId: string, extractedData: Record<string, unknown>) {
    const doc = await this.findDocumentWithArchive(documentId);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }
    if (doc.archived_at || doc.archive_path) {
      throw new ConflictException('Document archivé : son extraction est figée.');
    }
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE documents SET extraction_data = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        JSON.stringify(extractedData),
        documentId,
      );
    } catch (e: any) {
      throw new BadRequestException(`Impossible d'enregistrer les champs : ${e.message}`);
    }
    this.logger.log(`Extraction mise à jour pour ${documentId} (${Object.keys(extractedData).length} champs).`);
    return {
      document_id: documentId,
      updated: true,
      modified_fields: Object.keys(extractedData),
      extraction: extractedData,
    };
  }

  /**
   * Éléments d'information d'un document, avec leur nature.
   *
   * `extraction_data` reste la map plate pour compatibilité avec les
   * lecteurs existants, mais c'est `document_elements` qui fait autorité :
   * seul lui dit si une valeur est un mot-clé, un montant ou une date, et
   * d'où elle vient.
   */
  async listerElements(tenantId: string, documentId: string) {
    const doc = await this.findDocumentWithArchive(documentId);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }
    const elements = (await this.prisma.$queryRawUnsafe(
      `SELECT id, nature, label, valeur, page, zone, confiance, statut, source, created_at, updated_at
         FROM document_elements
        WHERE document_id = $1 AND tenant_id = $2
        ORDER BY
          CASE nature
            WHEN 'mot_cle' THEN 0 WHEN 'acteur' THEN 1 WHEN 'date' THEN 2
            WHEN 'montant' THEN 3 WHEN 'reference' THEN 4 WHEN 'texte' THEN 5
            ELSE 6
          END,
          statut,
          label`,
      documentId,
      tenantId,
    )) as any[];
    return {
      document_id: documentId,
      archive: doc.archive_path ?? null,
      modifiable: !doc.archived_at && !doc.archive_path,
      seuil_validation: Number(process.env.AUTO_VALIDATION_SEUIL ?? 0.8),
      elements: elements.map((e: any) => ({
        ...e,
        page: e.page ?? null,
        zone: e.zone ?? null,
        confiance: e.confiance ?? null,
      })),
      // Rappel structuré pour l'interface : ce que l'IA a validé seule, et ce
      // qui attend encore une relecture. Le frontend n'a plus à recomputer le
      // seuil ni à deviner quels mots-clés sont fiables.
      mots_cles_valides: elements
        .filter((e: any) => e.nature === 'mot_cle' && e.statut === 'valide')
        .map((e: any) => ({ id: e.id, terme: e.label, valeur: e.valeur, confiance: e.confiance })),
      a_valider: elements
        .filter((e: any) => e.statut !== 'valide')
        .map((e: any) => ({ id: e.id, nature: e.nature, label: e.label, valeur: e.valeur, confiance: e.confiance })),
    };
  }

  /**
   * Ajout d'un élément. La nature est validée en liste blanche : c'est elle
   * qui pilote le filtrage de la recherche, une nature libre la rendrait
   * inexploitable.
   */
  async ajouterElement(tenantId: string, documentId: string, input: {
    nature?: string; label: string; valeur: string; page?: number | null; zone?: unknown; confiance?: number | null;
  }) {
    const doc = await this.findDocumentWithArchive(documentId);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }
    if (doc.archived_at || doc.archive_path) {
      throw new ConflictException('Document archivé : son extraction est figée.');
    }
    const label = (input.label ?? '').trim();
    const valeur = (input.valeur ?? '').trim();
    if (!label) throw new BadRequestException('Le libellé est obligatoire.');
    if (!valeur) throw new BadRequestException('La valeur est obligatoire.');
    const nature = this.natureElement(input.nature);

    const ligne = (await this.prisma.$queryRawUnsafe(
      `INSERT INTO document_elements (tenant_id, document_id, nature, label, valeur, page, zone, confiance, statut, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, 'valide', 'manuel')
       ON CONFLICT (document_id, nature, label, valeur) DO UPDATE
         SET valeur = EXCLUDED.valeur, source = 'manuel', statut = 'valide', updated_at = NOW()
       RETURNING id, nature, label, valeur, page, zone, confiance, statut, source, created_at, updated_at`,
      tenantId,
      documentId,
      nature,
      label,
      valeur,
      input.page ?? null,
      input.zone ? JSON.stringify(input.zone) : null,
      input.confiance ?? null,
    )) as any[];

    // On garde aussi la map plate alignée, sinon la visionneuse et la
    // recherche existantes continueraient d'ignorer la saisie.
    await this.synchroniserExtractionPlate(documentId, tenantId);
    return ligne[0];
  }

  async modifierElement(tenantId: string, documentId: string, elementId: string, patch: {
    nature?: string; label?: string; valeur?: string; page?: number | null; confiance?: number | null; statut?: string;
  }) {
    const doc = await this.findDocumentWithArchive(documentId);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }
    if (doc.archived_at || doc.archive_path) {
      throw new ConflictException('Document archivé : son extraction est figée.');
    }
    const courant = (await this.prisma.$queryRawUnsafe(
      `SELECT nature, label, valeur, page, confiance, statut FROM document_elements WHERE id = $1 AND document_id = $2 AND tenant_id = $3`,
      elementId, documentId, tenantId,
    )) as any[];
    if (!courant.length) throw new NotFoundException('Élément introuvable.');

    const ligne = (await this.prisma.$queryRawUnsafe(
      `UPDATE document_elements
          SET nature = $1, label = $2, valeur = $3, page = $4, confiance = $5, statut = $6,
              source = 'manuel', updated_at = NOW()
        WHERE id = $7 AND document_id = $8 AND tenant_id = $9
      RETURNING id, nature, label, valeur, page, zone, confiance, statut, source, created_at, updated_at`,
      patch.nature !== undefined ? this.natureElement(patch.nature) : courant[0].nature,
      patch.label !== undefined ? String(patch.label).trim() : courant[0].label,
      patch.valeur !== undefined ? String(patch.valeur).trim() : courant[0].valeur,
      patch.page !== undefined ? patch.page : courant[0].page,
      patch.confiance !== undefined ? patch.confiance : courant[0].confiance,
      // Reprendre un élément à la main le valide : c'est la relecture humaine
      // qui prime, elle ne repasse pas par le seuil automatique.
      patch.statut !== undefined
        ? (patch.statut === 'valide' ? 'valide' : 'a_valider')
        : patch.valeur !== undefined || patch.label !== undefined || patch.nature !== undefined
          ? 'valide'
          : courant[0].statut,
      elementId, documentId, tenantId,
    )) as any[];

    await this.synchroniserExtractionPlate(documentId, tenantId);
    return ligne[0];
  }

  async supprimerElement(tenantId: string, documentId: string, elementId: string) {
    const doc = await this.findDocumentWithArchive(documentId);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }
    if (doc.archived_at || doc.archive_path) {
      throw new ConflictException('Document archivé : son extraction est figée.');
    }
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM document_elements WHERE id = $1 AND document_id = $2 AND tenant_id = $3`,
      elementId, documentId, tenantId,
    );
    await this.synchroniserExtractionPlate(documentId, tenantId);
    return { supprime: true, id: elementId };
  }

  /**
   * OCR d'une seule zone du document.
   *
   * On ne retraite pas le fichier entier : le client découpe la zone (page +
   * rectangle) et n'envoie que le morceau, ce qui est la seule façon
   * dERVER un document de 40 pages sans le repasser intégralement au moteur
   * OCR. Le texte obtenu alimente un élément précis au lieu d'écraser
   * l'extraction entière.
   */
  async ocrZoneVersElement(
    tenantId: string,
    documentId: string,
    elementId: string,
    zone: { label?: string; valeur?: string; page?: number | null; zone?: unknown },
  ) {
    const doc = await this.findDocumentWithArchive(documentId);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }
    if (doc.archived_at || doc.archive_path) {
      throw new ConflictException('Document archivé : son extraction est figée.');
    }
    const courant = (await this.prisma.$queryRawUnsafe(
      `SELECT id FROM document_elements WHERE id = $1 AND document_id = $2 AND tenant_id = $3`,
      elementId, documentId, tenantId,
    )) as any[];
    if (!courant.length) throw new NotFoundException('Élément introuvable.');

    const ligne = (await this.prisma.$queryRawUnsafe(
      `UPDATE document_elements
          SET valeur = $1, page = $2, zone = $3::jsonb, source = 'ocr', statut = 'valide', updated_at = NOW()
        WHERE id = $4 AND document_id = $5 AND tenant_id = $6
      RETURNING id, nature, label, valeur, page, zone, confiance, statut, source, created_at, updated_at`,
      (zone.valeur ?? '').trim(),
      zone.page ?? null,
      zone.zone ? JSON.stringify(zone.zone) : null,
      elementId, documentId, tenantId,
    )) as any[];

    await this.synchroniserExtractionPlate(documentId, tenantId);
    return ligne[0];
  }

  private natureElement(nature: unknown): string {
    const connues = ['mot_cle', 'acteur', 'date', 'montant', 'reference', 'texte', 'autre'];
    const valeur = String(nature ?? '').trim().toLowerCase();
    if (!connues.includes(valeur)) {
      throw new BadRequestException(`Nature inconnue. Attendu : ${connues.join(', ')}.`);
    }
    return valeur;
  }

  /**
   * Confidence d'un mot-clé, mesurée et non inventée.
   *
   * L'extraction ne renvoie pas de score par champ. Plutôt que d'en
   * fabriquer un — ce qui reviendrait à valider au hasard, et à présenter
   * comme fiable une valeur jamais vérifiée — on regarde si le terme est
   * réellement présent dans le texte du document :
   *
   * - 1    le terme est dans le texte, et le chiffre cited avec ;
   * - 0,6  le terme y est, sans valeur chiffrée à recouper ;
   * - 0,3  le terme n'y est pas mais la valeur, si.
   *
   * Au-dessus du seuil (0,8 par défaut) l'élément est validé seul. En
   * dessous il attend une relecture humaine, ce qui est le comportement
   * attendu d'une extraction automatique.
   */
  private confianceMotCle(terme: string, valeur: string, texteOcr: string): number {
    const texte = normaliserComparaison(texteOcr);
    if (!texte) return 0;
    const present = (v: string) => normaliserComparaison(v).length > 2 && texte.includes(normaliserComparaison(v));
    const termePresent = present(terme);
    const chiffres = (valeur.match(/\d[\d\s.,]{2,}/g) ?? []).map((c) => c.trim()).filter(Boolean);
    const chiffresVerifies = chiffres.length > 0 && chiffres.every((c) => present(c));
    if (termePresent && (!chiffres.length || chiffresVerifies)) return 1;
    if (termePresent) return 0.6;
    if (chiffresVerifies) return 0.3;
    return 0;
  }

  /**
   * Transforme l'extraction brute en éléments typés.
   *
   * Les mots-clés arrivent désormais avec leur valeur, sur le même modèle que
   * les dates : un terme seul ne dit pas ce qu'il désigne dans ce document.
   * On accepte les deux formes (liste d'objets `{terme, valeur}` issue du
   * nouveau prompt, chaîne « a, b, c » de l'ancienne sortie aplatie) pour ne
   * sans casser les extractions déjà en base.
   */
  private async semerElements(
    documentId: string,
    tenantId: string,
    extraction: Record<string, unknown>,
    texteOcr: string,
  ): Promise<{ total: number; valides: number; aValider: number }> {
    const seuil = Number(process.env.AUTO_VALIDATION_SEUIL ?? 0.8);
    const paires: { nature: string; label: string; valeur: string }[] = [];

    const detailles = Array.isArray(extraction['mots_cles_indexation'])
      ? (extraction['mots_cles_indexation'] as any[])
      : Array.isArray(extraction['Mots-clés détaillés'])
        ? (extraction['Mots-clés détaillés'] as any[])
        : null;

    if (detailles) {
      for (const m of detailles) {
        if (m && typeof m === 'object') {
          const terme = String(m.terme ?? m.mot_cle ?? '').trim();
          const valeur = String(m.valeur ?? m.signification ?? m.contexte ?? '').trim();
          if (terme) paires.push({ nature: 'mot_cle', label: terme, valeur });
        } else if (typeof m === 'string' && m.trim()) {
          paires.push({ nature: 'mot_cle', label: m.trim(), valeur: '' });
        }
      }
    } else {
      const plats = String(extraction['Mots-clés'] ?? '')
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const plat of plats) {
        // Ancienne forme aplatie : « terme (valeur) » si elle existe.
        const m = /^(.+?)\s*\((.+)\)$/.exec(plat);
        paires.push(
          m
            ? { nature: 'mot_cle', label: m[1].trim(), valeur: m[2].trim() }
            : { nature: 'mot_cle', label: plat, valeur: '' },
        );
      }
    }

    for (const acteur of (Array.isArray(extraction['acteurs_impliques']) ? (extraction['acteurs_impliques'] as any[]) : [])) {
      const nom = String(acteur?.nom ?? '').trim();
      if (nom) paires.push({ nature: 'acteur', label: String(acteur?.role ?? 'Acteur').trim(), valeur: nom });
    }
    for (const d of (Array.isArray(extraction['dates_cles']) ? (extraction['dates_cles'] as any[]) : [])) {
      const date = String(d?.date ?? '').trim();
      if (date) paires.push({ nature: 'date', label: String(d?.signification ?? 'Date').trim(), valeur: date });
    }
    for (const champ of ['Type de Document', 'Domaine Métier', 'Statut', 'Résumé'] as const) {
      const v = String(extraction[champ] ?? '').trim();
      if (v) paires.push({ nature: 'texte', label: champ, valeur: v });
    }

    let valides = 0;
    let aValider = 0;
    for (const p of paires) {
      const confiance = p.nature === 'mot_cle' ? this.confianceMotCle(p.label, p.valeur, texteOcr) : null;
      const statut = confiance !== null && confiance >= seuil ? 'valide' : 'a_valider';
      if (statut === 'valide') valides += 1;
      else aValider += 1;
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO document_elements (tenant_id, document_id, nature, label, valeur, confiance, statut, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ia')
         ON CONFLICT (document_id, nature, label, valeur) DO NOTHING`,
        tenantId, documentId, p.nature, p.label, p.valeur || '—', confiance, statut,
      );
    }
    this.logger.log(
      `Éléments semés pour ${documentId} : ${valides} validé(s) automatiquement, ${aValider} à vérifier.`,
    );
    return { total: valides + aValider, valides, aValider };
  }

  /**
   * Reconstruit `extraction_data` depuis les éléments typés.
   *
   * Les mots-clés sont multivalués, la map plate ne peut donc pas les
   * welcomes porter : ils sont regroupés sous une entrée unique, les autres
   * natures gardent une entrée par libellé.
   */
  private async synchroniserExtractionPlate(documentId: string, tenantId: string) {
    const elements = (await this.prisma.$queryRawUnsafe(
      `SELECT nature, label, valeur FROM document_elements WHERE document_id = $1 AND tenant_id = $2`,
      documentId, tenantId,
    )) as any[];
    const plat: Record<string, string> = {};
    const motsCles: string[] = [];
    for (const e of elements) {
      if (e.nature === 'mot_cle') {
        if (!motsCles.includes(e.valeur)) motsCles.push(e.valeur);
      } else {
        plat[e.label] = e.valeur;
      }
    }
    if (motsCles.length) plat['Mots-clés'] = motsCles.join(', ');
    await this.prisma.$executeRawUnsafe(
      `UPDATE documents SET extraction_data = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      JSON.stringify(plat),
      documentId,
    );
  }

  /**
   * Valider & Archiver : conserve le fichier dans un dossier diskgroup sécurisé
   * (copie immuable, isolée par tenant) et le référence par un index logique —
   * en mémoire (accès instantané) puis persisté en BDD (retrouvabilité).
   * Idempotent : ré-archiver un document déjà archivé renvoie l'enregistrement logique.
   */
  async archiveDocument(tenantId: string, documentId: string) {
    const doc = await this.findDocumentWithArchive(documentId);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }

    if (doc.archive_path) {
      const existing = this.buildArchiveRecord(doc);
      this.archiveMemory.set(documentId, existing);
      this.logger.log(`Document ${documentId} déjà archivé (réponse mémoire logique).`);
      return existing;
    }

    const buffer = await this.minioService.readBuffer(doc.lien_minio);
    const { archiveUrl, size, checksum } = await this.minioService.archiveBytes(
      tenantId,
      documentId,
      doc.lien_minio,
      buffer,
    );

    await this.prisma.$executeRawUnsafe(
      `UPDATE documents
         SET archive_path = $1, archive_checksum = $2, archive_size = $3,
             archived_at = NOW(), statut_validation = 'archive', updated_at = NOW()
       WHERE id = $4`,
      archiveUrl,
      checksum,
      size,
      documentId,
    );

    const updated = (await this.prisma.$queryRawUnsafe(
      `SELECT id, tenant_id, lien_minio, type_document, statut_validation, niveau_risque,
              archive_path, archive_checksum, archive_size, archived_at
         FROM documents WHERE id = $1 LIMIT 1`,
      documentId,
    )) as any[];

    const logical = this.buildArchiveRecord(updated[0]);
    this.archiveMemory.set(documentId, logical);

    this.gateway.notifyDocumentStatus(tenantId, documentId, 'Archivé & Intégré', {
      extractedData: { statut: 'archive', archive_path: logical.archive_path },
      ocrText: '',
      alert: null,
      statusColor: 'var(--teal)',
      statusBg: 'rgba(20, 184, 166, 0.1)',
    });

    this.logger.log(
      `Document ${documentId} validé & archivé (diskgroup sécurisé + index logique mémoire/BDD).`,
    );
    return logical;
  }

  /** Index logique des archives : lu en mémoire (rapide) + fusionné avec la BDD. */
  async getArchiveRecords(tenantId: string) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT id, tenant_id, lien_minio, type_document, statut_validation, archive_path,
              archive_checksum, archive_size, archived_at, created_at
         FROM documents
        WHERE tenant_id = $1 AND archive_path IS NOT NULL AND deleted_at IS NULL
        ORDER BY archived_at DESC`,
      tenantId,
    )) as any[];

    const archives = rows.map((row) => {
      const record = this.buildArchiveRecord(row);
      record.en_memoire = this.archiveMemory.has(row.id);
      return record;
    });

    return {
      total: archives.length,
      en_memoire: this.archiveMemory.size,
      archives,
    };
  }

  private async findDocumentWithArchive(documentId: string) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT id, tenant_id, lien_minio, type_document, score_confiance, niveau_risque,
              statut_validation, hash_document, created_at, updated_at, deleted_at,
              archive_path, archive_checksum, archive_size, archived_at,
              extraction_data, ocr_text
         FROM documents WHERE id = $1 LIMIT 1`,
      documentId,
    )) as any[];
    return rows[0] || null;
  }

  /**
   * Liste les documents récents du tenant (BDD = source de vérité). Permet à la
   * page Scanner de se réhydrater après un rafraîchissement — les documents
   * validés & archivés restent visibles, index logique mémoire + archive diskgroup.
   */
  async listDocuments(tenantId: string) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT id, tenant_id, lien_minio, type_document, score_confiance, niveau_risque,
              statut_validation, created_at, archived_at, archive_path, archive_checksum, archive_size,
              extraction_data, ocr_text
         FROM documents
        WHERE tenant_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 100`,
      tenantId,
    )) as any[];

    return rows.map((row: any) => ({
      document_id: row.id,
      tenant_id: row.tenant_id,
      // Le nom vient du fichier, le type est une information séparée. Les
      // confondre faisait porter « Inconnu » ou « Facture » comme intitulé de
      // document, et deux fichiers différents se retrouvaient avec le même nom.
      nom: this.displayNameOf(row.lien_minio),
      fichier: this.displayNameOf(row.lien_minio),
      type: row.type_document || null,
      type_libelle: row.type_document || 'Non classifié',
      statut: this.statusLabelOf(row.statut_validation),
      score: row.score_confiance != null ? Number(row.score_confiance) : null,
      niveau_risque: row.niveau_risque ?? 0,
      date: row.created_at ?? null,
      extraction: row.extraction_data,
      ocr_text: row.ocr_text || null,
      archive: row.archive_path
        ? {
            archive_path: row.archive_path,
            checksum: row.archive_checksum ?? null,
            taille: row.archive_size != null ? Number(row.archive_size) : null,
            archive_le: row.archived_at ?? null,
          }
        : null,
      en_memoire: this.archiveMemory.has(row.id),
    }));
  }

  /**
   * Type documentaire retenu pour l'affichage et la recherche.
   *
   * On ne renvoie jamais « Inconnu » : un placeholder écrit en base remontait
   * jusqu'au nom du document et leliste entière s'affichait « Inconnu ». Le
   * type du LLM n'est retenu que s'il est plausible, sinon on classe sur les
   * mots du document, et en dernier recours on assume un type neutre qui dit
   * exactement ce qu'on sait.
   */
  private classerDocument(texte: string, typeLlm?: string | null): string {
    const MOTIFS: [RegExp, string][] = [
      [/\b(facture|invoice|facture de|reçu|avoir)\b/i, 'Facture'],
      [/\b(devis|proforma|pro-forma|offre de prix)\b/i, 'Devis'],
      [/\b(releve|relevé|rib|iban|extrait de compte|relevé bancaire)\b/i, 'Document bancaire'],
      [/\b(contrat|convention|accord|prestataire|mandat)\b/i, 'Contrat'],
      [/\b(bon de commande|bon de livraison|bl\b|cmr)\b/i, 'Bon de commande'],
      [/\b(releve de_note de charges|bulletin de salaire|payslip)\b/i, 'Paie'],
      [/\b(attestation|certificat|convention collective)\b/i, 'Attestation'],
      [/\b(bilan|compte de resultat|compte de résultat|annexe)\b/i, 'Document comptable'],
      [/\b(kbis|rccm|nif|niu|registre du commerce)\b/i, 'Document juridique'],
      [/\b(identite|identité|passeport|cni|carte d')\b/i, "Pièce d'identité"],
    ];
    for (const [motif, type] of MOTIFS) {
      if (motif.test(texte)) return type;
    }
    const candidat = (typeLlm ?? '').trim();
    if (candidat && !/^(inconnu|document inconnu|document|erreur|autre|unknown)$/i.test(candidat)) {
      return candidat.charAt(0).toUpperCase() + candidat.slice(1);
    }
    return 'Document non classifié';
  }

  private statusLabelOf(status: string | null): string {
    const labels: Record<string, string> = {
      en_cours: 'En traitement',
      traite: 'Analyse terminée',
      valide_automatiquement: 'Validé automatiquement',
      en_attente_validation: 'En attente de validation',
      a_auditer: 'À auditer',
      non_conforme: 'Non conforme',
      echec: 'Échec de l\'analyse',
      archive: 'Archivé & Intégré',
      rejete: 'Rejeté',
    };
    // Un statut NULL veut dire « jamais traité », pas « inconnu » : l'ancien
    // repli affichait « Inconnu » sur les documents en cours d'analyse.
    return labels[status || ''] || status || 'Non traité';
  }

  private displayNameOf(lienMinio: string): string {
    let name = lienMinio || '';
    if (name.startsWith('local://')) name = name.slice('local://'.length);
    if (name.startsWith('archive://')) name = name.slice('archive://'.length);
    const parts = name.split('/').filter(Boolean);
    if (parts.length) name = parts[parts.length - 1];
    return name.replace(/^[a-f0-9]{8,}-/i, '').replace(/_/g, ' ') || 'Document';
  }

  private buildArchiveRecord(doc: any): any {
    return {
      document_id: doc.id,
      tenant_id: doc.tenant_id,
      nom: doc.type_document || doc.lien_minio,
      statut: doc.statut_validation,
      archive_path: doc.archive_path ?? null,
      checksum: doc.archive_checksum ?? null,
      taille: doc.archive_size != null ? Number(doc.archive_size) : null,
      archive_le: doc.archived_at ?? null,
      source: doc.lien_minio,
    };
  }

  /** Déduit un Content-Type HTTP valide depuis l'extension de l'URL du fichier.
   *  Ne jamais utiliser `type_document` (libellé IA, ex. "Document de test") comme Content-Type. */
  private guessMimeType(fileUrl: string): string {
    const extension = fileUrl.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() || '';
    const mimes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      tif: 'image/tiff',
      tiff: 'image/tiff',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      csv: 'text/csv',
      txt: 'text/plain',
    };
    return mimes[extension] || 'application/octet-stream';
  }
}
