"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Download, Plug, ShieldAlert } from "lucide-react";
import { getAdminData, getAuditTrail, getAuditResume, getReglagesData, getCompteursValidations, type EntreeAudit, type ResumeAudit, type Integration, type ProfilTenant } from "@/lib/ged-api";
import { BarreActions, BoutonExport, HoteNotifications, useRechargementDonnees } from "@/components/page-actions";

function dateFR(d: string | null | undefined): string {
  if (!d) return "—";
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "—" : x.toLocaleString("fr-FR");
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getAdminData>>["health"]>(null);
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof getAdminData>>["docs"]>([]);
  const [clients, setClients] = useState<Awaited<ReturnType<typeof getAdminData>>["clients"]>([]);
  const [audit, setAudit] = useState<EntreeAudit[]>([]);
  const [resume, setResume] = useState<ResumeAudit | null>(null);
  const [profil, setProfil] = useState<ProfilTenant | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [compteurs, setCompteurs] = useState<Awaited<ReturnType<typeof getCompteursValidations>> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [base, entrees, resumeAudit, reglages, file] = await Promise.all([
        getAdminData(),
        getAuditTrail({ limit: 25 }).catch(() => ({ data: [] as EntreeAudit[], meta: { total: 0, limit: 25, offset: 0 } })),
        getAuditResume().catch(() => null),
        getReglagesData().catch(() => null),
        getCompteursValidations().catch(() => null),
      ]);
      setHealth(base.health);
      setDocs(base.docs);
      setClients(base.clients);
      setAudit(entrees.data ?? []);
      setResume(resumeAudit);
      setProfil(reglages?.profil ?? null);
      setIntegrations(reglages?.integrations ?? []);
      setCompteurs(file);
      setError(base.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);
  useRechargementDonnees(load);

  const services = Object.entries(health?.services ?? {});
  const servicesOk = services.filter(([, v]) => v === "connected").length;
  const archives = docs.filter((d) => !!d.archive).length;
  const aAuditer = docs.filter((d) => d.statut === "À auditer").length;
  const enAttente = compteurs?.en_attente ?? 0;
  const echecsAudit = audit.filter((a) => a.statut === "FAILED").length;

  return (
    <motion.section
      className="view"
      id="v-admin"
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
            <span>Console admin · multi-tenant</span>
          </div>
          <h1 className="page-title">Santé de la plateforme</h1>
          <p className="page-sub">
            État des services, de la volumétrie et de la traçabilité de votre espace.
          </p>
        </div>
        <BarreActions
          actions={[
            {
              libelle: "Actualiser",
              variante: "fantome",
              icone: <RefreshCw className="w-3.5 h-3.5" />,
              executer: async () => {
                await load();
                return { ok: true, message: "Relevé rafraîchi." };
              },
            },
            {
              libelle: "Exporter le journal",
              variante: "fantome",
              icone: <Download className="w-3.5 h-3.5" />,
              naviguer: "#v-admin-export",
            },
          ]}
        />
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
          <div className="kpi-label">En attente de validation</div>
          <div className="kpi-value" style={{ color: enAttente > 0 ? "var(--amber)" : undefined }}>{loading ? "…" : enAttente}</div>
          <div className="kpi-delta flat">Validation humaine requise</div>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: "16px" }}>
        <div className="card">
          <div className="section-title">Services de la plateforme</div>
          <div className="section-sub">Relevé direct sur la route de santé de l&apos;API</div>
          <table className="tbl">
            <thead>
              <tr><th>Service</th><th>État</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Chargement…</td></tr>
              ) : services.length === 0 ? (
                <tr><td colSpan={2} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Route de santé injoignable — vérifiez que l&apos;API est démarrée.</td></tr>
              ) : (
                services.map(([nom, etat]) => (
                  <tr key={nom} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300">
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
                  <span style={{ flex: 1, fontSize: "13px" }}>{aAuditer} document(s) attendent une validation humaine</span>
                </div>
              )}
              {echecsAudit > 0 && (
                <div className="list-row">
                  <span className="pill" style={{ background: "var(--red)18", color: "var(--red)", marginRight: "12px" }}>Échecs</span>
                  <span style={{ flex: 1, fontSize: "13px" }}>{echecsAudit} écriture(s) en échec sur les {audit.length} dernières</span>
                </div>
              )}
              {services.length > 0 && servicesOk < services.length && (
                <div className="list-row">
                  <span className="pill" style={{ background: "var(--red)18", color: "var(--red)", marginRight: "12px" }}>Critique</span>
                  <span style={{ flex: 1, fontSize: "13px" }}>{services.length - servicesOk} service(s) déconnecté(s)</span>
                </div>
              )}
              {aAuditer === 0 && echecsAudit === 0 && servicesOk === services.length && services.length > 0 && (
                <div className="list-row">
                  <span className="pill" style={{ background: "var(--green)18", color: "var(--green)", marginRight: "12px" }}>OK</span>
                  <span style={{ flex: 1, fontSize: "13px" }}>
                    Services connectés, aucun document ni aucune écriture en attente.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: "16px" }}>
        <div className="card">
          <div className="section-title">Volumétrie de cet espace</div>
          <div className="section-sub">Mesures sur les données consolidées du tenant</div>
          <table className="tbl">
            <thead><tr><th>Indicateur</th><th>Valeur</th></tr></thead>
            <tbody>
              <tr><td className="name-cell">Contacts clients référencés</td><td className="mono">{loading ? "…" : clients.length}</td></tr>
              <tr><td className="name-cell">Documents consolidés</td><td className="mono">{loading ? "…" : docs.length}</td></tr>
              <tr><td className="name-cell">Documents archivés</td><td className="mono">{loading ? "…" : archives}</td></tr>
              <tr><td className="name-cell">Documents à auditer</td><td className="mono">{loading ? "…" : aAuditer}</td></tr>
              <tr><td className="name-cell">Écritures journalisées</td><td className="mono">{loading ? "…" : (resume?.total ?? "—")}</td></tr>
              <tr><td className="name-cell">Plan</td><td className="mono">{profil?.plan ?? "—"}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="section-title">Connecteurs</div>
          <div className="section-sub">
            {integrations.length === 0 ? "Aucun connecteur enregistré" : `${integrations.length} connecteur(s) · ${integrations.filter((i) => i.actif).length} actif(s)`}
          </div>
          {integrations.length === 0 ? (
            <div style={{ padding: "18px 2px", color: "var(--text-faint)", fontSize: "13px" }}>
              Ajoutez des connecteurs depuis Paramètres pour brancher vos outils.
            </div>
          ) : (
            integrations.map((i) => (
              <div key={i.id} className="list-row">
                <Plug className="w-3.5 h-3.5" style={{ color: "var(--teal-deep)", marginRight: 10 }} />
                <span style={{ flex: 1, fontSize: "13px" }}>{i.nom}</span>
                <span className={`pill ${i.actif ? "pill-success" : "pill-neutral"}`}>{i.actif ? "Actif" : "Inactif"}</span>
                {i.dernier_statut ? (
                  <span className={`pill ${i.dernier_statut < 400 ? "pill-success" : "pill-danger"}`}>HTTP {i.dernier_statut}</span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="section-title">Journal d&apos;audit</div>
        <div className="section-sub">Dernières écritures de l&apos;espace, successes comme échecs</div>
        <table className="tbl">
          <thead>
            <tr><th>Action</th><th>Entité</th><th>Résultat</th><th>Horodatage</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Chargement…</td></tr>
            ) : audit.length === 0 ? (
              <tr><td colSpan={4} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Aucune écriture journalisée.</td></tr>
            ) : (
              audit.slice(0, 10).map((a) => (
                <tr key={a.id} className="group hover:bg-white transition-all duration-300">
                  <td style={{ fontSize: "12.5px" }}>{a.action}</td>
                  <td style={{ fontSize: "12px" }}>{a.entite_concernee}</td>
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
        <div style={{ fontSize: "11.5px", color: "var(--text-faint)", marginTop: 12, lineHeight: 1.7 }}>
          <ShieldAlert className="w-3.5 h-3.5" style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Cette console est cantonnée à votre espace. La supervision transversale — uptime, latence
          P95, revenu par palier, consommation comparée des tenants — n&apos;a pas sa place ici :
          elle supposerait qu&apos;un administrateur d&apos;un tenant puisse lire les métriques des
          autres, ce que l&apos;isolation multi-tenant interdit. Ces indicateurs appartiennent à une
          console d&apos;exploitation distincte, hors du périmètre d&apos;une application louée par
          client.
        </div>
      </div>

      <div id="v-admin-export" className="card">
        <BoutonExport
          libelle="Exporter le journal en CSV"
          nomFichier="audit-espace.csv"
          colonnes={[
            { cle: "created_at", label: "Horodatage" },
            { cle: "action", label: "Action" },
            { cle: "entite_concernee", label: "Entité" },
            { cle: "acteur_type", label: "Auteur" },
            { cle: "statut", label: "Résultat" },
            { cle: "erreur", label: "Erreur" },
          ]}
          lignes={audit.map((a) => ({ ...a, erreur: a.metadata?.erreur ?? "" })) as unknown as Record<string, unknown>[]}
        />
      </div>
    </motion.section>
  );
}
