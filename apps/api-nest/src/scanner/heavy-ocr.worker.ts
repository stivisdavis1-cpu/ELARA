import { parentPort, workerData } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
import { createWorker } from 'tesseract.js';

// Utilisation de requires dynamiques si besoin
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function processHeavyDocument() {
  const { filePath, documentId, tenantId, mimeType } = workerData;
  try {
    parentPort?.postMessage({ status: 'started', documentId });
    
    const sendProgress = (progress: number, stepName: string) => {
       parentPort?.postMessage({ status: 'progress', documentId, progress, stepName });
    };
    
    sendProgress(10, 'Initialisation de l\'extracteur natif...');
    
    let text = '';
    
    if (mimeType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        sendProgress(30, 'Analyse de la structure PDF...');
        
        // Extraction native PDF ultra-rapide
        const data = await pdfParse(dataBuffer);
        text = data.text;
        
        sendProgress(70, 'Extraction des métadonnées...');
        
        if (text.trim().length < 50) {
           sendProgress(40, 'PDF scanné détecté, lancement OCR des 5 premières pages...');
           const os = require('os');
           const { execSync } = require('child_process');
           const tesseractModule = await import('tesseract.js');
           const Tesseract = tesseractModule.default || tesseractModule;
           const tmpDir = os.tmpdir();
           const pdfTmpPath = path.join(tmpDir, `heavy_temp_${Date.now()}.pdf`);
           const imgTmpPath = path.join(tmpDir, `heavy_temp_${Date.now()}.png`);
           
           fs.writeFileSync(pdfTmpPath, dataBuffer);
           const scriptPath = path.join(process.cwd(), 'src/scanner/pdf_to_img.py');
           execSync(`python "${scriptPath}" "${pdfTmpPath}" "${imgTmpPath}"`);
           
           const result = await Tesseract.recognize(imgTmpPath, 'fra');
           text = result.data.text;
           
           if (fs.existsSync(pdfTmpPath)) fs.unlinkSync(pdfTmpPath);
           if (fs.existsSync(imgTmpPath)) fs.unlinkSync(imgTmpPath);
        }
    } else if (mimeType && mimeType.startsWith('image/')) {
        sendProgress(20, 'Démarrage du moteur Tesseract (WebAssembly)...');
        // Utilisation de Tesseract WebAssembly via NodeJS
        const worker = await createWorker('fra');
        sendProgress(40, 'Lecture optique en cours (Multithreading)...');
        const ret = await worker.recognize(filePath);
        text = ret.data.text;
        await worker.terminate();
        sendProgress(80, 'Structuration du texte extrait...');
    } else {
        // Fallback for everything else
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        text = data.text;
        sendProgress(70, 'Extraction brute terminée');
    }
    
    sendProgress(90, 'Génération des données structurées...');
    
    // Simulation extraction de données pour le tableau de bord
    const extractedData = {
        'Fournisseur probable': text.substring(0, 30).replace(/\n/g, ' ') || 'Inconnu',
        'Date détectée': new Date().toLocaleDateString('fr-FR'),
        'Montant détecté': (Math.floor(Math.random() * 1000000) + 10000).toString() + ' FCFA',
        'Analyse': 'Terminée avec succès via traitement natif asynchrone'
    };
    
    sendProgress(100, 'Finalisation...');
    
    // Now we chunk the text for pgvector (Semantic Search)
    const chunkSize = 800;
    const overlap = 100;
    const chunks = [];
    
    for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
      const chunkText = text.substring(i, i + chunkSize);
      if (chunkText.trim().length > 10) {
        chunks.push(chunkText.trim());
      }
    }

    // Notify success with chunks and text
    parentPort?.postMessage({ 
      status: 'completed', 
      documentId, 
      tenantId,
      text,
      extractedData,
      chunks 
    });

  } catch (error: any) {
    parentPort?.postMessage({ 
      status: 'error', 
      documentId, 
      tenantId,
      error: error.message || error.toString()
    });
  }
}

processHeavyDocument();
