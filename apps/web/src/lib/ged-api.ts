"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { COOKIE_TENANT } from "@/lib/tenant";

export interface ApiEnvelope<T> {
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
}

export interface CfoSynthese {
  encaissements_totaux: number;
  sorties_totales: number;
  solde_theorique: number;
}

export interface CfoRunway {
  solde_actuel: number;
  cash_burn_mensuel_estime: number;
  runway_en_mois: number | null;
  alerte: "CRITIQUE" | "OK";
}

export interface CfoBfr {
  creances_clients: number;
  valeur_stocks: number;
  dettes_fournisseurs: number;
  bfr: number;
}

export interface DetailBalance {
  facture_id: string;
  client: string | null;
  retard_jours: number;
  montant: number;
}

export interface BalanceAgee {
  "0_30j": number;
  "31_60j": number;
  "61_90j": number;
  "90j_plus": number;
  details: DetailBalance[];
}

export interface TvaEstimee {
  tva_collectee: number;
  tva_deductible: number;
  solde_tva: number;
  conseil: string;
}

export interface AnomalieDoc {
  id: string;
  date: string;
  risque: number;
  type: string;
  message: string;
  lien: string | null;
}

export interface DocLigne {
  document_id: string;
  nom: string;
  fichier: string;
  type: string | null;
  statut: string;
  score: number | null;
  niveau_risque: number;
  date: string | null;
  extraction: Record<string, unknown> | null;
  archive: {
    archive_path: string;
    checksum: string | null;
    taille: number | null;
    archive_le: string | null;
  } | null;
}

export interface EntiteRef {
  id: string;
  nom: string;
  email?: string | null;
  telephone?: string | null;
  niu?: string | null;
  rccm?: string | null;
  identifiant_fiscal?: string | null;
}

export interface ProduitLigne {
  id: string;
  nom: string;
  reference: string | null;
  description: string | null;
  prix_unitaire: number | string;
}

export interface StockLigne {
  id: string;
  quantite: number;
  entrepot: string | null;
  produit: ProduitLigne;
}

export interface CommandeLigne {
  id: string;
  numero: string | null;
  statut: string;
  montant_total: number | string;
  date_commande: string | null;
  client: { id: string; nom: string } | null;
  fournisseur: { id: string; nom: string } | null;
}

export interface FactureLigne {
  id: string;
  numero: string | null;
  categorie: string | null;
  montant_ht: number | string | null;
  montant_tva: number | string | null;
  montant_total: number | string;
  statut: string;
  date_emission: string | null;
  date_echeance: string | null;
  client: { id: string; nom: string } | null;
  fournisseur: { id: string; nom: string } | null;
}

export interface PaiementLigne {
  id: string;
  montant: number | string;
  mode_paiement: string | null;
  date_paiement: string;
  client: { id: string; nom: string } | null;
  facture: { id: string; numero: string | null } | null;
}

export interface DepenseLigne {
  id: string;
  montant: number | string;
  categorie: string | null;
  date_depense: string;
  description: string | null;
  fournisseur: { id: string; nom: string } | null;
}

export interface TaxAuditResult {
  pays_traites: string[];
  mises_a_jour: {
    pays_code_iso?: string;
    tva?: { taux_standard: number; date_verification: string; source_url?: string };
    cotisations_sociales?: Record<string, number>;
  }[];
  a_verifier_manuellement: unknown[];
  non_disponibles: unknown[];
  message?: string;
}

/**
 * Entreprise sur laquelle travaille la session.
 *
 * Un compte peut piloter plusieurs entreprises : la demande vient donc de trois
 * endroits, par ordre d'autorité décroissante — le choix explicite de
 * l'utilisateur, puis le claim du jeton si Keycloak en porte un, et enfin
 * l'organisation principale du compte.
 *
 * La liste des organisations est récupérée par un appel direct et non par
 * `gedRequest` : ce dernier consulte cette fonction, qui appellerait donc
 * `gedRequest` à son tour, sans fin.
 */
export async function currentTenantId(): Promise<string> {
  const tenantId = await tenantCourantOptionnel();
  if (!tenantId) throw new Error("Aucune entreprise sélectionnée pour ce compte.");
  return tenantId;
}

/**
 * Entreprise courante, ou `null` si le compte n'en a aucune.
 *
 * `gedRequest` s'en sert pour l'en-tête `x-tenant-id` : cet en-tête doit
 * pouvoir manquer, sinon un compte créé directement dans Keycloak restait
 * enfermé — l'appel `POST /v1/mes-organisations`, qui crée l'entreprise, était
 * lui-même rejeté avant d'atteindre l'API. L'API décide alors, route par route,
 * si une entreprise est exigée.
 */
