"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plug, Plus, Trash2, Pencil, RefreshCw, Save } from "lucide-react";
import { getReglagesData, testerIntegration, type ReglagesData, type Integration, type ProfilTenant } from "@/lib/ged-api";
import { BarreActions, BoutonLigne, HoteNotifications, useRechargementDonnees } from "@/components/page-actions";
import {
  enregistrerProfilAction,
  enregistrerQuotasAction,
  enregistrerIntegrationAction,
  modifierIntegrationAction,
  supprimerIntegrationAction,
} from "@/lib/actions";

const PLANS = [
  { cle: "freemium", nom: "Freemium", prix: "0 F", features: ["Business Scanner limité", "Rapport mensuel ponctuel", "Assistant restreint"] },
  { cle: "starter", nom: "Starter", prix: "9 900 F/mois", features: ["Business Scanner illimité", "Mémoire Entreprise", "CFO de base"] },
  { cle: "pro", nom: "Pro", prix: "24 900 F/mois", features: ["Commercial", "Import WhatsApp", "Automatisations limitées"] },
  { cle: "business", nom: "Business", prix: "54 900 F/mois", features: ["Opérations & agents avancés", "Intégrations API", "Multi-utilisateurs"] },
];

const TYPES_INTEGRATION = [
  { cle: "webhook", libelle: "Webhook sortant" },
  { cle: "whatsapp", libelle: "WhatsApp Business" },
  { cle: "paiement", libelle: "Passerelle de paiement" },
  { cle: "compta", libelle: "Logiciel de comptabilité" },
  { cle: "openai", libelle: "Fournisseur d'IA" },
];

const MODULES = ["Business Scanner", "CFO", "Commercial", "Opérations", "Workflows", "Assistant IA"];

