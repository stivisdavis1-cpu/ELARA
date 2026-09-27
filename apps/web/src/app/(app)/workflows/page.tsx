"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Plus,
  Trash2,
  Pencil,
  Zap,
  Pause,
  Download,
  RefreshCw,
} from "lucide-react";
import { formatCFA, toNum } from "@/lib/utils";
import { getWorkflowsComplet, getWorkflowsData, type Workflow, type ExecutionWorkflow, type BalanceAgee, type DepenseLigne, type PaiementLigne } from "@/lib/ged-api";
import { BarreActions, BoutonLigne, BoutonExport, HoteNotifications, useRechargementDonnees } from "@/components/page-actions";
import {
  enregistrerWorkflowAction,
  modifierWorkflowAction,
  supprimerWorkflowAction,
  executerWorkflowAction,
  executerTousWorkflowsAction,
} from "@/lib/actions";

/**
 * Un candidat détecté dans les données réelles, avec la définition de workflow
 * qui lui correspond. On ne se contente pas de nommer le cas : l'action
 * « Activer » doit pouvoir créer un workflow que le moteur saura réellement
 * exécuter, avec les champs de contexte que le backend expose vraiment.
 */
interface Candidat {
  id: string;
  nom: string;
  declencheur: string;
  condition: string;
  action: string;
  volume: number;
  unite: string;
  evenement: string;
  conditions: Workflow["conditions"];
  actions: Workflow["actions"];
  /** mots-clés reconnus dans une description libre */
  motsCles: string[];
}

function statutWorkflow(w: Workflow) {
  if (w.actif) return <span className="pill pill-success">Actif</span>;
  return <span className="pill pill-neutral">Inactif</span>;
}

function resumeAction(a: { type: string; [cle: string]: unknown }): string {
  switch (a.type) {
    case "creer_validation":
      return "Ouvre une validation à valider";
    case "webhook":
      return `Diffuse vers ${a.evenement ?? "les connecteurs"}`;
    case "generer_document":
      return "Génère un document depuis un gabarit";
    case "marquer_statut":
      return `Marque en « ${a.statut ?? "—"} »`;
    default:
      return a.type;
  }
}