export async function tenantCourantOptionnel(): Promise<string | null> {
  const cookie = (await cookies()).get(COOKIE_TENANT)?.value?.trim();
  if (cookie) return cookie;

  const session = await auth();
  const portee = session?.tenantId?.trim();
  if (portee) return portee;

  return organisationPrincipale();
}

/** Identifiant de l'organisation principale, ou null si le compte n'en a aucune. */
async function organisationPrincipale(): Promise<string | null> {
  try {
    const session = await auth();
    const jeton = session?.accessToken;
    if (!jeton) return null;
    const apiUrl = process.env.API_NEST_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const r = await fetch(`${apiUrl}/v1/mes-organisations`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${jeton}` },
    });
    if (!r.ok) return null;
    const corps = (await r.json()) as ApiEnvelope<Array<{ id: string; principale: boolean }>>;
    const liste = corps?.data ?? [];
    return liste.find((o) => o.principale)?.id ?? liste[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Accès commun à l'API Nest (v1) depuis les server actions.
 * Injecte le bearer (jeton NextAuth réel) ainsi que le header x-tenant-id exigé
 * et vérifié par TenantInterceptor, puis ramène la payload de l'enveloppe
 * { data, error, meta }. Utilise API_NEST_URL (résolution interne docker)
 * avant NEXT_PUBLIC_API_URL (destination navigateur).
 */
async function gedRequest<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const session = await auth();
  const apiUrl = process.env.API_NEST_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Un seul jeton est jamais utilisé : celui de la session réelle. Réessayer
  // avec un jeton de secours après un 401 reviendrait à contourner
  // JwtAuthGuard ; en développement comme en production, l'échec est franc.
  const jeton = session?.accessToken;
  if (!jeton) throw new Error("Session expirée : reconnectez-vous.");

  // L'en-tête n'est envoyé que si le compte a une entreprise. L'API refuse
  // elle-même les routes qui en exigent une, avec le message attendu.
  const tenantId = await tenantCourantOptionnel();

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jeton}`,
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401) {
    throw new Error("Session expirée : reconnectez-vous.");
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.text()).slice(0, 240);
    } catch {
      /* ignore */
    }
    throw new Error(`API ${endpoint} → ${response.status} ${detail}`);
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  if (body.error) throw new Error(body.error);
  return body.data as T;
}

/** Échec attendu d'une écriture : remonté tel quel à l'utilisateur. */
  export interface ResultatAction {
    ok: boolean;
    message: string;
    /** Précision à afficher alors qu'aucune donnée n'est renvoyée. */
    note?: string | null;
    // Données complémentaires affichées par l'écran qui a déclenché l'action
    // (lien d'activation, valeurs enregistrées…). Absentes de la plupart des
    // actions, qui n'ont rien à montrer de plus qu'un message.
    donnees?: unknown;
  }

/**
 * Enveloppe les mutations pour qu'un échec remonte à l'écran au lieu de
 * casser le rendu. `gedRequest` lève ; on convertit ici en résultat lisible.
 */
async function mutation<T>(action: () => Promise<T>, succes: (resultat: T) => string): Promise<ResultatAction> {
  try {
    return { ok: true, message: succes(await action()) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "L'opération a échoué." };
  }
}

export interface HealthStatus {
  status: string;
  services: Record<string, string>;
}

export interface CurrentUser {
  id: string | null;
  name: string | null;
  email: string | null;
  roles: string[];
}

