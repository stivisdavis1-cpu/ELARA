import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MinioService } from './minio.service.js';
import { PrismaService } from '../prisma.service.js';
import { ScannerGateway } from './scanner.gateway.js';
import { BusinessMemoryService } from '../memoire/memoire.service.js';
import { CfoService } from '../cfo/cfo.service.js';
import { OcrService } from './ocr.service.js';

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly rabbitClient: ClientProxy,
    private readonly minioService: MinioService,
    private readonly prisma: PrismaService,
    private readonly gateway: ScannerGateway,
    private readonly memoireService: BusinessMemoryService,
    private readonly cfoService: CfoService,
    public readonly ocrService: OcrService,
  ) {}

  async processNewDocument(tenantId: string, file: any) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    let url = 'http://localhost:9000/mock-url';
    let docId = 'doc_' + Date.now();

    // DÉTECTION DOCUMENT LOURD (ex: > 10MB ou beaucoup de pages)
    // Ici on simule si la taille dépasse 5Mo
    if (file.size > 5 * 1024 * 1024) {
      this.logger.log(`Document lourd détecté (${file.size} bytes). Délégation au Worker en arrière-plan...`);
      
      const { Worker } = await import('worker_threads');
      const path = await import('path');
      
      const worker = new Worker(path.join(process.cwd(), 'dist/scanner/heavy-ocr.worker.js'), {
        workerData: {
          filePath: file.path, // Assuming it's saved somewhere or we can pass buffer if small enough
          documentId: docId,
          tenantId: tenantId
        }
      });
      
      worker.on('message', (msg) => {
        if (msg.status === 'completed') {
           this.logger.log(`Worker a terminé avec succès l'extraction de ${docId}. Chunks générés: ${msg.chunks.length}`);
           // Ici on insèrerait les chunks dans Prisma
        } else if (msg.status === 'error') {
           this.logger.error(`Worker a échoué pour ${docId}: ${msg.error}`);
        }
      });

      return {
        message: 'Le document est volumineux. Un traitement approfondi (OCR + Sémantique) est en cours en arrière-plan.',
        documentId: docId,
        url: url,
        name: file.originalname,
        type: 'Traitement Lourd',
        status: 'En cours',
        statusColor: 'var(--blue)',
        statusBg: 'var(--blue-light)',
        extractedData: {},
        alert: null,
        ocrText: 'Analyse approfondie (Multi-pages) en cours...'
      };
    }

    // 4. Extraction OCR synchrone & légère pour petits fichiers
    this.logger.log(`Extraction OCR en cours pour le document ${docId}...`);
    const ocrText = await this.ocrService.extractText(file.buffer, file.mimetype);
    const analysis = await this.ocrService.analyzeContent(ocrText, file.originalname);

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
                date_emission: data.extraction.date_emission ? new Date(data.extraction.date_emission) : undefined,
                date_echeance: data.extraction.date_echeance ? new Date(data.extraction.date_echeance) : undefined,
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

    // Notification Frontend avec l'enrichissement (Alertes, Fraude)
    this.gateway.notifyDocumentStatus(doc.tenant_id, doc.id, doc.statut_validation as string, { 
        extraction: data.extraction,
        alert: alertMessage
    });
  }

  async getArchiveUrl(tenantId: string, documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!doc || doc.tenant_id !== tenantId) {
      throw new BadRequestException('Document introuvable ou accès refusé.');
    }

    return { url: doc.lien_minio, statut: doc.statut_validation, niveau_risque: doc.niveau_risque };
  }
}
