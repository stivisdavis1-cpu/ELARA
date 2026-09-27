/**
 * Rôles de compte de la plateforme.
 *
 * Ce module ne porte volontairement pas la directive « use server » : dans un
 * fichier serveur, tout export devient une référence d'action, y compris une
 * simple constante. Un composant client recevrait alors un objet proxy sur
 * lequel `.map` n'existe pas — d'où un crash au rendu, en build comme en
 * production. Les données de référence restent donc ici, hors du module
 * serveur, et `ged-api` n'exporte plus de constante.
 */
export const ROLES_UTILISATEUR = [
  {
    cle: "admin_compte",
    libelle: "Administrateur",
    description: "Accès complet, y compris la facturation et la gestion des comptes.",
  },
  {
    cle: "utilisateur_standard",
    libelle: "Utilisateur",
    description: "Accès aux modules métier, sans gestion des comptes ni des quotas.",
  },
  {
    cle: "assistant_ia_systeme",
    libelle: "Assistant IA",
    description: "Lecture seule : l'IA peut lire et résumer, jamais écrire.",
  },
  {
    cle: "integration_externe",
    libelle: "Intégration",
    description: "Compte machine pour les connecteurs, sans connexion humaine.",
  },
] as const;

export type CleRole = (typeof ROLES_UTILISATEUR)[number]["cle"];

export function libelleRole(cle: string): string {
  return ROLES_UTILISATEUR.find((r) => r.cle === cle)?.libelle ?? cle;
}
