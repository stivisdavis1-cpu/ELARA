"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getAdminData } from "@/lib/ged-api";
import type { HealthStatus, DocLigne, EntiteRef } from "@/lib/ged-api";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [docs, setDocs] = useState<DocLigne[]>([]);
  const [clients, setClients] = useState<EntiteRef[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const d = await getAdminData();
    setHealth(d.health);
    setDocs(d.docs);
    setClients(d.clients);
    setError(d.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const services = Object.entries(health?.services ?? {});
  const servicesOk = services.filter(([, v]) => v === "connected").length;
  const archives = docs.filter((d) => !!d.archive).length;
  const aAuditer = docs.filter((d) => d.statut === "À auditer").length;

  return (
    <motion.section
      className="view"
      id="v-admin"
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
            <span>Console admin · multi-tenant</span>
          </div>
          <h1 className="page-title">Santé de la plateforme</h1>
          <p className="page-sub">
            État des services et de la volumétrie de l&apos;espace — relevé à l&apos;instantané.
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
          <strong>Observabilité multi-tenant non exposée</strong><br />
          <span className="muted">
            Le tableau de bord opérateur (uptime, latence P95, MRR par palier) nécessite une API
            d&apos;administration qui n&apos;existe pas encore. Seul l&apos;état des services est réel.
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
          <div className="kpi-label">État global</div>
          <div className="kpi-value" style={{ fontSize: "20px", color: health?.status === "ok" ? "var(--green)" : health ? "var(--red)" : undefined }}>
            {loading ? "…" : health ? health.status : "indisponible"}
          </div>
          <div className="kpi-delta flat">Réponse de /v1/health</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Services connectés</div>
          <div className="kpi-value">{loading ? "…" : `${servicesOk}/${services.length}`}</div>
          <div className="kpi-delta flat">Postgres · Redis · RabbitMQ · Keycloak</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Documents archivés</div>
          <div className="kpi-value">{loading ? "…" : archives}</div>
          <div className="kpi-delta flat">Sur {docs.length} document(s) consolidé(s)</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Documents à auditer</div>
          <div className="kpi-value" style={{ color: aAuditer > 0 ? "var(--amber)" : undefined }}>{loading ? "…" : aAuditer}</div>
          <div className="kpi-delta flat">Validation humaine requise</div>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: "16px" }}>
        <div className="card">
          <div className="section-title">Services de la plateforme</div>
          <div className="section-sub">Relevé direct sur la route de santé de l&apos;API</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Service</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Chargement…</td></tr>
              ) : services.length === 0 ? (
                <tr><td colSpan={2} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Route de santé injoignable — vérifiez que l&apos;API est démarrée.</td></tr>
              ) : (
                services.map(([nom, etat]) => (
                  <tr key={nom} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                    <td className="name-cell">{nom}</td>
                    <td>
                      <span className={`pill ${etat === "connected" ? "pill-success" : "pill-danger"}`}>
                        {etat === "connected" ? "Connecté" : etat}
                      </span>
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
            Alertes système actives
          </div>
          {loading ? (
            <div style={{ padding: "18px 2px", color: "var(--text-faint)", fontSize: "13px" }}>Chargement…</div>
          ) : (
            <>
              {aAuditer > 0 && (
                <div className="list-row">
                  <span className="pill" style={{ background: "var(--amber)18", color: "var(--amber)", marginRight: "12px" }}>Avertissement</span>
                  <span style={{ flex: 1, fontSize: "13px" }}>
                    {aAuditer} document(s) attendent une validation humaine
                  </span>
                </div>
              )}
              {health && health.status !== "ok" && (
                <div className="list-row">
                  <span className="pill" style={{ background: "var(--red)18", color: "var(--red)", marginRight: "12px" }}>Critique</span>
                  <span style={{ flex: 1, fontSize: "13px" }}>La route de santé signale un état « {health.status} »</span>
                </div>
              )}
              {aAuditer === 0 && (!health || health.status === "ok") && (
                <div className="list-row">
                  <span className="pill" style={{ background: "var(--green)18", color: "var(--green)", marginRight: "12px" }}>OK</span>
                  <span style={{ flex: 1, fontSize: "13px" }}>
                    Aucune alerte : services connectés et aucun document en attente de validation.
                  </span>
                </div>
              )}
            </>
          )}
          <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "14px", lineHeight: 1.7 }}>
            La supervision multi-tenant (consommation par tenant, pics, coûts) n&apos;est pas
            encore exposée par l&apos;API : ces indicateurs resteront vides tant que le module
            d&apos;administration ne sera pas branché.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Volumétrie de cet espace</div>
        <div className="section-sub">Les seules mesures disponibles : le contenu de votre mémoire d&apos;entreprise</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Indicateur</th>
              <th>Valeur</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="name-cell">Contacts clients référencés</td><td className="mono">{loading ? "…" : clients.length}</td></tr>
            <tr><td className="name-cell">Documents consolidés</td><td className="mono">{loading ? "…" : docs.length}</td></tr>
            <tr><td className="name-cell">Documents archivés</td><td className="mono">{loading ? "…" : archives}</td></tr>
            <tr><td className="name-cell">Documents à auditer</td><td className="mono">{loading ? "…" : aAuditer}</td></tr>
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}