/**
 * Session NextAuth réelle de l'utilisateur courant. Sert aux pages
 * « Utilisateurs & rôles » et « Sécurité » pour n'afficher que des
 * identités effectives plutôt que des profils d'exemple.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await auth();
  return {
    id: session?.user?.id ?? null,
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    roles: session?.user?.roles ?? [],
  };
}

// ============================================================
// SANTÉ PLATEFORME
// ============================================================

export async function getHealth() {
  return gedRequest<HealthStatus>("/v1/health");
}

// ============================================================
// CFO
// ============================================================

export async function getSyntheseTresorerie() {
  return gedRequest<CfoSynthese>("/v1/cfo/cashflow/synthese");
}

export async function getRunway() {
  return gedRequest<CfoRunway>("/v1/cfo/cashflow/runway");
}

export async function getBFR() {
  return gedRequest<CfoBfr>("/v1/cfo/cashflow/bfr");
}

export async function getBalanceAgee() {
  return gedRequest<BalanceAgee>("/v1/cfo/risques/balance-agee");
}

export async function getTvaEstimee() {
  return gedRequest<TvaEstimee>("/v1/cfo/risques/tva-estimee");
}

export async function getAnomalies() {
  return gedRequest<AnomalieDoc[]>("/v1/cfo/risques/anomalies");
}

export async function triggerTaxAudit(countries: string[]) {
  return gedRequest<TaxAuditResult>("/v1/cfo/tax-rules/update", {
    method: "POST",
    body: JSON.stringify({ countries }),
  });
}

// ============================================================
// SCANNER / GED
// ============================================================

export async function getDocuments() {
  return gedRequest<DocLigne[]>("/v1/scanner/documents");
}

// ============================================================
// MEMOIRE ENTREPRISE
// ============================================================

export async function getClients() {
  return gedRequest<EntiteRef[]>("/v1/memoire/clients");
}

export async function getFournisseurs() {
  return gedRequest<EntiteRef[]>("/v1/memoire/fournisseurs");
}

export async function getProduits() {
  return gedRequest<ProduitLigne[]>("/v1/memoire/produits");
}

export async function getStocks() {
  return gedRequest<StockLigne[]>("/v1/memoire/stocks");
}

export async function getCommandes() {
  return gedRequest<CommandeLigne[]>("/v1/memoire/commandes");
}

export async function getFactures() {
  return gedRequest<FactureLigne[]>("/v1/memoire/factures");
}

export async function getPaiements() {
  return gedRequest<PaiementLigne[]>("/v1/memoire/paiements");
}

export async function getDepenses() {
  return gedRequest<DepenseLigne[]>("/v1/memoire/depenses");
}

// ============================================================
// COMPOSITES — une seule action serveur par page.
// Next sérialise les actions serveur d'un composant client :
// un lot parallèle de N actions s'exécuterait en séquence, avec
// ~1-3 s de latence Supabase par requête. En agrégeant tous les
// endpoints d'une page dans UNE action (appels internes leaders
// en parallèle), le chargement est borné par l'endpoint le plus
// lent au lieu de la somme.
// ============================================================

type StatusLigne<T> = { status: "fulfilled"; value: T } | { status: "rejected"; reason: unknown };

function firstError(results: { status: string; reason?: unknown }[]): string | null {
  const rej = results.find((r) => r.status === "rejected") as { reason?: unknown } | undefined;
  if (!rej) return null;
  return rej.reason instanceof Error ? rej.reason.message : String(rej.reason);
}

function val<T>(r: StatusLigne<T>): T | null {
  return r.status === "fulfilled" ? r.value : null;
}

export async function getDashboardData() {
  const [synthese, runway, balance, bfr, factures] = await Promise.allSettled([
    getSyntheseTresorerie(),
    getRunway(),
    getBalanceAgee(),
    getBFR(),
    getFactures(),
  ]);
  return {
    synthese: val(synthese),
    runway: val(runway),
    balance: val(balance),
    bfr: val(bfr),
    factures: val(factures) ?? [],
    error: firstError([synthese, runway, balance, bfr, factures]),
  };
}

export async function getCfoData() {
  const [synthese, bfr, runway, balance, tva, anomalies] = await Promise.allSettled([
    getSyntheseTresorerie(),
    getBFR(),
    getRunway(),
    getBalanceAgee(),
    getTvaEstimee(),
    getAnomalies(),
  ]);
  return {
    synthese: val(synthese),
    bfr: val(bfr),
    runway: val(runway),
    balance: val(balance),
    tva: val(tva),
    anomalies: val(anomalies) ?? [],
    error: firstError([synthese, bfr, runway, balance, tva, anomalies]),
  };
}

export async function getCommercialData() {
  const [clients, commandes, factures, paiements, balance] = await Promise.allSettled([
    getClients(),
    getCommandes(),
    getFactures(),
    getPaiements(),
    getBalanceAgee(),
  ]);
  return {
    clients: val(clients) ?? [],
    commandes: val(commandes) ?? [],
    factures: val(factures) ?? [],
    paiements: val(paiements) ?? [],
    balance: val(balance),
    error: firstError([clients, commandes, factures, paiements, balance]),
  };
}

export async function getClientsData() {
  const [clients, fournisseurs, factures, paiements, balance] = await Promise.allSettled([
    getClients(),
    getFournisseurs(),
    getFactures(),
    getPaiements(),
    getBalanceAgee(),
  ]);
  return {
    clients: val(clients) ?? [],
    fournisseurs: val(fournisseurs) ?? [],
    factures: val(factures) ?? [],
    paiements: val(paiements) ?? [],
    balance: val(balance),
    error: firstError([clients, fournisseurs, factures, paiements, balance]),
  };
}

export async function getOpsData() {
  const [produits, stocks, fournisseurs, factures, depenses] = await Promise.allSettled([
    getProduits(),
    getStocks(),
    getFournisseurs(),
    getFactures(),
    getDepenses(),
  ]);
  return {
    produits: val(produits) ?? [],
    stocks: val(stocks) ?? [],
    fournisseurs: val(fournisseurs) ?? [],
    factures: val(factures) ?? [],
    depenses: val(depenses) ?? [],
    error: firstError([produits, stocks, fournisseurs, factures, depenses]),
  };
}

export async function getReportData() {
  const [s, rw, bfrR, bal, tv, f, cl, fo, d, an, pa] = await Promise.allSettled([
    getSyntheseTresorerie(),
    getRunway(),
    getBFR(),
    getBalanceAgee(),
    getTvaEstimee(),
    getFactures(),
    getClients(),
    getFournisseurs(),
    getDocuments(),
    getAnomalies(),
    getPaiements(),
  ]);
  return {
    synthese: val(s),
    runway: val(rw),
    bfr: val(bfrR),
    balance: val(bal),
    tva: val(tv),
    factures: val(f) ?? [],
    clients: val(cl) ?? [],
    fournisseurs: val(fo) ?? [],
    docs: val(d) ?? [],
    anomalies: val(an) ?? [],
    paiements: val(pa) ?? [],
    error: firstError([s, rw, bfrR, bal, tv, f, cl, fo, d, an, pa]),
  };
}

export async function getAdminData() {
  const [health, docs, clients] = await Promise.allSettled([
    getHealth(),
    getDocuments(),
    getClients(),
  ]);
  return {
    health: val(health),
    docs: val(docs) ?? [],
    clients: val(clients) ?? [],
    error: firstError([health, docs, clients]),
  };
}

export async function getUsageData() {
  const [docs, clients, factures] = await Promise.allSettled([
    getDocuments(),
    getClients(),
    getFactures(),
  ]);
  return {
    docs: val(docs) ?? [],
    clients: val(clients) ?? [],
    factures: val(factures) ?? [],
    error: firstError([docs, clients, factures]),
  };
}

export async function getWorkflowsData() {
  const [balance, depenses, paiements] = await Promise.allSettled([
    getBalanceAgee(),
    getDepenses(),
    getPaiements(),
  ]);
  return {
    balance: val(balance),
    depenses: val(depenses) ?? [],
    paiements: val(paiements) ?? [],
    error: firstError([balance, depenses, paiements]),
  };
}

export async function getMobileData() {
  const [synthese, balance, paiements, factures] = await Promise.allSettled([
    getSyntheseTresorerie(),
    getBalanceAgee(),
    getPaiements(),
    getFactures(),
  ]);
  return {
    synthese: val(synthese),
    balance: val(balance),
    paiements: val(paiements) ?? [],
    factures: val(factures) ?? [],
    error: firstError([synthese, balance, paiements, factures]),
  };
}

// ============================================================
// GÉNÉRATION DE DOCUMENTS
// ============================================================

export interface ChampTemplate {
  cle: string;
  label: string;
  type: "texte" | "nombre" | "date" | "select";
}

export interface TemplateDocgen {
  id: string;
  nom: string;
  type: string;
  description: string | null;
  corps: string;
  champs: ChampTemplate[];
  actif: boolean;
  created_at: string;
  _count?: { documents_generes: number };
}

export interface DocumentGenere {
  id: string;
  numero: string;
  type: string;
  destinataire: string | null;
  montant: number | null;
  statut: string;
  fichier: string | null;
  created_at: string;
  template: { id: string; nom: string; type: string } | null;
}

export async function getTemplatesDocgen() {
  return gedRequest<TemplateDocgen[]>("/v1/docgen/templates");
}

export async function getDocumentsGeneres() {
  return gedRequest<DocumentGenere[]>("/v1/docgen/documents");
}

export async function creerTemplate(input: {
  nom: string;
  type: string;
  description?: string;
  corps?: string;
  champs?: ChampTemplate[];
  actif?: boolean;
}): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<TemplateDocgen>("/v1/docgen/templates", { method: "POST", body: JSON.stringify(input) }),
    (t) => `Gabarit « ${t.nom} » enregistré.`,
  );
}

export async function modifierTemplate(id: string, input: Partial<TemplateDocgen>): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<TemplateDocgen>(`/v1/docgen/templates/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    (t) => `Gabarit « ${t.nom} » mis à jour.`,
  );
}

export async function supprimerTemplate(id: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest(`/v1/docgen/templates/${id}`, { method: "DELETE" }),
    () => "Gabarit supprimé. Les documents déjà produits sont conservés.",
  );
}

export async function genererDocument(input: {
  template_id: string;
  client_id?: string | null;
  fournisseur_id?: string | null;
  numero?: string;
  montant?: number | null;
  donnees?: Record<string, unknown>;
}): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<DocumentGenere>("/v1/docgen/generer", { method: "POST", body: JSON.stringify(input) }),
    (d) => `Document ${d.numero} généré et déposé dans la GED.`,
  );
}

export async function changerStatutDocument(id: string, statut: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest(`/v1/docgen/documents/${id}/statut`, { method: "PATCH", body: JSON.stringify({ statut }) }),
    () => `Document passé en « ${statut} ».`,
  );
}

export async function supprimerDocumentGenere(id: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest(`/v1/docgen/documents/${id}`, { method: "DELETE" }),
    () => "Document généré supprimé.",
  );
}

export interface DocgenData {
  templates: TemplateDocgen[];
  documents: DocumentGenere[];
  clients: EntiteRef[];
  fournisseurs: EntiteRef[];
  error: string | null;
}

export async function getDocgenData(): Promise<DocgenData> {
  const [templates, documents, clients, fournisseurs] = await Promise.allSettled([
    getTemplatesDocgen(),
    getDocumentsGeneres(),
    getClients(),
    getFournisseurs(),
  ]);
  return {
    templates: val(templates) ?? [],
    documents: val(documents) ?? [],
    clients: val(clients) ?? [],
    fournisseurs: val(fournisseurs) ?? [],
    error: firstError([templates, documents, clients, fournisseurs]),
  };
}

// ============================================================
// WORKFLOWS
// ============================================================

export interface Workflow {
  id: string;
  nom: string;
  description: string | null;
  declencheur: string;
  evenement: string | null;
  frequence: string | null;
  conditions: { champ: string; operateur: string; valeur: string | number }[];
  actions: { type: string; [cle: string]: unknown }[];
  actif: boolean;
  derniere_execution: string | null;
  _count?: { executions: number };
}

export interface ExecutionWorkflow {
  id: string;
  workflow_id: string;
  statut: string;
  declencheur: string | null;
  cible: string | null;
  resultat: {
    cibles_examinees?: number;
    retenues?: number;
    actions?: { action: string; cible?: string; ignore?: string }[];
    erreurs?: string[];
  };
  erreur: string | null;
  debut: string;
  fin: string | null;
  workflow?: { id: string; nom: string };
}

export interface CatalogueWorkflow {
  evenements: { cle: string; libelle: string }[];
  types: Record<string, string[]>;
}

export async function getWorkflows() {
  return gedRequest<Workflow[]>("/v1/workflows");
}

export async function getExecutionsWorkflows(limit = 20) {
  return gedRequest<ExecutionWorkflow[]>(`/v1/workflows/executions?limit=${limit}`);
}

export async function getCatalogueWorkflows() {
  return gedRequest<CatalogueWorkflow>("/v1/workflows/catalogue");
}

export async function creerWorkflow(input: {
  nom: string;
  description?: string;
  declencheur: string;
  evenement: string;
  conditions: Workflow["conditions"];
  actions: Workflow["actions"];
  actif?: boolean;
}): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<Workflow>("/v1/workflows", { method: "POST", body: JSON.stringify(input) }),
    (w) => `Workflow « ${w.nom} » créé.`,
  );
}

export async function modifierWorkflow(id: string, input: Partial<Workflow>): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<Workflow>(`/v1/workflows/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    (w) => `Workflow « ${w.nom} » mis à jour.`,
  );
}

export async function supprimerWorkflow(id: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest(`/v1/workflows/${id}`, { method: "DELETE" }),
    () => "Workflow supprimé.",
  );
}

export async function executerWorkflow(id: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<ExecutionWorkflow>(`/v1/workflows/${id}/executer`, { method: "POST" }),
    (e) =>
      e.statut === "ignore"
        ? "Aucune donnée ne correspond encore aux conditions : rien à faire."
        : `Exécution terminée : ${e.cible ?? '—'}.`,
  );
}

export async function executerTousWorkflows(evenement?: string): Promise<ResultatAction> {
  return mutation(
    () =>
      gedRequest<ExecutionWorkflow[]>("/v1/workflows/executer-tous", {
        method: "POST",
        body: JSON.stringify({ evenement }),
      }),
    (e) => `${e.length} workflow(s) exécuté(s).`,
  );
}

export interface WorkflowsData {
  workflows: Workflow[];
  executions: ExecutionWorkflow[];
  catalogue: CatalogueWorkflow | null;
  error: string | null;
}

export async function getWorkflowsComplet(): Promise<WorkflowsData> {
  const [workflows, executions, catalogue] = await Promise.allSettled([
    getWorkflows(),
    getExecutionsWorkflows(),
    getCatalogueWorkflows(),
  ]);
  return {
    workflows: val(workflows) ?? [],
    executions: val(executions) ?? [],
    catalogue: val(catalogue),
    error: firstError([workflows, executions, catalogue]),
  };
}

// ============================================================
// VALIDATIONS (page Sécurité)
// ============================================================

export interface Validation {
  id: string;
  type: string;
  titre: string;
  detail: string | null;
  cible_type: string | null;
  cible_id: string | null;
  montant: number | null;
  statut: "en_attente" | "approuvee" | "rejetee";
  motif: string | null;
  decide_par: string | null;
  decide_at: string | null;
  created_at: string;
}

export async function getValidations(statut?: string) {
  return gedRequest<Validation[]>(`/v1/validations${statut ? `?statut=${statut}` : ""}`);
}

export async function getCompteursValidations() {
  return gedRequest<{ en_attente: number; approuvee: number; rejetee: number; total: number }>(
    "/v1/validations/compteurs",
  );
}

export async function creerValidation(input: {
  type: string;
  titre: string;
  detail?: string;
  cible_type?: string;
  cible_id?: string;
  montant?: number;
}): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<Validation>("/v1/validations", { method: "POST", body: JSON.stringify(input) }),
    (v) => `Demande « ${v.titre} » soumise à validation.`,
  );
}

export async function approuverValidation(id: string, motif?: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest(`/v1/validations/${id}/approuver`, { method: "POST", body: JSON.stringify({ motif }) }),
    () => "Demande approuvée.",
  );
}

export async function rejeterValidation(id: string, motif: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest(`/v1/validations/${id}/rejeter`, { method: "POST", body: JSON.stringify({ motif }) }),
    () => "Demande rejetée.",
  );
}

export async function supprimerValidation(id: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest(`/v1/validations/${id}`, { method: "DELETE" }),
    () => "Demande retirée de la file.",
  );
}

// ============================================================
// JOURNAL D'AUDIT (page Sécurité)
// ============================================================

export interface EntreeAudit {
  id: string;
  acteur_type: string;
  acteur_id: string;
  action: string;
  entite_concernee: string;
  statut: "SUCCESS" | "FAILED";
  metadata: { champs?: string[]; erreur?: string } | null;
  created_at: string;
}

export interface ResumeAudit {
  total: number;
  echecs: number;
  taux_echec: number;
  par_acteur: { acteur_id: string; acteur_type: string; total: number }[];
  par_entite: { entite: string; total: number }[];
}

export async function getAuditTrail(filtres: { limit?: number; statut?: string; entite?: string } = {}) {
  const params = new URLSearchParams();
  if (filtres.limit) params.set("limit", String(filtres.limit));
  if (filtres.statut) params.set("statut", filtres.statut);
  if (filtres.entite) params.set("entite", filtres.entite);
  return gedRequest<{ data: EntreeAudit[]; meta: { total: number; limit: number; offset: number } }>(
    `/v1/audit/trail?${params.toString()}`,
  );
}

export async function getAuditResume() {
  return gedRequest<ResumeAudit>("/v1/audit/resume");
}

export interface SecuriteData {
  validations: Validation[];
  compteurs: Awaited<ReturnType<typeof getCompteursValidations>> | null;
  audit: EntreeAudit[];
  auditTotal: number;
  resume: ResumeAudit | null;
  error: string | null;
}

export async function getSecuriteData(): Promise<SecuriteData> {
  const [validations, compteurs, audit, resume] = await Promise.allSettled([
    getValidations(),
    getCompteursValidations(),
    getAuditTrail({ limit: 40 }),
    getAuditResume(),
  ]);
  return {
    validations: val(validations) ?? [],
    compteurs: val(compteurs),
    audit: val(audit)?.data ?? [],
    auditTotal: val(audit)?.meta.total ?? 0,
    resume: val(resume),
    error: firstError([validations, compteurs, audit, resume]),
  };
}

// ============================================================
// UTILISATEURS & RÔLES
// ============================================================

    export interface CompteUtilisateur {
      id: string;
      email: string;
      nom: string;
      role: string;
      multi_organisation: boolean;
      created_at: string;
      deja_existant?: boolean;
      identite?: { fournisseur: string; etat: string; sujet?: string; raison?: string; code?: number };
      // Lien d'activation renvoyé une seule fois, à la création de l'invitation.
      activation?: { lien: string; expire_le: string; duree_jours: number } | null;
      /** Précision affichée quand aucun lien n'est nécessaire. */
      note?: string | null;
    }


