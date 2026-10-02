import { Injectable, Logger } from '@nestjs/common';
import Tesseract from 'tesseract.js';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { pythonBin } from './python-bin.js';

// Répertoire des scripts Python OCR (pdf_to_img / crop / docx_to_pdf).
// Survolé par OCR_SCRIPTS_DIR ; défauts : scripts embarqués puis api-ai/services.
function ocrScriptsDir(): string {
  const candidates = [
    process.env.OCR_SCRIPTS_DIR,
    path.join(process.cwd(), 'src/scanner'),
    path.join(process.cwd(), '..', 'api-ai', 'services'),
  ].filter((d): d is string => Boolean(d));
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir)) return dir;
    } catch { /* ignore */ }
  }
  return candidates[0] ?? path.join(process.cwd(), 'src/scanner');
}

const PDF_TO_IMG_SCRIPT = () => path.join(ocrScriptsDir(), 'pdf_to_img.py');
const CROP_SCRIPT = () => path.join(ocrScriptsDir(), 'crop.py');

// ==========================================
// THREAD WORKER (S'exécute en parallèle, 0% blocage Event Loop)
// ==========================================
if (!isMainThread && parentPort) {
  (async () => {
    try {
      const { PdfReader } = await import('pdfreader');
      const { PDFDocument } = await import('pdf-lib');
      const buffer = Buffer.from(workerData.bufferData);

      const parseBuffer = (buf: Buffer): Promise<string> =>
        new Promise((resolve, reject) => {
          let text = '';
          new PdfReader().parseBuffer(buf, (err: any, item: any) => {
            if (err) reject(err instanceof Error ? err : new Error(String(err)));
            else if (item === null || item === undefined) resolve(text);
            else if (item.text) text += item.text + ' ';
          });
        });

      const imageOcr = async (buf: Buffer): Promise<string> => {
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');
        const { execSync } = await import('child_process');
        const tesseractModule = await import('tesseract.js');
        const Tesseract = tesseractModule.default || tesseractModule;

        const tmpDir = os.tmpdir();
        const pdfPath = path.join(tmpDir, `temp_${Date.now()}.pdf`);
        const imgPath = path.join(tmpDir, `temp_${Date.now()}.png`);
        try {
          fs.writeFileSync(pdfPath, buf);
          // Chemin vers le script python (configurable via OCR_SCRIPTS_DIR)
          const scriptPath = PDF_TO_IMG_SCRIPT();
          execSync(`${pythonBin()} "${scriptPath}" "${pdfPath}" "${imgPath}"`);
          const result = await Tesseract.recognize(imgPath, 'fra');
          return result.data.text;
        } finally {
          if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
      };

      const popplerText = async (buf: Buffer): Promise<string> => {
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');
        const { execSync } = await import('child_process');

        const tmpDir = os.tmpdir();
        const pdfPath = path.join(tmpDir, `pdf_${Date.now()}.pdf`);
        const outPath = path.join(tmpDir, `txt_${Date.now()}.txt`);
        try {
          fs.writeFileSync(pdfPath, buf);
          execSync(`pdftotext -layout -enc UTF-8 "${pdfPath}" "${outPath}"`);
          return fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
        } finally {
          if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        }
      };

      let fullText = '';
      try {
        fullText = await parseBuffer(buffer);
      } catch (parseErr: any) {
        // PDF à table XRef corrompue (ex: « bad XRef entry ») :
        // réparation silencieuse via pdf-lib, puis nouveau parsing.
        console.warn(`Erreur parsing PDF (${parseErr.message || parseErr}), tentative de réparation pdf-lib...`);
        try {
          const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          const repaired = Buffer.from(await pdfDoc.save());
          fullText = await parseBuffer(repaired);
        } catch (repairErr: any) {
          console.warn(`Réparation PDF impossible : ${repairErr.message || repairErr}`);
        }
      }

      // Fallbacks : pdf2json ne sait pas lire les XRef *stream* ni certains PDF générés ;
      // poppler-utils (pdftotext) est embarqué dans l'image api-nest.
      if (fullText.trim().length < 30) {
        try {
          fullText = await popplerText(buffer);
        } catch (popplerErr: any) {
          console.warn(`pdftotext indisponible : ${popplerErr.message || popplerErr}`);
        }
      }

      // Si le texte est très court, c'est probablement un PDF scanné (Image)
      if (fullText.trim().length < 30) {
        try {
          fullText = await imageOcr(buffer);
        } catch (fallbackError: any) {
          console.error("Erreur OCR Fallback Image:", fallbackError);
        }
      }

      parentPort!.postMessage({ result: fullText });
    } catch (e: any) {
      parentPort!.postMessage({ error: e.message || String(e) });
    }
  })();
}

// ==========================================
// EXTRACTION RTF → TEXTE (Rich Text Format)
// ==========================================
const RTF_CP1252: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž',
  0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

const RTF_SKIP_DESTINATIONS = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'header',
  'headerl', 'headerr', 'headerf', 'footer', 'footerl', 'footerr', 'footerf',
  'footnote', 'annotation', 'filetbl', 'listtable', 'listoverridetable',
  'generator', 'datastore', 'themedata', 'colorschememapping', 'latentstyles',
  'xmlnstbl', 'rsidtbl', 'doccomm', 'bkmkstart', 'bkmkend', 'v', 'fldinst', 'shp',
]);

