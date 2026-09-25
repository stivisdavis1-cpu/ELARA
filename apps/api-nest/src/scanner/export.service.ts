import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ScannerService } from './scanner.service.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { resolve } from 'path';

function scriptPath(name: string): string {
  const c = process.env.OCR_SCRIPTS_DIR;
  return c ? resolve(c, name) : resolve(process.cwd(), name);
}

function pdfToImgScript(): string {
  return scriptPath('pdf_to_img.py');
}
function docxToPdfScript(): string {
  return scriptPath('docx_to_pdf.py');
}
function textToDocxScript(): string {
  return scriptPath('text_to_docx.py');
}

export type ExportFormat = 'pdf' | 'docx' | 'png';

/**
 * Export d'un document vers PDF / Word (docx) / Image (png), entièrement côté
 * serveur, en réutilisant la chaîne Python déjà embarquée dans l'image
 * (python-docx + reportlab + poppler-utils + pymupdf) et ImageMagick.
 *
 * Réponses toujours en JSON sûr (base64) — jamais de `application/...`
 * exposé à fetch() (quirk navigateur déjà identifié sur ce poste).
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly scannerService: ScannerService) {}

  async convert(tenantId: string, documentId: string, format: ExportFormat) {
    const src = await this.scannerService.getExportArtifacts(tenantId, documentId);
    if (!src.buffer || src.buffer.length === 0) {
      throw new BadRequestException('Fichier source vide (0 octet).');
    }

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const base = path.join(tmpDir, `export_${stamp}`);
    fs.mkdirSync(base, { recursive: true });

    const cleanup = () => {
      try { fs.rmSync(base, { recursive: true, force: true }); } catch { /* ignore */ }
    };

    try {
      const ext = this.extOf(src.mime);
      const inPath = path.join(base, 'source' + (ext || '.bin'));
      fs.writeFileSync(inPath, src.buffer);

      const isPdf = src.mime === 'application/pdf' || ext === '.pdf';
      const isImage = src.mime.startsWith('image/');
      const isWord = ext === '.docx' || ext === '.doc' || src.mime.includes('word');
      const nameBase = (src.name || 'document').replace(/\.[a-z0-9]{1,5}$/i, '');

      if (format === 'pdf') {
        return await this.toPdf(base, inPath, src, isPdf, isImage, isWord, nameBase);
      }
      if (format === 'docx') {
        return await this.toDocx(base, inPath, src, isWord, nameBase);
      }
      return await this.toPng(base, inPath, src, isPdf, isImage, nameBase);
    } finally {
      cleanup();
    }
  }

  private run(cmd: string, label: string) {
    try {
      return execSync(cmd, { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' }).toString();
    } catch (e: any) {
      this.logger.error(`Conversion ${label} échouée : ${e?.message || e}`);
      throw new BadRequestException(`Conversion ${label} impossible c\u00f4t\u00e9 serveur.`);
    }
  }

  private async buildDocxFromText(base: string, src: any, nameBase: string): Promise<string> {
    const raw = (src.ocrText && String(src.ocrText).trim())
      ? String(src.ocrText)
      : (src.extraction && Object.keys(src.extraction).length
          ? Object.entries(src.extraction)
              .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
              .map(([k, v]) => `${k} : ${v}`)
              .join('\n')
          : 'Contenu non extrait pour ce document.');
    const txt = path.join(base, 'source.txt');
    fs.writeFileSync(txt, raw);
    const out = path.join(base, 'out.docx');
    this.run(`python3 "${textToDocxScript()}" "${txt}" "${out}" --title "${this.escapeShell(nameBase)}"`, 'texte vers Word');
    return out;
  }

  private async toPdf(base: string, inPath: string, src: any, isPdf: boolean, isImage: boolean, isWord: boolean, nameBase: string) {
    let outPdf: Buffer;
    if (isPdf) {
      outPdf = src.buffer;
    } else if (isImage) {
      const out = path.join(base, 'out.pdf');
      this.run(`convert "${inPath}" -quality 90 "${out}"`, 'image vers PDF');
      outPdf = fs.readFileSync(out);
    } else {
      const docx = await this.buildDocxFromText(base, src, nameBase);
      const out = path.join(base, 'out.pdf');
      this.run(`python3 "${docxToPdfScript()}" "${docx}" "${out}"`, 'Word vers PDF');
      outPdf = fs.readFileSync(out);
    }
    return { mime: 'application/pdf', name: nameBase + '.pdf', data: outPdf.toString('base64') };
  }

  private async toDocx(base: string, inPath: string, src: any, isWord: boolean, nameBase: string) {
    if (isWord) {
      return {
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        name: nameBase + '.docx',
        data: src.buffer.toString('base64'),
      };
    }
    const docx = await this.buildDocxFromText(base, src, nameBase);
    return {
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      name: nameBase + '.docx',
      data: fs.readFileSync(docx).toString('base64'),
    };
  }

  private async toPng(base: string, inPath: string, src: any, isPdf: boolean, isImage: boolean, nameBase: string) {
    if (isImage) {
      return { mime: src.mime, name: nameBase + this.extOf(src.mime), data: src.buffer.toString('base64'), single: true };
    }
    const pdfPath = isPdf ? inPath : await this.pdfOf(base, inPath, src, nameBase);
    const pages: string[] = [];
    const maxPages = 60;
    for (let i = 0; i < maxPages; i++) {
      const out = path.join(base, `page_${i}.png`);
      try {
        execSync(`python3 "${pdfToImgScript()}" "${pdfPath}" "${out}" --page ${i}`, { maxBuffer: 64 * 1024 * 1024 });
      } catch {
        // page au-delà de la dernière : on s'arrête
      }
      if (!fs.existsSync(out)) break;
      pages.push(fs.readFileSync(out).toString('base64'));
    }
    if (pages.length === 0) {
      throw new BadRequestException('Aucune page exportable en image.');
    }
    return {
      mime: 'image/png',
      name: nameBase + '.png',
      data: pages[0],
      pages,
      single: pages.length === 1,
    };
  }

  private async pdfOf(base: string, inPath: string, src: any, nameBase: string): Promise<string> {
    if (src.mime.startsWith('image/')) {
      const out = path.join(base, 'out.pdf');
      this.run(`convert "${inPath}" -quality 90 "${out}"`, 'image vers PDF');
      return out;
    }
    const docx = await this.buildDocxFromText(base, src, nameBase);
    const out = path.join(base, 'out.pdf');
    this.run(`python3 "${docxToPdfScript()}" "${docx}" "${out}"`, 'Word vers PDF');
    return out;
  }

  private extOf(mime: string): string {
    const m = (mime || '').toLowerCase();
    if (m === 'application/pdf') return '.pdf';
    if (m.includes('word') || m.includes('document')) return '.docx';
    if (m.includes('presentation')) return '.pptx';
    if (m.includes('spreadsheet') || m.includes('excel')) return '.xlsx';
    if (m.includes('csv')) return '.csv';
    if (m.includes('rtf')) return '.rtf';
    if (m.includes('jpeg')) return '.jpg';
    if (m.includes('png')) return '.png';
    if (m.includes('webp')) return '.webp';
    if (m.includes('tiff')) return '.tiff';
    if (m.startsWith('image/')) return '.img';
    if (m.startsWith('text/')) return '.txt';
    return '';
  }

  private escapeShell(s: string): string {
    return String(s || '').replace(/(["\\$`])/g, '\\$1');
  }
}