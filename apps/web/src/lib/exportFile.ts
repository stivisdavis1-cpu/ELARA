export type ExportFormat = 'pdf' | 'docx' | 'png';

export const EXPORT_LABELS: Record<ExportFormat, string> = {
  pdf: 'PDF',
  docx: 'Word (.docx)',
  png: 'Images PNG',
};

export const EXPORT_ICONS: Record<ExportFormat, string> = {
  pdf: '.pdf',
  docx: '.docx',
  png: '.png',
};

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function triggerDownload(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export type ExportListener = (state: 'busy' | 'done' | 'error', message?: string) => void;

/**
 * Export d'un document vers PDF / Word / Image.
 * Passe par le rewrite même-origine `/api/scanner/*` (JSON base64 sûr).
 * L'en-tête Authorization est envoyé quand la session fournit un accessToken
 * (utilisé par le backend pour vérifier le rôle admin sur certaines actions).
 */
export async function exportDocument(
  documentId: string,
  format: ExportFormat,
  accessToken?: string | null,
  onState?: ExportListener
): Promise<void> {
  const url = `/api/scanner/documents/${encodeURIComponent(documentId)}/export?format=${format}`;
  const headers: Record<string, string> = {
    accept: 'application/json',
  };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  onState?.('busy');
  let res: Response;
  try {
    res = await fetch(url, { headers, cache: 'no-store' });
  } catch (e: any) {
    onState?.('error', e instanceof Error ? e.message : String(e));
    throw e;
  }

  if (!res.ok) {
    let msg = `Export impossible (HTTP ${res.status})`;
    try {
      const payload = await res.json();
      msg = payload?.error || payload?.data?.error || msg;
    } catch { /* corps non JSON */ }
    onState?.('error', msg);
    throw new Error(msg);
  }

  let payload: any;
  try {
    payload = await res.json();
  } catch (e: any) {
    onState?.('error', 'Réponse d\'export invalide.');
    throw e;
  }

  const inner = payload?.data && typeof payload.data.data === 'string' ? payload.data : payload;
  const mime: string = inner?.mime || 'application/octet-stream';
  const name: string = inner?.name || `document.${format}`;
  const pages: string[] | undefined = Array.isArray(inner?.pages) ? inner.pages : undefined;

  try {
    if (pages && pages.length > 1) {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const stem = name.replace(/\.[a-z0-9]{1,5}$/i, '');
      pages.forEach((b64, i) => {
        zip.file(`${stem}_page_${i + 1}.png`, base64ToBytes(b64));
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(blob, `${stem}_pages.zip`);
    } else {
      const data = typeof inner?.data === 'string' ? inner.data : (pages?.[0] ?? '');
      if (!data) throw new Error('Export vide.');
      triggerDownload(new Blob([base64ToBytes(data)], { type: mime }), name);
    }
    onState?.('done');
  } catch (e: any) {
    onState?.('error', e instanceof Error ? e.message : String(e));
    throw e;
  }
}