function rtfSkipControlWord(rtf: string, index: number): number {
  const n = rtf.length;
  let i = index;
  if (rtf[i] === '*') i++;
  while (i < n && /[a-z]/i.test(rtf[i])) i++;
  if (rtf[i] === "'") return Math.min(i + 3, n);
  if (rtf[i] === '-' || (rtf[i] >= '0' && rtf[i] <= '9')) {
    if (rtf[i] === '-') i++;
    while (i < n && rtf[i] >= '0' && rtf[i] <= '9') i++;
  }
  if (rtf[i] === ' ') i++;
  return i;
}

export function rtfToPlainText(rtf: string): string {
  let out = '';
  const stack: boolean[] = [false];
  const inSkip = () => stack[stack.length - 1];
  const n = rtf.length;
  let i = 0;

  while (i < n) {
    const ch = rtf[i];

    if (ch === '{') {
      i++;
      if (inSkip()) {
        stack.push(true);
      } else if (rtf[i] === '\\') {
        let j = i + 1;
        if (rtf[j] === '*') {
          j++;
          stack.push(true);
          i = rtfSkipControlWord(rtf, j);
          continue;
        }
        let name = '';
        let k = j;
        while (k < n && /[a-z]/i.test(rtf[k])) {
          name += rtf[k];
          k++;
        }
        if (name && RTF_SKIP_DESTINATIONS.has(name)) {
          stack.push(true);
          i = rtfSkipControlWord(rtf, k);
          continue;
        }
        stack.push(false);
        i = name ? rtfSkipControlWord(rtf, k) : k;
      } else {
        stack.push(false);
      }
      continue;
    }

    if (ch === '}') {
      if (stack.length > 1) stack.pop();
      i++;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      if (!inSkip()) out += '\n';
      i++;
      continue;
    }

    if (ch === '\t') {
      if (!inSkip()) out += '\t';
      i++;
      continue;
    }

    if (ch === '\\') {
      let j = i + 1;
      if (rtf[j] === '*') {
        j++;
        i = rtfSkipControlWord(rtf, j);
        continue;
      }
      if (rtf[j] === "'") {
        const code = parseInt(rtf.substring(j + 1, j + 3), 16);
        if (!inSkip()) {
          const c = code >= 0x80 && code <= 0x9f ? (RTF_CP1252[code] ?? ' ') : String.fromCharCode(code);
          out += c === '\u00A0' ? ' ' : c;
        }
        i = j + 3;
        continue;
      }
      let name = '';
      let k = j;
      while (k < n && /[a-z]/i.test(rtf[k])) {
        name += rtf[k];
        k++;
      }
      let param = '';
      let p = k;
      if (rtf[p] === '-' || (rtf[p] >= '0' && rtf[p] <= '9')) {
        if (rtf[p] === '-') {
          param += '-';
          p++;
        }
        while (p < n && rtf[p] >= '0' && rtf[p] <= '9') {
          param += rtf[p];
          p++;
        }
      }

      if (name === 'u' && param.length > 0 && !inSkip()) {
        const code = parseInt(param, 10) & 0xffff;
        if (code > 31 && code !== 0x7f) out += String.fromCharCode(code);
        i = p;
        if (rtf[i] === '\\') {
          i = rtfSkipControlWord(rtf, i + 1);
        } else {
          i++;
        }
        continue;
      }
      if (name === 'bin' && param) {
        i = p + (parseInt(param, 10) || 0);
        continue;
      }
      if (name === '' && param === '') {
        if (!inSkip()) {
          const lit = rtf[j];
          if (lit === '~' || lit === '_' || lit === ' ') out += ' ';
          else out += lit;
        }
        i = Math.min(j + 1, n);
        continue;
      }
      if (!inSkip()) {
        switch (name) {
          case 'par':
          case 'line':
          case 'row':
          case 'sect':
          case 'softline':
            out += '\n';
            break;
          case 'tab':
            out += '\t';
            break;
          case '~':
          case '_':
            out += ' ';
            break;
          case 'bullet':
            out += '•';
            break;
          case 'endash':
            out += '–';
            break;
          case 'emdash':
            out += '—';
            break;
          case 'lquote':
            out += '‘';
            break;
          case 'rquote':
            out += '’';
            break;
          case 'ldblquote':
            out += '“';
            break;
          case 'rdblquote':
            out += '”';
            break;
          case 'enspace':
            out += ' ';
            break;
        }
      }
      i = p;
      if (rtf[i] === ' ') i++;
      continue;
    }

    if (!inSkip()) out += ch === '\u00A0' ? ' ' : ch;
    i++;
  }

  return out.replace(/\n{3,}/g, '\n\n').trim();
}

