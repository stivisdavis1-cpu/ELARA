"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarreActions,
  BoutonExport,
  BoutonLigne,
  HoteNotifications,
  useRechargementDonnees,
  type ActionPage,
} from "@/components/page-actions";
import {
  changerStatutDocumentAction,
  genererDocumentAction,
  enregistrerTemplateAction,
  supprimerDocumentAction,
  supprimerTemplateAction,
} from "@/lib/actions";
import { getDocgenData } from "@/lib/ged-api";
import type { DocumentGenere, EntiteRef, TemplateDocgen } from "@/lib/ged-api";

function formaterDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function montantFr(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

const STATUTS = ["a_valider", "valide", "envoye", "archive", "rejete"] as const;
const LIBELLES_STATUT: Record<string, string> = {
  a_valider: "À valider",
  valide: "Validé",
  envoye: "Envoyé",
  archive: "Archivé",
  rejete: "Rejeté",
};

function classeStatut(statut: string | null | undefined): string {
  switch (statut) {
    case "valide":
    case "envoye":
      return "pill-success";
    case "a_valider":
      return "pill-warning";
    case "archive":
      return "pill-info";
    case "rejete":
      return "pill-danger";
    default:
      return "pill-neutral";
  }
}

const TYPES_GABARIT = [
  { valeur: "generique", libelle: "Générique" },
  { valeur: "facture", libelle: "Facture" },
  { valeur: "devis", libelle: "Devis" },
  { valeur: "attestation", libelle: "Attestation" },
  { valeur: "relance", libelle: "Relance" },
  { valeur: "proforma", libelle: "Proforma" },
];

export default function DocgenPage() {
  const [chargement, setChargement] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gabarits, setGabarits] = useState<TemplateDocgen[]>([]);
  const [documents, setDocuments] = useState<DocumentGenere[]>([]);
  const [clients, setClients] = useState<EntiteRef[]>([]);
  const [fournisseurs, setFournisseurs] = useState<EntiteRef[]>([]);
  const [filtreHistorique, setFiltreHistorique] = useState(false);

  const load = useCallback(async () => {
    setChargement(true);
    setError(null);
    const d = await getDocgenData();
    setGabarits(d.templates);
    setDocuments(d.documents);
    setClients(d.clients);
    setFournisseurs(d.fournisseurs);
    setError(d.error);
    setChargement(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // Recharge après chaque écriture réussie déclenchée par un bouton de la page.
  useRechargementDonnees(load);

  const visibles = filtreHistorique ? documents : documents.slice(0, 8);
  const enAttente = documents.filter((d) => d.statut === "a_valider").length;
  const totalMontant = documents.reduce((s, d) => s + (d.montant ?? 0), 0);

  const actifs = gabarits.filter((g) => g.actif);

  const actions: ActionPage[] = [
    {
      libelle: "Historique complet",
      variante: "fantome",
      confirmation: "Afficher tous les documents produits, pas seulement les 8 récents ?",
      executer: async () => {
        setFiltreHistorique(true);
        return { ok: true, message: `${documents.length} document(s) affiché(s).` };
      },
    },
    {
      libelle: "Générer un document",
      champs: [
        {
          cle: "template_id",
          label: "Gabarit",
          type: "select",
          requis: true,
          hint: actifs.length ? undefined : "Aucun gabarit actif : créez-en un d'abord.",
          options: actifs.map((g) => ({ valeur: g.id, libelle: `${g.nom} (${g.type})` })),
        },
        {
          cle: "client_id",
          label: "Client",
          type: "select",
          colonne: "demi",
          options: clients.map((c) => ({ valeur: c.id, libelle: c.nom })),
        },
        {
          cle: "fournisseur_id",
          label: "Fournisseur",
          type: "select",
          colonne: "demi",
          options: fournisseurs.map((f) => ({ valeur: f.id, libelle: f.nom })),
        },
        { cle: "numero", label: "Numéro", type: "texte", colonne: "demi" },
        { cle: "montant", label: "Montant (€)", type: "nombre", colonne: "demi" },
        {
          cle: "objet",
          label: "Objet",
          type: "texte",
          hint: "Remplacé dans le corps du gabarit à la place de {{objet}}.",
        },
      ],
      executer: genererDocumentAction,
    },
    {
      libelle: "Importer modèle Word",
      variante: "fantome",
      confirmation:
        "Les modèles Elara sont des gabarits structurés (champs + corps), pas des .docx bruts. Créer le gabarit ?",
      champs: [
        { cle: "nom", label: "Nom du gabarit", type: "texte", requis: true },
        { cle: "type", label: "Type", type: "select", options: TYPES_GABARIT },
        { cle: "description", label: "Description", type: "texte" },
        {
          cle: "corps",
          label: "Corps du document",
          type: "textarea",
          hint: "Variables acceptées : {{numero}}, {{montant}}, {{objet}}, {{date}}.",
        },
        {
          cle: "champs",
          label: "Champs à faire saisir",
          type: "texte",
          hint: "Séparés par des virgules : numero, montant, objet, date.",
          defaut: "numero, montant, objet, date",
        },
      ],
      valeurs: { type: "generique", actif: "true" },
      executer: enregistrerTemplateAction,
    },
    {
      libelle: "Exporter CSV",
      variante: "fantome",
      executer: async () => ({ ok: true, message: "Export prêt." }),
    },
  ];

  return (
    <motion.section
      className="view"
      id="v-docgen"
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
            <span>Production documentaire</span>
          </div>
          <h1 className="page-title">Génération de documents</h1>
          <p className="page-sub">
            Vos gabarits, les documents qu&apos;ils ont produits et leur cycle de validation.
          </p>
        </div>
        <BarreActions
          actions={[
            actions[0],
            actions[1],
            actions[2],
            {
              libelle: actions[3].libelle,
              variante: "fantome",
              naviguer: "#v-docgen-export",
            },
          ]}
        />
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.25)",
            color: "var(--red)",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          Impossible de charger toutes les données — {error}
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: "16px" }}>
        {[
          { label: "Documents produits", valeur: chargement ? "…" : String(documents.length), sub: `${actifs.length} gabarit(s) actif(s)` },
          { label: "À valider", valeur: chargement ? "…" : String(enAttente), sub: "Validation humaine requise" },
          { label: "Montant cumulé", valeur: chargement ? "…" : montantFr(totalMontant), sub: "Tous documents confondus" },
          { label: "Gabarits enregistrés", valeur: chargement ? "…" : String(gabarits.length), sub: `${actifs.length} actif(s)` },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-value">{s.valeur}</div>
            <div className="kpi-delta flat">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid g2" style={{ marginBottom: "16px" }}>
        <div className="card">
          <div className="section-title">
            {filtreHistorique ? "Historique complet" : "Documents récents"}
          </div>
          <div className="section-sub">
            {filtreHistorique
              ? "Tous les documents produits par vos gabarits"
              : "8 derniers documents — « Historique complet » pour tout voir"}
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Destinataire</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chargement ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>
                    Chargement…
                  </td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>
                    Aucun document. Créez un gabarit puis cliquez sur « Générer un document ».
                  </td>
                </tr>
              ) : (
                visibles.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="name-cell">{d.numero}</div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-faint)" }}>
                        {d.type} · {formaterDate(d.created_at)}
                      </div>
                    </td>
                    <td style={{ fontSize: "12.5px" }}>{d.destinataire ?? "—"}</td>
                    <td className="mono" style={{ fontSize: "12.5px" }}>
                      {montantFr(d.montant)}
                    </td>
                    <td>
                      <span className={`pill ${classeStatut(d.statut)}`}>
                        {LIBELLES_STATUT[d.statut] ?? d.statut}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <a className="btn btn-ghost" href={`/api/docgen/documents/${d.id}/telecharger`}>
                          Télécharger
                        </a>
                        {d.statut === "a_valider" ? (
                          <BoutonLigne
                            libelle="Valider"
                            action={{
                              valeurs: { id: d.id, statut: "valide" },
                              executer: changerStatutDocumentAction,
                            }}
                          />
                        ) : null}
                        {d.statut !== "archive" ? (
                          <BoutonLigne
                            libelle="Archiver"
                            action={{
                              valeurs: { id: d.id, statut: "archive" },
                              confirmation: `Archiver ${d.numero} ? Le statut ne pourra plus revenir en validation.`,
                              executer: changerStatutDocumentAction,
                            }}
                          />
                        ) : null}
                        <BoutonLigne
                          libelle="Supprimer"
                          action={{
                            valeurs: { id: d.id },
                            confirmation: `Supprimer définitivement ${d.numero} ?`,
                            executer: supprimerDocumentAction,
                          }}
                        />
                      </div>
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
            Comment ça marche
          </div>
          <div className="section-title" style={{ marginBottom: "14px" }}>
            Du gabarit au document signé
          </div>
          <div className="list-row">
            <span className="pill" style={{ background: "var(--indigo)18", color: "var(--indigo)", marginRight: "12px" }}>1</span>
            <span style={{ flex: 1, fontSize: "13px" }}>
              Vous créez un gabarit une fois : le corps du texte et les variables attendues.
            </span>
          </div>
          <div className="list-row">
            <span className="pill" style={{ background: "var(--indigo)18", color: "var(--indigo)", marginRight: "12px" }}>2</span>
            <span style={{ flex: 1, fontSize: "13px" }}>
              À chaque production, Elara reprend le numéro, le montant et le destinataire réels de
              l&apos;entreprise, puis archive le .docx dans la GED.
            </span>
          </div>
          <div className="list-row">
            <span className="pill" style={{ background: "var(--indigo)18", color: "var(--indigo)", marginRight: "12px" }}>3</span>
            <span style={{ flex: 1, fontSize: "13px" }}>
              Le document part en « à valider » : personne ne l&apos;envoie sans validation humaine.
            </span>
          </div>
        </div>
      </div>

      <div className="card" id="v-docgen-export">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
          <div>
            <div className="section-title">Gabarits</div>
            <div className="section-sub">
              Emplacement unique de mise à jour — tout changement s&apos;applique aux prochaines générations.
            </div>
          </div>
          <BoutonExport
            libelle="Exporter CSV"
            nomFichier="elara-documents.csv"
            colonnes={[
              { cle: "numero", label: "Numéro" },
              { cle: "destinataire", label: "Destinataire" },
              { cle: "type", label: "Type" },
              { cle: "montant", label: "Montant" },
              { cle: "statut", label: "Statut" },
              { cle: "gabarit", label: "Gabarit" },
              { cle: "date", label: "Date" },
            ]}
            lignes={visibles.map((d) => ({
              numero: d.numero,
              destinataire: d.destinataire ?? "",
              type: d.type,
              montant: d.montant ?? "",
              statut: LIBELLES_STATUT[d.statut] ?? d.statut,
              gabarit: d.template?.nom ?? "",
              date: d.created_at,
            }))}
          />
        </div>

        <table className="tbl" style={{ marginTop: "8px" }}>
          <thead>
            <tr>
              <th>Gabarit</th>
              <th>Type</th>
              <th>Champs</th>
              <th>Documents</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {chargement ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>
                  Chargement…
                </td>
              </tr>
            ) : gabarits.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>
                  Aucun gabarit. Utilisez « Importer modèle Word » pour créer le premier.
                </td>
              </tr>
            ) : (
              gabarits.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div className="name-cell">{g.nom}</div>
                    {g.description ? (
                      <div style={{ fontSize: "11.5px", color: "var(--text-faint)" }}>{g.description}</div>
                    ) : null}
                  </td>
                  <td style={{ fontSize: "12.5px" }}>{g.type}</td>
                  <td style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                    {g.champs?.length ? g.champs.map((c) => c.label || c.cle).join(", ") : "—"}
                  </td>
                  <td className="mono" style={{ fontSize: "12.5px" }}>
                    {g._count?.documents_generes ?? 0}
                  </td>
                  <td>
                    <span className={`pill ${g.actif ? "pill-success" : "pill-neutral"}`}>
                      {g.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td>
                    <BoutonLigne
                      libelle="Supprimer"
                      action={{
                        valeurs: { id: g.id },
                        confirmation: `Supprimer le gabarit « ${g.nom} » ? Les documents déjà produits sont conservés.`,
                        executer: supprimerTemplateAction,
                      }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}
