"use server";

/**
 * Actions serveur du web.
 *
 * Chaque fonction exported est une Server Action : elle reçoit les valeurs
 * brutes du formulaire (toujours des chaînes côté navigateur), les coerce et
 * les transmet aux server actions de `ged-api.ts`, qui speakent à l'API Nest.
 * Elles renvoient toutes `ResultatAction` pour que l'interface puisse
 * afficher un retour sans lever d'exception.
 */
import { cookies } from "next/headers";
import {
  ResultatAction,
  creerClient,
  creerEmploye,
  creerFournisseur,
  creerIntegration,
  creerOrganisation,
  creerTemplate,
  creerValidation,
  creerWorkflow,
  definirQuotas,
  enregistrerOnboarding,
  executerTousWorkflows,
  executerWorkflow,
  genererDocument,
  getAuditTrail,
  getCatalogueWorkflows,
  getDocumentsGeneres,
  getEmployes,
  getIntegrations,
  getMesOrganisations,
  getProfilTenant,
  getTemplatesDocgen,
  getUtilisateurs,
  inviterUtilisateur,
  modifierEmploye,
  modifierIntegration,
  modifierProfil,
  modifierTemplate,
  modifierWorkflow,
  retirerUtilisateur,
  changerRoleUtilisateur,
  changerStatutDocument,
  approuverValidation,
  rejeterValidation,
  supprimerDocumentGenere,
  supprimerEmploye,
  supprimerIntegration,
  supprimerTemplate,
  supprimerValidation,
  supprimerWorkflow,
  EntreeAudit,
  Organisation,
} from "./ged-api";
import { COOKIE_TENANT } from "./tenant";
import { ROLES_UTILISATEUR } from "./roles";

// ============================================================
// COERCITION DES SAISIES
// ============================================================

/** Les formulaires HTML renvoient des chaînes : on reformate selon le champ attendu. */
function texte(v: unknown, defaut = ""): string {
  if (v === undefined || v === null) return defaut;
  return String(v).trim() || defaut;
}

