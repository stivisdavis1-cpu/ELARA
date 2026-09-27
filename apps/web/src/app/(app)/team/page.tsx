"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { UserPlus, Download, Pencil, Trash2 } from "lucide-react";
import { getRhData, type Employe, type ResumeRh } from "@/lib/ged-api";
import { BarreActions, BoutonLigne, BoutonExport, HoteNotifications, useRechargementDonnees } from "@/components/page-actions";
import { enregistrerEmployeAction, modifierEmployeAction, supprimerEmployeAction } from "@/lib/actions";

const TYPES_CONTRAT = [
  { cle: "CDI", libelle: "CDI" },
  { cle: "CDD", libelle: "CDD" },
  { cle: "alternance", libelle: "Alternance" },
  { cle: "stage", libelle: "Stage" },
  { cle: "consultant", libelle: "Consultant" },
];

const STATUTS = [
  { valeur: "actif", libelle: "Actif" },
  { valeur: "conge", libelle: "En congé" },
  { valeur: "sorti", libelle: "Parti" },
];

/** Champs du formulaire d'un employé — partagés entre création et édition. */
const CHAMPS_EMPLOYE = (e?: Employe) => [
  { cle: "nom", label: "Nom et prénom", type: "texte" as const, requis: true, colonne: "demi" as const, defaut: e?.nom ?? "" },
  { cle: "email", label: "E-mail professionnel", type: "email" as const, colonne: "demi" as const, defaut: e?.email ?? "" },
  { cle: "fonction", label: "Fonction", type: "texte" as const, colonne: "demi" as const, defaut: e?.fonction ?? "" },
  { cle: "departement", label: "Département", type: "texte" as const, colonne: "demi" as const, defaut: e?.departement ?? "" },
  { cle: "type_contrat", label: "Type de contrat", type: "select" as const, colonne: "demi" as const, options: TYPES_CONTRAT.map((t) => ({ valeur: t.cle, libelle: t.libelle })), defaut: e?.type_contrat ?? "CDI" },
  { cle: "salaire_base", label: "Salaire de base (annuel, €)", type: "nombre" as const, colonne: "demi" as const, defaut: e?.salaire_base ?? "" },
  { cle: "date_embauche", label: "Date d'entrée", type: "date" as const, colonne: "demi" as const, defaut: e?.date_embauche ?? "" },
  { cle: "telephone", label: "Téléphone", type: "texte" as const, colonne: "demi" as const, defaut: e?.telephone ?? "" },
  {
    cle: "statut",
    label: "Statut",
    type: "select" as const,
    colonne: "demi" as const,
    options: STATUTS,
    defaut: e?.statut ?? "actif",
    hint: "« En congé » et « parti » sortent l'intéressé de l'effectif actif, mais pas de l'historique.",
  },
];

