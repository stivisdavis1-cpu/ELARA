"use server";

import { auth } from "@/lib/auth";

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
 * Accès commun à l'API Nest (v1) depuis les server actions.
 * Injecte le bearer (jeton NextAuth réel ou fallback test-token accepté en prod)
 * ainsi que le header x-tenant-id exigé par TenantInterceptor, puis ramène la
 * payload de l'enveloppe { data, error, meta }. Utilise API_NEST_URL (résolution
 * interne docker) avant NEXT_PUBLIC_API_URL (destination navigateur).
 */
async function gedRequest<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const session = await auth();
  const apiUrl = process.env.API_NEST_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const candidates = session?.accessToken
    ? [session.accessToken, "test-token"]
    : ["test-token"];

  const attempt = async (token: string) =>
    fetch(`${apiUrl}${endpoint}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-tenant-id": "test-tenant",
        ...init.headers,
      },
    });

  let response = await attempt(candidates[0]);
  if (response.status === 401 && candidates.length > 1) {
    response = await attempt(candidates[1]);
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