"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getCurrentUser } from "@/lib/ged-api";
import type { CurrentUser } from "@/lib/ged-api";

const PERMISSIONS: { module: string; roles: Record<string, boolean> }[] = [
  { module: "Tableau de bord & rapports", roles: { Propriétaire: true, Comptable: true, Commercial: true, "Lecture seule": true } },
  { module: "CFO — trésorerie & marges", roles: { Propriétaire: true, Comptable: true, Commercial: false, "Lecture seule": true } },
  { module: "Valider et archiver un document", roles: { Propriétaire: true, Comptable: true, Commercial: false, "Lecture seule": false } },
  { module: "Clients & fournisseurs — relances", roles: { Propriétaire: true, Comptable: false, Commercial: true, "Lecture seule": true } },
  { module: "Gérer les utilisateurs et rôles", roles: { Propriétaire: true, Comptable: false, Commercial: false, "Lecture seule": false } },
];

const COLONNES = ["Propriétaire", "Comptable", "Commercial", "Lecture seule"];

function initiales(nom: string | null): string {
  if (!nom) return "?";
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const u = await getCurrentUser();
        if (!cancelled) setUser(u);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <motion.section
      className="view"
      id="v-users"
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
            <span>Gouvernance</span>
          </div>
          <h1 className="page-title">Utilisateurs &amp; rôles</h1>
          <p className="page-sub">
            Gestion des accès — les identités et rôles effectifs de l&apos;espace.
          </p>
        </div>
      </div>

      <div className="preview-banner" style={{ background: "var(--amber-bg, rgba(217,119,6,0.08))", borderColor: "rgba(217,119,6,0.3)" }}>
        <span className="dot" style={{ background: "var(--amber)" }}></span>
        <div>
          <strong>Annuaire multi-utilisateurs non exposé</strong><br />
          <span className="muted">
            L&apos;API ne fournit pas encore la liste des membres de l&apos;espace. Seul votre
            profil, lu depuis la session Keycloak, est affiché ci-dessous.
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Impossible de lire votre session — {error}
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: "16px" }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Utilisateurs actifs</div>
          <div className="kpi-value">{loading ? "…" : "—"}</div>
          <div className="kpi-delta flat">Annuaire non exposé par l&apos;API</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Invitations en attente</div>
          <div className="kpi-value">{loading ? "…" : "—"}</div>
          <div className="kpi-delta flat">Service d&apos;invitation non branché</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Rôles sur votre session</div>
          <div className="kpi-value">{loading ? "…" : user?.roles.length ?? 0}</div>
          <div className="kpi-delta flat">Attribués par Keycloak</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Rôles définis</div>
          <div className="kpi-value">{COLONNES.length}</div>
          <div className="kpi-delta flat">Modèle de référence de la plateforme</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="section-title">Session en cours</div>
        <div className="section-sub">Identité réelle, lue depuis le jeton Keycloak</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôles</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Chargement…</td></tr>
            ) : !user?.email ? (
              <tr><td colSpan={3} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Aucune session active — reconnectez-vous pour afficher votre profil.</td></tr>
            ) : (
              <tr className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="tag-icon" style={{ width: "30px", height: "30px", background: "var(--blue-bg)", color: "var(--indigo-deep)", fontSize: "11px", fontWeight: 700 }}>
                      {initiales(user.name ?? user.email)}
                    </div>
                    <div>
                      <div className="name-cell">{user.name ?? user.email}</div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {user.roles.length === 0 ? (
                    <span className="pill pill-neutral">Aucun rôle</span>
                  ) : (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {user.roles.map((r) => (
                        <span key={r} className="pill pill-info">{r}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td><span className="pill pill-success">Connecté</span></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="section-title">Permissions par rôle</div>
        <div className="section-sub">
          Matrice de référence de la plateforme — l&apos;attribution effective par utilisateur n&apos;est pas
          encore disponible
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Module / action</th>
              {COLONNES.map((c) => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.module} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                <td className="name-cell">{p.module}</td>
                {COLONNES.map((c) => (
                  <td key={c}>
                    <span style={{ color: p.roles[c] ? "var(--teal-deep)" : "var(--line)" }}>
                      {p.roles[c] ? "✓" : "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}
