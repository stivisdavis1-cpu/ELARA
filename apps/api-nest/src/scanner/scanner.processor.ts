import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as util from 'util';
import { ScannerGateway } from './scanner.gateway.js';
import { createWorker } from 'tesseract.js';

// Utilisation de requires dynamiques si besoin, mais pdf-parse supporte l'import ESM généralement, on teste require
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

@Processor('scanner-queue')
export class ScannerProcessor extends WorkerHost {
  private readonly logger = new Logger(ScannerProcessor.name);

  constructor(private readonly gateway: ScannerGateway) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { filePath, documentId, tenantId, mimeType } = job.data;
    
    this.logger.log(`Traitement BullMQ démarré pour le job ${job.id} (Doc: ${documentId})`);
    
    const sendProgress = async (progress: number, stepName: string) => {
      await job.updateProgress(progress);
      this.gateway.server.to(tenantId).emit('document_progress', {
        documentId,
        progress,
        stepName
      });
    };
    
    try {
      await sendProgress(10, 'Initialisation de l\'extracteur...');
      
      let text = '';
      
      if (mimeType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        await sendProgress(30, 'Analyse de la structure PDF...');
        
        // Extraction native PDF ultra-rapide
        const data = await pdfParse(dataBuffer);
        text = data.text;
        
        await sendProgress(70, 'Extraction des métadonnées...');
        
        if (text.trim().length < 50) {
           text = "--- AVIS : PDF Scanné détecté ---\nCe document semble être une image ou un scan sans texte natif. Le système d'extraction a lu la structure de base. Pour une meilleure qualité d'extraction OCR, veuillez charger ce document directement sous forme d'image (JPEG/PNG).";
        }
      } else if (mimeType.startsWith('image/')) {
        await sendProgress(20, 'Démarrage du moteur Tesseract (WebAssembly)...');
        // Utilisation de Tesseract WebAssembly via NodeJS
        const worker = await createWorker('fra');
        await sendProgress(40, 'Lecture optique en cours (Multithreading)...');
        const ret = await worker.recognize(filePath);
        text = ret.data.text;
        await worker.terminate();
        await sendProgress(80, 'Structuration du texte extrait...');
      } else if (mimeType === 'application/rtf' || mimeType === 'text/rtf' || (mimeType && mimeType.includes('rtf'))) {
        await sendProgress(30, 'Décodage du format RTF...');
        const { rtfToPlainText } = await import('./ocr.service.js');
        text = rtfToPlainText(fs.readFileSync(filePath).toString('latin1'));
        await sendProgress(80, 'Structuration du texte extrait...');
      } else {
        throw new Error(`Format non supporté pour l'extraction: ${mimeType}`);
      }
      
      // Simulation extraction de données
      const extractedData = {
        'Fournisseur probable': text.substring(0, 30).replace(/\n/g, ' ') || 'Inconnu',
        'Date détectée': new Date().toLocaleDateString('fr-FR'),
        'Montant détecté': (Math.floor(Math.random() * 1000000) + 10000).toString() + ' FCFA',
        'Analyse': 'Terminée avec succès via BullMQ'
      };
      
      await sendProgress(100, 'Finalisation...');
      
      // Notifier le frontend en temps réel
      this.gateway.server.to(tenantId).emit('document_status_update', {
        documentId,
        status: 'Terminé',
        statusColor: 'var(--teal)',
        statusBg: 'rgba(20, 184, 166, 0.1)',
        ocrText: text,
        extractedData
      });
      
      this.logger.log(`Traitement terminé pour ${documentId}`);
      return { success: true, textLength: text.length };
      
    } catch (error: any) {
      this.logger.error(`Erreur BullMQ pour ${documentId}:`, error.stack || error);
      
      this.gateway.server.to(tenantId).emit('document_status_update', {
        documentId,
        status: 'Erreur (Backend)',
        statusColor: 'var(--red)',
        statusBg: 'rgba(239, 68, 68, 0.1)',
        ocrText: 'Erreur lors du traitement asynchrone: ' + error.message,
      });
      
      throw error;
    }
  }
}
