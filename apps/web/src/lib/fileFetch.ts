export interface FetchedFile {
  buffer: ArrayBuffer;
  mime: string;
}

/**
 * Récupère le contenu brut d'un document sans jamais exposer une réponse
 * `application/pdf` à fetch() (bloquée dans certains navigateurs/paramètres)
 * : on demande `?as=base64` (JSON) puis on décode.
 */
export async function fetchFileBytes(url: string): Promise<FetchedFile> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`fetch HTTP ${res.status}`);

  const servedMime = (res.headers.get('Content-Type') || '').split(';')[0].trim();

  if (servedMime === 'application/json') {
    const json = await res.json();
    // Un interceptor Nest global enveloppe parfois la réponse : { data: { mime, data } }.
    const inner =
      json && typeof json.data === 'object' && json.data && typeof json.data.data === 'string'
        ? json.data
        : json;
    if (!inner || typeof inner.data !== 'string' || typeof inner.mime !== 'string') {
      throw new Error('réponse JSON inattendue (data/mime manquants)');
    }
    const bin = atob(inner.data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { buffer: bytes.buffer as ArrayBuffer, mime: inner.mime.split(';')[0].trim() };
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength === 0) throw new Error('réponse vide (0 octets)');
  return { buffer, mime: servedMime };
}

/** URL « propre » pour téléchargement/ouverture (sans ?as=base64). */
export function rawFileUrl(url: string): string {
  return url.replace(/[?&]as=base64$/, '');
}