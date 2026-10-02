/**
 * Entreprise courante d'une session.
 *
 * Volontairement hors de `ged-api.ts` : ce fichier porte la directive
 * `"use server"`, qui n'accepte que des fonctions asynchrones comme export.
 * Aucune donnée d'entreprise n'est stockée ici — seulement le nom du cookie
 * qui porte le choix de l'utilisateur.
 */
export const COOKIE_TENANT = "elara_tenant";
