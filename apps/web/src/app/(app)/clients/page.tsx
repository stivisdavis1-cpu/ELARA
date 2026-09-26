"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { formatCFA, toNum } from "@/lib/utils";
import { getClientsData } from "@/lib/ged-api";
import type { EntiteRef, FactureLigne, PaiementLigne, BalanceAgee } from "@/lib/ged-api";

const JOUR = 24 * 60 * 60 * 1000;

function joursEntre(iso: string | null, ref = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((ref - t) / JOUR);
}

interface LigneClient {
  id: string;
  nom: string;
  contact: string;
  solde: number;
  factures: number;
  retardJours: number;
  echeanceProche: number | null;
}

export default function ClientsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<EntiteRef[]>([]);
  const [fournisseurs, setFournisseurs] = useState<EntiteRef[]>([]);
  const [factures, setFactures] = useState<FactureLigne[]>([]);
  const [paiements, setPaiements] = useState<PaiementLigne[]>([]);
  const [balance, setBalance] = useState<BalanceAgee | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const d = await getClientsData();
    setClients(d.clients);
    setFournisseurs(d.fournisseurs);
    setFactures(d.factures);
    setPaiements(d.paiements);
    setBalance(d.balance);
    setError(d.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const impayees = factures.filter(
    (f) => f.statut !== "payee" && f.statut !== "annulee",
  );
  const creances = impayees
    .filter((f) => !!f.client)
    .reduce((acc, f) => acc + toNum(f.montant_total), 0);
  const dettes = impayees
    .filter((f) => !!f.fournisseur)
    .reduce((acc, f) => acc + toNum(f.montant_total), 0);
  const nFacturesClient = impayees.filter((f) => !!f.client).length;
  const nEcheances = impayees.filter((f) => !!f.fournisseur).length;
  const enRetard = (balance?.details ?? []).reduce((acc, d) => acc + toNum(d.montant), 0);

  // Clients actifs = au moins une facture consolidée (hors annulées)
  const clientsActifs = new Set(
    factures.filter((f) => f.client && f.statut !== "annulee").map((f) => f.client!.id),
  ).size;

  // Délai moyen de paiement : date de paiement - date d'émission de la facture
  const delais: number[] = [];
  for (const p of paiements) {
    const f = p.facture ? factures.find((x) => x.id === p.facture!.id) : null;
    if (!f?.date_emission) continue;
    const d = Math.round((Date.parse(p.date_paiement) - Date.parse(f.date_emission)) / JOUR);
    if (d >= 0) delais.push(d);
  }
  const delaiMoyen = delais.length
    ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length)
    : null;

  const lignes: LigneClient[] = clients.map((c) => {
    const siennes = impayees.filter((f) => f.client?.id === c.id);
    const solde = siennes.reduce((acc, f) => acc + toNum(f.montant_total), 0);
    const retards = siennes
      .map((f) => joursEntre(f.date_echeance ?? f.date_emission) ?? 0)
      .filter((j) => j > 0);
    const echus = siennes
      .map((f) => joursEntre(f.date_echeance))
      .filter((j): j is number => j !== null && j <= 14);
    return {
      id: c.id,
      nom: c.nom,
      contact: c.email ?? c.telephone ?? c.niu ?? "—",
      solde,
      factures: siennes.length,
      retardJours: retards.length ? Math.max(...retards) : 0,
      echeanceProche: echus.length ? Math.min(...echus) : null,
    };
  })
    .filter((l) => l.solde > 0 || l.factures > 0)
    .sort((a, b) => b.solde - a.solde);

  // Créances par ancienneté (jours de retard sur l'échéance)
  const buckets = [
    { label: "0 – 15 jours", min: 1, max: 15, color: "#A9761F" },
    { label: "16 – 30 jours", min: 16, max: 30, color: "#C06A2C" },
    { label: "+ 30 jours", min: 31, max: Infinity, color: "#A23B3B" },
  ].map((b) => {
    const rows = impayees.filter((f) => {
      if (!f.client) return false;
      const j = joursEntre(f.date_echeance ?? f.date_emission) ?? 0;
      return j >= b.min && j <= b.max;
    });
    return {
      ...b,
      montant: rows.reduce((acc, f) => acc + toNum(f.montant_total), 0),
      count: rows.length,
    };
  });
  const bucketMax = Math.max(1, ...buckets.map((b) => b.montant));

  const suggestions: { pill: string; color: string; text: string }[] = [];
  const pire = lignes.filter((l) => l.retardJours > 0)[0];
  if (pire) {
    suggestions.push({
      pill: "Relance",
      color: "var(--red)",
      text: `${pire.nom} — ${formatCFA(pire.solde)} avec ${pire.retardJours} j de retard, relance recommandée`,
    });
  }
  const sansFacture = clients.filter(
    (c) => !factures.some((f) => f.client?.id === c.id),
  );
  if (sansFacture.length > 0) {
    suggestions.push({
      pill: "Opportunité",
      color: "var(--green)",
      text: `${sansFacture.length} contact(s) sans facture consolidée — proposition commerciale à envoyer`,
    });
  }
  if (dettes > 0) {
    suggestions.push({
      pill: "Échéance",
      color: "var(--amber)",
      text: `${formatCFA(dettes)} de dettes fournisseurs sur ${nEcheances} facture(s) — arbitrer les échéances`,
    });
  }
  if (suggestions.length === 0 && !loading) {
    suggestions.push({
      pill: "À jour",
      color: "var(--green)",
      text: "Aucun impayé ni retard détecté. Les clients apparaîtront après intégration de vos factures.",
    });
  }

  return (
    <motion.section
      className="view"
      id="v-clients"
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
            <span>Relations commerciales</span>
          </div>
          <h1 className="page-title">Clients &amp; fournisseurs</h1>
          <p className="page-sub">
            Suivi des soldes, relances et historique de paiement — consolidé depuis vos factures.
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

      <div className="preview-banner" style={{ background: "var(--green-bg)", borderColor: "rgba(22,163,74,0.3)" }}>
        <span className="dot" style={{ background: "var(--green)" }}></span>
        <div>
          <strong>Données en temps réel</strong><br />
          <span className="muted">
            {clients.length} contact(s) client et {fournisseurs.length} fournisseur(s) extraits de vos documents.
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Impossible de charger toutes les données — {error}
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: "16px" }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Créances clients</div>
          <div className="kpi-value" style={{ color: creances > 0 ? "var(--red)" : undefined }}>{loading ? "…" : formatCFA(creances)}</div>
          <div className="kpi-delta flat">
            {loading ? "" : enRetard > 0 ? `Dont ${formatCFA(enRetard)} en retard` : `${nFacturesClient} facture(s) en attente`}
          </div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Dettes fournisseurs</div>
          <div className="kpi-value">{loading ? "…" : formatCFA(dettes)}</div>
          <div className="kpi-delta flat">{nEcheances} échéance(s) en cours</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Clients actifs</div>
          <div className="kpi-value">{loading ? "…" : clientsActifs}</div>
          <div className="kpi-delta flat">Sur {clients.length} contact(s) référencé(s)</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Délai moyen de paiement</div>
          <div className="kpi-value">{loading ? "…" : delaiMoyen === null ? "—" : `${delaiMoyen} j`}</div>
          <div className="kpi-delta flat">{delais.length} paiement(s) daté(s)</div>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="section-title">Clients</div>
          <div className="section-sub">Soldes ouverts et niveau de retard, déduits de vos factures</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Solde</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Chargement…</td></tr>
              ) : lignes.length === 0 ? (
                <tr><td colSpan={4} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Aucun client facturé — le tableau se remplira après l&apos;intégration de vos factures.</td></tr>
              ) : (
                lignes.map((l) => (
                  <tr key={l.id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                    <td className="name-cell">{l.nom}</td>
                    <td style={{ fontSize: "12.5px", color: "var(--text-dim)" }}>{l.contact}</td>
                    <td className="mono" style={{ color: l.solde > 0 ? "var(--red)" : undefined }}>{formatCFA(l.solde)}</td>
                    <td>
                      {l.solde === 0 ? (
                        <span className="pill pill-success">À jour</span>
                      ) : l.retardJours > 0 ? (
                        <span className="pill pill-danger">Retard {l.retardJours} j</span>
                      ) : (
                        <span className="pill pill-warning">À échoir</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <div className="card" style={{ marginBottom: "16px" }}>
            <div className="section-title">Créances par ancienneté</div>
            <div className="section-sub">Montants en retard, regroupés par tranche de jours depuis l&apos;échéance</div>
            {creances === 0 && !loading ? (
              <div style={{ padding: "22px 2px", color: "var(--text-faint)", fontSize: "13px" }}>
                Aucune créance en retard — la répartition apparaîtra dès que des factures client non réglées seront consolidées.
              </div>
            ) : (
              <div style={{ paddingTop: "10px" }}>
                {buckets.map((b) => (
                  <div key={b.label} style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px" }}>
                      <span style={{ color: "var(--text-dim)" }}>{b.label} · {b.count} facture(s)</span>
                      <strong className="mono">{loading ? "…" : formatCFA(b.montant)}</strong>
                    </div>
                    <div className="progress">
                      <div style={{ width: `${b.montant > 0 ? Math.max(4, Math.round((b.montant / bucketMax) * 100)) : 0}%`, background: b.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ai-card">
            <div className="ai-badge">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
                <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
                <path d="M4 21l7-7" strokeLinecap="round"></path>
              </svg>
              Suggestions Elara
            </div>
            {suggestions.map((s, i) => (
              <div key={i} className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl">
                <span className="pill" style={{ background: `${s.color}18`, color: s.color, marginRight: "12px" }}>{s.pill}</span>
                <span style={{ flex: 1, fontSize: "13px" }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
