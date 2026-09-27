"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatCFA, toNum } from "@/lib/utils";
import { getMobileData } from "@/lib/ged-api";
import type { CfoSynthese, BalanceAgee, PaiementLigne, FactureLigne } from "@/lib/ged-api";
import { BoutonExport } from "@/components/page-actions";

const ACTIONS = [
  {
    href: "/scanner",
    label: "Scanner",
    icon: (
      <>
        <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" strokeLinecap="round"></path>
        <path d="M3 12h18" strokeLinecap="round"></path>
      </>
    ),
  },
  {
    href: "/cfo",
    label: "Trésorerie",
    icon: (
      <>
        <path d="M3 17l5-6 4 3 6-8" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M14 6h4v4" strokeLinecap="round" strokeLinejoin="round"></path>
      </>
    ),
  },
  {
    href: "/assistant",
    label: "Assistant",
    icon: (
      <>
        <path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.2-3.6A7.96 7.96 0 0 1 4 12Z" strokeLinejoin="round"></path>
        <circle cx="9" cy="12" r=".8" fill="currentColor" stroke="none"></circle>
        <circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"></circle>
        <circle cx="15" cy="12" r=".8" fill="currentColor" stroke="none"></circle>
      </>
    ),
  },
  {
    href: "/clients",
    label: "Relancer",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2"></circle>
        <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" strokeLinecap="round"></path>
        <path d="M16 4.5c1.7.4 3 1.9 3 3.6s-1.3 3.2-3 3.6M20 20c0-2.6-1.7-4.5-4-5.3" strokeLinecap="round"></path>
      </>
    ),
  },
];

const TABS = [
  { href: "/dashboard", label: "Accueil", icon: "grid" },
  { href: "/scanner", label: "Scanner", icon: "scan" },
  { href: "/assistant", label: "Assistant", icon: "chat" },
  { href: "/report", label: "Rapports", icon: "doc" },
];

const TAB_ICONS: Record<string, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
      <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
      <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
      <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" strokeLinecap="round"></path>
      <path d="M3 12h18" strokeLinecap="round"></path>
    </>
  ),
  chat: (
    <>
      <path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.2-3.6A7.96 7.96 0 0 1 4 12Z" strokeLinejoin="round"></path>
      <circle cx="9" cy="12" r=".8" fill="currentColor" stroke="none"></circle>
      <circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"></circle>
      <circle cx="15" cy="12" r=".8" fill="currentColor" stroke="none"></circle>
    </>
  ),
  doc: (
    <>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path>
      <path d="M9 13h6M9 17h6M9 9h2" strokeLinecap="round"></path>
    </>
  ),
};

