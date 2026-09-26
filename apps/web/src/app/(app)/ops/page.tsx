"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { formatCFA, toNum } from "@/lib/utils";
import { getOpsData } from "@/lib/ged-api";
import type { ProduitLigne, StockLigne, EntiteRef, FactureLigne, DepenseLigne } from "@/lib/ged-api";

interface StockRow {
  id: string;
  nom: string;
  ref: string;
  qty: number;
  depot: string;
  hasStock: boolean;
}

export default function OpsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [produits, setProduits] = useState<ProduitLigne[]>([]);
  const [stocks, setStocks] = useState<StockLigne[]>([]);
  const [fournisseurs, setFournisseurs] = useState<EntiteRef[]>([]);
  const [factures, setFactures] = useState<FactureLigne[]>([]);
  const [depenses, setDepenses] = useState<DepenseLigne[]>([]);

  const load = useCallback(async () => {
    const d = await getOpsData();
    setProduits(d.produits);
    setStocks(d.stocks);
    setFournisseurs(d.fournisseurs);
    setFactures(d.factures);
    setDepenses(d.depenses);
    setError(d.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const rows: StockRow[] = produits.map((p) => {
    const st = stocks.find((s) => s.produit?.id === p.id);
    return {
      id: p.id,
      nom: p.nom,
      ref: p.reference ?? "—",
      qty: st ? st.quantite : 0,
      depot: st?.entrepot ?? "—",
      hasStock: !!st,
    };
  });

  const ruptures = rows.filter((r) => r.hasStock && r.qty === 0);
  const sansStock = rows.filter((r) => !r.hasStock);
  const totalDepenses = depenses.reduce((acc, d) => acc + toNum(d.montant), 0);

  const recommandations: { pill: string; color: string; text: string }[] = [];
  if (ruptures.length > 0) {
    recommandations.push({
      pill: "Urgent",
      color: "var(--red)",
      text: `${ruptures[0].nom} : stock à 0 — déclencher un réapprovisionnement`,
    });
  }
  if (sansStock.length > 0) {
    recommandations.push({
      pill: "Anticipé",
      color: "var(--amber)",
      text: `${sansStock.slice(0, 3).map((r) => r.nom).join(", ")}${sansStock.length > 3 ? ` +${sansStock.length - 3}` : ""} : ligne de stock non initialisée`,
    });
  }
  if (recommandations.length === 0 && !loading) {
    recommandations.push({
      pill: "OK",
      color: "var(--green)",
      text: "Aucun stock en rupture. Les recommandations de réapprovisionnement apparaîtront dès que des niveaux critiques seront consolidés.",
    });
  }

  const detteFournisseur = (id: string) =>
    factures
      .filter((f) => f.fournisseur?.id === id && f.statut !== "payee" && f.statut !== "annulee")
      .reduce((acc, f) => acc + toNum(f.montant_total), 0);

  return (
    <motion.section
      className="view"
      id="v-ops"
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
            <span>Module · Opérations Avancées</span>
          </div>
          <h1 className="page-title">Opérations Avancées</h1>
          <p className="page-sub">Stocks, achats et fournisseurs — consolidés depuis la Business Memory.</p>
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
          <span className="muted">Produits, stocks et fournisseurs extraits de vos documents d’achat apparaissent ici automatiquement.</span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Impossible de charger toutes les données — {error}
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: '16px' }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Références produits</div>
          <div className="kpi-value">{loading ? "…" : produits.length}</div>
          <div className="kpi-delta flat">{rows.filter((r) => r.hasStock).length} ligne(s) de stock</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Ruptures de stock</div>
          <div className="kpi-value" style={{ color: ruptures.length > 0 ? 'var(--red)' : 'var(--green)' }}>{loading ? "…" : ruptures.length}</div>
          <div className="kpi-delta flat">Sur le catalogue consolidé</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Fournisseurs référencés</div>
          <div className="kpi-value">{loading ? "…" : fournisseurs.length}</div>
          <div className="kpi-delta flat">Extraits de vos documents</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Dépenses consolidées</div>
          <div className="kpi-value">{loading ? "…" : formatCFA(totalDepenses)}</div>
          <div className="kpi-delta flat">{depenses.length} écriture(s)</div>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: '16px' }}>
        <div className="card">
          <div className="section-title">Stock par référence</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Stock</th>
                <th>Entrepôt</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ color: 'var(--text-faint)', fontSize: '13px', padding: '16px' }}>Chargement…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} style={{ color: 'var(--text-faint)', fontSize: '13px', padding: '16px' }}>Aucun produit consolidé — le stock apparaîtra après l’intégration de vos documents d’achat.</td></tr>
              ) : (
                rows.map((ev) => (
                  <tr key={ev.id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                    <td className="name-cell">{ev.nom}</td>
                    <td className="mono">{ev.hasStock ? ev.qty : "—"}</td>
                    <td className="mono">{ev.depot}</td>
                    <td>
                      {!ev.hasStock ? (
                        <span className="pill pill-info">Non initialisé</span>
                      ) : ev.qty === 0 ? (
                        <span className="pill pill-danger">En rupture</span>
                      ) : (
                        <span className="pill pill-success">Disponible</span>
                      )}
                    </td>
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
            Recommandations de réapprovisionnement
          </div>
          {recommandations.map((r, i) => (
            <div key={i} className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl">
              <span className="pill" style={{ background: `${r.color}18`, color: r.color, marginRight: '12px' }}>{r.pill}</span>
              <span style={{ flex: 1, fontSize: '13px' }}>{r.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Fournisseurs</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Contact</th>
              <th>Dette en cours</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ color: 'var(--text-faint)', fontSize: '13px', padding: '16px' }}>Chargement…</td></tr>
            ) : fournisseurs.length === 0 ? (
              <tr><td colSpan={4} style={{ color: 'var(--text-faint)', fontSize: '13px', padding: '16px' }}>Aucun fournisseur consolidé pour l’instant.</td></tr>
            ) : (
              fournisseurs.map((f) => {
                const dette = detteFournisseur(f.id);
                return (
                  <tr key={f.id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                    <td className="name-cell">{f.nom}</td>
                    <td>{f.email ?? f.telephone ?? "—"}</td>
                    <td className="mono">{formatCFA(dette)}</td>
                    <td>
                      {dette > 0 ? (
                        <span className="pill pill-info">Échéance à suivre</span>
                      ) : (
                        <span className="pill pill-success">À jour</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}