function nombre(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function booleen(v: unknown): boolean {
  return v === true || v === "true" || v === "on" || v === 1 || v === "1";
}

function liste(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return texte(v)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function objet(v: unknown): Record<string, string> {
  const sortie: Record<string, string> = {};
  if (v && typeof v === "object") {
    for (const [cle, valeur] of Object.entries(v as Record<string, unknown>)) {
      if (valeur !== undefined && valeur !== null && valeur !== "") sortie[cle] = String(valeur);
    }
  }
  return sortie;
}

function echec(e: unknown): ResultatAction {
  return { ok: false, message: e instanceof Error ? e.message : "L'opération a échoué." };
}

async function deflater(action: () => Promise<ResultatAction>): Promise<ResultatAction> {
  try {
    return await action();
  } catch (e) {
    return echec(e);
  }
}

// ============================================================
// ENTREPRISE COURANTE (un compte, plusieurs entreprises)
// ============================================================

/**
 * Mémorise l'entreprise sur laquelle l'utilisateur travaille.
 *
 * Le choix est validé contre la liste réelle des organisations du compte avant
 * d'être écrit : le cookie n'est qu'un moyen de navigation, il ne constitue
 * jamais une autorisation — celle-ci reste vérifiée par l'API à chaque appel.
 */
export async function selectionnerEntrepriseAction(tenantId: string): Promise<ResultatAction> {
  const id = texte(tenantId);
  if (!id) return { ok: false, message: "Entreprise non renseignée." };
  return deflater(async () => {
    const organisations = await getMesOrganisations();
    if (!organisations.some((o) => o.id === id)) {
      return { ok: false, message: "Vous n'avez pas accès à cette entreprise." };
    }
    (await cookies()).set(COOKIE_TENANT, id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return { ok: true, message: "Entreprise sélectionnée." };
  });
}

/**
 * Crée une entreprise pour le compte connecté.
 *
 * Point d'entrée du parcours de démarrage : un compte Keycloak qui n'a encore
 * aucune entreprise n'a accès à aucune page métier, l'onboarding compris. Il
 * crée donc d'abord son entreprise, ce qui lui rend l'onboarding accessible.
 */
export async function creerEntrepriseAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const raison_sociale = texte(d.raison_sociale);
  if (!raison_sociale) return { ok: false, message: "La raison sociale est obligatoire." };
  return deflater(async () => {
    const resultat = await creerOrganisation({
      raison_sociale,
      secteur: texte(d.secteur) || undefined,
      pays: texte(d.pays) || undefined,
      ville: texte(d.ville) || undefined,
      devise: (texte(d.devise) || undefined)?.toUpperCase(),
      systeme_comptable: texte(d.systeme_comptable) || "SYSCOHADA",
      nom: texte(d.nom) || undefined,
      email: texte(d.email) || undefined,
    });
    (await cookies()).set(COOKIE_TENANT, resultat.organisation.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return { ok: true, message: "Entreprise créée." };
  });
}

/** Entreprises accessibles au compte connecté, pour le sélecteur de la Sidebar. */
export async function mesOrganisationsAction(): Promise<Organisation[]> {
  const { organisations } = await mesOrganisationsResultat();
  return organisations;
}

/**
 * Même lecture, mais en distinguant « aucune entreprise » d'une panne : une
 * liste vide renvoyée sur erreur ferait croire à un compte sans société et
 * pousserait vers l'écran de création alors que l'appel a simplement échoué.
 */
export async function mesOrganisationsResultat(): Promise<{
  organisations: Organisation[];
  erreur: string | null;
}> {
  try {
    return { organisations: await getMesOrganisations(), erreur: null };
  } catch (e) {
    return { organisations: [], erreur: e instanceof Error ? e.message : String(e) };
  }
}

// ============================================================
// EMPLOYÉS (page Équipe)
// ============================================================

export async function enregistrerEmployeAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const nom = texte(d.nom);
  if (!nom) return { ok: false, message: "Le nom est obligatoire." };
  return deflater(() =>
    creerEmploye({
      nom,
      email: texte(d.email) || undefined,
      telephone: texte(d.telephone) || undefined,
      fonction: texte(d.fonction) || undefined,
      departement: texte(d.departement) || undefined,
      type_contrat: texte(d.type_contrat) || undefined,
      salaire_base: nombre(d.salaire_base),
      date_embauche: texte(d.date_embauche) || undefined,
      statut: texte(d.statut, "actif"),
    }),
  );
}

export async function modifierEmployeAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Employé introuvable." };
  const { id: _ignore, ...reste } = d;
  return deflater(() =>
    modifierEmploye(id, {
      nom: texte(reste.nom) || undefined,
      email: texte(reste.email) || undefined,
      telephone: texte(reste.telephone) || undefined,
      fonction: texte(reste.fonction) || undefined,
      departement: texte(reste.departement) || undefined,
      type_contrat: texte(reste.type_contrat) || undefined,
      salaire_base: nombre(reste.salaire_base),
      date_embauche: texte(reste.date_embauche) || undefined,
      statut: (texte(reste.statut, "actif") as "actif" | "conge" | "sorti"),
    }),
  );
}

export async function supprimerEmployeAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Employé introuvable." };
  return deflater(() => supprimerEmploye(id));
}

// ============================================================
// COMPTES & RÔLES (page Utilisateurs)
// ============================================================

export async function inviterUtilisateurAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const nom = texte(d.nom);
  const email = texte(d.email);
  if (!nom) return { ok: false, message: "Le nom est obligatoire." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Adresse e-mail invalide." };
  }
  return deflater(() => inviterUtilisateur({ nom, email, role: texte(d.role, "utilisateur_standard") }));
}

export async function changerRoleUtilisateurAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Compte introuvable." };
  return deflater(() => changerRoleUtilisateur(id, texte(d.role, "utilisateur_standard")));
}

