"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toNum } from "@/lib/utils";
import { getDocgenData } from "@/lib/ged-api";
import type { DocLigne, FactureLigne, EntiteRef } from "@/lib/ged-api";

function moisCourant(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function formaterDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUTS: { label: string; cls: string }[] = [
  { label: "Validé", cls: "pill-success" },
  { label: "À auditer", cls: "pill-warning" },
  { label: "Archivé", cls: "pill-info" },
  { label: "Rejeté", cls: "pill-danger" },
];

function classeStatut(statut: string | null | undefined): string {
  if (!statut) return "pill-neutral";
  const found = STATUTS.find((s) => s.label.toLowerCase() === statut.toLowerCase());
  return found ? found.cls : "pill-neutral";
}

export default function DocgenPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocLigne[]>([]);
  const [factures, setFactures] = useState<FactureLigne[]>([]);
  const [clients, setClients] = useState<EntiteRef[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const d = await getDocgenData();
    setDocs(d.docs);
    setFactures(d.factures);
    setClients(d.clients);
    setError(d.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const docsMois = docs.filter((d) => moisCourant(d.date));
  const archives = docs.filter((d) => !!d.archive);
  const aAuditer = docs.filter((d) => d.statut === "À auditer");
  const scores = docs
    .map((d) => d.score)
    .filter((s): s is number => s != null)
    .map((s) => (s <= 1 ? s * 100 : s));
  const scoreMoyen = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const recents = [...docs]
    .filter((d) => d.date)
    .sort((a, b) => (a.date! < b.date! ? 1 : -1))
    .slice(0, 8);

  const caParClient = new Map<string, number>();
  for (const f of factures) {
    if (!f.client || f.statut === "annulee") continue;
    caParClient.set(f.client.id, (caParClient.get(f.client.id) ?? 0) + toNum(f.montant_total));
  }
  const topClient = [...caParClient.entries()].sort((a, b) => b[1] - a[1])[0];
  const nomClient = (id: string | undefined) =>
    clients.find((c) => c.id === id)?.nom ?? "un client de votre portefeuille";

  const stats: { label: string; value: string; sub: string }[] = [
    {
      label: "Documents ce mois-ci",
      value: loading ? "…" : String(docsMois.length),
      sub: `${docs.length} document(s) au total`,
    },
    {
      label: "Archivés",
      value: loading ? "…" : String(archives.length),
      sub: `${docs.length ? Math.round((archives.length / docs.length) * 100) : 0} % du fonds documentaire`,
    },
    {
      label: "À auditer",
      value: loading ? "…" : String(aAuditer.length),
      sub: "Validation humaine requise",
    },
    {
      label: "Score d'extraction moyen",
      value: loading ? "…" : scoreMoyen === null ? "—" : `${scoreMoyen} %`,
      sub: `${scores.length} document(s) scoré(s)`,
    },
  ];

  return (
    <motion.section
      className="view"
      id="v-docgen"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="topbar">
        <div>
          <div className="eyebrow">
            <svg className="wave-rule" viewBox="0 0 46 14" fill="none">
              <path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" strokeWidth="1.4" strokeLinecap="round" fill="none"></path>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="46" y2="0">
                  <stop stopColor="#A9761F"></stop>
                  <stop offset="1" stopColor="#1A4A3C"></stop>
                </linearGradient>
              </defs>
            </svg>
            <span>Production documentaire</span>
          </div>
          <h1 className="page-title">Génération de documents</h1>
          <p className="page-sub">
            Les documents produits et archivés par Elara, et l&apos;état du module de rédaction assistée.
          </p>
        </div>
        <div className="topbar-actions">
          <button
            className="btn btn-primary teal transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
            style={{ cursor: "pointer" }}
            onClick={() => { setLoading(true); setError(null); void load(); }}
            disabled={loading}
          >
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>
      </div>

      <div className="preview-banner" style={{ background: "var(--amber-bg, rgba(217,119,6,0.08))", borderColor: "rgba(217,119,6,0.3)" }}>
        <span className="dot" style={{ background: "var(--amber)" }}></span>
        <div>
          <strong>Génération à partir de modèles Word : en cours de branchement</strong><br />
          <span className="muted">
            Le module de rédaction (modèles .docx, relance, attestation) n&apos;expose pas encore
            d&apos;API. Les indicateurs ci-dessous reflètent uniquement vos documents réels.
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Impossible de charger toutes les données — {error}
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: "16px" }}>
        {stats.map((s) => (
          <div key={s.label} className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-delta flat">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid g2" style={{ marginBottom: "16px" }}>
        <div className="card">
          <div className="section-title">Documents récents</div>
          <div className="section-sub">Derniers documents consolidés dans la mémoire d&apos;entreprise</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Chargement…</td></tr>
              ) : recents.length === 0 ? (
                <tr><td colSpan={4} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Aucun document — envoyez une facture ou un relevé au Business Scanner pour alimenter cette liste.</td></tr>
              ) : (
                recents.map((d) => (
                  <tr key={d.document_id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                    <td className="name-cell">
                      <Link href={`/ged/${d.document_id}`} style={{ color: "inherit" }}>{d.nom}</Link>
                    </td>
                    <td style={{ fontSize: "12.5px", color: "var(--text-dim)" }}>{d.type ?? "—"}</td>
                    <td className="mono" style={{ fontSize: "12.5px" }}>{formaterDate(d.date)}</td>
                    <td><span className={`pill ${classeStatut(d.statut)}`}>{d.statut ?? "—"}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ai-card">
          <div className="ai-badge">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
              <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
              <path d="M4 21l7-7" strokeLinecap="round"></path>
            </svg>
            Comment ça marche
          </div>
          <div className="section-title" style={{ marginBottom: "14px" }}>De la conversation au document</div>
          <div className="list-row">
            <span className="pill" style={{ background: "var(--indigo)18", color: "var(--indigo)", marginRight: "12px" }}>1</span>
            <span style={{ flex: 1, fontSize: "13px" }}>
              Vous décrivez le besoin à l&apos;Assistant Virtuel — ex. « fais-moi une facture proforma
              {topClient ? ` pour ${nomClient(topClient[0])}` : " pour un client de votre portefeuille"} »
            </span>
          </div>
          <div className="list-row">
            <span className="pill" style={{ background: "var(--indigo)18", color: "var(--indigo)", marginRight: "12px" }}>2</span>
            <span style={{ flex: 1, fontSize: "13px" }}>Elara remplit le modèle Word actif avec les données réelles de l&apos;entreprise</span>
          </div>
          <div className="list-row">
            <span className="pill" style={{ background: "var(--indigo)18", color: "var(--indigo)", marginRight: "12px" }}>3</span>
            <span style={{ flex: 1, fontSize: "13px" }}>Le document est prêt à relire, télécharger ou envoyer directement</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
          <div>
            <div className="section-title">Modèles Word</div>
            <div className="section-sub">Emplacement unique de mise à jour — tout changement s&apos;applique immédiatement aux prochaines générations.</div>
          </div>
        </div>
        <div style={{ border: "1.5px dashed var(--line)", borderRadius: "var(--radius)", padding: "22px", textAlign: "center", margin: "8px 0 20px", background: "var(--paper)" }}>
          <div style={{ fontSize: "13.5px", fontWeight: 700, marginBottom: "4px", fontFamily: "var(--font-heading)" }}>
            Import de modèle .docx indisponible pour le moment
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "14px" }}>
            Le stockage des modèles n&apos;est pas encore exposé par l&apos;API Elara.
          </div>
          <button className="btn btn-primary teal" style={{ margin: "0 auto", opacity: 0.55, cursor: "not-allowed" }} disabled>
            Importer un modèle Word (.docx)
          </button>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Modèle</th>
              <th>Type de document</th>
              <th>Dernière mise à jour</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>
                Aucun modèle enregistré. Ils apparaîtront ici dès que le module de génération sera
                connecté au stockage de l&apos;entreprise.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}
