"use client";

import React, { useState, useEffect, useCallback } from "react";
import { formatCFA, toNum } from "@/lib/utils";
import {
  triggerTaxAudit,
  getCfoData,
} from "@/lib/ged-api";
import type {
  CfoSynthese,
  CfoBfr,
  CfoRunway,
  BalanceAgee,
  TvaEstimee,
  AnomalieDoc,
  TaxAuditResult,
} from "@/lib/ged-api";

export default function CfoPage() {
  const [tresorerie, setTresorerie] = useState<CfoSynthese | null>(null);
  const [bfrData, setBfrData] = useState<CfoBfr | null>(null);
  const [runway, setRunway] = useState<CfoRunway | null>(null);
  const [balanceAgee, setBalanceAgee] = useState<BalanceAgee | null>(null);
  const [tva, setTva] = useState<TvaEstimee | null>(null);
  const [taxRules, setTaxRules] = useState<TaxAuditResult | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalieDoc[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await getCfoData();
      setTresorerie(d.synthese);
      setBfrData(d.bfr);
      setRunway(d.runway);
      setBalanceAgee(d.balance);
      setTva(d.tva);
      setAnomalies(d.anomalies);
      setError(d.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      const result = await triggerTaxAudit(["CM"]);
      setTaxRules(result);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'audit fiscal.");
    } finally {
      setIsAuditing(false);
    }
  };

  const solde = tresorerie?.solde_theorique ?? 0;
  const soldeDisplay = loading ? "Chargement..." : formatCFA(solde);
  const runwayLabel =
    loading
      ? "—"
      : runway?.runway_en_mois == null
        ? "Illimité"
        : `${runway.runway_en_mois} mois`;
  const totalArriere = loading
    ? 0
    : (balanceAgee?.["0_30j"] ?? 0) +
      (balanceAgee?.["31_60j"] ?? 0) +
      (balanceAgee?.["61_90j"] ?? 0) +
      (balanceAgee?.["90j_plus"] ?? 0);

  const regleFiscale: TaxAuditResult["mises_a_jour"][number] | null =
    taxRules?.mises_a_jour?.[0] ?? null;

  return (
    <section className="view" id="v-cfo">
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
            <span>Module · CFO</span>
          </div>
          <h1 className="page-title">Trésorerie & marges</h1>
          <p className="page-sub">Analyse financière continue à partir de vos documents et transactions.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary teal transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]" style={{ cursor: "pointer" }} onClick={() => { setLoading(true); setError(null); void load(); }} disabled={loading}>
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          Impossible de charger les données financières — {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
        <span className="pill pill-info" style={{ padding: "7px 14px", cursor: "pointer" }}>Trésorerie</span>
        <span className="pill pill-neutral" style={{ padding: "7px 14px", cursor: "pointer" }}>Marges</span>
        <span className="pill pill-neutral" style={{ padding: "7px 14px", cursor: "pointer" }}>Conformité Fiscale</span>
      </div>

      <div className="grid g2" style={{ marginBottom: "16px" }}>
        <div className="card transition-all duration-300 ease-out hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1">
          <div className="section-title">Évolution de la trésorerie</div>
          <div className="section-sub">Solde théorique (encaissements − sorties) et projection mensuelle</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
            <div style={{ padding: "15px", background: "var(--green-bg)", borderRadius: "12px", border: "1px solid var(--green)" }}>
              <div style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>Solde de trésorerie</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--teal-deep)" }}>
                {soldeDisplay}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1, padding: "12px", background: "var(--paper)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 700 }}>Encaissements</div>
                <div style={{ fontSize: "15px", fontWeight: 700 }}>{loading ? "-" : formatCFA(toNum(tresorerie?.encaissements_totaux))}</div>
              </div>
              <div style={{ flex: 1, padding: "12px", background: "var(--paper)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 700 }}>Sorties</div>
                <div style={{ fontSize: "15px", fontWeight: 700 }}>{loading ? "-" : formatCFA(toNum(tresorerie?.sorties_totales))}</div>
              </div>
              <div style={{ flex: 1, padding: "12px", background: "var(--paper)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 700 }}>Runway</div>
                <div style={{ fontSize: "15px", fontWeight: 700 }}>{runwayLabel}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", padding: "12px 14px", borderRadius: "9px", background: "var(--amber-bg)" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--teal-deep)" }}>
              {runway?.runway_en_mois == null
                ? "Aucune dépense enregistrée — survie illimitée à l\'état actuel."
                : `Projection : solde ${formatCFA(runway.solde_actuel)} / burn ${formatCFA(toNum(runway.cash_burn_mensuel_estime))}/mois`}
            </div>
            {runway?.alerte === "CRITIQUE" && (
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--red)", fontFamily: "var(--font-heading)" }}>
                Runway critique
              </span>
            )}
          </div>
        </div>

        <div className="card transition-all duration-300 ease-out hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1">
          <div className="section-title">Besoin en Fonds de Roulement (BFR)</div>
          <div className="section-sub">Indicateur clé de la santé de trésorerie</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
            <div style={{ padding: "15px", background: "var(--paper)", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>BFR Actuel</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--ink)" }}>
                {loading ? "Chargement..." : formatCFA(toNum(bfrData?.bfr))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1, padding: "12px", background: "var(--paper)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 700 }}>Créances Clients</div>
                <div style={{ fontSize: "15px", fontWeight: 700 }}>{loading ? "-" : formatCFA(toNum(bfrData?.creances_clients))}</div>
              </div>
              <div style={{ flex: 1, padding: "12px", background: "var(--paper)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 700 }}>Dettes Frns.</div>
                <div style={{ fontSize: "15px", fontWeight: 700 }}>{loading ? "-" : formatCFA(toNum(bfrData?.dettes_fournisseurs))}</div>
              </div>
              <div style={{ flex: 1, padding: "12px", background: "var(--paper)", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 700 }}>Stocks</div>
                <div style={{ fontSize: "15px", fontWeight: 700 }}>{loading ? "-" : formatCFA(toNum(bfrData?.valeur_stocks))}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card transition-all duration-300 ease-out hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1">
          <div className="section-title">Balance âgée & TVA estimée</div>
          <div className="section-sub">Créances en retard et position TVA (OHADA / CEMAC)</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
            {loading ? (
              <div style={{ padding: "12px", borderRadius: "9px", background: "var(--paper)", border: "1px solid var(--line)", fontSize: "13px" }}>Chargement...</div>
            ) : (
              <>
                <div>
                  {[
                    { label: "0 — 30 jours", value: toNum(balanceAgee?.["0_30j"]), color: "var(--teal)" },
                    { label: "31 — 60 jours", value: toNum(balanceAgee?.["31_60j"]), color: "var(--amber)" },
                    { label: "61 — 90 jours", value: toNum(balanceAgee?.["61_90j"]), color: "var(--amber)" },
                    { label: "+ 90 jours", value: toNum(balanceAgee?.["90j_plus"]), color: "var(--red)" },
                  ].map((b) => (
                    <div key={b.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line-soft)", padding: "7px 2px", fontSize: "13px" }}>
                      <span style={{ color: "var(--text-dim)" }}>{b.label}</span>
                      <span className="mono" style={{ fontWeight: 700, color: b.value > 0 ? b.color : "var(--text-faint)" }}>{formatCFA(b.value)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 2px 0", fontSize: "13px" }}>
                    <span style={{ fontWeight: 700 }}>Total en retard</span>
                    <span className="mono" style={{ fontWeight: 700 }}>{formatCFA(totalArriere)}</span>
                  </div>
                </div>
                <div style={{ padding: "12px", borderRadius: "9px", background: "var(--paper)", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>TVA estimée</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-dim)" }}>Solde TVA</span>
                    <span className="mono" style={{ fontWeight: 700 }}>{formatCFA(toNum(tva?.solde_tva))}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>{tva?.conseil ?? "Provisionnez suivant le résultat."}</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card transition-all duration-300 ease-out hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Conformité Fiscale & Anomalies (Shadow Alerts)</div>
            {taxRules && <span className="pill pill-info">À jour</span>}
          </div>
          <div className="section-sub">Agent expert en charge de la veille réglementaire et détection de fraudes silencieuses</div>

          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={handleAudit}
              disabled={isAuditing}
              className="btn btn-primary transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
              style={{ width: "100%", justifyContent: "center", cursor: "pointer" }}
            >
              {isAuditing ? (
                <>
                  <span className="pulse-dot"></span> Analyse IA en cours...
                </>
              ) : (
                "Lancer l'Audit Fiscal (CM)"
              )}
            </button>

            {regleFiscale && regleFiscale.tva && (
              <div style={{ padding: "12px", borderRadius: "9px", background: "var(--paper)", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
                  Taux Applicables{regleFiscale.pays_code_iso ? ` (${regleFiscale.pays_code_iso})` : ""}{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>
                    Mis à jour le {new Date(regleFiscale.tva.date_verification).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                  <span style={{ color: "var(--text-dim)" }}>TVA Standard</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{regleFiscale.tva.taux_standard}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "var(--text-dim)" }}>Cotisations Patronales</span>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {regleFiscale.cotisations_sociales?.part_patronale || "N/A"}%
                  </span>
                </div>
              </div>
            )}

            {taxRules && taxRules.pays_traites.length > 0 && !regleFiscale?.tva && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--green-bg)", border: "1px solid var(--green)", fontSize: "13px" }}>
                Audit terminé — {taxRules.pays_traites.join(", ")} :{" "}
                {taxRules.mises_a_jour.length} règle(s) mise(s) à jour, {taxRules.non_disponibles.length} indisponible(s).
              </div>
            )}

            {!loading && anomalies && anomalies.length === 0 && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--green-bg)", border: "1px solid var(--green)", fontSize: "13px", color: "var(--ink-2)" }}>
                Aucune anomalie détectée sur les documents actuellement en base.
              </div>
            )}

            {anomalies && anomalies.length > 0 && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--amber)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  Alertes de comportement
                </div>
                {anomalies.map((ano) => (
                  <div key={ano.id} style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.05)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    fontSize: "13px"
                  }} className="transition-all duration-300 ease-out hover:shadow-sm">
                    <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "2px" }}>{ano.message}</div>
                    <div style={{ color: "var(--text-light)", fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
                      <span>Document: {ano.type}</span>
                      {ano.lien && (
                        <a href={ano.lien} target="_blank" rel="noreferrer" style={{ color: "var(--teal)", textDecoration: "none" }} className="hover:underline">Voir le document &rarr;</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}