export async function getUtilisateurs() {
  return gedRequest<CompteUtilisateur[]>("/v1/utilisateurs");
}

    export async function inviterUtilisateur(input: { nom: string; email: string; role: string }): Promise<ResultatAction> {
      try {
        const invite = await gedRequest<CompteUtilisateur>("/v1/utilisateurs/inviter", {
          method: "POST",
          body: JSON.stringify(input),
        });
        // Le lien d'activation n'existe qu'ici : l'API n'en conserve que
        // l'empreinte. Il est donc renvoyé à l'écran pour être transmis, et
        // l'invité définit lui-même son mot de passe.
        return {
          ok: true,
          message: invite.deja_existant
            ? `${invite.email} existe déjà : rattaché à cette organisation.`
            : invite.activation
              ? `${invite.email} invité. Transmettez-lui le lien d'activation ci-dessous.`
              : `${invite.email} invité et rattaché à cette organisation.`,
          donnees: invite.activation ?? null,
          note: invite.note ?? null,
        };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "L'invitation a échoué." };
      }
    }

export async function changerRoleUtilisateur(id: string, role: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest(`/v1/utilisateurs/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    () => "Rôle mis à jour.",
  );
}

export async function retirerUtilisateur(id: string): Promise<ResultatAction> {
  return mutation<{ autres_organisations: number }>(
    () => gedRequest(`/v1/utilisateurs/${id}`, { method: "DELETE" }),
    (r) =>
      r.autres_organisations
        ? `Compte retiré de cette organisation (${r.autres_organisations} autre(s) conservée(s)).`
        : "Compte retiré.",
  );
}

export interface UtilisateursData {
  comptes: CompteUtilisateur[];
  courant: CurrentUser;
  error: string | null;
}

export async function getUtilisateursData(): Promise<UtilisateursData> {
  const [comptes, courant] = await Promise.allSettled([getUtilisateurs(), getCurrentUser()]);
  return {
    comptes: val(comptes) ?? [],
    courant: val(courant) ?? { id: null, name: null, email: null, roles: [] },
    error: firstError([comptes, courant]),
  };
}

// ============================================================
// ÉQUIPE (RH)
// ============================================================

export interface Employe {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  fonction: string | null;
  departement: string | null;
  type_contrat: string | null;
  salaire_base: number | null;
  date_embauche: string | null;
  statut: "actif" | "conge" | "sorti";
}

export interface ResumeRh {
  effectif: number;
  total: number;
  en_conge: number;
  partis: number;
  masse_salariale: number;
  masse_annuelle: number;
  anciennete_moyenne_ans: number;
}

export interface RhData {
  employes: Employe[];
  resume: ResumeRh | null;
  error: string | null;
}

export async function getEmployes() {
  return gedRequest<{ employes: Employe[]; resume: ResumeRh }>("/v1/rh/employes");
}

export async function getRhData(): Promise<RhData> {
  const resultat = await Promise.allSettled([getEmployes()]);
  const donnees = val(resultat[0]);
  return {
    employes: donnees?.employes ?? [],
    resume: donnees?.resume ?? null,
    error: firstError(resultat),
  };
}

export async function creerEmploye(input: {
  nom: string;
  email?: string;
  telephone?: string;
  fonction?: string;
  departement?: string;
  type_contrat?: string;
  salaire_base?: number;
  date_embauche?: string;
  statut?: string;
}): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<Employe>("/v1/rh/employes", { method: "POST", body: JSON.stringify(input) }),
    (e) => `${e.nom} ajouté à l’effectif.`,
  );
}

export async function modifierEmploye(id: string, input: Partial<Employe>): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<Employe>(`/v1/rh/employes/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    (e) => `Fiche de ${e.nom} mise à jour.`,
  );
}