function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function anciennete(d: string | null): string {
  if (!d) return "—";
  const embauche = new Date(d);
  if (Number.isNaN(embauche.getTime())) return "—";
  const mois = Math.max(0, Math.floor((Date.now() - embauche.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  if (mois < 12) return `${mois} mois`;
  const ans = Math.floor(mois / 12);
  const reste = mois % 12;
  return reste ? `${ans} an${ans > 1 ? "s" : ""} ${reste} mois` : `${ans} an${ans > 1 ? "s" : ""}`;
}

function euros(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function dateFR(d: string | null): string {
  if (!d) return "—";
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "—" : x.toLocaleDateString("fr-FR");
}

export default function TeamPage() {
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [resume, setResume] = useState<ResumeRh | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRhData();
      setEmployes(data.employes);
      setResume(data.resume);
      setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);
  useRechargementDonnees(charger);

  // Le résumé vient de l'API quand elle le calcule ; sinon on le déduit de
  // l'annuaire plutôt que d'afficher « — », ce qui ferait croire à une
  // absence de données alors que l'écran est simplement le seul à les compter.
  const repartition = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of employes) {
      const cle = e.departement?.trim() || "Non renseigné";
      map.set(cle, (map.get(cle) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [employes]);

  const effectif = resume?.effectif ?? employes.filter((e) => e.statut === "actif").length;
  const maxService = repartition[0]?.[1] ?? 1;

  return (
    <motion.section
      className="view"
      id="v-team"
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
            <span>Ressources humaines</span>
          </div>
          <h1 className="page-title">Employés</h1>
          <p className="page-sub">
            L&apos;annuaire de votre équipe — distinct des comptes de connexion à la plateforme
            (voir Utilisateurs &amp; rôles).
          </p>
        </div>
        <BarreActions
          actions={[
            {
              libelle: "Ajouter un employé",
              variante: "primaire",
              icone: <UserPlus className="w-3.5 h-3.5" />,
              champs: CHAMPS_EMPLOYE(),
              executer: (d) => enregistrerEmployeAction(d as Record<string, unknown>),
            },
            {
              libelle: "Exporter l'annuaire",
              variante: "fantome",
              icone: <Download className="w-3.5 h-3.5" />,
              naviguer: "#v-team-export",
            },
          ]}
        />
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: "16px" }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Employés actifs</div>
          <div className="kpi-value">{loading ? "…" : effectif}</div>
          <div className="kpi-delta flat">{loading ? "" : `${resume?.total ?? employes.length} fiches au total`}</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Services</div>
          <div className="kpi-value">{loading ? "…" : repartition.length}</div>
          <div className="kpi-delta flat">Départements distincts</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Ancienneté moyenne</div>
          <div className="kpi-value">
            {loading ? "…" : resume?.anciennete_moyenne_ans != null ? `${resume.anciennete_moyenne_ans.toFixed(1)} ans` : "—"}
          </div>
          <div className="kpi-delta flat">Sur les embauchés en cours</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Masse salariale</div>
          <div className="kpi-value" style={{ fontSize: 24 }}>{loading ? "…" : euros(resume?.masse_annuelle ?? null)}</div>
          <div className="kpi-delta flat">Coût annuel des contrats en cours</div>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="section-title">Annuaire</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Employé</th>
                <th>Fonction</th>
                <th>Service</th>
                <th>Entrée</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Chargement…</td></tr>
              ) : employes.length === 0 ? (
                <tr><td colSpan={6} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Aucun employé enregistré — utilisez « Ajouter un employé ».</td></tr>
              ) : (
                employes.map((e) => (
                  <tr key={e.id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="tag-icon" style={{ width: "30px", height: "30px", background: "var(--teal-bg)", color: "var(--teal-deep)", fontSize: "11px", fontWeight: 700 }}>
                          {initiales(e.nom)}
                        </div>
                        <div>
                          <div className="name-cell">{e.nom}</div>
                          <div style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>{e.email || e.telephone || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: "12.5px" }}>{e.fonction || "—"}</td>
                    <td style={{ fontSize: "12.5px" }}>{e.departement || "—"}</td>
                    <td style={{ fontSize: "12.5px" }} title={`Ancienneté : ${anciennete(e.date_embauche)}`}>{dateFR(e.date_embauche)}</td>
                    <td>
                      <span className={`pill ${e.statut === "actif" ? "pill-success" : e.statut === "conge" ? "pill-warning" : "pill-neutral"}`}>
                        {STATUTS.find((s) => s.valeur === e.statut)?.libelle ?? e.statut}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <BoutonLigne
                          libelle=""
                          action={{
                            variante: "fantome",
                            icone: <Pencil className="w-3.5 h-3.5" />,
                            champs: CHAMPS_EMPLOYE(e),
                            executer: (d) => modifierEmployeAction({ ...(d as Record<string, unknown>), id: e.id }),
                          }}
                        />
                        <BoutonLigne
                          libelle=""
                          action={{
                            variante: "fantome",
                            icone: <Trash2 className="w-3.5 h-3.5" />,
                            confirmation: `Supprimer la fiche de ${e.nom} ? L'historique de ses affectations est conservé.`,
                            executer: async () => {
                              const r = await supprimerEmployeAction({ id: e.id });
                              if (r.ok) setEmployes((liste) => liste.filter((x) => x.id !== e.id));
                              return r;
                            },
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

        <div>
          <div className="card" style={{ marginBottom: "16px" }}>
            <div className="section-title">Répartition par service</div>
            {repartition.length === 0 ? (
              <div style={{ padding: "22px 2px", color: "var(--text-faint)", fontSize: "13px" }}>
                Aucune donnée — la répartition apparaîtra après création de l&apos;annuaire.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {repartition.map(([service, n]) => (
                  <div key={service}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: 4 }}>
                      <span>{service}</span>
                      <span style={{ color: "var(--text-dim)" }}>{n}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 4, background: "var(--line)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round((n / maxService) * 100)}%`, background: "linear-gradient(90deg, var(--teal-deep), var(--teal))" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              {repartition.length > 1
                ? `Le service « ${repartition[0][0]} » concentre ${repartition[0][1]} personne${repartition[0][1] > 1 ? "s" : ""} sur ${effectif || repartition.reduce((s, [, n]) => s + n, 0)}.`
                : "Les analyses de charge par service apparaîtront une fois l'annuaire alimenté."}
            </div>
          </div>
        </div>
      </div>

      <div id="v-team-export" className="card" style={{ marginTop: 16 }}>
        <BoutonExport
          libelle="Exporter l'annuaire en CSV"
          nomFichier="annuaire-employes.csv"
          colonnes={[
            { cle: "nom", label: "Nom" },
            { cle: "email", label: "E-mail" },
            { cle: "telephone", label: "Téléphone" },
            { cle: "fonction", label: "Fonction" },
            { cle: "departement", label: "Département" },
            { cle: "type_contrat", label: "Contrat" },
            { cle: "salaire_base", label: "Salaire de base" },
            { cle: "date_embauche", label: "Entrée" },
            { cle: "statut", label: "Statut" },
          ]}
          lignes={employes as unknown as Record<string, unknown>[]}
        />
      </div>
    </motion.section>
  );
}