export async function retirerUtilisateurAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Compte introuvable." };
  return deflater(() => retirerUtilisateur(id));
}

// ============================================================
// WORKFLOWS
// ============================================================

/** Analyse les conditions « champ / opérateur / valeur » saisies en JSON. */
function lireConditions(brut: unknown): { champ: string; operateur: string; valeur: string | number }[] {
  if (Array.isArray(brut)) {
    return brut
      .map((c) => {
        const item = c as Record<string, unknown>;
        return {
          champ: texte(item.champ),
          operateur: texte(item.operateur),
          valeur: (item.valeur as string | number) ?? "",
        };
      })
      .filter((c) => c.champ && c.operateur);
  }
  const brutTexte = texte(brut);
  if (!brutTexte) return [];
  try {
    const lu = JSON.parse(brutTexte);
    return Array.isArray(lu) ? lireConditions(lu) : [];
  } catch {
    throw new Error("Conditions invalides : utilisez du JSON, par exemple [{\"champ\":\"montant\",\"operateur\":\">\",\"valeur\":10000}].");
  }
}

/** Analyse les actions « type + paramètres » saisies en JSON. */
function lireActions(brut: unknown): { type: string; [cle: string]: unknown }[] {
  if (Array.isArray(brut)) {
    return brut
      .map((a) => {
        const item = a as Record<string, unknown>;
        const type = texte(item.type);
        if (!type) return null;
        const { type: _t, ...params } = item;
        return { type, ...params };
      })
      .filter((a): a is { type: string } => a !== null);
  }
  const brutTexte = texte(brut);
  if (!brutTexte) return [];
  try {
    const lu = JSON.parse(brutTexte);
    return Array.isArray(lu) ? lireActions(lu) : [];
  } catch {
    throw new Error("Actions invalides : utilisez du JSON, par exemple [{\"type\":\"slack\"}].");
  }
}

export async function enregistrerWorkflowAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const nom = texte(d.nom);
  if (!nom) return { ok: false, message: "Le nom du workflow est obligatoire." };
  const actions = lireActions(d.actions);
  if (!actions.length) {
    return { ok: false, message: "Ajoutez au moins une action à exécuter." };
  }
  return deflater(() =>
    creerWorkflow({
      nom,
      description: texte(d.description) || undefined,
      declencheur: texte(d.declencheur, "manuel"),
      evenement: texte(d.evenement, "workflow_demande"),
      conditions: lireConditions(d.conditions),
      actions,
      actif: booleen(d.actif),
    }),
  );
}

export async function modifierWorkflowAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Workflow introuvable." };
  return deflater(() => {
    const charge: Record<string, unknown> = { actif: booleen(d.actif) };
    if (d.nom !== undefined) charge.nom = texte(d.nom);
    if (d.description !== undefined) charge.description = texte(d.description);
    if (d.declencheur !== undefined) charge.declencheur = texte(d.declencheur, "manuel");
    if (d.evenement !== undefined) charge.evenement = texte(d.evenement);
    if (d.conditions !== undefined) charge.conditions = lireConditions(d.conditions);
    if (d.actions !== undefined) charge.actions = lireActions(d.actions);
    return modifierWorkflow(id, charge);
  });
}

export async function supprimerWorkflowAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Workflow introuvable." };
  return deflater(() => supprimerWorkflow(id));
}

export async function executerWorkflowAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Workflow introuvable." };
  return deflater(() => executerWorkflow(id));
}

export async function executerTousWorkflowsAction(d: Record<string, unknown> = {}): Promise<ResultatAction> {
  const evenement = texte(d.evenement) || undefined;
  return deflater(() => executerTousWorkflows(evenement));
}

export async function lireCatalogueWorkflowsAction(): Promise<ResultatAction> {
  return deflater(async () => {
    const catalogue = await getCatalogueWorkflows();
    return { ok: true, message: `${catalogue.evenements.length} déclencheurs et ${Object.keys(catalogue.types).length} types d'action disponibles.` };
  });
}