export default function WorkflowsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<BalanceAgee | null>(null);
  const [depenses, setDepenses] = useState<DepenseLigne[]>([]);
  const [paiements, setPaiements] = useState<PaiementLigne[]>([]);
  const [description, setDescription] = useState("");
  const [generation, setGeneration] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<ExecutionWorkflow[]>([]);
  const [catalogue, setCatalogue] = useState<Record<string, string[]> | null>(null);
  const [evenements, setEvenements] = useState<{ cle: string; libelle: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [d, base] = await Promise.all([getWorkflowsComplet(), getWorkflowsData()]);
    setWorkflows(d.workflows);
    setExecutions(d.executions);
    setCatalogue(d.catalogue?.types ?? null);
    setEvenements(d.catalogue?.evenements ?? []);
    setBalance(base.balance);
    setDepenses(base.depenses);
    setPaiements(base.paiements);
    setError(d.error ?? base.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);
  useRechargementDonnees(load);

  const retards = (balance?.details ?? []).filter((d) => d.retard_jours > 0);
  const grosRetards = retards.filter((d) => d.retard_jours > 30);
  const sansFacture = paiements.filter((p) => !p.facture);
  const montantMoyenDepense = depenses.length
    ? depenses.reduce((acc, d) => acc + toNum(d.montant), 0) / depenses.length
    : 0;
  const depensesAnormales = depenses.filter((d) => toNum(d.montant) > montantMoyenDepense * 1.4);
  const docsRisque = useMemo(() => workflows.filter((w) => w.evenement === "document_a_risque").length, [workflows]);

  const candidats: Candidat[] = [];
  if (grosRetards.length > 0) {
    candidats.push({
      id: "relance",
      nom: "Relance automatique des factures en retard",
      declencheur: "Facture non réglée",
      condition: `Retard > 30 j (${grosRetards.length} facture(s) concernée(s))`,
      action: "Prépare une relance et notifie le comptable",
      volume: grosRetards.length,
      unite: "facture(s)",
      evenement: "facture_impayee",
      conditions: [{ champ: "retard_jours", operateur: ">", valeur: 30 }],
      actions: [
        { type: "creer_validation", message: "Relance à valider avant envoi au client." },
        { type: "webhook", evenement: "relance_facture" },
      ],
      motsCles: ["relance", "relancer", "impay", "retard", "recouvr", "facture"],
    });
  }
  if (retards.length > grosRetards.length) {
    candidats.push({
      id: "relance-court",
      nom: "Relance douce avant escalade",
      declencheur: "Facture non réglée",
      condition: `Retard entre 1 et 30 j (${retards.length - grosRetards.length} facture(s))`,
      action: "Signale la facture au tableau de bord commercial",
      volume: retards.length - grosRetards.length,
      unite: "facture(s)",
      evenement: "facture_impayee",
      conditions: [
        { champ: "retard_jours", operateur: ">", valeur: 0 },
        { champ: "retard_jours", operateur: "<=", valeur: 30 },
      ],
      actions: [{ type: "webhook", evenement: "signal_Commercial" }],
      motsCles: ["doux", "douce", "escalade", "commercial", "signal"],
    });
  }
  if (depensesAnormales.length > 0) {
    candidats.push({
      id: "depense",
      nom: "Alerte dépense anormale",
      declencheur: "Nouvelle dépense enregistrée",
      condition: `Montant > 1,4 × la moyenne (${formatCFA(Math.round(montantMoyenDepense))})`,
      action: "Crée une anomalie et notifie le Directeur Financier Virtuel",
      volume: depensesAnormales.length,
      unite: "dépense(s)",
      evenement: "tous",
      conditions: [{ champ: "montant_total", operateur: ">", valeur: Math.round(montantMoyenDepense * 1.4) }],
      actions: [{ type: "creer_validation", message: "Dépense nettement supérieure à la moyenne — à valider." }],
      motsCles: ["depense", "dépense", "anormal", "moyenne", "alerte", "surcout"],
    });
  }
  if (sansFacture.length > 0) {
    candidats.push({
      id: "rapprochement",
      nom: "Rapprochement des paiements Mobile Money",
      declencheur: "Paiement enregistré",
      condition: `Aucune facture liée (${sansFacture.length} paiement(s))`,
      action: "Propose une facture candidate à l'opérateur",
      volume: sansFacture.length,
      unite: "paiement(s)",
      evenement: "paiement_non_lie",
      conditions: [{ champ: "age_paiement_jours", operateur: ">", valeur: 7 }],
      actions: [{ type: "creer_validation", message: "Paiement sans facture rattachée — rapprochement à confirmer." }],
      motsCles: ["rapproch", "paiement", "mobile", "money", "momo", "non lie", "non lié", "facture"],
    });
  }

  const WorkflowsEnregistres = workflows.length;
  const actifs = workflows.filter((w) => w.actif).length;
  const totalExec = workflows.reduce((s, w) => s + (w._count?.executions ?? 0), 0);

  const kpis = [
    { label: "Workflows enregistrés", valeur: loading ? "…" : String(WorkflowsEnregistres), sub: `${actifs} actif(s)` },
    { label: "Factures en retard", valeur: loading ? "…" : String(retards.length), sub: `${formatCFA(retards.reduce((a, d) => a + toNum(d.montant), 0))} à recouvrer` },
    { label: "Paiements à rapprocher", valeur: loading ? "…" : String(sansFacture.length), sub: `${paiements.length} paiement(s) au total` },
    { label: "Candidats détectés", valeur: loading ? "…" : String(candidats.length), sub: `${docsRisque} workflow(s) document(s)` },
  ];

  /**
   * Une description libre n'est pas un workflow. On la rapproche des candidats
   * réellement détectés : si elle en désigne un, on crée sa définition
   * (déclencheur, conditions, actions) et on l'active. Sinon on crée un
   * brouillon inactif rattaché au premier événement du catalogue, en disant
   * qu'il reste à configurer — plutôt que d'enregistrer une automate vide
   * qui ne se déclencherait jamais.
   */
  const generer = async () => {
    const texte = description.trim().toLowerCase();
    if (!texte) {
      setGeneration("Décrivez d'abord le processus à automatiser.");
      return;
    }
    const correspond = candidats.find((c) => c.motsCles.some((m) => texte.includes(m)));
    const evenement = correspond?.evenement ?? evenements[0]?.cle ?? "tous";
    const nom = correspond?.nom ?? description.trim().slice(0, 80);
    const r = await enregistrerWorkflowAction({
      nom,
      description: correspond
        ? `Créé depuis « ${description.trim()} » — correspond au candidat « ${correspond.nom} ».`
        : `Brouillon créé depuis « ${description.trim()} ». À configurer.`,
      declencheur: correspond?.declencheur ?? evenements.find((e) => e.cle === evenement)?.libelle ?? evenement,
      evenement,
      conditions: JSON.stringify(correspond?.conditions ?? []),
      actions: JSON.stringify(correspond?.actions ?? [{ type: "creer_validation", message: "Brouillon à configurer." }]),
      actif: Boolean(correspond),
    });
    if (r.ok) {
      setDescription("");
      setGeneration(
        correspond
          ? `Workflow « ${nom} » créé et activé. Il s'exécutera au prochain passage du moteur.`
          : `Brouillon « ${nom} » créé, inactif : aucun candidat ne correspondait à votre description. Configurez ses conditions dans l'éditeur avant de l'activer.`,
      );
      await load();
    } else {
      setGeneration(r.message);
    }
  };

  return (
    <motion.section
      className="view"
      id="v-workflows"
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
            <span>Automatisation</span>
          </div>
          <h1 className="page-title">Concepteur de workflows</h1>
          <p className="page-sub">
            Les situations que vos données font ressortir — et qui peuvent être automatisées.
          </p>
        </div>
        <BarreActions
          actions={[
            {
              libelle: "Exécuter tous les workflows",
              variante: "fantome",
              icone: <Play className="w-3.5 h-3.5" />,
              confirmation: "Déclencher maintenant tous les workflows actifs ?",
              executer: async () => {
                const r = await executerTousWorkflowsAction({});
                if (r.ok) await load();
                return r;
              },
            },
            {
              libelle: "Nouveau workflow",
              variante: "primaire",
              icone: <Plus className="w-3.5 h-3.5" />,
              champs: [
                { cle: "nom", label: "Nom du workflow", type: "texte", requis: true, colonne: "pleine" },
                { cle: "description", label: "Description", type: "textarea", colonne: "pleine" },
                {
                  cle: "evenement",
                  label: "Événement déclencheur",
                  type: "select",
                  requis: true,
                  colonne: "demi",
                  defaut: "tous",
                  options: (evenements.length ? evenements : [{ cle: "tous", libelle: "Toutes les cibles" }]).map((e) => ({ valeur: e.cle, libelle: e.libelle })),
                },
                {
                  cle: "declencheur",
                  label: "Libellé du déclencheur",
                  type: "texte",
                  colonne: "demi",
                  hint: "Texte affiché dans l'éditeur pour expliquer quand le workflow part.",
                },
                {
                  cle: "actif",
                  label: "Activer immédiatement",
                  type: "checkbox",
                  colonne: "pleine",
                  defaut: true,
                },
              ],
              executer: (d) => enregistrerWorkflowAction(d),
            },
            {
              libelle: "Exporter l'historique",
              variante: "fantome",
              icone: <Download className="w-3.5 h-3.5" />,
              naviguer: "#v-workflows-export",
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
        {kpis.map((k) => (
          <div key={k.label} className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.valeur}</div>
            <div className="kpi-delta flat">{k.sub}</div>
          </div>
        ))}
      </div>

      {WorkflowsEnregistres > 0 ? (
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="section-title">Workflows enregistrés</div>
          <div className="section-sub">
            {totalExec} exécution(s) au total — chaque workflow propose une validation, jamais une action directe
          </div>
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Déclencheur</th>
                <th>Actions</th>
                <th>Exécutions</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {workflows.map((w) => (
                <tr key={w.id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                  <td>
                    <div className="name-cell">{w.nom}</div>
                    {w.description ? (
                      <div style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>{w.description}</div>
                    ) : null}
                    {w.conditions?.length ? (
                      <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {w.conditions.map((c, i) => (
                          <span key={i} className="pill pill-neutral" style={{ fontSize: 10.5 }}>
                            {c.champ} {c.operateur} {String(c.valeur)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ fontSize: "12.5px" }}>
                    {w.declencheur}
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                      sur « {evenements.find((e) => e.cle === w.evenement)?.libelle ?? w.evenement ?? "—"} »
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {w.actions?.length ? w.actions.map((a, i) => (
                        <span key={i} style={{ fontSize: 11.5, color: "var(--text-dim)" }}>• {resumeAction(a)}</span>
                      )) : <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>aucune</span>}
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: "12px" }}>{w._count?.executions ?? 0}</td>
                  <td>{statutWorkflow(w)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <BoutonLigne
                        libelle=""
                        action={{
                          variante: "fantome",
                          icone: <Play className="w-3.5 h-3.5" />,
                          confirmation: `Exécuter « ${w.nom} » maintenant ?`,
                          executer: async () => {
                            const r = await executerWorkflowAction({ id: w.id });
                            if (r.ok) await load();
                            return r;
                          },
                        }}
                      />
                      <BoutonLigne
                        libelle=""
                        action={{
                          variante: "fantome",
                          icone: w.actif ? <Pause className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />,
                          executer: async () => {
                            const r = await modifierWorkflowAction({ id: w.id, actif: !w.actif });
                            if (r.ok) await load();
                            return r;
                          },
                        }}
                      />
                      <BoutonLigne
                        libelle=""
                        action={{
                          variante: "fantome",
                          icone: <Pencil className="w-3.5 h-3.5" />,
                          champs: [
                            { cle: "nom", label: "Nom", type: "texte", requis: true, colonne: "pleine", defaut: w.nom },
                            { cle: "description", label: "Description", type: "textarea", colonne: "pleine", defaut: w.description ?? "" },
                            {
                              cle: "evenement",
                              label: "Événement",
                              type: "select",
                              colonne: "demi",
                              defaut: w.evenement ?? "tous",
                              options: (evenements.length ? evenements : [{ cle: "tous", libelle: "Toutes les cibles" }]).map((e) => ({ valeur: e.cle, libelle: e.libelle })),
                            },
                            { cle: "declencheur", label: "Déclencheur", type: "texte", colonne: "demi", defaut: w.declencheur },
                          ],
                          executer: (d) => modifierWorkflowAction({ ...(d as Record<string, unknown>), id: w.id }),
                        }}
                      />
                      <BoutonLigne
                        libelle=""
                        action={{
                          variante: "fantome",
                          icone: <Trash2 className="w-3.5 h-3.5" />,
                          confirmation: `Supprimer « ${w.nom} » ? Son historique d'exécution sera conservé.`,
                          executer: async () => {
                            const r = await supprimerWorkflowAction({ id: w.id });
                            if (r.ok) setWorkflows((liste) => liste.filter((x) => x.id !== w.id));
                            return r;
                          },
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="section-title">Décrire un nouveau workflow</div>
        <div className="section-sub">
          Exemple : « Quand une facture dépasse 30 jours de retard, envoie une relance et notifie le
          comptable »
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          <input
            className="field"
            placeholder="Décrivez le processus à automatiser…"
            style={{ flex: 1 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void generer(); }}
          />
          <button className="btn btn-primary teal" onClick={() => void generer()} disabled={loading}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
              <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
              <path d="M4 21l7-7" strokeLinecap="round"></path>
            </svg>
            Générer le workflow
          </button>
        </div>
        {generation ? (
          <div style={{ fontSize: "12.5px", color: "var(--text-dim)", marginTop: "10px" }}>{generation}</div>
        ) : null}
      </div>

      <div className="section-title" style={{ marginBottom: "12px" }}>
        Candidats détectés sur vos données
      </div>

      {loading ? (
        <div className="card">
          <div style={{ padding: "18px 2px", color: "var(--text-faint)", fontSize: "13px" }}>Chargement…</div>
        </div>
      ) : candidats.length === 0 ? (
        <div className="card">
          <div style={{ padding: "18px 2px", color: "var(--text-faint)", fontSize: "13px" }}>
            Aucun cas détecté : ni facture en retard, ni paiement sans facture liée, ni dépense
            au-dessus de la moyenne. Les candidats apparaîtront dès que vos factures, paiements et
            dépenses seront consolidés.
          </div>
        </div>
      ) : (
        candidats.map((c) => {
          const dejaCree = workflows.some((w) => w.nom === c.nom);
          return (
            <div key={c.id} className="card" style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "2px", fontFamily: "var(--font-heading)" }}>{c.nom}</div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
                    {c.volume} {c.unite} concernée(s) actuellement
                  </div>
                </div>
                <span className={`pill ${dejaCree ? "pill-success" : "pill-neutral"}`} style={{ flexShrink: 0 }}>
                  {dejaCree ? "Workflow créé" : "Candidat · non activé"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                <span className="pill pill-info">{c.declencheur}</span>
                <span style={{ color: "var(--text-faint)", fontSize: "13px" }}>→</span>
                <span className="pill pill-warning">{c.condition}</span>
                <span style={{ color: "var(--text-faint)", fontSize: "13px" }}>→</span>
                <span className="pill pill-success">{c.action}</span>
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <BoutonLigne
                  libelle={dejaCree ? "Créer à nouveau" : "Activer ce workflow"}
                  action={{
                    variante: dejaCree ? "fantome" : "primaire",
                    icone: <Zap className="w-3.5 h-3.5" />,
                    confirmation: `Créer et activer « ${c.nom} » ? Chaque cas détecté ouvrira une validation à votre accord — aucune relance ne partira sans vous.`,
                    executer: async () => {
                      const r = await enregistrerWorkflowAction({
                        nom: c.nom,
                        description: `Candidat détecté : ${c.volume} ${c.unite} concernée(s). ${c.action}.`,
                        declencheur: c.declencheur,
                        evenement: c.evenement,
                        conditions: JSON.stringify(c.conditions),
                        actions: JSON.stringify(c.actions),
                        actif: true,
                      });
                      if (r.ok) await load();
                      return r;
                    },
                  }}
                />
              </div>
            </div>
          );
        })
      )}

      {executions.length > 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-title">Dernières exécutions</div>
          <div className="section-sub">Ce que le moteur a fait, et sur combien de cibles</div>
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Déclencheur</th>
                <th>Cibles examinées</th>
                <th>Retenues</th>
                <th>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {executions.slice(0, 12).map((e) => (
                <tr key={e.id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300">
                  <td style={{ fontSize: "12.5px" }}>{e.workflow?.nom ?? e.workflow_id?.slice(0, 8) ?? "—"}</td>
                  <td style={{ fontSize: "12px", color: "var(--text-dim)" }}>{e.declencheur ?? "—"}</td>
                  <td className="mono" style={{ fontSize: "12px" }}>{e.resultat?.cibles_examinees ?? "—"}</td>
                  <td className="mono" style={{ fontSize: "12px" }}>{e.resultat?.retenues ?? "—"}</td>
                  <td>
                    <span className={`pill ${e.statut === "succes" ? "pill-success" : e.statut === "echec" ? "pill-danger" : "pill-neutral"}`}>
                      {e.statut}
                    </span>
                    {e.erreur ? <div style={{ fontSize: 11, color: "var(--red)", marginTop: 3 }}>{e.erreur}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div id="v-workflows-export" className="card" style={{ marginTop: 16 }}>
        <BoutonExport
          libelle="Exporter les exécutions en CSV"
          nomFichier="executions-workflows.csv"
          colonnes={[
            { cle: "workflow", label: "Workflow" },
            { cle: "declencheur", label: "Déclencheur" },
            { cle: "statut", label: "Statut" },
            { cle: "examinees", label: "Cibles examinées" },
            { cle: "retenues", label: "Cibles retenues" },
            { cle: "erreur", label: "Erreur" },
          ]}
          lignes={executions.map((e) => ({
            workflow: e.workflow?.nom ?? e.workflow_id,
            declencheur: e.declencheur,
            statut: e.statut,
            examinees: e.resultat?.cibles_examinees ?? "",
            retenues: e.resultat?.retenues ?? "",
            erreur: e.erreur ?? "",
          })) as unknown as Record<string, unknown>[]}
        />
      </div>

      <div className="ai-card" style={{ marginTop: 16 }}>
        <div className="ai-badge">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
            <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
            <path d="M4 21l7-7" strokeLinecap="round"></path>
          </svg>
          Suggestion Elara
        </div>
        {grosRetards.length > 0 ? (
          <div className="list-row">
            <span className="pill" style={{ background: "var(--indigo)18", color: "var(--indigo)", marginRight: "12px" }}>Priorité</span>
            <span style={{ flex: 1, fontSize: "13px" }}>
              {grosRetards.length} facture(s) de plus de 30 jours de retard
              ({formatCFA(grosRetards.reduce((a, d) => a + toNum(d.montant), 0))}) — un workflow de
              relance automatique est le premier levier.
            </span>
          </div>
        ) : (
          <div className="list-row">
            <span className="pill" style={{ background: "var(--green)18", color: "var(--green)", marginRight: "12px" }}>OK</span>
            <span style={{ flex: 1, fontSize: "13px" }}>
              Aucune facture au-delà de 30 jours de retard — l&apos;automatisation de relance n&apos;est
              pas encore prioritaire.
            </span>
          </div>
        )}
      </div>
    </motion.section>
  );
}
