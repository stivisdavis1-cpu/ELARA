"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { formatCFA, toNum } from "@/lib/utils";
import { getDashboardData } from "@/lib/ged-api";
import type { CfoSynthese, CfoRunway, BalanceAgee, CfoBfr, FactureLigne } from "@/lib/ged-api";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface Fin {
  synthese?: CfoSynthese;
  runway?: CfoRunway;
  balance?: BalanceAgee;
  bfr?: CfoBfr;
  factures?: FactureLigne[];
}

function buildInsight(fin: Fin | null): string {
  if (!fin) return "Chargement de l'analyse...";
  const enc = toNum(fin.synthese?.encaissements_totaux);
  const sort = toNum(fin.synthese?.sorties_totales);
  const solde = toNum(fin.synthese?.solde_theorique);
  const arriere =
    toNum(fin.balance?.["0_30j"]) +
    toNum(fin.balance?.["31_60j"]) +
    toNum(fin.balance?.["61_90j"]) +
    toNum(fin.balance?.["90j_plus"]);
  const nFactures = (fin.factures ?? []).length;

  if (enc === 0 && sort === 0 && arriere === 0 && nFactures === 0) {
    return "Aucune donnée en base pour l'instant. Scannez vos documents (factures, relevés, bons de commande) : les indicateurs et l'analyse se mettront à jour automatiquement.";
  }
  const rw = fin.runway?.runway_en_mois;
  if (solde < 0) {
    return `Trésorerie négative : ${formatCFA(solde)}. ${arriere > 0 ? `Balance âgée de ${formatCFA(arriere)} — relancez les clients en retard.` : "Réduisez les sorties ou accélérez les encaissements."}`;
  }
  return `Trésorerie ${formatCFA(solde)}, cash burn ${formatCFA(toNum(fin.runway?.cash_burn_mensuel_estime))}/mois → ${rw == null ? "survie illimitée" : `${rw} mois de survie`}. ${arriere > 0 ? `Recouvrez ${formatCFA(arriere)} de factures en retard pour renforcer le matelas de sécurité.` : ""}`;
}