// ============================================================
// GÉNÉRATION DE DOCUMENTS
// ============================================================

export async function enregistrerTemplateAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const nom = texte(d.nom);
  if (!nom) return { ok: false, message: "Le nom du gabarit est obligatoire." };
  return deflater(() =>
    creerTemplate({
      nom,
      type: texte(d.type, "generique"),
      description: texte(d.description) || undefined,
      corps:
        texte(d.corps) ||
        "Madame, Monsieur,\n\nSauf erreur de notre part, nous vous transmettons le document {{numero}} d'un montant de {{montant}}.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
      champs: liste(d.champs).map((cle) => ({ cle, label: cle, type: "texte" as const })),
      actif: booleen(d.actif),
    }),
  );
}

export async function modifierTemplateAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Gabarit introuvable." };
  return deflater(() => {
    const charge: Record<string, unknown> = {};
    if (d.nom !== undefined) charge.nom = texte(d.nom);
    if (d.type !== undefined) charge.type = texte(d.type);
    if (d.description !== undefined) charge.description = texte(d.description);
    if (d.corps !== undefined) charge.corps = texte(d.corps);
    if (d.actif !== undefined) charge.actif = booleen(d.actif);
    if (d.champs !== undefined) {
      charge.champs = liste(d.champs).map((cle) => ({ cle, label: cle, type: "texte" as const }));
    }
    return modifierTemplate(id, charge);
  });
}

export async function supprimerTemplateAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Gabarit introuvable." };
  return deflater(() => supprimerTemplate(id));
}

export async function genererDocumentAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const templateId = texte(d.template_id);
  if (!templateId) return { ok: false, message: "Choisissez un gabarit." };
  return deflater(() =>
    genererDocument({
      template_id: templateId,
      client_id: texte(d.client_id) || null,
      fournisseur_id: texte(d.fournisseur_id) || null,
      numero: texte(d.numero) || undefined,
      montant: nombre(d.montant),
      donnees: objet(d.donnees),
    }),
  );
}

export async function changerStatutDocumentAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Document introuvable." };
  return deflater(() => changerStatutDocument(id, texte(d.statut, "a_valider")));
}

export async function supprimerDocumentAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Document introuvable." };
  return deflater(() => supprimerDocumentGenere(id));
}

// ============================================================
// VALIDATIONS
// ============================================================

export async function creerValidationAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const titre = texte(d.titre);
  if (!titre) return { ok: false, message: "Intitulé obligatoire." };
  return deflater(() =>
    creerValidation({
      type: texte(d.type, "document"),
      titre,
      detail: texte(d.detail) || undefined,
      cible_type: texte(d.cible_type) || undefined,
      cible_id: texte(d.cible_id) || undefined,
      montant: nombre(d.montant),
    }),
  );
}

export async function approuverValidationAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Demande introuvable." };
  return deflater(() => approuverValidation(id, texte(d.motif) || undefined));
}

export async function rejeterValidationAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  const motif = texte(d.motif);
  if (!id) return { ok: false, message: "Demande introuvable." };
  if (!motif) return { ok: false, message: "Le motif du refus est obligatoire." };
  return deflater(() => rejeterValidation(id, motif));
}

export async function supprimerValidationAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Demande introuvable." };
  return deflater(() => supprimerValidation(id));
}

// ============================================================
// INTÉGRATIONS
// ============================================================

export async function enregistrerIntegrationAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const nom = texte(d.nom);
  if (!nom) return { ok: false, message: "Le nom du connecteur est obligatoire." };
  return deflater(() =>
    creerIntegration({
      nom,
      type: texte(d.type, "webhook"),
      url: texte(d.url) || undefined,
      secret: texte(d.secret) || undefined,
      evenements: liste(d.evenements),
    }),
  );
}

