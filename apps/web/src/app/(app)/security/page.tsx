"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, X, Download, ShieldCheck } from "lucide-react";
import {
  getSecuriteData,
  approuverValidation,
  rejeterValidation,
  type Validation,
  type EntreeAudit,
  type ResumeAudit,
  type SecuriteData,
} from "@/lib/ged-api";
import { BarreActions, BoutonLigne, BoutonExport, HoteNotifications, useRechargementDonnees } from "@/components/page-actions";

function dateFR(d: string | null): string {
  if (!d) return "—";
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "—" : x.toLocaleString("fr-FR");
}

function euros(v: number | null): string {
  if (v === null || v === undefined) return "";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function iconeAction(action: string): string {
  if (/(cre|cree|ajout|nouveau)/i.test(action)) return "Création";
  if (/(mod|updat|patch)/i.test(action)) return "Modification";
  if (/(suppr|delete|retir)/i.test(action)) return "Suppression";
  if (/(archiv|valid)/i.test(action)) return "Validation";
  if (/(gener|envoy|envoi)/i.test(action)) return "Envoi";
  return action;
}

export default function SecurityPage() {
  const [data, setData] = useState<SecuriteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState<string>("");

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getSecuriteData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);
  useRechargementDonnees(charger);

  const validations: Validation[] = data?.validations ?? [];
  const audit: EntreeAudit[] = data?.audit ?? [];
  const resume: ResumeAudit | null = data?.resume ?? null;

  const enAttente = validations.filter((v) => v.statut === "en_attente");
  const traitees = validations.filter((v) => v.statut !== "en_attente");
  const fileVisible = filtreStatut ? validations.filter((v) => v.statut === filtreStatut) : validations;
  const echecs = audit.filter((a) => a.statut === "FAILED");

  return (
    <motion.section
      className="view"
      id="v-security"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <HoteNotifications />

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
        <BarreActions
          actions={[
            {
              libelle: "Exporter le journal",
              variante: "fantome",
              icone: <Download className="w-3.5 h-3.5" />,
              naviguer: "#v-security-export",
            },
          ]}
        />
      </div>

      {data?.error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          {data.error}
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: "16px" }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">En attente de validation</div>
          <div className="kpi-value" style={{ color: enAttente.length ? "var(--amber)" : undefined }}>{loading ? "…" : enAttente.length}</div>
          <div className="kpi-delta flat">Garde-fou human-in-the-loop</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Validées</div>
          <div className="kpi-value">{loading ? "…" : validations.filter((v) => v.statut === "approuvee").length}</div>
          <div className="kpi-delta flat">Exécutées après accord humain</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Écritures journalisées</div>
          <div className="kpi-value">{loading ? "…" : (resume?.total ?? data?.auditTotal ?? 0)}</div>
          <div className="kpi-delta flat">Toutes entités confondues</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Taux d&apos;échec</div>
          <div className="kpi-value" style={{ color: resume?.taux_echec ? "var(--red)" : undefined }}>
            {loading ? "…" : resume ? `${resume.taux_echec.toFixed(1)} %` : "—"}
          </div>
          <div className="kpi-delta flat">{loading ? "" : `${resume?.echecs ?? 0} opération(s) en échec`}</div>
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
            explicite. La file ci-dessous est l&apos;endroit où ces propositions attendent votre
            décision.
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
            <li>Confiance mesurée sur les valeurs extraites, avant validation automatique</li>
            <li>Versioning des prompts, des modèles et des jeux d&apos;évaluation</li>
            <li>Audit trail dédié aux actions réalisées par l&apos;Avancé</li>
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="section-title">File de validation</div>
        <div className="section-sub">
          Chaque proposition attend une décision humaine explicite — rien ne part sans accord
        </div>
        <div className="dossier-chip-row" style={{ marginTop: 10 }}>
          {[
            { cle: "", libelle: `Toutes (${validations.length})` },
            { cle: "en_attente", libelle: `En attente (${validations.filter((v) => v.statut === "en_attente").length})` },
            { cle: "approuvee", libelle: `Validées (${validations.filter((v) => v.statut === "approuvee").length})` },
            { cle: "rejetee", libelle: `Rejetées (${validations.filter((v) => v.statut === "rejetee").length})` },
          ].map((f) => (
            <button
              key={f.cle || "toutes"}
              className={`dossier-chip ${filtreStatut === f.cle ? "dossier-chip-active" : ""}`}
              style={{ cursor: "pointer", border: filtreStatut === f.cle ? "1px solid var(--teal-deep)" : undefined }}
              onClick={() => setFiltreStatut(f.cle)}
            >
              {f.libelle}
            </button>
          ))}
        </div>

        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Proposition</th>
              <th>Cible</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Décision</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Chargement…</td></tr>
            ) : fileVisible.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>
                  {enAttente.length === 0
                    ? "Aucune action en attente — la file est vide. Les modules qui proposent une action sensible (relance, archivage, envoi) y deposent leur proposition."
                    : "Aucune entrée pour ce filtre."}
                </td>
              </tr>
            ) : (
              fileVisible.map((v) => (
                <tr key={v.id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                  <td>
                    <div className="name-cell">{v.titre}</div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>{v.detail || v.type}</div>
                  </td>
                  <td style={{ fontSize: "12px" }}>{v.cible_type ? `${v.cible_type}` : "—"}</td>
                  <td style={{ fontSize: "12.5px" }}>{euros(v.montant) || "—"}</td>
                  <td>
                    <span className={`pill ${v.statut === "approuvee" ? "pill-success" : v.statut === "rejetee" ? "pill-danger" : "pill-warning"}`}>
                      {v.statut === "approuvee" ? "Validée" : v.statut === "rejetee" ? "Rejetée" : "En attente"}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                    {v.decide_par ? `${v.decide_par} · ${dateFR(v.decide_at)}` : "—"}
                    {v.motif ? <div style={{ fontStyle: "italic", fontSize: 11.5 }}>« {v.motif} »</div> : null}
                  </td>
                  <td>
                    {v.statut === "en_attente" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <BoutonLigne
                          libelle="Valider"
                          action={{
                            variante: "fantome",
                            icone: <Check className="w-3.5 h-3.5" />,
                            confirmation: `Valider « ${v.titre} » ? L'action sera exécutée immédiatement.`,
                            executer: async () => {
                              const r = await approuverValidation(v.id);
                              if (r.ok) {
                                setData((d) => d ? { ...d, validations: d.validations.map((x) => (x.id === v.id ? { ...x, statut: "approuvee", decide_at: new Date().toISOString() } : x)) } : d);
                              }
                              return r;
                            },
                          }}
                        />
                        <BoutonLigne
                          libelle="Rejeter"
                          action={{
                            variante: "fantome",
                            icone: <X className="w-3.5 h-3.5" />,
                            executer: async () => {
                              const motif = window.prompt("Motif du rejet — il sera conservé au journal :");
                              if (motif === null) return { ok: false, message: "Rejet annulé." };
                              const r = await rejeterValidation(v.id, motif || "Rejet sans motif");
                              if (r.ok) {
                                setData((d) => d ? { ...d, validations: d.validations.map((x) => (x.id === v.id ? { ...x, statut: "rejetee", motif, decide_at: new Date().toISOString() } : x)) } : d);
                              }
                              return r;
                            },
                          }}
                        />
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {traitees.length > 0 && !filtreStatut ? (
          <div style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: 10 }}>
            {traitees.length} décision(s) déjà prise(s) — filtrez pour les consulter.
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="section-title">Journal d&apos;audit</div>
        <div className="section-sub">
          Traçabilité des écritures, successes comme échecs
          {resume ? ` — ${resume.total} entrées au total` : ""}
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Action</th>
              <th>Entité</th>
              <th>Auteur</th>
              <th>Résultat</th>
              <th>Horodatage</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Chargement…</td></tr>
            ) : audit.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>
                  Aucune écriture journalisée pour le tenant — le journal se remplit dès la première
                  écriture.
                </td>
              </tr>
            ) : (
              audit.map((a) => (
                <tr key={a.id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                  <td style={{ fontSize: "12.5px" }}>{iconeAction(a.action)}</td>
                  <td style={{ fontSize: "12px" }}>{a.entite_concernee}</td>
                  <td style={{ fontSize: "12px", color: "var(--text-dim)" }}>{a.acteur_type}</td>
                  <td>
                    <span className={`pill ${a.statut === "SUCCESS" ? "pill-success" : "pill-danger"}`} title={a.metadata?.erreur ?? ""}>
                      {a.statut === "SUCCESS" ? "Succès" : "Échec"}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-dim)" }}>{dateFR(a.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {echecs.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(220,38,38,0.06)",
              border: "1px solid rgba(220,38,38,0.22)",
              fontSize: 12.5,
              color: "var(--red)",
            }}
          >
            <ShieldCheck className="w-4 h-4" />
            {echecs.length} écriture(s) ont échoué dans les 40 dernières entrées — le détail figure dans
            l&apos;infobulle de chaque ligne.
          </div>
        ) : null}
      </div>

      <div id="v-security-export" className="card" style={{ marginTop: 16 }}>
        <BoutonExport
          libelle="Exporter le journal d'audit en CSV"
          nomFichier="journal-audit.csv"
          colonnes={[
            { cle: "created_at", label: "Horodatage" },
            { cle: "acteur_type", label: "Type d'auteur" },
            { cle: "acteur_id", label: "Auteur" },
            { cle: "action", label: "Action" },
            { cle: "entite_concernee", label: "Entité" },
            { cle: "statut", label: "Résultat" },
            { cle: "erreur", label: "Erreur" },
          ]}
          lignes={audit.map((a) => ({ ...a, erreur: a.metadata?.erreur ?? "" })) as unknown as Record<string, unknown>[]}
        />
      </div>
    </motion.section>
  );
}
