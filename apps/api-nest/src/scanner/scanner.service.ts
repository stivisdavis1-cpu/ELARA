import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MinioService } from './minio.service.js';
import { PrismaService } from '../prisma.service.js';
import { ScannerGateway } from './scanner.gateway.js';
import { BusinessMemoryService } from '../memoire/memoire.service.js';
import { CfoService } from '../cfo/cfo.service.js';
import { OcrService } from './ocr.service.js';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service.js';
import { SearchService } from './search.service.js';
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
    const docId = 'doc_' + Date.now();

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
          type_document: 'Inconnu',
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
    let analysis = {
      smartName: file.originalname,
      type: 'Document Inconnu',
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
          type: aiData.type || 'Inconnu',
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
      const vectorLiteral = `[${embedding.join(',')}]`;
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO company_memories (id, tenant_id, content, type_info, embedding, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())`,
        tenantId,
        contenu,
        'document',
        vectorLiteral,
      );
      this.logger.log(`Mémoire d'entreprise enrichie (document ${doc.id}).`);
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
   * Mise à jour des champs extraits d'un document (réservée aux administrateurs).
   * Réécrit `extraction_data` (JSONB) — la visionneuse rejoue ainsi la consultation.
   */
  async updateExtraction(tenantId: string, documentId: string, extractedData: Record<string, unknown>) {
    const doc = await this.findDocumentWithArchive(documentId);
    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
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
      nom: row.type_document || this.displayNameOf(row.lien_minio),
      fichier: this.displayNameOf(row.lien_minio),
      type: row.type_document,
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
    return labels[status || ''] || status || 'Inconnu';
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
