/**
 * URL de l'API vues par le navigateur.
 *
 * Deux pièges que le code composants tombait dedans :
 *
 * - `localhost:3001` codé en dur marche sur le poste du développeur et
 *   nowhere else : en docker, le navigateur du client ne connaît pas le
 *   réseau interne. Le socket temps réel ne se connectait donc jamais hors
 *   local.
 * - `NEXT_PUBLIC_API_URL` est défini côté navigateur, `API_NEST_URL` côté
 *   serveur : mélanger les deux fait fuiter une URL interne dans le bundle.
 *
 * On lit donc uniquement la variable publique, et on déduit le WebSocket du
 * même hôte au lieu d'un second littéral.
 */

/** Base HTTP publique de l'API, sans slash final. */
export function apiPublique(): string {
  const configuree = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuree) return configuree.replace(/\/+$/, "").replace(/\/v1$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3001";
}

/** URL du socket temps réel, dérivée de la même base. */
export function socketScanner(): string {
  return `${apiPublique().replace(/^http/, "ws")}/v1/scanner/realtime`;
}