function octets(o: number | null | undefined): string {
  const n = Number(o ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "0 o";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function SettingsPage() {
  const [data, setData] = useState<ReglagesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setData(await getReglagesData());
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);
  useRechargementDonnees(load);

  const profil: ProfilTenant | null = data?.profil ?? null;
  const usage = data?.usage ?? null;
  const integrations: Integration[] = data?.integrations ?? [];

  const stockage = usage?.stockage_mo ?? 0;
  const depassements = Object.entries(usage?.depassement ?? {}).filter(([, v]) => v !== null && v !== undefined) as [string, number][];

  const compteurs = [
    { label: "Documents", valeur: String(usage?.documents ?? 0), quota: usage?.quotas?.documents, unite: "doc." },
    { label: "Contacts clients", valeur: String(usage?.clients ?? 0), quota: usage?.quotas?.clients, unite: "contacts" },
    { label: "Factures", valeur: String(usage?.factures ?? 0), quota: usage?.quotas?.factures, unite: "factures" },
    { label: "Stockage archivé", valeur: octets(stockage * 1024 * 1024), quota: usage?.quotas?.stockage_mo, unite: "Mo" },
  ];

  const tester = async (i: Integration) => {
    setTest((t) => ({ ...t, [i.id]: "Test en cours…" }));
    try {
      const r = await testerIntegration(i.id);
      if (!r.ok) {
        // Un échec peut venir du test lui-même (renseigné dans `erreur`) ou
        // de l'appel (renseigné dans `message`) : les deux cas sont affichés.
        const motif = "erreur" in r ? r.erreur : "message" in r ? r.message : "cause inconnue";
        setTest((t) => ({ ...t, [i.id]: `Échec — ${motif ?? "cause inconnue"}` }));
        return;
      }
      // Un test réussi renvoie le code HTTP et la latence, pas un message.
      const detail = "code" in r ? `HTTP ${r.code}${r.duree_ms != null ? ` en ${r.duree_ms} ms` : ""}` : r.message;
      setTest((t) => ({ ...t, [i.id]: `OK — ${detail}` }));
    } catch (e) {
      setTest((t) => ({ ...t, [i.id]: `Échec — ${e instanceof Error ? e.message : String(e)}` }));
    }
  };

  return (
    <motion.section
      className="view"
      id="v-settings"
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
            <span>Configuration</span>
          </div>
          <h1 className="page-title">Paramètres &amp; abonnement</h1>
          <p className="page-sub">Configuration de l&apos;espace et paliers tarifaires.</p>
        </div>
        <BarreActions
          actions={[
            {
              libelle: "Modifier le profil",
              variante: "fantome",
              icone: <Save className="w-3.5 h-3.5" />,
              champs: [
                { cle: "raison_sociale", label: "Raison sociale", type: "texte", requis: true, colonne: "pleine", defaut: profil?.raison_sociale ?? "" },
                { cle: "secteur", label: "Secteur d'activité", type: "texte", colonne: "demi", defaut: profil?.secteur ?? "" },
                { cle: "ville", label: "Ville", type: "texte", colonne: "demi", defaut: profil?.ville ?? "" },
                { cle: "pays", label: "Pays", type: "texte", colonne: "demi", defaut: profil?.pays ?? "" },
                { cle: "devise", label: "Devise", type: "texte", colonne: "demi", defaut: profil?.devise ?? "XOF" },
                { cle: "systeme_comptable", label: "Système comptable", type: "texte", colonne: "pleine", defaut: profil?.systeme_comptable ?? "" },
              ],
              executer: (d) => enregistrerProfilAction(d),
            },
            {
              libelle: "Ajuster les quotas",
              variante: "fantome",
              icone: <RefreshCw className="w-3.5 h-3.5" />,
              champs: [
                {
                  cle: "plan",
                  label: "Plan",
                  type: "select",
                  colonne: "pleine",
                  defaut: profil?.plan ?? "starter",
                  options: PLANS.map((p) => ({ valeur: p.cle, libelle: `${p.nom} — ${p.prix}` })),
                },
                { cle: "documents", label: "Quota documents", type: "nombre", colonne: "demi", defaut: usage?.quotas?.documents ?? "" },
                { cle: "clients", label: "Quota contacts", type: "nombre", colonne: "demi", defaut: usage?.quotas?.clients ?? "" },
                { cle: "factures", label: "Quota factures", type: "nombre", colonne: "demi", defaut: usage?.quotas?.factures ?? "" },
                { cle: "stockage_mo", label: "Stockage (Mo)", type: "nombre", colonne: "demi", defaut: usage?.quotas?.stockage_mo ?? "" },
              ],
              executer: (d) => enregistrerQuotasAction(d),
            },
            {
              libelle: "Ajouter un connecteur",
              variante: "primaire",
              icone: <Plus className="w-3.5 h-3.5" />,
              champs: [
                { cle: "nom", label: "Nom du connecteur", type: "texte", requis: true, colonne: "demi" },
                { cle: "type", label: "Type", type: "select", requis: true, colonne: "demi", options: TYPES_INTEGRATION.map((t) => ({ valeur: t.cle, libelle: t.libelle })) },
                { cle: "url", label: "URL cible", type: "texte", colonne: "pleine", hint: "Point d'entrée qui recevra les événements." },
                { cle: "secret", label: "Secret", type: "texte", colonne: "pleine", hint: "Signature HMAC des appels sortants. Jamais renvoyé par l'API." },
                { cle: "actif", label: "Activer immédiatement", type: "checkbox", colonne: "pleine", defaut: true },
              ],
              executer: (d) => enregistrerIntegrationAction(d),
            },
          ]}
        />
      </div>

      {data?.error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Impossible de charger toutes les données — {data.error}
        </div>
      )}

      {depassements.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: 10,
            background: "rgba(217,119,6,0.08)",
            border: "1px solid rgba(217,119,6,0.3)",
            fontSize: 13,
          }}
        >
          <span className="dot" style={{ background: "var(--amber)", flexShrink: 0 }} />
          <span>
            <strong>Quota dépassé</strong> — {depassements.map(([k, v]) => `${k} : +${v}`).join(" · ")}.
            Ajustez les quotas ou archivez des documents.
          </span>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div className="section-title">Volumétrie de l&apos;espace</div>
            <div className="section-sub">
              {profil?.raison_sociale || "Votre espace"} — consommation réelle face aux quotas du plan
            </div>
          </div>
          <span className={`pill ${profil?.statut_abonnement === "actif" ? "pill-success" : "pill-warning"}`}>
            {profil?.plan ?? "Plan inconnu"}
            {profil?.statut_abonnement ? ` · ${profil.statut_abonnement}` : ""}
          </span>
        </div>
        <div className="grid g4">
          {compteurs.map((c) => {
            const depasse = c.quota != null && Number(c.valeur) > c.quota;
            return (
              <div key={c.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px" }}>
                  <span style={{ color: "var(--text-dim)" }}>{c.label}</span>
                  <strong className="mono" style={{ color: depasse ? "var(--red)" : undefined }}>
                    {loading ? "…" : c.valeur}
                  </strong>
                </div>
                <div style={{ fontSize: "11px", color: depasse ? "var(--red)" : "var(--text-faint)" }}>
                  {c.quota == null ? "Quota non défini" : `Quota ${c.quota} ${c.unite}`}
                </div>
                {c.quota != null && Number(c.valeur) > 0 ? (
                  <div style={{ height: 5, borderRadius: 3, background: "var(--line)", marginTop: 6, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.round((Number(c.valeur) / c.quota) * 100))}%`,
                        background: depasse ? "var(--red)" : "linear-gradient(90deg, var(--teal-deep), var(--teal))",
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, fontSize: "12px", color: "var(--text-faint)" }}>
          {usage
            ? `${usage.fournisseurs} fournisseur(s), ${usage.paiements} paiement(s), ${usage.employes} employé(s), ${usage.workflows} workflow(s).`
            : ""}
        </div>
      </div>

      <div className="section-title" style={{ marginBottom: "14px" }}>Comparer les paliers</div>
      <div className="grid g4" style={{ marginBottom: "24px" }}>
        {PLANS.map((p) => {
          const actuel = profil?.plan === p.cle;
          return (
            <div key={p.cle} className="card" style={actuel ? { border: "1.6px solid var(--indigo)" } : undefined}>
              {actuel ? <span className="pill pill-info" style={{ marginBottom: "10px" }}>Plan actuel</span> : null}
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "17px" }}>{p.nom}</div>
              <div style={{ fontSize: "20px", fontWeight: 700, margin: "6px 0 14px", fontFamily: "var(--font-heading)" }}>{p.prix}</div>
              <div style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: 2, marginBottom: "16px" }}>
                {p.features.map((f) => <div key={f}>✓ {f}</div>)}
              </div>
              <div style={{ marginTop: "auto" }}>
                <BoutonLigne
                  libelle={actuel ? "Plan actuel" : "Choisir ce plan"}
                  action={{
                    variante: actuel ? "fantome" : "primaire",
                    confirmation: `Basculer l'espace sur le plan ${p.nom} ? Les quotas associés seront appliqués.`,
                    executer: async () => {
                      const r = await enregistrerQuotasAction({ plan: p.cle });
                      if (r.ok) await load();
                      return r;
                    },
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="section-title">Modules</div>
          <div className="section-sub">
            Modules présents dans l&apos;espace — l&apos;API n&apos;expose pas encore d&apos;activation par module
          </div>
          {MODULES.map((m) => (
            <div key={m} className="list-row">
              <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-heading)" }}>{m}</span>
              <span className="pill pill-success">Disponible</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-title">Connecteurs</div>
          <div className="section-sub">
            {integrations.length === 0
              ? "Aucun connecteur — ajoutez-en un pour brancher vos outils"
              : `${integrations.length} connecteur(s), dont ${integrations.filter((i) => i.actif).length} actif(s)`}
          </div>
          {integrations.length === 0 ? (
            <div style={{ padding: "18px 2px", color: "var(--text-faint)", fontSize: "13px" }}>
              Utilisez « Ajouter un connecteur » pour enregistrer un webhook, une passerelle de paiement
              ou un logiciel de comptabilité.
            </div>
          ) : (
            integrations.map((i) => (
              <div key={i.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Plug className="w-3.5 h-3.5" style={{ color: "var(--teal-deep)" }} />
                      <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-heading)" }}>{i.nom}</span>
                      <span className={`pill ${i.actif ? "pill-success" : "pill-neutral"}`}>{i.actif ? "Actif" : "Inactif"}</span>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: 2, wordBreak: "break-all" }}>
                      {i.url || "—"} · {i.type}
                      {i.dernier_appel ? ` · dernier appel ${new Date(i.dernier_appel).toLocaleString("fr-FR")}` : ""}
                      {i.dernier_statut ? ` (HTTP ${i.dernier_statut})` : ""}
                    </div>
                    {test[i.id] ? (
                      <div style={{ fontSize: 11.5, color: test[i.id].startsWith("OK") ? "var(--teal-deep)" : "var(--red)", marginTop: 3 }}>
                        {test[i.id]}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <BoutonLigne
                      libelle="Tester"
                      action={{ variante: "fantome", executer: async () => { await tester(i); return { ok: true, message: "Test lancé." }; } }}
                    />
                    <BoutonLigne
                      libelle=""
                      action={{
                        variante: "fantome",
                        icone: <Pencil className="w-3.5 h-3.5" />,
                        champs: [
                          { cle: "nom", label: "Nom", type: "texte", requis: true, colonne: "pleine", defaut: i.nom },
                          { cle: "url", label: "URL", type: "texte", colonne: "pleine", defaut: i.url ?? "" },
                          { cle: "actif", label: "Actif", type: "checkbox", colonne: "pleine", defaut: i.actif },
                        ],
                        executer: (d) => modifierIntegrationAction({ ...(d as Record<string, unknown>), id: i.id }),
                      }}
                    />
                    <BoutonLigne
                      libelle=""
                      action={{
                        variante: "fantome",
                        icone: <Trash2 className="w-3.5 h-3.5" />,
                        confirmation: `Supprimer le connecteur « ${i.nom} » ? Les événements ne seront plus diffusés.`,
                        executer: async () => {
                          const r = await supprimerIntegrationAction({ id: i.id });
                          if (r.ok) setData((d) => (d ? { ...d, integrations: d.integrations.filter((x) => x.id !== i.id) } : d));
                          return r;
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.section>
  );
}