export default function MobilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synthese, setSynthese] = useState<CfoSynthese | null>(null);
  const [balance, setBalance] = useState<BalanceAgee | null>(null);
  const [paiements, setPaiements] = useState<PaiementLigne[]>([]);
  const [factures, setFactures] = useState<FactureLigne[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const d = await getMobileData();
    setSynthese(d.synthese);
    setBalance(d.balance);
    setPaiements(d.paiements);
    setFactures(d.factures);
    setError(d.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const impayes = (balance?.details ?? []).reduce((acc, d) => acc + toNum(d.montant), 0);
  const totalFacture = factures
    .filter((f) => f.client && f.statut !== "annulee")
    .reduce((acc, f) => acc + toNum(f.montant_total), 0);
  const payees = factures
    .filter((f) => f.client && f.statut === "payee")
    .reduce((acc, f) => acc + toNum(f.montant_total), 0);
  const recouvrement = totalFacture > 0 ? Math.round((payees / totalFacture) * 100) : null;

  const aRapprocher = [...paiements]
    .sort((a, b) => (a.date_paiement < b.date_paiement ? 1 : -1))
    .slice(0, 3);

  return (
    <motion.section
      className="view"
      id="v-mobile"
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
            <span>Surface mobile</span>
          </div>
          <h1 className="page-title">Aperçu mobile — Accueil</h1>
          <p className="page-sub">
            Même mémoire d&apos;entreprise, pensée pour un usage sur le terrain — données réelles.
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
          {paiements.length ? (
            <BoutonExport
              libelle="Exporter les paiements"
              nomFichier="paiements-mobile"
              colonnes={[
                { cle: "date", label: "Date" },
                { cle: "tiers", label: "Tiers" },
                { cle: "montant", label: "Montant" },
                { cle: "moyen", label: "Moyen" },
              ]}
              lignes={paiements.map((p) => ({
                date: p.date_paiement,
                tiers: p.client?.nom ?? p.facture?.numero ?? "—",
                montant: p.montant,
                moyen: p.mode_paiement ?? "—",
              }))}
            />
          ) : null}
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Impossible de charger toutes les données — {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center" }}>
        <div className="phone">
          <div className="phone-screen">
            <div className="phone-status">
              <span>9:41</span>
              <span>●●● Orange · 4G</span>
            </div>
            <div className="phone-body" style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "8px" }}>Votre espace</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 700, marginBottom: "14px" }}>
                Bonjour 👋
              </div>

              <div className="card" style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
                <div
                  className="ring"
                  style={{
                    width: "58px",
                    height: "58px",
                    background: `conic-gradient(#A9761F ${(recouvrement ?? 0) * 3.6}deg, #ECE9DD 0)`,
                  }}
                >
                  <div className="ring-val">{loading ? "…" : recouvrement === null ? "—" : `${recouvrement}`}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13.5px", fontFamily: "var(--font-heading)" }}>
                    Taux de recouvrement
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
                    {loading ? "Calcul…" : recouvrement === null ? "Aucune facture client" : `${formatCFA(payees)} encaissés`}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                <div className="card" style={{ flex: 1, padding: "14px" }}>
                  <div style={{ fontSize: "10.5px", color: "var(--text-dim)", fontWeight: 700, fontFamily: "var(--font-heading)", textTransform: "uppercase" }}>Trésorerie</div>
                  <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "4px" }} className="mono">
                    {loading ? "…" : formatCFA(toNum(synthese?.solde_theorique))}
                  </div>
                </div>
                <div className="card" style={{ flex: 1, padding: "14px" }}>
                  <div style={{ fontSize: "10.5px", color: "var(--text-dim)", fontWeight: 700, fontFamily: "var(--font-heading)", textTransform: "uppercase" }}>Impayés</div>
                  <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "4px", color: impayes > 0 ? "var(--red)" : undefined }} className="mono">
                    {loading ? "…" : formatCFA(impayes)}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", marginBottom: "16px" }}>
                {ACTIONS.map((a) => (
                  <Link key={a.href} href={a.href} className="card" style={{ textAlign: "center", padding: "12px 4px", color: "inherit" }}>
                    <div style={{ color: "var(--indigo)", marginBottom: "6px", display: "flex", justifyContent: "center" }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        {a.icon}
                      </svg>
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-heading)" }}>{a.label}</div>
                  </Link>
                ))}
              </div>

              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", fontFamily: "var(--font-heading)" }}>
                Paiements à rapprocher
              </div>
              {loading ? (
                <div style={{ padding: "12px 2px", color: "var(--text-faint)", fontSize: "12.5px" }}>Chargement…</div>
              ) : aRapprocher.length === 0 ? (
                <div style={{ padding: "12px 2px", color: "var(--text-faint)", fontSize: "12.5px" }}>
                  Aucun paiement enregistré — ils apparaîtront ici après consolidation de vos
                  relevés Mobile Money.
                </div>
              ) : (
                aRapprocher.map((p) => (
                  <div
                    key={p.id}
                    className="card"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", padding: "14px" }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13.5px" }} className="mono">
                        +{formatCFA(toNum(p.montant))} reçu
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                        {p.mode_paiement ?? "Mode non précisé"} ·{" "}
                        {new Date(p.date_paiement).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                    <span className={`pill ${p.facture ? "pill-success" : "pill-warning"}`}>
                      {p.facture ? "Lié" : "À lier"}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="tabbar">
              {TABS.map((t, i) => (
                <Link key={t.href} href={t.href} className={`tab-item ${i === 0 ? "active" : ""}`}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    {TAB_ICONS[t.icon]}
                  </svg>
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
