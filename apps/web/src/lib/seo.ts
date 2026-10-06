/**
 * Domaine canonique du site, sans slash final.
 *
 * `NEXT_PUBLIC_SITE_URL` est la variable à définir en production (coupleur,
 * déploiement) : elle alimente le canonical, les balises Open Graph, le
 * sitemap et les liens de parrainage. Repli sur le domaine public déjà
 * affiché dans les pages (pied de page).
 */
export function siteUrl(): string {
  const configure =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  return (configure || 'https://www.elara.app').replace(/\/+$/, '');
}