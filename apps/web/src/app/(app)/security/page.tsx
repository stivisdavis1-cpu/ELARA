"use client";

import React from "react";
import { motion } from "framer-motion";

export default function SecurityPage() {
  return (
    <motion.section
      className="view"
      id="v-security"
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
            <span>Console admin · confiance &amp; conformité</span>
          </div>
          <h1 className="page-title">Sécurité &amp; gouvernance</h1>
          <p className="page-sub">
            Les principes structurants qui encadrent chaque action de la plateforme, du chiffrement
            à la validation humaine.
          </p>
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: "16px" }}>
        <div className="card">
          <div className="tag-icon" style={{ background: "var(--blue-bg)", color: "var(--indigo-deep)", marginBottom: "12px" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 3l7 3v6c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6l7-3Z" strokeLinejoin="round"></path>
              <path d="M9 12l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <div className="section-title">Security by design</div>
          <ul style={{ paddingLeft: "18px", margin: "12px 0 0", fontSize: "13px", lineHeight: 1.9, color: "var(--text-dim)" }}>
            <li>Chiffrement des données au repos et en transit</li>
            <li>Authentification multi-facteurs (MFA) et RBAC</li>
            <li>Isolation stricte des tenants (tenant_id + Row-Level Security)</li>
            <li>Secrets centralisés, journaux d&apos;audit, sauvegardes, plan de reprise</li>
          </ul>
        </div>
        <div className="card">
          <div className="tag-icon" style={{ background: "var(--green-bg)", color: "var(--green)", marginBottom: "12px" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="8" cy="9" r="3"></circle>
              <circle cx="17" cy="10" r="2.4"></circle>
              <path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14.5 19c0-2.2 1.7-3.8 4-3.8s4 1.6 4 3.8" strokeLinecap="round"></path>
            </svg>
          </div>
          <div className="section-title">Human-in-the-loop</div>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.8, margin: "12px 0 0" }}>
            Aucune action sensible — envoi de message, génération et envoi de facture, modification
            d&apos;un statut financier — n&apos;est exécutée automatiquement sans validation
            explicite, dès le MVP.
          </p>
        </div>
        <div className="card">
          <div className="tag-icon" style={{ background: "var(--amber-bg)", color: "var(--amber)", marginBottom: "12px" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
              <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
              <path d="M4 21l7-7" strokeLinecap="round"></path>
            </svg>
          </div>
          <div className="section-title">AI Governance</div>
          <ul style={{ paddingLeft: "18px", margin: "12px 0 0", fontSize: "13px", lineHeight: 1.9, color: "var(--text-dim)" }}>
            <li>Grounding systématique sur les données réelles, avec citation des sources</li>
            <li>Score de confiance associé aux réponses et recommandations</li>
            <li>Versioning des prompts, des modèles et des jeux d&apos;évaluation</li>
            <li>Audit trail dédié aux actions réalisées par l&apos;Avancé</li>
          </ul>
        </div>
      </div>

      <div className="preview-banner" style={{ background: "var(--amber-bg, rgba(217,119,6,0.08))", borderColor: "rgba(217,119,6,0.3)", marginBottom: "16px" }}>
        <span className="dot" style={{ background: "var(--amber)" }}></span>
        <div>
          <strong>File de validation et journal d&apos;audit non persistés</strong><br />
          <span className="muted">
            L&apos;AuditInterceptor enregistre les actions en console uniquement, et aucune file
            d&apos;actions à valider n&apos;est exposée par l&apos;API. Les deux tableaux ci-dessous
            resteront vides en attendant la persistance.
          </span>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="section-title">Actions automatisées en attente de validation</div>
          <div className="section-sub">Garde-fou « human-in-the-loop » appliqué aux actions sensibles</div>
          <div style={{ padding: "24px 2px", color: "var(--text-faint)", fontSize: "13px" }}>
            Aucune action en attente. La file de validation sera alimentée dès que les modules
            d&apos;action (relance, archivage, génération) exposeront leurs propositions.
          </div>
        </div>
        <div className="card">
          <div className="section-title">Journal d&apos;audit — Actions automatisées</div>
          <div className="section-sub">Traçabilité des actions réalisées par les agents</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Action</th>
                <th>Agent</th>
                <th>Validé par</th>
                <th>Horodatage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>
                  Aucune entrée — le journal n&apos;est pas encore persisté en base.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}