export async function supprimerEmploye(id: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest(`/v1/rh/employes/${id}`, { method: "DELETE" }),
    () => "Employé retiré de l’effectif.",
  );
}

// ============================================================
// RÉGLAGES
// ============================================================

export interface ProfilTenant {
  id: string;
  raison_sociale: string;
  secteur: string | null;
  pays: string | null;
  ville: string | null;
  devise: string | null;
  systeme_comptable: string;
  statut_abonnement: string | null;
  plan: string;
  quotas: { documents?: number; clients?: number; factures?: number; stockage_mo?: number } | null;
  onboarding: Record<string, unknown> | null;
}

export interface UsageReglages {
  documents: number;
  clients: number;
  fournisseurs: number;
  factures: number;
  paiements: number;
  employes: number;
  workflows: number;
  stockage_mo: number;
  quotas: ProfilTenant["quotas"];
  depassement: { documents: number | null; clients: number | null; factures: number | null; stockage_mo: number | null };
}

export interface Integration {
  id: string;
  nom: string;
  type: string;
  url: string | null;
  evenements: string[];
  actif: boolean;
  statut: string;
  dernier_appel: string | null;
  dernier_statut: number | null;
  secret_defini?: boolean;
}

export interface ReglagesData {
  profil: ProfilTenant | null;
  usage: UsageReglages | null;
  integrations: Integration[];
  error: string | null;
}