export async function modifierIntegrationAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Connecteur introuvable." };
  return deflater(() => {
    const charge: Record<string, unknown> = {};
    if (d.nom !== undefined) charge.nom = texte(d.nom);
    if (d.type !== undefined) charge.type = texte(d.type);
    if (d.url !== undefined) charge.url = texte(d.url);
    if (d.secret !== undefined) charge.secret = texte(d.secret);
    if (d.evenements !== undefined) charge.evenements = liste(d.evenements);
    if (d.actif !== undefined) charge.actif = booleen(d.actif);
    return modifierIntegration(id, charge);
  });
}

export async function supprimerIntegrationAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const id = texte(d.id);
  if (!id) return { ok: false, message: "Connecteur introuvable." };
  return deflater(() => supprimerIntegration(id));
}

// ============================================================
// RÉGLAGES
// ============================================================

export async function enregistrerProfilAction(d: Record<string, unknown>): Promise<ResultatAction> {
  return deflater(() =>
    modifierProfil({
      raison_sociale: texte(d.raison_sociale) || undefined,
      secteur: texte(d.secteur) || undefined,
      pays: texte(d.pays) || undefined,
      ville: texte(d.ville) || undefined,
      devise: texte(d.devise) || undefined,
      systeme_comptable: texte(d.systeme_comptable) || undefined,
    }),
  );
}

export async function enregistrerQuotasAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const quotas: Record<string, number | null> = {};
  for (const cle of ["documents", "clients", "factures", "stockage_mo"]) {
    const valeur = d[cle];
    if (valeur === undefined) continue;
    quotas[cle] = valeur === "" || valeur === null ? null : (nombre(valeur) ?? null);
  }
  if (!Object.keys(quotas).length) return { ok: false, message: "Renseignez au moins un quota." };
  return deflater(() => definirQuotas({ plan: texte(d.plan) || undefined, quotas }));
}

export async function enregistrerOnboardingAction(d: Record<string, unknown>): Promise<ResultatAction> {
  return deflater(() => enregistrerOnboarding(objet(d.reponses)));
}

// ============================================================
// CLIENTS & FOURNISSEURS
// ============================================================

export async function creerClientAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const nom = texte(d.nom);
  if (!nom) return { ok: false, message: "Le nom est obligatoire." };
  return deflater(() =>
    creerClient({
      nom,
      email: texte(d.email) || undefined,
      telephone: texte(d.telephone) || undefined,
      adresse: texte(d.adresse) || undefined,
      identifiant_fiscal: texte(d.identifiant_fiscal) || undefined,
      niu: texte(d.niu) || undefined,
      rccm: texte(d.rccm) || undefined,
    }),
  );
}

export async function creerFournisseurAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const nom = texte(d.nom);
  if (!nom) return { ok: false, message: "Le nom est obligatoire." };
  return deflater(() =>
    creerFournisseur({
      nom,
      email: texte(d.email) || undefined,
      telephone: texte(d.telephone) || undefined,
      adresse: texte(d.adresse) || undefined,
      identifiant_fiscal: texte(d.identifiant_fiscal) || undefined,
      niu: texte(d.niu) || undefined,
      rccm: texte(d.rccm) || undefined,
    }),
  );
}

/**
 * Import CSV : une ligne = un contact. Le fichier est découpé côté serveur,
 * chaque ligne est insérée, et le rapport indique les rejets au lieu d'échouer
 * en bloc sur une ligne malformée.
 */
