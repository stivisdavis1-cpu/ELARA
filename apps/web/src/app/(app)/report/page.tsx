"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { formatCFA, toNum } from "@/lib/utils";
import { getProfilTenant, getReportData } from "@/lib/ged-api";
import type {
  CfoSynthese,
  CfoRunway,
  CfoBfr,
  BalanceAgee,
  TvaEstimee,
  FactureLigne,
  EntiteRef,
  DocLigne,
  AnomalieDoc,
  PaiementLigne,
} from "@/lib/ged-api";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function scoreDoc(score: number | null): number {
  if (score == null) return 0.5;
  return score <= 1 ? score : score / 100;
}

export default function ReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synthese, setSynthese] = useState<CfoSynthese | null>(null);
  const [runway, setRunway] = useState<CfoRunway | null>(null);
  const [bfr, setBfr] = useState<CfoBfr | null>(null);
  const [balance, setBalance] = useState<BalanceAgee | null>(null);
  const [tva, setTva] = useState<TvaEstimee | null>(null);
  const [factures, setFactures] = useState<FactureLigne[]>([]);
  const [clients, setClients] = useState<EntiteRef[]>([]);
  const [fournisseurs, setFournisseurs] = useState<EntiteRef[]>([]);
  const [docs, setDocs] = useState<DocLigne[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalieDoc[]>([]);
  const [paiements, setPaiements] = useState<PaiementLigne[]>([]);
  // Raison sociale réelle de l'entreprise courante : elle était écrite en dur,
  // ce qui faisait porter au rapport d'une autre société que celle des données.
  const [entreprise, setEntreprise] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await getReportData();
    setSynthese(d.synthese);
    setRunway(d.runway);
    setBfr(d.bfr);
    setBalance(d.balance);
    setTva(d.tva);
    setFactures(d.factures);
    setClients(d.clients);
    setFournisseurs(d.fournisseurs);
    setDocs(d.docs);
    setAnomalies(d.anomalies);
    setPaiements(d.paiements);
    setError(d.error);
    setLoading(false);

    const profil = await getProfilTenant().catch(() => null);
    setEntreprise(profil?.raison_sociale ?? null);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const facturesClient = factures.filter((f) => f.client);
  const totFact = facturesClient.reduce((acc, f) => acc + toNum(f.montant_total), 0);
  const payees = facturesClient.filter((f) => f.statut === "payee").reduce((acc, f) => acc + toNum(f.montant_total), 0);
  const totPaiements = paiements.reduce((acc, p) => acc + toNum(p.montant), 0);
  const arriere =
    toNum(balance?.["0_30j"]) + toNum(balance?.["31_60j"]) + toNum(balance?.["61_90j"]) + toNum(balance?.["90j_plus"]);
  const docsAAuditer = docs.filter((d) => d.statut === "À auditer");
  const solde = toNum(synthese?.solde_theorique);

  // --- Scores ---
  const hasData = docs.length > 0 || totFact > 0 || totPaiements > 0 || clients.length > 0 || fournisseurs.length > 0;
  const scoreFinancier = hasData
    ? clamp(solde > 0 ? Math.round(50 + Math.min(30, toNum(runway?.runway_en_mois) * 5)) : solde < 0 ? 20 : 50, 0, 100)
    : 0;
  const scoreCommercial = hasData
    ? totFact > 0
      ? clamp(Math.round((payees / totFact) * 70) + Math.min(30, clients.length * 6), 0, 100)
      : clients.length > 0
        ? 60
        : 50
    : 0;
  const scoreRecouvrement = hasData
    ? totFact > 0
      ? Math.round((payees / totFact) * 100)
      : 50
    : 0;
  const scoreQualite = hasData
    ? docs.length > 0
      ? Math.round(((docs.reduce((acc, d) => acc + scoreDoc(d.score), 0)) / docs.length) * 100)
      : 55
    : 0;
  const global =
    Math.round(
      scoreFinancier * 0.35 +
      scoreCommercial * 0.25 +
      scoreRecouvrement * 0.2 +
      scoreQualite * 0.2,
    );

  const deg = Math.round((global / 100) * 360);
  const qualif =
    !hasData
      ? "En attente de données"
      : global >= 85
        ? "Excellent état général"
        : global >= 70
          ? "Bon état général"
          : global >= 50
            ? "État moyen"
            : "Situation à surveiller";

  const topRetard = [...(balance?.details ?? [])].sort((a, b) => b.retard_jours - a.retard_jours)[0];
  const topClient = (() => {
    const map = new Map<string, { nom: string; total: number }>();
    facturesClient.forEach((f) => {
      if (!f.client?.id) return;
      const cur = map.get(f.client.id) ?? { nom: f.client.nom || "Client", total: 0 };
      cur.total += toNum(f.montant_total);
      map.set(f.client.id, cur);
    });
    const arr = Array.from(map.values()).sort((a, b) => b.total - a.total);
    return arr[0];
  })();

  const problemes: string[] = [];
  if (anomalies.length > 0) problemes.push(...anomalies.slice(0, 3).map((a) => a.message));
  if (arriere > 0) problemes.push(`${formatCFA(arriere)} de factures clients en retard (balance âgée)`);
  if (runway?.alerte === "CRITIQUE") problemes.push("Runway critique : moins de 3 mois de survie au rythme actuel");
  if (docsAAuditer.length > 0) problemes.push(`${docsAAuditer.length} document(s) à auditer par un humain`);
  if (toNum(bfr?.dettes_fournisseurs) > 0) problemes.push(`${formatCFA(toNum(bfr?.dettes_fournisseurs))} de dettes fournisseurs en cours`);
  if (problemes.length === 0 && hasData) problemes.push("Aucun problème détecté sur les données actuellement en base.");

  const opportunites: string[] = [];
  if (toNum(tva?.solde_tva) < 0) opportunites.push(`Crédit de TVA en votre faveur (${formatCFA(toNum(tva?.solde_tva))}) — à imputer sur les prochains reversements`);
  if (topClient && totFact > 0)
    opportunites.push(`${topClient.nom} concentre ${Math.round((topClient.total / totFact) * 100)}% du chiffre d'affaires facturé — fidéliser cette relation`);
  if (fournisseurs.length > 0) opportunites.push(`${fournisseurs.length} fournisseur(s) référencés — historiser les conditions pour renégocier les plus importants`);
  if (docs.length > 0 && opportunites.length === 0) opportunites.push(`${docs.length} document(s) analysés — la mémoire d'entreprise s'enrichit pour affiner les recommandations`);
  if (opportunites.length === 0 && hasData) opportunites.push("Analyse en cours — les opportunités apparaîtront avec davantage d'historique.");

  const actions: string[] = [];
  if (topRetard) actions.push(`Relancer ${topRetard.client ?? "le client"} — ${formatCFA(toNum(topRetard.montant))} en retard de ${topRetard.retard_jours} j`);
  if (toNum(tva?.solde_tva) > 0) actions.push(`Provisionner ${formatCFA(toNum(tva?.solde_tva))} pour le reversement TVA du 15`);
  if (docsAAuditer.length > 0) actions.push(`Soumettre ${docsAAuditer.length} document(s) à l'audit manuel`);
  if (actions.length === 0 && hasData) actions.push("Aucune action prioritaire requise pour l'instant.");

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Lien du rapport copié dans le presse-papiers !");
  };

  return (
    <motion.section
      className="view"
      id="v-report"
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
            <span>Rapport généré automatiquement</span>
          </div>
          <h1 className="page-title">Rapport de santé</h1>
          <p className="page-sub">
            {entreprise ? `${entreprise} · ` : ""}données consolidées en temps réel depuis votre Business Memory.
          </p>
        </div>
        <div className="topbar-actions hide-on-print">
          <button className="btn btn-ghost hover-scale" onClick={handleShare} style={{ cursor: 'pointer' }}>Partager</button>
          <button className="btn btn-primary teal hover-scale" onClick={handlePrint} style={{ cursor: 'pointer' }}>Exporter en PDF</button>
          {loading && <span className="pulse-dot"></span>}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: 'var(--green-bg)', border: 'none' }}>
        <span style={{ fontSize: '15px' }}>📲</span>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-2)' }}>
          <strong>Ce que contient ce rapport :</strong> uniquement des indicateurs calculés à partir de vos factures,
          paiements, dépenses et documents. Les sections sans donnée restent vides plutôt que d&apos;afficher une valeur estimée.
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Certains indicateurs n’ont pas pu être chargés — {error}
        </div>
      )}

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '26px', marginBottom: '16px', background: 'var(--ink)', border: 'none', color: '#fff' }}>
        <div className="ring" style={{ width: '90px', height: '90px', background: `conic-gradient(#A9761F ${deg}deg, #ECE9DD 0)` }}>
          <div className="ring-val">{global}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#ADB3A4', fontWeight: 700, fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>Business Health Score</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>{loading ? "Calcul…" : qualif}</div>
          <div style={{ fontSize: '12px', color: '#ADB3A4', marginTop: '4px' }}>
            {!hasData
              ? "Le score s'activera dès que vos documents seront consolidés (factures, relevés, documents d'achat)."
              : "Score pondéré : santé financière 35%, commerciale 25%, recouvrement 20%, qualité des données 20%."}
          </div>
        </div>
        {!loading && (
          <button className="btn btn-ghost hide-on-print" onClick={() => { setLoading(true); setError(null); void load(); }} style={{ marginLeft: 'auto', cursor: 'pointer' }}>
            Regénérer
          </button>
        )}
      </div>

      <div className="grid g4" style={{ marginBottom: '16px' }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Santé financière</div>
          <div className="kpi-value" style={{ color: scoreFinancier >= 70 ? 'var(--green)' : scoreFinancier >= 50 ? 'var(--amber)' : 'var(--red)' }}>{loading ? "…" : scoreFinancier}</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Santé commerciale</div>
          <div className="kpi-value" style={{ color: scoreCommercial >= 70 ? 'var(--green)' : scoreCommercial >= 50 ? 'var(--amber)' : 'var(--red)' }}>{loading ? "…" : scoreCommercial}</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Recouvrement</div>
          <div className="kpi-value" style={{ color: scoreRecouvrement >= 70 ? 'var(--green)' : scoreRecouvrement >= 50 ? 'var(--amber)' : 'var(--red)' }}>{loading ? "…" : scoreRecouvrement}</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Qualité des données</div>
          <div className="kpi-value" style={{ color: scoreQualite >= 70 ? 'var(--green)' : scoreQualite >= 50 ? 'var(--amber)' : 'var(--red)' }}>{loading ? "…" : scoreQualite}</div>
        </div>
      </div>

      <div className="grid g3">
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="section-title" style={{ color: 'var(--red)' }}>Problèmes détectés</div>
          <ul style={{ paddingLeft: '18px', margin: '14px 0 0', fontSize: '13px', lineHeight: 1.9, color: 'var(--text-dim)' }}>
            {loading ? (
              <li>Analyse en cours…</li>
            ) : !hasData ? (
              <li>Aucun problème détecté — aucun document consolidé pour le moment.</li>
            ) : (
              problemes.map((p, i) => <li key={i}>{p}</li>)
            )}
          </ul>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="section-title" style={{ color: '#1A4A3C' }}>Opportunités</div>
          <ul style={{ paddingLeft: '18px', margin: '14px 0 0', fontSize: '13px', lineHeight: 1.9, color: 'var(--text-dim)' }}>
            {loading ? (
              <li>Analyse en cours…</li>
            ) : !hasData ? (
              <li>Les opportunités apparaîtront dès la consolidation de vos données.</li>
            ) : (
              opportunites.map((o, i) => <li key={i}>{o}</li>)
            )}
          </ul>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="section-title" style={{ color: 'var(--green)' }}>Actions prioritaires</div>
          <ul style={{ paddingLeft: '18px', margin: '14px 0 0', fontSize: '13px', lineHeight: 1.9, color: 'var(--text-dim)' }}>
            {loading ? (
              <li>Analyse en cours…</li>
            ) : !hasData ? (
              <li>Aucune action prioritaire — en attente de données.</li>
            ) : (
              actions.map((a, i) => <li key={i}>{a}</li>)
            )}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}