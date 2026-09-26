"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getUsageData } from "@/lib/ged-api";
import type { DocLigne, EntiteRef, FactureLigne } from "@/lib/ged-api";

const PLANS = [
  {
    nom: "Freemium",
    prix: "0 F",
    features: ["Business Scanner limité", "Rapport mensuel ponctuel", "Assistant restreint"],
  },
  {
    nom: "Starter",
    prix: "9 900 F/mois",
    actuel: true,
    features: ["Business Scanner illimité", "Mémoire Entreprise", "CFO de base"],
  },
  {
    nom: "Pro",
    prix: "24 900 F/mois",
    features: ["Commercial", "Import WhatsApp", "Automatisations limitées"],
  },
  {
    nom: "Business",
    prix: "54 900 F/mois",
    features: ["Opérations & agents avancés", "Intégrations API", "Multi-utilisateurs"],
  },
];

const MODULES = [
  { nom: "Business Scanner", statut: "Actif" },
  { nom: "CFO", statut: "Actif" },
  { nom: "Commercial", statut: "Non exposé par l'API" },
  { nom: "Opérations", statut: "Non exposé par l'API" },
];

const INTEGRATIONS = [
  { nom: "WhatsApp Business", statut: null },
  { nom: "Orange Money / MTN MoMo", statut: null },
  { nom: "Logiciel de comptabilité", statut: null },
  { nom: "API Elara", statut: null },
];

function octets(o: number | null | undefined): string {
  const n = Number(o ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "0 o";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocLigne[]>([]);
  const [clients, setClients] = useState<EntiteRef[]>([]);
  const [factures, setFactures] = useState<FactureLigne[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const d = await getUsageData();
    setDocs(d.docs);
    setClients(d.clients);
    setFactures(d.factures);
    setError(d.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const stockage = docs.reduce((acc, d) => acc + Number(d.archive?.taille ?? 0), 0);

  const compteurs = [
    { label: "Documents consolidés", valeur: loading ? "…" : String(docs.length), quota: "Quota non exposé" },
    { label: "Contacts clients", valeur: loading ? "…" : String(clients.length), quota: "Quota non exposé" },
    { label: "Factures en base", valeur: loading ? "…" : String(factures.length), quota: "Quota non exposé" },
    { label: "Stockage archivé", valeur: loading ? "…" : octets(stockage), quota: "Quota non exposé" },
  ];

  return (
    <motion.section
      className="view"
      id="v-settings"
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
            <span>Configuration</span>
          </div>
          <h1 className="page-title">Paramètres &amp; abonnement</h1>
          <p className="page-sub">Configuration de l&apos;espace et paliers tarifaires.</p>
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
          <strong>Abonnement non géré par l&apos;API</strong><br />
          <span className="muted">
            Les compteurs ci-dessous sont calculés depuis vos données réelles. Les quotas du plan,
            l&apos;état des modules et les intégrations ne sont pas encore exposés.
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Impossible de charger toutes les données — {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div className="section-title">Volumétrie de l&apos;espace</div>
            <div className="section-sub">Calculé à l&apos;instantané sur les données consolidées</div>
          </div>
          <span className="pill pill-neutral">Plan non détecté</span>
        </div>
        <div className="grid g4">
          {compteurs.map((c) => (
            <div key={c.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px" }}>
                <span style={{ color: "var(--text-dim)" }}>{c.label}</span>
                <strong className="mono">{c.valeur}</strong>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>{c.quota}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title" style={{ marginBottom: "14px" }}>Comparer les paliers</div>
      <div className="grid g4" style={{ marginBottom: "24px" }}>
        {PLANS.map((p) => (
          <div key={p.nom} className="card" style={p.actuel ? { border: "1.6px solid var(--indigo)" } : undefined}>
            {p.actuel && (
              <span className="pill pill-info" style={{ marginBottom: "10px" }}>Plan de référence</span>
            )}
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "17px" }}>{p.nom}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, margin: "6px 0 14px", fontFamily: "var(--font-heading)" }}>{p.prix}</div>
            <div style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: 2, marginBottom: "16px" }}>
              {p.features.map((f) => <div key={f}>✓ {f}</div>)}
            </div>
            <button
              className={p.actuel ? "btn btn-ghost" : "btn btn-primary teal"}
              style={{ width: "100%", justifyContent: "center" }}
              disabled
            >
              {p.actuel ? "Non vérifiable" : "Changement non branché"}
            </button>
          </div>
        ))}
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="section-title">Modules activés</div>
          <div className="section-sub">L&apos;API ne renvoie pas encore la liste des modules du tenant</div>
          {MODULES.map((m) => (
            <div key={m.nom} className="list-row">
              <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-heading)" }}>{m.nom}</span>
              <span className={`pill ${m.statut === "Actif" ? "pill-success" : "pill-neutral"}`}>{m.statut}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="section-title">Intégrations</div>
          <div className="section-sub">Aucun état de connexion exposé par l&apos;API</div>
          {INTEGRATIONS.map((i) => (
            <div key={i.nom} className="list-row">
              <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-heading)" }}>{i.nom}</span>
              <span className="pill pill-neutral">Non vérifiable</span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
