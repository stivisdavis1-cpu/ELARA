"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { formatCFA, toNum } from "@/lib/utils";
import { getWorkflowsData } from "@/lib/ged-api";
import type { BalanceAgee, DepenseLigne, PaiementLigne } from "@/lib/ged-api";

interface Candidat {
  id: string;
  nom: string;
  declencheur: string;
  condition: string;
  action: string;
  volume: number;
  unite: string;
}

export default function WorkflowsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<BalanceAgee | null>(null);
  const [depenses, setDepenses] = useState<DepenseLigne[]>([]);
  const [paiements, setPaiements] = useState<PaiementLigne[]>([]);
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const d = await getWorkflowsData();
    setBalance(d.balance);
    setDepenses(d.depenses);
    setPaiements(d.paiements);
    setError(d.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const retards = (balance?.details ?? []).filter((d) => d.retard_jours > 0);
  const grosRetards = retards.filter((d) => d.retard_jours > 30);
  const sansFacture = paiements.filter((p) => !p.facture);
  const montantMoyenDepense = depenses.length
    ? depenses.reduce((acc, d) => acc + toNum(d.montant), 0) / depenses.length
    : 0;
  const depensesAnormales = depenses.filter((d) => toNum(d.montant) > montantMoyenDepense * 1.4);

  // Candidats calculés sur les données réelles — ce sont des cas détectés,
  // pas des workflows enregistrés (le moteur d'automatisation n'existe pas).
  const candidats: Candidat[] = [];
  if (grosRetards.length > 0) {
    candidats.push({
      id: "relance",
      nom: "Relance automatique des factures en retard",
      declencheur: "Facture non réglée",
      condition: `Retard > 30 j (${grosRetards.length} facture(s) concernée(s))`,
      action: "Préparer une relance WhatsApp + email et notifier le comptable",
      volume: grosRetards.length,
      unite: "facture(s)",
    });
  }
  if (retards.length > grosRetards.length) {
    candidats.push({
      id: "relance-court",
      nom: "Relance douce avant escalade",
      declencheur: "Facture non réglée",
      condition: `Retard entre 1 et 30 j (${retards.length - grosRetards.length} facture(s))`,
      action: "Signaler la facture au tableau de bord commercial",
      volume: retards.length - grosRetards.length,
      unite: "facture(s)",
    });
  }
  if (depensesAnormales.length > 0) {
    candidats.push({
      id: "depense",
      nom: "Alerte dépense anormale",
      declencheur: "Nouvelle dépense enregistrée",
      condition: `Montant > 1,4 × la moyenne (${formatCFA(Math.round(montantMoyenDepense))})`,
      action: "Créer une anomalie et notifier le Directeur Financier Virtuel",
      volume: depensesAnormales.length,
      unite: "dépense(s)",
    });
  }
  if (sansFacture.length > 0) {
    candidats.push({
      id: "rapprochement",
      nom: "Rapprochement des paiements Mobile Money",
      declencheur: "Paiement enregistré",
      condition: `Aucune facture liée (${sansFacture.length} paiement(s))`,
      action: "Proposer une facture candidate à l'opérateur",
      volume: sansFacture.length,
      unite: "paiement(s)",
    });
  }

  const kpis = [
    { label: "Workflows enregistrés", valeur: loading ? "…" : "0", sub: "Moteur d'automatisation non implémenté" },
    { label: "Factures en retard", valeur: loading ? "…" : String(retards.length), sub: `${formatCFA(retards.reduce((a, d) => a + toNum(d.montant), 0))} à recouvrer` },
    { label: "Paiements à rapprocher", valeur: loading ? "…" : String(sansFacture.length), sub: `${paiements.length} paiement(s) au total` },
    { label: "Candidats détectés", valeur: loading ? "…" : String(candidats.length), sub: "Sur vos données réelles" },
  ];

  return (
    <motion.section
      className="view"
      id="v-workflows"
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
            <span>Automatisation</span>
          </div>
          <h1 className="page-title">Concepteur de workflows</h1>
          <p className="page-sub">
            Les situations que vos données font ressortir — et qui pourraient être automatisées.
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
          <strong>Moteur d&apos;automatisation non implémenté</strong><br />
          <span className="muted">
            Aucun workflow n&apos;est enregistré ni exécuté. Les éléments ci-dessous sont des
            candidats calculés sur vos factures, paiements et dépenses réelles.
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Impossible de charger toutes les données — {error}
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: "16px" }}>
        {kpis.map((k) => (
          <div key={k.label} className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.valeur}</div>
            <div className="kpi-delta flat">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="section-title">Décrire un nouveau workflow</div>
        <div className="section-sub">
          Exemple : « Quand une facture dépasse 30 jours de retard, envoie une relance WhatsApp et
          notifie le comptable »
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          <input
            className="field"
            placeholder="Décrivez le processus à automatiser…"
            style={{ flex: 1 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button className="btn btn-primary teal" disabled title="Le générateur de workflows n'est pas encore branché">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
              <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
              <path d="M4 21l7-7" strokeLinecap="round"></path>
            </svg>
            Générer le workflow
          </button>
        </div>
        {description.trim() && (
          <div style={{ fontSize: "12.5px", color: "var(--text-dim)", marginTop: "10px" }}>
            Votre description est conservée localement pour cette session — la génération
            automatique n&apos;est pas encore disponible.
          </div>
        )}
      </div>

      <div className="section-title" style={{ marginBottom: "12px" }}>Candidats détectés sur vos données</div>

      {loading ? (
        <div className="card">
          <div style={{ padding: "18px 2px", color: "var(--text-faint)", fontSize: "13px" }}>Chargement…</div>
        </div>
      ) : candidats.length === 0 ? (
        <div className="card">
          <div style={{ padding: "18px 2px", color: "var(--text-faint)", fontSize: "13px" }}>
            Aucun cas détecté : ni facture en retard, ni paiement sans facture liée, ni dépense
            au-dessus de la moyenne. Les candidats apparaîtront dès que vos factures, paiements et
            dépenses seront consolidés.
          </div>
        </div>
      ) : (
        candidats.map((c) => (
          <div key={c.id} className="card" style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "2px", fontFamily: "var(--font-heading)" }}>{c.nom}</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
                  {c.volume} {c.unite} concernée(s) actuellement
                </div>
              </div>
              <span className="pill pill-neutral" style={{ flexShrink: 0 }}>Candidat · non activé</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
              <span className="pill pill-info">{c.declencheur}</span>
              <span style={{ color: "var(--text-faint)", fontSize: "13px" }}>→</span>
              <span className="pill pill-warning">{c.condition}</span>
              <span style={{ color: "var(--text-faint)", fontSize: "13px" }}>→</span>
              <span className="pill pill-success">{c.action}</span>
            </div>
          </div>
        ))
      )}

      <div className="ai-card">
        <div className="ai-badge">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
            <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
            <path d="M4 21l7-7" strokeLinecap="round"></path>
          </svg>
          Suggestion Elara
        </div>
        {grosRetards.length > 0 ? (
          <div className="list-row">
            <span className="pill" style={{ background: "var(--indigo)18", color: "var(--indigo)", marginRight: "12px" }}>Priorité</span>
            <span style={{ flex: 1, fontSize: "13px" }}>
              {grosRetards.length} facture(s) de plus de 30 jours de retard
              ({formatCFA(grosRetards.reduce((a, d) => a + toNum(d.montant), 0))}) — un workflow de
              relance automatique est le premier levier.
            </span>
          </div>
        ) : (
          <div className="list-row">
            <span className="pill" style={{ background: "var(--green)18", color: "var(--green)", marginRight: "12px" }}>OK</span>
            <span style={{ flex: 1, fontSize: "13px" }}>
              Aucune facture au-delà de 30 jours de retard — l&apos;automatisation de relance n&apos;est
              pas encore prioritaire.
            </span>
          </div>
        )}
      </div>
    </motion.section>
  );
}