export default function DashboardPage() {
  const [biAxe, setBiAxe] = useState("executive");
  const [biDim, setBiDim] = useState("mois");
  const [biPrompt, setBiPrompt] = useState("");
  const [biInsight, setBiInsight] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fin, setFin] = useState<Fin | null>(null);

  const load = useCallback(async () => {
    const d = await getDashboardData();
    const next: Fin = {};
    if (d.synthese) next.synthese = d.synthese;
    if (d.runway) next.runway = d.runway;
    if (d.balance) next.balance = d.balance;
    if (d.bfr) next.bfr = d.bfr;
    next.factures = d.factures;
    setFin(next);
    setError(d.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const enc = toNum(fin?.synthese?.encaissements_totaux);
  const sort = toNum(fin?.synthese?.sorties_totales);
  const solde = toNum(fin?.synthese?.solde_theorique);
  const barMax = Math.max(enc, sort, 1);
  const barH = (v: number) => Math.max(4, Math.round((v / barMax) * 100));
  const marge = enc > 0 ? Math.max(0, Math.min(100, Math.round(((enc - sort) / enc) * 100))) : 0;
  const runwayLabel = loading || !fin?.runway ? "—" : fin.runway.runway_en_mois == null ? "Illimité" : `${fin.runway.runway_en_mois} mois`;
  const arriere = toNum(fin?.balance?.["0_30j"]) + toNum(fin?.balance?.["31_60j"]) + toNum(fin?.balance?.["61_90j"]) + toNum(fin?.balance?.["90j_plus"]);

  const topClients = useMemo(() => {
    const map = new Map<string, { nom: string; total: number }>();
    (fin?.factures ?? []).forEach((f) => {
      if (!f.client?.id) return;
      const cur = map.get(f.client.id) ?? { nom: f.client.nom || "Client", total: 0 };
      cur.total += toNum(f.montant_total);
      map.set(f.client.id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [fin]);
  const maxClient = topClients[0]?.total || 1;

  const buckets = [
    { label: "< 30 j", value: toNum(fin?.balance?.["0_30j"]), cls: "seg-safe", color: "var(--teal)" },
    { label: "31-60 j", value: toNum(fin?.balance?.["31_60j"]), cls: "seg-warn", color: "var(--amber)" },
    { label: "61-90 j", value: toNum(fin?.balance?.["61_90j"]), cls: "seg-warn", color: "var(--amber)" },
    { label: "+ 90 j", value: toNum(fin?.balance?.["90j_plus"]), cls: "seg-risk", color: "var(--red)" },
  ];
  const bfrMax = Math.max(...buckets.map((b) => b.value), 1);

  const handleAskInsight = () => {
    if (!biPrompt.trim()) return;
    setBiInsight("Analyse en cours...");
    const base = buildInsight(fin);
    setTimeout(() => {
      setBiInsight(`Analyse exhaustive demandée. ${base} La requête « ${biPrompt} » sera traitée par l'assistant dès que l'historique sera suffisant.`);
      setBiPrompt("");
    }, 500);
  };

  const chartInsight = biInsight || buildInsight(loading ? null : fin);

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants}>
      <motion.div className="topbar" variants={itemVariants}>
        <div>
          <div className="eyebrow">Vue d’ensemble CFO</div>
          <h1 className="page-title">Tableau de bord financier</h1>
          <p className="page-sub">Bienvenue sur votre espace de pilotage stratégique — les indicateurs sont calculés en temps réel depuis vos documents et transactions.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary teal transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]" style={{ cursor: "pointer" }} onClick={() => { setLoading(true); setError(null); void load(); }} disabled={loading}>
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>
      </motion.div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Certains indicateurs n’ont pas pu être chargés — {error}
        </div>
      )}

      {/* Grid KPI Principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <motion.div className="card" variants={itemVariants}>
          <div className="kpi-label" title="Argent immédiatement disponible sur vos comptes">Trésorerie Actuelle (Liquidités)</div>
          <div className="kpi-value">{loading ? "…" : formatCFA(solde)}</div>
          <div className="kpi-delta">
            {loading ? "Calcul…" : enc === 0 && sort === 0 ? "En attente de transactions" : solde < 0 ? "Solde négatif" : "Solde positif"}
          </div>
        </motion.div>

        <motion.div className="ai-card span-2" variants={itemVariants}>
          <div className="ai-badge">
            <div className="pulse-dot"></div>
            Prédiction Runway (Algorithme)
          </div>
          <div className="ai-card-content">
            <div className="ai-card-metric">
              <div className="kpi-value">{loading ? "…" : runwayLabel}</div>
              <div className="kpi-label" style={{ marginTop: '8px', marginBottom: 0 }}>De survie sans revenus</div>
            </div>
            <div className="ai-card-desc">
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                {loading
                  ? "Calcul en cours…"
                  : toNum(fin?.runway?.cash_burn_mensuel_estime) > 0
                    ? `Base de calcul : dépenses moyennes de ${formatCFA(toNum(fin?.runway?.cash_burn_mensuel_estime))}/mois.`
                    : "Aucune dépense enregistrée — la survie est estimée illimitée tant que des sorties de trésorerie n'ont pas été consolidées."}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginTop: '24px' }}>
        <motion.div className="card" variants={itemVariants}>
          <div className="kpi-label">Balance Âgée (Sommes que vos clients vous doivent)</div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: "0 - 30 jours", note: "(Récent)", value: toNum(fin?.balance?.["0_30j"]), color: "var(--ink)" },
              { label: "31 - 60 jours", note: "(En retard)", value: toNum(fin?.balance?.["31_60j"]), color: "var(--amber)" },
              { label: "61 - 90 jours", note: "(En retard)", value: toNum(fin?.balance?.["61_90j"]), color: "var(--amber)" },
              { label: "+ 60 jours", note: "(Risque élevé)", value: toNum(fin?.balance?.["90j_plus"]), color: "var(--red)" },
            ].map((b) => (
              <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{b.label} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>{b.note}</span></span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: b.value > 0 ? b.color : "var(--text-faint)" }}>{loading ? "…" : formatCFA(b.value)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
              <span>Total en retard</span>
              <span>{loading ? "…" : formatCFA(arriere)}</span>
            </div>
          </div>
        </motion.div>

        <motion.div className="card" variants={itemVariants}>
          <div className="kpi-label">Besoin en Fonds de Roulement (BFR)</div>
          <div className="kpi-value" style={{ marginTop: '12px' }}>{loading ? "…" : formatCFA(toNum(fin?.bfr?.bfr))}</div>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '12px' }}>
            Le BFR représente l’argent bloqué au quotidien pour faire tourner votre activité.
            {!loading && toNum(fin?.bfr?.creances_clients) === 0 && toNum(fin?.bfr?.dettes_fournisseurs) === 0 && toNum(fin?.bfr?.valeur_stocks) === 0
              ? " Aucune transaction consolidée pour le moment : le BFR se calculera après l'intégration des factures, stocks et dettes."
              : ` Détail : créances ${formatCFA(toNum(fin?.bfr?.creances_clients))}, dettes fournisseurs ${formatCFA(toNum(fin?.bfr?.dettes_fournisseurs))}, stocks ${formatCFA(toNum(fin?.bfr?.valeur_stocks))}.`}
          </p>
        </motion.div>
      </div>

      {/* Module de Business Intelligence */}
      <motion.div variants={itemVariants} style={{ marginTop: '48px', paddingBottom: '48px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div className="eyebrow" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>Business Intelligence</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Analyse Exploratoire Intelligente</h2>
        </div>

        <div className="bi-tabs">
          <div className={`bi-tab ${biAxe === 'executive' ? 'active' : ''}`} onClick={() => setBiAxe('executive')}>Vue Exécutive</div>
          <div className={`bi-tab ${biAxe === 'sales' ? 'active' : ''}`} onClick={() => setBiAxe('sales')}>Analyse Commerciale</div>
          <div className={`bi-tab ${biAxe === 'bfr' ? 'active' : ''}`} onClick={() => setBiAxe('bfr')}>BFR & Risque Client</div>
        </div>

        <div className="bi-layout" style={{ gridTemplateColumns: biAxe === 'executive' ? '1fr 300px' : '260px 1fr 300px' }}>

          {biAxe !== 'executive' && (
            <div className="card bi-sidebar" style={{ padding: '24px' }}>
              <div className="bi-section-title">Paramétrage</div>
              <label style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Dimension de regroupement</label>
              <select className="bi-select" value={biDim} onChange={(e) => setBiDim(e.target.value)}>
                <option value="mois">Par Mois</option>
                <option value="trimestre">Par Trimestre</option>
                <option value="client">Top Clients</option>
              </select>
              <label style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Période</label>
              <select className="bi-select">
                <option>Année à date (YTD)</option>
                <option>12 derniers mois</option>
              </select>
              <p style={{ fontSize: '11.5px', color: 'var(--text-faint)', marginTop: '14px', lineHeight: 1.6 }}>
                Les séries temporelles (par mois/trimestre) deviennent disponibles dès que l’historique des transactions est consolidé.
              </p>
            </div>
          )}

          <div className="card bi-chart-area" style={{ padding: '24px' }}>

            {biAxe === 'executive' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Performance Globale & Répartition</div>
                </div>
                {loading ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Chargement des agrégats…</div>
                ) : (
                  <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                      {enc === 0 && sort === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-dim)', fontSize: '13.5px', textAlign: 'center', padding: '40px 0' }}>
                          Encaissements et dépenses consolidés dans vos documents apparaîtront ici.
                        </div>
                      ) : (
                        <div className="css-chart" style={{ flex: 1, borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px', height: '200px', minHeight: '200px', marginTop: 0, alignItems: 'flex-end', display: 'flex', gap: '16px' }}>
                          {[
                            { l: 'Encaissements', v: enc > 0 ? enc : 0, color: 'var(--teal)' },
                            { l: 'Dépenses', v: sort > 0 ? sort : 0, color: 'var(--amber)' },
                          ].map((val, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100%', flex: 1, justifyContent: 'center' }}>
                              <div className="css-bar-wrapper" style={{ width: '52px', position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                                <div className="css-bar-tooltip">{val.l}: {formatCFA(val.v)}</div>
                                <div className="css-bar" style={{ height: `${barH(val.v)}%`, background: val.color, width: '100%', borderRadius: '4px 4px 0 0', transition: 'all 0.3s ease' }}></div>
                                <div className="css-bar-label" style={{ position: 'absolute', bottom: '-24px', width: '100%', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>{val.l}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--teal)' }}></div> Encaissements</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--amber)' }}></div> Dépenses</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid var(--line-soft)', paddingLeft: '24px' }}>
                      <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(var(--teal) ${marge * 3.6}deg, var(--line-soft) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '18px', fontWeight: 800 }}>{marge}%</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Marge</span>
                        </div>
                      </div>
                      {enc === 0 && <span style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '10px' }}>Aucune donnée pour le calcul</span>}
                    </div>
                  </div>
                )}
              </>
            )}

            {biAxe === 'sales' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Top Clients & Évolution</div>
                </div>
                {loading ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Chargement des clients…</div>
                ) : topClients.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-dim)', fontSize: '13.5px', textAlign: 'center' }}>
                    Aucune facture client consolidée — le classement apparaîtra après l’intégration de vos ventes.
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {topClients.map((c, i) => (
                      <div key={i} className="hbar-row">
                        <div className="hbar-label">{c.nom}</div>
                        <div className="hbar-track">
                          <div className="hbar-fill" style={{ width: `${Math.max(8, Math.round((c.total / maxClient) * 100))}%` }}></div>
                        </div>
                        <div className="hbar-value">{formatCFA(c.total)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {biAxe === 'bfr' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Balance Âgée Historique</div>
                </div>
                {loading ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Chargement…</div>
                ) : (
                  <div style={{ display: 'flex', gap: '24px', height: '240px', alignItems: 'flex-end', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
                    <div className="stacked-bar-wrapper" style={{ width: '120px' }}>
                      <div className="stacked-bar-container">
                        {buckets.map((b, i) => (
                          <div key={i} className={`stacked-segment ${b.cls}`} style={{ height: `${b.value > 0 ? Math.max(6, Math.round((b.value / bfrMax) * 100)) : 2}%`, background: b.value > 0 ? b.color : 'var(--line-soft)' }} title={`${b.label}: ${formatCFA(b.value)}`}></div>
                        ))}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginTop: '8px' }}>Aujourd’hui</div>
                    </div>
                    <div style={{ flex: 1, alignSelf: 'flex-start', paddingTop: '8px', fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.8 }}>
                      {arriere === 0
                        ? "Aucune créance en retard. La répartition âgée (par tranche : moins de 30 j, 31-60 j, 61-90 j, plus de 90 j) apparaîtra dès que des factures clients seront consolidées."
                        : `Répartition des ${formatCFA(arriere)} de créances en retard (hors factures encore dans les délais).`}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--teal)' }}></div> Sains</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--amber)' }}></div> En retard</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--red)' }}></div> +60 jours</div>
                </div>
              </>
            )}

          </div>

          <div className="card bi-assistant bi-assistant-col" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div className="pulse-dot"></div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Assistant d’Analyse</div>
            </div>

            <div className="bi-chat-box">{chartInsight}</div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <input
                type="text"
                className="bi-prompt-input"
                placeholder="Posez une question..."
                value={biPrompt}
                onChange={(e) => setBiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskInsight()}
              />
              <button className="btn btn-primary teal hover-scale" style={{ padding: '0 16px', cursor: 'pointer' }} onClick={handleAskInsight}>
                Go
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}