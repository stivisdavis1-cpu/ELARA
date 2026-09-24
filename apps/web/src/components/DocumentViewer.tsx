"use client";
import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { FileText, Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";

// Chargé dynamiquement dans l'effet (jamais évalué au build/prérendu : pdf.js v6
// requiert `Iterator`, absent de Node 20 utilisé dans l'image Docker).
const pdfWorkerUrl = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PreviewState =
  | { kind: 'loading' }
  | { kind: 'image'; blobUrl: string }
  | { kind: 'pdf'; numPages: number }
  | { kind: 'html'; html: string }
  | { kind: 'text'; text: string }
  | { kind: 'csv'; head: string[]; rows: string[][] }
  | { kind: 'pptx'; slides: string[][] }
  | { kind: 'unsupported' };

/** Déduit un type MIME depuis le nom de fichier (sert à choisir le rendu). */
export function mimeFromName(fileName?: string): string | undefined {
  const n = (fileName || '').toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (n.endsWith('.doc')) return 'application/msword';
  if (n.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (n.endsWith('.rtf')) return 'application/rtf';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.tif') || n.endsWith('.tiff')) return 'image/tiff';
  if (n.endsWith('.bmp')) return 'image/bmp';
  if (n.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (n.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (n.endsWith('.csv')) return 'text/csv';
  if (n.endsWith('.txt')) return 'text/plain';
  if (n.endsWith('.json')) return 'application/json';
  if (n.endsWith('.md')) return 'text/markdown';
  if (n.endsWith('.xml')) return 'text/xml';
  if (n.endsWith('.log')) return 'text/plain';
  return undefined;
}

function parseCsv(raw: string): { head: string[]; rows: string[][] } {
  const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);
  const split = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else current += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ',' || ch === ';') { cells.push(current.trim()); current = ''; }
      else current += ch;
    }
    cells.push(current.trim());
    return cells;
  };
  const head = split(lines[0]);
  const rows = lines.slice(1).map(split);
  return { head, rows };
}

export interface DocumentViewerProps {
  url: string;
  /** Nom du fichier (avec extension) utilisé pour détecter le format et le téléchargement. */
  fileName: string;
  /** Nom d'affichage (facultatif). */
  title?: string;
  /** Type MIME connu (sinon déduit de fileName). */
  mimeType?: string;
}