/**
 * Entreprises accessibles au compte connecté.
 *
 * Un compte n'est pas attaché à une seule entreprise : l'API renvoie son
 * organisation principale et celles auxquelles il est rattaché, avec son rôle
 * dans chacune. L'interface s'en sert pour nommer l'espace courant et proposer
 * un sélecteur, sans jamais inventer un nom d'entreprise.
 */
export interface Organisation {
  id: string;
  raison_sociale: string;
  secteur: string | null;
  pays: string | null;
  ville: string | null;
  devise: string | null;
  plan: string | null;
  role: string;
  principale: boolean;
}

export async function getMesOrganisations(): Promise<Organisation[]> {
  return gedRequest<Organisation[]>("/v1/mes-organisations");
}

/**
 * Crée une entreprise et y rattache le compte connecté.
 *
 * C'est l'action de démarrage du parcours : sans entreprise, un compte n'a
 * accès à rien — pas même à l'onboarding, qui est lui-même protégé par le
 * tenant. Le serveur répond 201 avec l'organisation créée, dont l'identifiant
 * sert aussitôt de tenant courant.
 */
export async function creerOrganisation(input: {
  raison_sociale: string;
  secteur?: string;
  pays?: string;
  ville?: string;
  devise?: string;
  systeme_comptable?: string;
  nom?: string;
  email?: string;
}): Promise<{ organisation: { id: string; raison_sociale: string }; compte: { id: string; email: string } }> {
  return gedRequest("/v1/mes-organisations", { method: "POST", body: JSON.stringify(input) });
}