export async function importerContactsAction(d: Record<string, unknown>): Promise<ResultatAction> {
  const contenu = texte(d.contenu);
  const type = texte(d.type, "clients");
  if (!contenu) return { ok: false, message: "Fichier vide." };

  const lignes = contenu.split(/\r?\n/).filter((l) => l.trim());
  if (lignes.length < 2) return { ok: false, message: "Le fichier doit contenir une ligne d'en-tête." };

  const separateur = lignes[0].includes(";") ? ";" : ",";
  const entetes = decouper(lignes[0], separateur).map((e) => e.trim().toLowerCase());
  let crees = 0;
  const rejets: string[] = [];

  for (const ligne of lignes.slice(1)) {
    const cellules = decouper(ligne, separateur);
    const record: Record<string, string> = {};
    entetes.forEach((entete, i) => {
      record[entete] = (cellules[i] ?? "").trim().replace(/^"|"$/g, "");
    });
    const nom = record.nom || record.raison_sociale || record.client || record.fournisseur;
    if (!nom) {
      rejets.push(ligne.slice(0, 60));
      continue;
    }
    const charge = {
      nom,
      email: record.email || record.mail || undefined,
      telephone: record.telephone || record.tel || record.portable || undefined,
      adresse: record.adresse || undefined,
      identifiant_fiscal: record.identifiant_fiscal || record.nif || undefined,
      niu: record.niu || undefined,
      rccm: record.rccm || undefined,
    };
    const resultat = type === "fournisseurs" ? await creerFournisseur(charge) : await creerClient(charge);
    if (resultat.ok) crees += 1;
    else rejets.push(`${nom} : ${resultat.message}`);
  }

  const resume = `${crees} contact(s) importé(s).`;
  return rejets.length
    ? { ok: crees > 0, message: `${resume} ${rejets.length} ligne(s) rejetée(s) : ${rejets.slice(0, 3).join(" ; ")}` }
    : { ok: true, message: resume };
}

/** Découpe une ligne CSV en respectant les guillemets. */
function decouper(ligne: string, separateur: string): string[] {
  const cellules: string[] = [];
  let courante = "";
  let dansGuillemets = false;
  for (let i = 0; i < ligne.length; i += 1) {
    const c = ligne[i];
    if (c === '"') {
      if (dansGuillemets && ligne[i + 1] === '"') {
        courante += '"';
        i += 1;
      } else dansGuillemets = !dansGuillemets;
    } else if (c === separateur && !dansGuillemets) {
      cellules.push(courante);
      courante = "";
    } else courante += c;
  }
  cellules.push(courante);
  return cellules;
}

// ============================================================
// ACTIVITÉ EN DIRECT (bouton « Webhook Live »)
// ============================================================

export interface EntreeActivite {
  id: string;
  action: string;
  entite: string;
  statut: "SUCCESS" | "FAILED";
  acteur: string;
  quand: string;
}

/**
 * Alimente le panneau « Webhook Live » : dernières écritures réellement
 * enregistrées dans `audit_trail`, pas un flux simulé.
 */
export async function lireActiviteAction(limite = 25): Promise<{ entrees: EntreeActivite[]; total: number }> {
  const reponse = await getAuditTrail({ limit: limite });
  return {
    total: reponse.meta.total,
    entrees: reponse.data.map((e: EntreeAudit) => ({
      id: e.id,
      action: e.action,
      entite: e.entite_concernee,
      statut: e.statut,
      acteur: e.acteur_type === "SYSTEM" ? "système" : e.acteur_id,
      quand: new Date(e.created_at).toISOString(),
    })),
  };
}

// ============================================================
// LECTURE POUR LES MODALES D'INFORMATION
// ============================================================

export async function lireRolesAction(): Promise<
  ResultatAction & { roles: { cle: string; libelle: string; description: string }[] }
> {
  const comptes = await getUtilisateurs().catch(() => [] as { role: string }[]);
  const utilises = new Set(comptes.map((c) => c.role));
  const roles = ROLES_UTILISATEUR.map((r) => ({ ...r, utilise: utilises.has(r.cle) }));
  return {
    ok: true,
    message: `${roles.length} rôles disponibles.`,
    roles: roles.map(({ cle, libelle, description }) => ({ cle, libelle, description })),
  };
}

