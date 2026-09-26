"use client";

import React from "react";
import { motion } from "framer-motion";

export default function TeamPage() {
  return (
    <motion.section
      className="view"
      id="v-team"
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
            <span>Ressources humaines</span>
          </div>
          <h1 className="page-title">Employés</h1>
          <p className="page-sub">
            L&apos;annuaire de votre équipe — distinct des comptes de connexion à la plateforme
            (voir Utilisateurs &amp; rôles).
          </p>
        </div>
      </div>

      <div className="preview-banner" style={{ background: "var(--amber-bg, rgba(217,119,6,0.08))", borderColor: "rgba(217,119,6,0.3)" }}>
        <span className="dot" style={{ background: "var(--amber)" }}></span>
        <div>
          <strong>Module RH non implémenté</strong><br />
          <span className="muted">
            Aucun endpoint ne gère les employés, les services ou l&apos;ancienneté. L&apos;annuaire
            restera vide tant que le module RH ne sera pas développé.
          </span>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: "16px" }}>
        <div className="card">
          <div className="kpi-label">Employés actifs</div>
          <div className="kpi-value">—</div>
          <div className="kpi-delta flat">Non exposé par l&apos;API</div>
        </div>
        <div className="card">
          <div className="kpi-label">Services</div>
          <div className="kpi-value">—</div>
          <div className="kpi-delta flat">Non exposé par l&apos;API</div>
        </div>
        <div className="card">
          <div className="kpi-label">Ancienneté moyenne</div>
          <div className="kpi-value">—</div>
          <div className="kpi-delta flat">Non exposé par l&apos;API</div>
        </div>
        <div className="card">
          <div className="kpi-label">Postes vacants</div>
          <div className="kpi-value">—</div>
          <div className="kpi-delta flat">Non exposé par l&apos;API</div>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="section-title">Annuaire</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Employé</th>
                <th>Poste</th>
                <th>Service</th>
                <th>Entrée</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>
                  Aucun employé enregistré. L&apos;annuaire se remplira lorsque le module RH sera
                  connecté à l&apos;API.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div className="card" style={{ marginBottom: "16px" }}>
            <div className="section-title">Répartition par service</div>
            <div style={{ padding: "22px 2px", color: "var(--text-faint)", fontSize: "13px" }}>
              Aucune donnée — la répartition apparaîtra après création de l&apos;annuaire.
            </div>
          </div>
          <div className="ai-card">
            <div className="ai-badge">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
                <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
                <path d="M4 21l7-7" strokeLinecap="round"></path>
              </svg>
              Observation Elara
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-dim)", padding: "4px 0" }}>
              Les analyses de charge par service apparaîtront une fois l&apos;annuaire alimenté.
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