export async function getProfilTenant() {
  return gedRequest<ProfilTenant>("/v1/reglages/profil");
}

export async function getUsageReglages() {
  return gedRequest<UsageReglages>("/v1/reglages/usage");
}

export async function getIntegrations() {
  return gedRequest<Integration[]>("/v1/integrations");
}

export async function getReglagesData(): Promise<ReglagesData> {
  const [profil, usage, integrations] = await Promise.allSettled([
    getProfilTenant(),
    getUsageReglages(),
    getIntegrations(),
  ]);
  return {
    profil: val(profil),
    usage: val(usage),
    integrations: val(integrations) ?? [],
    error: firstError([profil, usage, integrations]),
  };
}

export async function modifierProfil(input: Partial<ProfilTenant>): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<ProfilTenant>("/v1/reglages/profil", { method: "PATCH", body: JSON.stringify(input) }),
    () => "Profil enregistré.",
  );
}

export async function definirQuotas(input: {
  plan?: string;
  quotas?: Record<string, number | null>;
}): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<ProfilTenant>("/v1/reglages/quotas", { method: "POST", body: JSON.stringify(input) }),
    () => "Plan et quotas enregistrés.",
  );
}

export async function enregistrerOnboarding(reponses: Record<string, unknown>): Promise<ResultatAction> {
  return mutation(
    () =>
      gedRequest<ProfilTenant>("/v1/reglages/onboarding", {
        method: "POST",
        body: JSON.stringify({ reponses }),
      }),
    (p) => `Configuration enregistrée pour ${p.raison_sociale}.`,
  );
}

