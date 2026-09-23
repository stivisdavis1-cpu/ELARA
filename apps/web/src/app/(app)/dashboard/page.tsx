"use client";

import React, { useState } from "react";
import { motion, Variants } from "framer-motion";

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

export default function DashboardPage() {
  const [biAxe, setBiAxe] = useState("executive");
  const [biDim, setBiDim] = useState("mois");
  const [biPrompt, setBiPrompt] = useState("");
  const [biInsight, setBiInsight] = useState("");

  const handleAskInsight = () => {
    if (!biPrompt.trim()) return;
    setBiInsight("Analyse en cours...");
    setTimeout(() => {
      setBiInsight(`L'analyse croisée des données de ${biAxe === 'tresorerie' ? 'Trésorerie' : biAxe === 'ca' ? "Chiffre d'affaires" : 'BFR'} par ${biDim === 'mois' ? 'Mois' : biDim === 'client' ? 'Client' : 'Produit'} révèle une tendance haussière solide. La requête "${biPrompt}" a mis en évidence une opportunité d'optimisation de 15% sur le prochain trimestre.`);
      setBiPrompt("");
    }, 800);
  };

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants}>
      <motion.div className="topbar" variants={itemVariants}>
        <div>
          <div className="eyebrow">Vue d'ensemble CFO</div>
          <h1 className="page-title">Tableau de bord financier</h1>
          <p className="page-sub">Bienvenue sur votre espace de pilotage stratégique propulsé par notre technologie d'analyse avancée.</p>
        </div>
      </motion.div>

      {/* Grid KPI Principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <motion.div className="card" variants={itemVariants}>
          <div className="kpi-label" title="Argent immédiatement disponible sur vos comptes">Trésorerie Actuelle (Liquidités)</div>
          <div className="kpi-value">12 450 000 FCFA</div>
          <div className="kpi-delta up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
            +14% vs mois préc.
          </div>
        </motion.div>

        <motion.div className="ai-card span-2" variants={itemVariants}>
          <div className="ai-badge">
            <div className="pulse-dot"></div>
            Prédiction Runway (Algorithme)
          </div>
          <div className="ai-card-content">
            <div className="ai-card-metric">
              <div className="kpi-value">8.5 Mois</div>
              <div className="kpi-label" style={{ marginTop: '8px', marginBottom: 0 }}>De survie sans revenus</div>
            </div>
            <div className="ai-card-desc">
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                Dépenses maîtrisées. Relancer les factures en retard allongerait votre sécurité à 10 mois.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginTop: '24px' }}>
        <motion.div className="card" variants={itemVariants}>
          <div className="kpi-label">Balance Âgée (Sommes que vos clients vous doivent)</div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>0 - 30 jours <span style={{color: 'var(--text-faint)', fontWeight: 400}}>(Récent)</span></span>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>2 100 000 FCFA</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>31 - 60 jours <span style={{color: 'var(--text-faint)', fontWeight: 400}}>(En retard)</span></span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>850 000 FCFA</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>+ 60 jours <span style={{color: 'var(--text-faint)', fontWeight: 400}}>(Risque élevé)</span></span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--red)' }}>420 000 FCFA</span>
            </div>
          </div>
        </motion.div>
        
        <motion.div className="card" variants={itemVariants}>
          <div className="kpi-label">Besoin en Fonds de Roulement (BFR)</div>
          <div className="kpi-value" style={{ marginTop: '12px' }}>4 800 000 FCFA</div>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '12px' }}>
            Le BFR représente l'argent bloqué au quotidien pour faire tourner votre activité. Plus il est bas, moins vous avez besoin de puiser dans votre trésorerie.
          </p>
        </motion.div>
      </div>

      {/* Module de Business Intelligence Avancée */}
      <motion.div variants={itemVariants} style={{ marginTop: '48px', paddingBottom: '48px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div className="eyebrow" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>Business Intelligence</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Analyse Exploratoire Intelligente</h2>
        </div>
        
        {/* Système d'onglets pour les vues */}
        <div className="bi-tabs">
          <div className={`bi-tab ${biAxe === 'executive' ? 'active' : ''}`} onClick={() => setBiAxe('executive')}>Vue Exécutive</div>
          <div className={`bi-tab ${biAxe === 'sales' ? 'active' : ''}`} onClick={() => setBiAxe('sales')}>Analyse Commerciale</div>
          <div className={`bi-tab ${biAxe === 'bfr' ? 'active' : ''}`} onClick={() => setBiAxe('bfr')}>BFR & Risque Client</div>
        </div>

        <div className="bi-layout" style={{ gridTemplateColumns: biAxe === 'executive' ? '1fr 300px' : '260px 1fr 300px' }}>
          
          {/* Si pas vue executive, on affiche la sidebar de paramétrage (simplifiée) */}
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
            </div>
          )}

          {/* Zone Principale de Graphique selon la vue */}
          <div className="card bi-chart-area" style={{ padding: '24px' }}>
            
            {/* VUE EXÉCUTIVE */}
            {biAxe === 'executive' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Performance Globale & Répartition</div>
                </div>
                <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
                  <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                    <div className="css-chart" style={{ flex: 1, borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px', height: '200px', minHeight: '200px', marginTop: 0, alignItems: 'flex-end', display: 'flex', gap: '16px' }}>
                      {/* Bar chart Revenus vs Depenses */}
                      {[ {l:'T1', r:120, d:90}, {l:'T2', r:150, d:100}, {l:'T3', r:140, d:110}, {l:'T4', r:180, d:120} ].map((val, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100%', flex: 1, justifyContent: 'center' }}>
                          <div className="css-bar-wrapper" style={{ width: '30px', position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                            <div className="css-bar-tooltip">Revenus: {val.r}M</div>
                            <div className="css-bar" style={{ height: `${val.r/2}%`, background: 'var(--teal)', width: '100%', borderRadius: '4px 4px 0 0', transition: 'all 0.3s ease' }}></div>
                            <div className="css-bar-label" style={{ position: 'absolute', bottom: '-24px', width: '100%', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>{val.l}</div>
                          </div>
                          <div className="css-bar-wrapper" style={{ width: '30px', position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                            <div className="css-bar-tooltip">Dépenses: {val.d}M</div>
                            <div className="css-bar" style={{ height: `${val.d/2}%`, background: 'var(--amber)', width: '100%', borderRadius: '4px 4px 0 0', transition: 'all 0.3s ease' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--teal)' }}></div> Revenus</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--amber)' }}></div> Dépenses</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid var(--line-soft)', paddingLeft: '24px' }}>
                    <div className="donut-chart">
                      <div className="donut-hole">
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Marge</span>
                        <span style={{ fontSize: '18px', fontWeight: 800 }}>24%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* VUE VENTES */}
            {biAxe === 'sales' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Top Clients & Évolution</div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {[ {n: 'TechCorp Industries', v: 85}, {n: 'Global Logistics SA', v: 65}, {n: 'Retail Network', v: 45}, {n: 'Medical Systems', v: 30}, {n: 'EduTech Corp', v: 20} ].map((client, i) => (
                    <div key={i} className="hbar-row">
                      <div className="hbar-label">{client.n}</div>
                      <div className="hbar-track">
                        <div className="hbar-fill" style={{ width: `${client.v}%` }}></div>
                      </div>
                      <div className="hbar-value">{client.v}M</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* VUE BFR */}
            {biAxe === 'bfr' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Balance Âgée Historique</div>
                </div>
                <div style={{ display: 'flex', gap: '24px', height: '240px', alignItems: 'flex-end', borderBottom: '1px solid var(--line-soft)', paddingBottom: '8px' }}>
                  {[ {m: 'Mai', s: 70, w: 20, r: 10}, {m: 'Juin', s: 65, w: 25, r: 10}, {m: 'Juil', s: 60, w: 20, r: 20}, {m: 'Août', s: 75, w: 15, r: 10} ].map((month, i) => (
                    <div key={i} className="stacked-bar-wrapper">
                      <div className="stacked-bar-container">
                        <div className="stacked-segment seg-risk" style={{ height: `${month.r}%` }} title="+60 jours"></div>
                        <div className="stacked-segment seg-warn" style={{ height: `${month.w}%` }} title="31-60 jours"></div>
                        <div className="stacked-segment seg-safe" style={{ height: `${month.s}%` }} title="Payé ou <30j"></div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginTop: '8px' }}>{month.m}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--teal)' }}></div> Sains</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--amber)' }}></div> En retard</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--red)' }}></div> +60 jours</div>
                </div>
              </>
            )}

          </div>

          {/* Assistant d'analyse */}
          <div className="card bi-assistant bi-assistant-col" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div className="pulse-dot"></div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Assistant d'Analyse</div>
            </div>
            
            <div className="bi-chat-box">
              {biInsight || (biAxe === 'executive' ? "La marge nette est stable à 24%. Les revenus du T4 (180M FCFA) compensent l'augmentation des dépenses opérationnelles (+10%)." : biAxe === 'sales' ? "Forte dépendance sur TechCorp (35% du CA global). Envisager une diversification sur le segment Retail." : "Le risque de non-paiement a doublé en Juillet. Recommandation : bloquer les encours de la Liste Rouge.")}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <input 
                type="text" 
                className="bi-prompt-input" 
                placeholder="Posez une question..."
                value={biPrompt}
                onChange={(e) => setBiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskInsight()}
              />
              <button className="btn btn-primary teal hover-scale" style={{ padding: '0 16px' }} onClick={handleAskInsight}>
                Go
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