export default function DocumentViewer({ url, fileName, title, mimeType }: DocumentViewerProps) {
  const [state, setState] = useState<PreviewState>({ kind: 'loading' });
  const [pdfPage, setPdfPage] = useState(1);
  const blobUrlRef = useRef('');
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const pdfTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);

  const revoke = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = '';
    }
  }, []);

  const destroyPdf = useCallback(() => {
    pdfDocRef.current = null;
    const task = pdfTaskRef.current;
    pdfTaskRef.current = null;
    try { task?.destroy(); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const mime = mimeType || mimeFromName(fileName);
    const n = fileName || '';
    const lower = n.toLowerCase();

    // Type déduit du nom de fichier (fallback si le serveur ne renvoie pas un type exploitable).
    const kindFromName = (() => {
      if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
      if (mime?.startsWith('image/') || /\.(png|jpe?g|webp|tiff?|bmp)$/i.test(lower)) return 'image';
      if (mime?.includes('word') || lower.endsWith('.docx') || lower.endsWith('.doc')) return 'docx';
      if (mime?.includes('presentation') || lower.endsWith('.pptx')) return 'pptx';
      if (mime?.includes('rtf') || lower.endsWith('.rtf')) return 'rtf';
      if (mime === 'text/csv' || lower.endsWith('.csv')) return 'csv';
      if (mime?.startsWith('text/') || /\.(txt|json|md|xml|log)$/i.test(lower)) return 'text';
      return undefined;
    })() as 'pdf' | 'image' | 'docx' | 'pptx' | 'rtf' | 'csv' | 'text' | undefined;

    // Le Content-Type réel retourné par le serveur fait foi : il permet d'afficher
    // correctement un PDF/une image même si le nom de fichier a perdu son extension.
    const decideFromServed = (servedMime: string): typeof kindFromName | 'unsupported' => {
      const sm = servedMime;
      if (sm === 'application/pdf') return 'pdf';
      if (sm.startsWith('image/')) return 'image';
      if (sm.includes('word') || sm === 'application/msword') return 'docx';
      if (sm.includes('presentation')) return 'pptx';
      if (sm.includes('rtf')) return 'rtf';
      if (sm === 'text/csv') return 'csv';
      if (sm.startsWith('text/') || sm.includes('json') || sm.includes('xml') || sm.includes('markdown')) return 'text';
      return 'unsupported';
    };

    let cancelled = false;

    (async () => {
      setState({ kind: 'loading' });
      try {
        const res = await fetch(url);
        if (!res.ok || cancelled) { if (!cancelled) setState({ kind: 'unsupported' }); return; }

        const servedMime = (res.headers.get('Content-Type') || '').split(';')[0].trim();
        const decided = decideFromServed(servedMime);
        const kind: typeof kindFromName | 'unsupported' = decided === 'unsupported' ? kindFromName : decided;

        if (!kind) { setState({ kind: 'unsupported' }); return; }

        if (kind === 'pdf') {
          const buf = await res.arrayBuffer();
          if (cancelled) return;
          destroyPdf();
          // Rendu 100% côté client via pdf.js (canvas) : aucun visualiseur natif n'est
          // sollicité, donc aucun réglage navigateur ne peut déclencher un téléchargement.
          const pdfjs = await import('pdfjs-dist');
          if (cancelled) return;
          pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
          const task = pdfjs.getDocument({ data: buf });
          pdfTaskRef.current = task;
          const doc = await task.promise;
          if (cancelled || !doc) return;
          pdfDocRef.current = doc;
          setPdfPage(1);
          setState({ kind: 'pdf', numPages: doc.numPages });
          return;
        }

        if (kind === 'image') {
          const blob = await res.blob();
          if (cancelled || !blob.size) return;
          revoke();
          blobUrlRef.current = URL.createObjectURL(blob);
          setState({ kind: 'image', blobUrl: blobUrlRef.current });
          return;
        }

        const buf = await res.arrayBuffer();
        if (cancelled) return;

        if (kind === 'docx') {
          const mammoth = (await import('mammoth')).default;
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (!cancelled) setState({ kind: 'html', html: result.value });
        } else if (kind === 'rtf') {
          const { rtfToPlainText } = await import('@/lib/rtf');
          const text = rtfToPlainText(buf);
          if (!cancelled) setState({ kind: 'text', text });
        } else if (kind === 'pptx') {
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(buf);
          const slideFiles = Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
            .sort((a, b) => {
              const num = (p: string) => parseInt(p.match(/slide(\d+)/)?.[1] || '0', 10);
              return num(a) - num(b);
            });
          const slides: string[][] = [];
          for (const f of slideFiles) {
            const xml = await zip.files[f].async('string');
            const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
              .map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim())
              .filter(Boolean);
            slides.push(texts);
          }
          if (!cancelled) setState({ kind: 'pptx', slides });
        } else if (kind === 'csv') {
          const text = new TextDecoder('utf-8').decode(buf);
          const { head, rows } = parseCsv(text);
          if (!cancelled) setState({ kind: 'csv', head, rows });
        } else {
          const text = new TextDecoder('utf-8').decode(buf);
          if (!cancelled) setState({ kind: 'text', text });
        }
      } catch {
        if (!cancelled) setState({ kind: 'unsupported' });
      }
    })();

    return () => {
      cancelled = true;
      revoke();
      destroyPdf();
    };
  }, [url, fileName, mimeType, revoke, destroyPdf]);

  // Rendu de la page PDF courante dans le canvas.
  const isPdf = state.kind === 'pdf';
  const numPages = isPdf ? state.numPages : 0;

  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    const doc = pdfDocRef.current;
    const wrap = canvasWrapRef.current;
    const canvas = canvasRef.current;
    if (!doc || !wrap || !canvas) return;
    (async () => {
      try {
        const page = await doc.getPage(Math.min(pdfPage, numPages));
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const availWidth = Math.max(360, (wrap.clientWidth || 700) - 48);
        const scale = availWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        await page.render({
          canvas,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        }).promise;
        if (!cancelled) page.cleanup();
      } catch { /* erreur de rendu d'une page : on garde le canvas vide */ }
    })();
    return () => { cancelled = true; };
  }, [isPdf, pdfPage, numPages]);

  const prevPage = useCallback(() => {
    if (isPdf && pdfPage > 1) setPdfPage(p => p - 1);
  }, [isPdf, pdfPage]);

  const nextPage = useCallback(() => {
    if (isPdf && pdfPage < numPages) setPdfPage(p => p + 1);
  }, [isPdf, numPages, pdfPage]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', overflow: 'auto' }}>
      {state.kind === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-dim)', fontSize: 13 }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--teal)' }} />
          Chargement de l&apos;aperçu…
        </div>
      )}

      {state.kind === 'pdf' && (
        <div ref={canvasWrapRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'auto', background: '#52525B', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16 }}>
          <canvas ref={canvasRef} style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.35)', background: '#fff', borderRadius: 2 }} />
          <div style={{ position: 'sticky', top: 0, marginLeft: -0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(15,23,42,0.75)', color: '#fff', padding: '4px 8px', borderRadius: 999, fontSize: 12, alignSelf: 'flex-start' }}>
            <button onClick={prevPage} disabled={pdfPage <= 1} style={{ background: 'transparent', border: 'none', color: pdfPage <= 1 ? 'rgba(255,255,255,0.35)' : '#fff', cursor: pdfPage <= 1 ? 'default' : 'pointer', padding: 2 }} title="Page précédente">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>{pdfPage} / {numPages}</span>
            <button onClick={nextPage} disabled={pdfPage >= numPages} style={{ background: 'transparent', border: 'none', color: pdfPage >= numPages ? 'rgba(255,255,255,0.35)' : '#fff', cursor: pdfPage >= numPages ? 'default' : 'pointer', padding: 2 }} title="Page suivante">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {state.kind === 'image' && (
        <img src={state.blobUrl} alt={title || fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      )}

      {state.kind === 'html' && (
        <div className="viewer-office" style={{ padding: 24, background: '#fff' }} dangerouslySetInnerHTML={{ __html: state.html }} />
      )}

      {state.kind === 'text' && (
        <pre className="rtf-pre" style={{ color: 'var(--ink)', padding: 24 }}>{state.text}</pre>
      )}

      {state.kind === 'csv' && (
        <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#fff' }}>
          <table className="tbl" style={{ fontSize: 12 }}>
            <thead>
              <tr>{state.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {state.rows.map((row, r) => (
                <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.kind === 'pptx' && (
        <div className="viewer-pptx" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
          {state.slides.length > 0 ? state.slides.map((lines, i) => (
            <div className="pptx-slide" key={i}>
              <div className="pptx-slide-num">{i + 1} / {state.slides.length}</div>
              {lines.map((t, j) => (
                <div key={j} className={j === 0 ? 'pptx-title' : 'pptx-line'}>{t}</div>
              ))}
            </div>
          )) : (
            <div style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', padding: 40 }}>
              Aucun texte détecté dans cette présentation.
            </div>
          )}
        </div>
      )}

      {state.kind === 'unsupported' && (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
          <FileText className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--border)' }} />
          Aperçu non disponible pour ce format.<br />
          Téléchargez le fichier pour le consulter.
          <div style={{ marginTop: 16 }}>
            <a className="btn btn-primary teal" style={{ padding: '6px 12px', fontSize: 12, textDecoration: 'none' }} href={url} download={fileName}>
              <Download className="w-3 h-3 inline" style={{ marginRight: 4 }} /> Télécharger
            </a>
          </div>
        </div>
      )}
    </div>
  );
}