export async function lireClesApiAction(): Promise<ResultatAction & { lignes: { cle: string; valeur: string }[] }> {
  const [profil, integrations] = await Promise.all([getProfilTenant(), getIntegrations()]);
  const lignes = [
    { cle: "Organisation", valeur: `${profil.raison_sociale} (${profil.id})` },
    { cle: "Identifiant API", valeur: profil.id },
    { cle: "Connecteurs", valeur: `${integrations.length} configuré(s)` },
    ...integrations.map((i) => ({
      cle: `Secret · ${i.nom}`,
      valeur: i.secret_defini ? "Défini · masqué" : "Non défini",
    })),
  ];
  return { ok: true, message: `${lignes.length} élément(s).`, lignes };
}

export async function lireModelesWorkflowAction(): Promise<
  ResultatAction & { evenements: { cle: string; libelle: string }[]; types: Record<string, string[]> }
> {
  const catalogue = await getCatalogueWorkflows();
  return { ok: true, message: "Catalogue chargé.", evenements: catalogue.evenements, types: catalogue.types };
}

export async function lireResumeIntegrationAction(): Promise<ResultatAction & { lignes: { cle: string; valeur: string }[] }> {
  const integrations = await getIntegrations();
  return {
    ok: true,
    message: `${integrations.length} connecteur(s).`,
    lignes: integrations.length
      ? integrations.map((i) => ({
          cle: i.nom,
          valeur: `${i.actif ? "actif" : "inactif"} · ${i.statut}${i.dernier_statut ? ` · HTTP ${i.dernier_statut}` : ""}`,
        }))
      : [{ cle: "Aucun connecteur", valeur: "Ajoutez-en un pour brancher vos outils." }],
  };
}

export async function lireGabaritsAction(): Promise<
  ResultatAction & { gabarits: { id: string; nom: string; type: string; documents: number }[] }
> {
  const [gabarits, documents] = await Promise.all([getTemplatesDocgen(), getDocumentsGeneres()]);
  return {
    ok: true,
    message: `${gabarits.length} gabarit(s) enregistré(s).`,
    gabarits: gabarits.map((g) => ({
      id: g.id,
      nom: g.nom,
      type: g.type,
      documents: documents.filter((d) => d.template?.id === g.id).length,
    })),
  };
}

export async function lireEffectifsAction(): Promise<
  ResultatAction & { lignes: { cle: string; valeur: string }[] }
> {
  const { resume, employes } = await getEmployes();
  return {
    ok: true,
    message: `${employes.length} employé(s).`,
    lignes: [
      { cle: "Effectif", valeur: `${resume.effectif} actif(s) sur ${resume.total}` },
      { cle: "Masse salariale", valeur: `${resume.masse_salariale.toLocaleString("fr-FR")} / mois` },
      { cle: "Masse annuelle", valeur: `${resume.masse_annuelle.toLocaleString("fr-FR")}` },
      { cle: "Ancienneté moyenne", valeur: `${resume.anciennete_moyenne_ans} an(s)` },
      { cle: "En congé", valeur: String(resume.en_conge) },
    ],
  };
}

export async function lireManifesteExempleAction(): Promise<ResultatAction & { exemple: string }> {
  return {
    ok: true,
    message: "Exemple de manifeste d'agent.",
    exemple: JSON.stringify(
      {
        identifiant: "releve-factures-01",
        nom: "Relevé de factures fournisseur",
        version: "1.0.0",
        declencheur: { type: "planifie", cron: "0 8 1 * *" },
        entrees: [{ nom: "pdf", type: "fichier", requis: true, description: "Facture à traiter" }],
        etapes: [
          { nom: "extraction", outil: "ocr-facture", entrees: { document: "${pdf}" } },
          { nom: "rapprochement", outil: "rapprochement-comptabilite", entrees: { lignes: "${extraction.lignes}" } },
          { nom: "validation", outil: "file-validation", entrees: { montant: "${extraction.montant_ttc}" } },
        ],
        sorties: [{ nom: "ecriture", type: "document", format: "pdf" }],
        garde_fous: { seuil_validation_montant: 5000, dry_run: false },
      },
      null,
      2,
    ),
  };
}