// ==========================================
// THREAD PRINCIPAL (Service NestJS)
// ==========================================
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extractText(fileBuffer: Buffer, mimetype: string): Promise<string> {
    try {
      this.logger.log(`Début de l'extraction OCR pour un fichier de type ${mimetype}`);

      if (mimetype === 'application/pdf') {
        const { PDFDocument } = await import('pdf-lib');
        
        let bufferToParse = fileBuffer;
        try {
          // Découpage ultra-rapide des pages
          const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
          const totalPages = pdfDoc.getPageCount();
          
          if (totalPages > 5) {
            this.logger.log(`Document lourd détecté (${totalPages} pages). Découpage des 5 premières pages...`);
            const newPdf = await PDFDocument.create();
            const copiedPages = await newPdf.copyPages(pdfDoc, [0, 1, 2, 3, 4]);
            copiedPages.forEach(page => newPdf.addPage(page));
            const newBytes = await newPdf.save();
            bufferToParse = Buffer.from(newBytes);
          }
        } catch (e) {
          this.logger.warn("Erreur lors du découpage PDF, fallback sur le buffer complet", e);
        }

        this.logger.log(`Lancement du Worker Thread pour l'extraction PDF...`);
        // Lancement du parsing CPU-bound dans un thread séparé !
        return this.runWorker(bufferToParse);

      } else if (mimetype.startsWith('image/')) {
        // Tesseract.js pour les images
        const result = await Tesseract.recognize(fileBuffer, 'fra', {
          logger: m => this.logger.debug(m)
        });
        return result.data.text;
      } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimetype === 'application/msword') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return result.value;
      } else if (mimetype === 'application/rtf' || mimetype === 'text/rtf') {
        return rtfToPlainText(fileBuffer.toString('latin1'));
      } else if (mimetype.startsWith('text/') || mimetype === 'application/json' || mimetype === 'application/xml') {
        // Un fichier texte n'a rien à reconnaître : son contenu est déjà le
        // texte. Sans ce cas, un .txt ou un .csv était refusé puis laissé
        // indefiniment en cours d'analyse, l'agent ne recevant jamais rien.
        // Le BOM UTF-8 est retiré pour ne pas polluer le premier mot.
        return fileBuffer.toString('utf8').replace(/^\uFEFF/, '');
      }

      throw new Error(`Format non supporté pour l'OCR: ${mimetype}`);
    } catch (error) {
      this.logger.error(`Échec de l'extraction OCR: ${error}`);
      throw error;
    }
  }

  async runWorker(bufferToParse: Buffer): Promise<string> {
    const { fileURLToPath } = await import('url');
    const workerFile = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
    
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerFile, {
        workerData: { bufferData: bufferToParse }
      });

      // Timeout de sécurité pour éviter les workers fantômes
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("Timeout de l'extraction OCR (Worker)"));
      }, 29000);

      worker.on('message', (msg) => {
        clearTimeout(timeout);
        if (msg.error) reject(new Error(msg.error));
        else resolve(msg.result);
        worker.terminate();
      });

      worker.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      
      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }

  async convertToImage(buffer: Buffer): Promise<Buffer> {
    const fs = await import('fs');
    const path = await import('path');
    const { execSync } = await import('child_process');
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const pdfPath = path.join(tmpDir, `preview_${Date.now()}.pdf`);
    const imgPath = path.join(tmpDir, `preview_${Date.now()}.png`);
    
    fs.writeFileSync(pdfPath, buffer);
    const scriptPath = PDF_TO_IMG_SCRIPT();
    execSync(`${pythonBin()} "${scriptPath}" "${pdfPath}" "${imgPath}"`);
    
    const imgBuffer = fs.readFileSync(imgPath);
    
    // Cleanup
    fs.unlinkSync(pdfPath);
    fs.unlinkSync(imgPath);
    
    return imgBuffer;
  }

  async cropAndOcr(buffer: Buffer, mimeType: string, rect: { x: number, y: number, width: number, height: number }): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');
    const { execSync } = await import('child_process');
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    let imgPath = path.join(tmpDir, `src_${Date.now()}.png`);
    
    // Si c'est un PDF, on le convertit d'abord
    if (mimeType === 'application/pdf') {
       const pdfPath = path.join(tmpDir, `src_${Date.now()}.pdf`);
       fs.writeFileSync(pdfPath, buffer);
       const scriptPath = PDF_TO_IMG_SCRIPT();
       execSync(`${pythonBin()} "${scriptPath}" "${pdfPath}" "${imgPath}"`);
       fs.unlinkSync(pdfPath);
    } else {
       fs.writeFileSync(imgPath, buffer);
    }

    const croppedPath = path.join(tmpDir, `cropped_${Date.now()}.png`);
    
    // Crop Python script
    execSync(`${pythonBin()} "${CROP_SCRIPT()}" "${imgPath}" "${croppedPath}" ${rect.x} ${rect.y} ${rect.width} ${rect.height}`);
    
    // Tesseract
    const result = await Tesseract.recognize(croppedPath, 'fra');
    
    fs.unlinkSync(imgPath);
    fs.unlinkSync(croppedPath);
    
    return result.data.text.trim();
  }

  async analyzeContent(text: string, originalName: string) {
    const textUpper = text.toUpperCase();
    
    // 1. TENTATIVE IA DYNAMIQUE AVEC OLLAMA (Local)
    try {
      const prompt = `Tu es l'expert documentaire embarqué du Business Scanner d'Elara, une plateforme IA pour PME africaines. L'utilisateur n'est pas expert du domaine du document qu'il scanne : c'est toi qui portes cette expertise à sa place.
Tu as accès à un outil de recherche web (web_search) pour vérifier des informations critiques.

## Mission
Analyser un document d'entreprise (facture, contrat, bulletin de paie, relevé bancaire, bon de commande, courrier administratif, etc.) et produire une sortie structurée exploitable directement par l'application, sans intervention humaine de tri préalable.

## Quand chercher sur le web (et seulement dans ces cas)
- Un numéro d'identification d'entreprise (RCCM, NIU, SIRET...) doit être validé ou complété
- Un taux légal (TVA, cotisation sociale, barème fiscal) semble avoir pu changer depuis ta date de connaissance et impacte un calcul du document
- Le nom d'une entreprise/organisme cité doit être vérifié (existence, statut, secteur) pour fiabiliser la classification
- Une référence réglementaire citée dans le document doit être confirmée comme toujours en vigueur

## Quand NE PAS chercher
- Tout ce qui est déjà écrit noir sur blanc dans le document (ne vérifie jamais une donnée déjà présente dans le texte source — extrais-la telle quelle)
- Les champs purement internes à l'entreprise (montants, dates propres au document)
- Si le document est complet et cohérent sans ambiguïté externe

## Méthode de recherche
1. Requête courte et ciblée (3-6 mots), jamais une phrase complète
2. Une seule recherche par point d'incertitude — pas de recherches en boucle
3. Si le résultat web contredit une donnée du document : ne corrige JAMAIS la donnée extraite, signale la contradiction dans "flags" avec les deux valeurs (celle du document, celle trouvée)
4. Si aucun résultat fiable n'est trouvé : laisse le champ tel qu'extrait du document et note l'incertitude — n'invente jamais une confirmation

## Règles de sortie
- Réponds UNIQUEMENT en JSON valide — jamais de texte libre autour.
- Si un champ ne peut pas être déterminé avec confiance : mets null et ajoute une entrée dans "uncertainties", jamais une valeur devinée.
- Chaque champ financier extrait doit être accompagné de sa localisation approximative dans le document (numéro de page/section) pour audit.
- Devise, dates et montants dans le format local (FCFA, JJ/MM/AAAA).

## Étapes d'analyse (dans l'ordre)
1. Identifier le TYPE de document (taxonomie Elara ci-dessous).
2. Extraire les champs spécifiques à ce type.
3. Évaluer la CONFIDENTIALITÉ (public interne / RH / financier sensible / légal).
4. Générer 5 à 8 mots-clés métier pertinents (pas génériques).
5. Proposer un CLASSEMENT dans l'arborescence Elara (dossier + sous-dossier).
6. Si le document contient des données exploitables par le module CFO IA (montants, échéances, parties prenantes), les extraire dans "financial_signals" pour alimenter ce module en aval.
7. Signaler toute incohérence ou anomalie détectée dans "flags".

## Taxonomie des types de documents Elara
[facture_client, facture_fournisseur, contrat, bulletin_paie, relevé_bancaire, bon_commande, courrier_administratif, rapport_interne, document_juridique, document_rh, autre]

## Format JSON attendu (OBLIGATOIRE)
{
  "type": "un_des_types_de_la_taxonomie",
  "extractedData": {
    "Mots-clés": "mot1, mot2...",
    "Confidentialité": "...",
    "Classement suggéré": "...",
    "Clé 1": "Valeur 1" // (ajoute tous les champs spécifiques ici)
  },
  "financial_signals": {},
  "uncertainties": [],
  "flags": [],
  "web_verifications": [
    { "point_verifie": "...", "resultat": "...", "source_url": "...", "date_verification": "..." }
  ],
  "alert": "Alerte critique s'il y a lieu, ou false"
}

Texte OCR :
${text.substring(0, 4000)}
`;
      // Timeout de 15s pour l'analyse approfondie
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3', // Modèle par défaut standard
          prompt: prompt,
          format: 'json',
          stream: false
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const jsonResponse = await response.json();
        const aiData = JSON.parse(jsonResponse.response);
        
        let smartName = originalName;
        if (aiData.extractedData && Object.keys(aiData.extractedData).length > 0) {
          const firstVal = Object.values(aiData.extractedData)[0];
          smartName = `${aiData.type || 'Document'} - ${String(firstVal).substring(0, 15)}`;
        }

        const finalExtracted = aiData.extractedData || {};
        if (aiData.financial_signals && Object.keys(aiData.financial_signals).length > 0) {
          finalExtracted['Signaux CFO'] = JSON.stringify(aiData.financial_signals);
        }
        if (aiData.uncertainties && aiData.uncertainties.length > 0) {
          finalExtracted['Incertitudes IA'] = aiData.uncertainties.join(' | ');
        }
        if (aiData.web_verifications && aiData.web_verifications.length > 0) {
          finalExtracted['Vérifications Web'] = aiData.web_verifications.map((w: any) => `${w.point_verifie}: ${w.resultat} (${w.source_url})`).join(' | ');
        }
        
        const alertMsg = aiData.alert || (aiData.flags && aiData.flags.length > 0 ? aiData.flags.join(' | ') : false);

        return {
          type: aiData.type || 'Document Inconnu',
          smartName,
          extractedData: finalExtracted,
          alert: alertMsg,
          status: 'Analyse IA (Ollama) terminée',
          statusColor: 'var(--teal)',
          statusBg: 'rgba(20, 184, 166, 0.1)'
        };
      }
    } catch (e: any) {
      this.logger.warn(`Ollama indisponible ou erreur LLM, fallback sur l'analyse Regex: ${e.message}`);
    }

    // 2. FALLBACK EXPERT GED (Deloitte / KPMG Standards) : Extraction d'Entités Nommées
    let type = 'Document Inconnu';
    if (textUpper.includes('FACTURE') || textUpper.includes('INVOICE') || textUpper.includes('RECU')) type = 'Facture Fournisseur';
    else if (textUpper.includes('CONTRAT') || textUpper.includes('ACCORD') || textUpper.includes('PRESTATION')) type = 'Contrat Légal';
    else if (textUpper.includes('RELEVE') || textUpper.includes('RIB') || textUpper.includes('IBAN')) type = 'Document Bancaire';
    else if (textUpper.includes('PASSEPORT') || textUpper.includes('IDENTITE')) type = 'Pièce d\'identité (KYC)';
    else if (textUpper.includes('DEVIS') || textUpper.includes('PROPOSITION')) type = 'Devis Commercial';
    else if (textUpper.includes('CAHIER DES CHARGES') || textUpper.includes('SPECIFICATIONS')) type = 'Cahier des Charges';

    const extractedData: Record<string, string> = {};

    // A. Extraction de l'Entité Principale (Fournisseur, Client, etc.)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const entityLines = lines.filter(l => !l.toUpperCase().includes('FACTURE') && !l.toUpperCase().includes('DATE') && !l.toUpperCase().includes('PAGE'));
    if (entityLines.length > 0) extractedData['Entité (Emetteur/Tiers)'] = entityLines[0].substring(0, 50);

    // B. Extraction de l'Objet / Titre du document
    const objetMatch = text.match(/(?:Objet|Sujet|Titre)[\s]*[:\-]?[\s]*([^\n]{5,100})/i);
    if (objetMatch) extractedData['Objet du document'] = objetMatch[1].trim();

    // C. Extraction des Dates (Format JJ/MM/AAAA ou AAAA-MM-JJ)
    const dateRegex = /\b(?:0[1-9]|[12][0-9]|3[01])[\/.\-](?:0[1-9]|1[012])[\/.\-](?:19|20)\d{2}\b/g;
    const dates = text.match(dateRegex);
    if (dates && dates.length > 0) {
      extractedData['Date du document'] = dates[0];
      if (dates.length > 1) extractedData['Date d\'échéance/Fin'] = dates[dates.length - 1];
    }

    // D. Extraction des Montants (Finance/Achats)
    const amountRegex = /\b(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?)\s*(?:€|FCFA|XAF|USD|\$|CFA|EUR)\b/gi;
    const amounts = [];
    let m;
    while ((m = amountRegex.exec(text)) !== null) {
      amounts.push(m[0]);
    }
    if (amounts.length > 0) {
      // On prend souvent le montant le plus élevé comme "Montant Total"
      const maxAmount = amounts.sort((a, b) => parseFloat(b.replace(/[^\d.]/g, '')) - parseFloat(a.replace(/[^\d.]/g, '')))[0];
      extractedData['Montant Principal'] = maxAmount;
    }

    // E. Extraction des Références (N°, Réf, ID)
    const refMatch = text.match(/(?:N°|Réf\.?|Reference|Facture n°|Devis n°)[\s]*[:\-]?[\s]*([A-Z0-9\-_]{4,20})/i);
    if (refMatch) extractedData['Référence (ID)'] = refMatch[1].trim();

    // F. Extraction des Contacts (Emails & Téléphones)
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) extractedData['Email de contact'] = emailMatch[0];

    const phoneMatch = text.match(/(?:Tél\.?|Tel\.?|Téléphone|Phone)?[\s]*[:\-]?[\s]*(\+?\d{1,4}[\s.\-]?\(?\d{1,3}\)?[\s.\-]?\d{2,4}[\s.\-]?\d{2,4}[\s.\-]?\d{2,4})/i);
    if (phoneMatch && phoneMatch[1].replace(/[^\d]/g, '').length >= 8) {
      extractedData['Téléphone'] = phoneMatch[1].trim();
    }

    // G. Numéros d'enregistrement (GED Métier: SIRET, NIU, RCCM)
    const niuMatch = text.match(/\b(?:NIU|NIF|SIRET|SIREN)[\s]*[:\-]?[\s]*([A-Z0-9\s]{9,20})\b/i);
    if (niuMatch) extractedData['Numéro d\'Identification'] = niuMatch[1].trim();

    let smartName = originalName;
    if (extractedData['Entité (Emetteur/Tiers)']) {
      smartName = `${type} - ${extractedData['Entité (Emetteur/Tiers)'].substring(0, 15)}`;
    }

    // H. Extraction de mots-clés intelligente (Analyse de la structure)
    const stopwords = new Set(['le','la','les','de','des','du','un','une','en','et','ou','pour','par','dans','sur','avec','sans','sous','vers','ce','cette','ces','mon','ton','son','notre','votre','leur','qui','que','quoi','dont','où','je','tu','il','elle','nous','vous','ils','elles','a','à','au','aux','est','sont','été','avoir','être','faire','dire','pouvoir','vouloir','savoir','voir','devoir','venir','suivre','parler','prendre','croire','aimer','passer','mettre','demander','tenir','sembler','laisser','rester','penser','entendre','regarder','répondre','rendre','connaître','paraître','arriver','sentir','attendre','vivre','chercher','sortir','comprendre','porter','devenir','entrer','retenir','écrire','appeler','tomber','reprendre','commencer','partir','montrer','cette','dans','pour','nous','vous','votre','notre','facture','objet','date','monsieur','madame','selon','ayant','sont','leurs']);

    const cleanText = textUpper.replace(/[^A-ZÀ-Ÿ0-9\s]/g, ' ');
    const words = cleanText.split(/\s+/).filter(w => w.length > 3 && !stopwords.has(w.toLowerCase()) && !/^\d+$/.test(w));
    
    // Fréquence des mots
    const wordCounts: Record<string, number> = {};
    for (const w of words) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
    
    // Mots avec majuscules d'origine (pour privilégier les entités)
    const originalCapitalized = text.match(/\b[A-ZÀ-Ÿ][a-zà-ÿA-ZÀ-Ÿ]{3,}\b/g) || [];
    for (const cw of originalCapitalized) {
        const u = cw.toUpperCase();
        if (wordCounts[u]) wordCounts[u] += 2; // Poids supplémentaire pour les majuscules
    }

    const sortedKeywords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(entry => entry[0]);

    if (sortedKeywords.length > 0) {
        extractedData['Mots-clés Indexation'] = sortedKeywords.join(', ');
    }

    let alertMsg = null;
    if (textUpper.includes('URGENT') || textUpper.includes('RETARD') || textUpper.includes('PENALITE')) {
      alertMsg = "Le document contient des mentions liées à une urgence, un retard ou une pénalité.";
    }

    return {
      type,
      smartName,
      extractedData,
      alert: alertMsg, 
      status: 'Analyse standard terminée',
      statusColor: 'var(--teal)',
      statusBg: 'rgba(20, 184, 166, 0.1)'
    };
  }
}