export async function creerIntegration(input: {
  nom: string;
  type: string;
  url?: string;
  secret?: string;
  evenements?: string[];
}): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<Integration>("/v1/integrations", { method: "POST", body: JSON.stringify(input) }),
    (i) => `Connecteur « ${i.nom} » créé. Testez-le avant de l'activer.`,
  );
}

export async function modifierIntegration(id: string, input: Partial<Integration>): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<Integration>(`/v1/integrations/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    () => "Connecteur mis à jour.",
  );
}

export async function supprimerIntegration(id: string): Promise<ResultatAction> {
  return mutation(
    () => gedRequest(`/v1/integrations/${id}`, { method: "DELETE" }),
    () => "Connecteur supprimé.",
  );
}

export interface TestIntegration {
  ok: boolean;
  code: number;
  duree_ms?: number;
  erreur?: string;
}

export async function testerIntegration(id: string): Promise<TestIntegration | ResultatAction> {
  try {
    const reponse = await gedRequest<TestIntegration>(`/v1/integrations/${id}/tester`, { method: "POST" });
    return reponse;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Test impossible." };
  }
}

// ============================================================
// CLIENTS & FOURNISSEURS (création manuelle)
// ============================================================

export async function creerClient(input: {
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  identifiant_fiscal?: string;
  niu?: string;
  rccm?: string;
}): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<EntiteRef>("/v1/memoire/clients", { method: "POST", body: JSON.stringify(input) }),
    (c) => `Client « ${c.nom} » créé.`,
  );
}

export async function creerFournisseur(input: {
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  identifiant_fiscal?: string;
  niu?: string;
  rccm?: string;
}): Promise<ResultatAction> {
  return mutation(
    () => gedRequest<EntiteRef>("/v1/memoire/fournisseurs", { method: "POST", body: JSON.stringify(input) }),
    (f) => `Fournisseur « ${f.nom} » créé.`,
  );
}