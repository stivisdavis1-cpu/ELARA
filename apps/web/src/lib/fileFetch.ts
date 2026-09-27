export interface FetchedFile {
  buffer: ArrayBuffer;
  mime: string;
}

/**
 * Récupère le contenu brut d'un document sans jamais exposer une réponse
 * `application/pdf` à fetch() (bloquée dans certains navigateurs/paramètres)
 * : on demande `?as=base64` (JSON) puis on décode.
 *
 * `headers` est indispensable pour les URL de l'API : le proxy Next relaie
 * `/api/scanner/*` vers Nest sans rien ajouter, et le contrôleur lit le
 * tenant sur l'en-tête `x-tenant-id`. Sans lui, Nest retombe sur
 * « test-tenant » et répond 404 sur un document d'un tenant réel.
 */
export async function fetchFileBytes(url: string, headers?: Record<string, string>): Promise<FetchedFile> {
  const res = await fetch(url, { cache: 'no-store', headers });
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

/**
 * Rectangle réellement occupé par une image `object-fit: contain` dans un
 * conteneur, en coordonnées de celui-ci.
 *
 * LeContain centre l'image et laisse des bandes vides si les rapporteurs
 * d'aspect diffèrent. Sans ce calcul, un rectangle dessiné sur la page est
 * interprété comme s'il couvrait tout le conteneur : l'OCR recadre alors la
 * mauvaise zone, très visiblement sur un document au format A4 dans un
 * cadre 16/9.
 */
export function rectImageContenue(
  conteneur: { largeur: number; hauteur: number },
  image: { largeur: number; hauteur: number },
): { x: number; y: number; largeur: number; hauteur: number } {
  if (!image.largeur || !image.hauteur || !conteneur.largeur || !conteneur.hauteur) {
    return { x: 0, y: 0, largeur: conteneur.largeur, hauteur: conteneur.hauteur };
  }
  const ratio = Math.min(conteneur.largeur / image.largeur, conteneur.hauteur / image.hauteur);
  const largeur = image.largeur * ratio;
  const hauteur = image.hauteur * ratio;
  return {
    x: (conteneur.largeur - largeur) / 2,
    y: (conteneur.hauteur - hauteur) / 2,
    largeur,
    hauteur,
  };
}