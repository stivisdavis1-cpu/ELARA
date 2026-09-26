"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { formatCFA, toNum } from "@/lib/utils";
import { getCommercialData } from "@/lib/ged-api";
import type { EntiteRef, CommandeLigne, FactureLigne, PaiementLigne, BalanceAgee } from "@/lib/ged-api";

const C = {
  prospection: "var(--teal)",
  negociation: "#1A4A3C",
  gagne: "#A9761F",
};

interface Activite {
  id: string;
  label: string;
  detail: string;
  montant: number;
}

export default function CommercialPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<EntiteRef[]>([]);
  const [commandes, setCommandes] = useState<CommandeLigne[]>([]);
  const [factures, setFactures] = useState<FactureLigne[]>([]);
  const [paiements, setPaiements] = useState<PaiementLigne[]>([]);
  const [balance, setBalance] = useState<BalanceAgee | null>(null);

  const load = useCallback(async () => {
    const d = await getCommercialData();
    setClients(d.clients);
    setCommandes(d.commandes);
    setFactures(d.factures);
    setPaiements(d.paiements);
    setBalance(d.balance);
    setError(d.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const creances = factures
    .filter((f) => f.client && f.statut !== "payee" && f.statut !== "annulee")
    .reduce((acc, f) => acc + toNum(f.montant_total), 0);
  const encaisses = paiements.reduce((acc, p) => acc + toNum(p.montant), 0);
  const totalCommandes = commandes
    .filter((c) => c.statut !== "annulee")
    .reduce((acc, c) => acc + toNum(c.montant_total), 0);

  const stages = [
    { key: "Prospection", statut: ["brouillon"], color: C.prospection },
    { key: "Négociation", statut: ["validee"], color: C.negociation },
    { key: "Gagné", statut: ["livree"], color: C.gagne },
  ];

  const activite: Activite[] = [
    ...factures.map((f, i) => ({
      id: `f-${f.id ?? i}`,
      label: `Facture ${f.numero ? `n°${f.numero}` : "émise"}${f.client ? ` — ${f.client.nom}` : ""}`,
      detail: f.date_emission ? new Date(f.date_emission).toLocaleDateString("fr-FR") : "—",
      montant: toNum(f.montant_total),
    })),
    ...paiements.map((p, i) => ({
      id: `p-${p.id ?? i}`,
      label: `Paiement ${p.mode_paiement ? `(${p.mode_paiement})` : ""}${p.client ? ` — ${p.client.nom}` : p.facture?.numero ? ` — facture ${p.facture.numero}` : ""}`,
      detail: new Date(p.date_paiement).toLocaleDateString("fr-FR"),
      montant: toNum(p.montant),
    })),
  ]
    .sort((a, b) => (b.detail < a.detail ? -1 : 1))
    .slice(0, 6);

  const topRetard = [...(balance?.details ?? [])].sort((a, b) => b.retard_jours - a.retard_jours)[0];
  const clientsSansFacture = clients.filter(
    (c) => !factures.some((f) => f.client?.id === c.id),
  );
  const nFacturesImpayees = factures.filter(
    (f) => f.client && f.statut !== "payee" && f.statut !== "annulee",
  ).length;

  const suggestions: { pill: string; color: string; text: string }[] = [];
  if (topRetard) {
    suggestions.push({
      pill: "Relance",
      color: "var(--amber)",
      text: `${topRetard.client ?? "Client"} — ${formatCFA(toNum(topRetard.montant))} en retard de ${topRetard.retard_jours} j`,
    });
  }
  if (clientsSansFacture.length > 0) {
    suggestions.push({
      pill: "Opportunité",
      color: "#1A4A3C",
      text: `${clientsSansFacture.length} client(s) sans facture consolidée — proposer une offre ou relancer la prospection`,
    });
  }
  if (nFacturesImpayees > 0) {
    suggestions.push({
      pill: "Suivi",
      color: "var(--red)",
      text: `${nFacturesImpayees} facture(s) cliente(s) non réglée(s) — programmer la relance`,
    });
  }
  if (suggestions.length === 0 && !loading) {
    suggestions.push({
      pill: "À jour",
      color: "var(--green)",
      text: "Aucune relance nécessaire pour le moment. Les suggestions apparaîtront dès que des factures ou clients seront consolidés.",
    });
  }

  return (
    <motion.section
      className="view"
      id="v-commercial"
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
            <span>Module · Assistant Commercial</span>
          </div>
          <h1 className="page-title">Assistant Commercial</h1>
          <p className="page-sub">CRM léger, suivi des commandes et recouvrement — alimenté par la Business Memory.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary teal transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]" style={{ cursor: "pointer" }} onClick={() => { setLoading(true); setError(null); void load(); }} disabled={loading}>
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>
      </div>

      <div className="preview-banner" style={{ background: "var(--green-bg)", borderColor: "rgba(22,163,74,0.3)" }}>
        <span className="dot" style={{ background: "var(--green)" }}></span>
        <div>
          <strong>Données en temps réel</strong><br />
          <span className="muted">Clients, commandes, factures et paiements consolidés dans Elara apparaissent ici automatiquement.</span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Impossible de charger toutes les données — {error}
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: '16px' }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Clients (opportunités)</div>
          <div className="kpi-value">{loading ? "…" : clients.length}</div>
          <div className="kpi-delta flat">Référencés en base</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Créances clients</div>
          <div className="kpi-value">{loading ? "…" : formatCFA(creances)}</div>
          <div className={`kpi-delta ${creances > 0 ? "down" : "flat"}`}>{creances > 0 ? "À recouvrer" : "En attente de factures"}</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Encaissements reçus</div>
          <div className="kpi-value">{loading ? "…" : formatCFA(encaisses)}</div>
          <div className="kpi-delta flat">{paiements.length} paiement(s) enregistré(s)</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Commandes suivies</div>
          <div className="kpi-value">{loading ? "…" : commandes.length}</div>
          <div className="kpi-delta flat">{loading ? "" : `${formatCFA(totalCommandes)} au total`}</div>
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: '16px' }}>
        {stages.map((stage) => {
          const rows = commandes.filter((c) => stage.statut.includes(c.statut)).slice(0, 4);
          const total = rows.reduce((acc, c) => acc + toNum(c.montant_total), 0);
          return (
            <div className="card" key={stage.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color }}></span>
                <span className="section-title" style={{ margin: 0 }}>{stage.key}</span>
                {rows.length > 0 && (
                  <span className="mono" style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--text-dim)' }}>{formatCFA(total)}</span>
                )}
              </div>
              {rows.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: 'var(--text-faint)', padding: '8px 2px' }}>
                  {loading ? "Chargement…" : "Aucune commande dans cette étape."}
                </div>
              ) : (
                rows.map((c) => (
                  <div key={c.id} className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl">
                    <span className="name-cell" style={{ fontWeight: 600 }}>{c.client?.nom ?? c.fournisseur?.nom ?? `${c.numero ?? "Commande"} (${c.statut})`}</span>
                    <span className="mono">{formatCFA(toNum(c.montant_total))}</span>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="section-title">Fil d’activité — factures & paiements consolidés</div>
          <div className="section-sub">L’activité commerciale extraite de vos documents, classée par date</div>
          {loading ? (
            <div style={{ padding: '18px 2px', color: 'var(--text-faint)', fontSize: '13px' }}>Chargement…</div>
          ) : activite.length === 0 ? (
            <div style={{ padding: '24px 2px', color: 'var(--text-faint)', fontSize: '13px' }}>
              Aucune facture ni paiement en base — le flux s’alimentera après l’intégration de vos documents.
            </div>
          ) : (
            activite.map((ev) => (
              <motion.div
                key={ev.id}
                className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div>
                  <div className="name-cell">{ev.label}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>{ev.detail}</div>
                </div>
                <div className="mono" style={{ fontWeight: 700 }}>{formatCFA(ev.montant)}</div>
              </motion.div>
            ))
          )}
        </div>
        <div className="ai-card">
          <div className="ai-badge">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
              <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
              <path d="M4 21l7-7" strokeLinecap="round"></path>
            </svg>
            Suggestions Assistant Commercial
          </div>
          {suggestions.map((s, i) => (
            <div key={i} className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl">
              <span className="pill" style={{ background: `${s.color}18`, color: s.color, marginRight: '12px' }}>{s.pill}</span>
              <span style={{ flex: 1, fontSize: '13px' }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}