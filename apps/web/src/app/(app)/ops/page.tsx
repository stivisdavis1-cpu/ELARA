"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export default function OpsPage() {
  const [stockEvents, setStockEvents] = useState([
    {
      id: 1,
      ref: "Licences Microsoft 365 (postes)",
      stock: 14,
      seuil: 25,
      status: "Sous le seuil",
      pillClass: "pill-danger"
    },
    {
      id: 2,
      ref: "Laptops Dell reconditionnés",
      stock: 88,
      seuil: 40,
      status: "OK",
      pillClass: "pill-success"
    },
    {
      id: 3,
      ref: "Cartouches toner HP",
      stock: 21,
      seuil: 30,
      status: "À surveiller",
      pillClass: "pill-warning"
    },
    {
      id: 4,
      ref: "Switch réseau 24 ports",
      stock: 6,
      seuil: 20,
      status: "Sous le seuil",
      pillClass: "pill-danger"
    }
  ]);

  const triggerSimulatedSupabaseEvent = () => {
    // Simulate a new logistics event
    const newEv = {
      id: Date.now(),
      ref: "Écrans 27 pouces (Nouvelle Commande)",
      stock: 5,
      seuil: 15,
      status: "Sous le seuil",
      pillClass: "pill-danger"
    };
    setStockEvents([newEv, ...stockEvents]);
  };

  const activateBusinessPlan = () => {
    alert("Activation du plan Business en cours... (Simulation)");
  };

  const simulateOrder = (itemName: string) => {
    alert(`Ordre de réapprovisionnement généré pour : ${itemName}`);
  };

  return (
    <motion.section 
      className="view" 
      id="v-ops"
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
            <span>Module · Opérations Avancées</span>
          </div>
          <h1 className="page-title">Opérations Avancées</h1>
          <p className="page-sub">Stocks, achats et fournisseurs — recommandations de réapprovisionnement fondées sur la Business Memory.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn-live-stream" onClick={triggerSimulatedSupabaseEvent} title="Simuler l'injection d'un flux Supabase">
            <span className="pulse-dot"></span> Webhook Live
          </button>
          <button className="btn btn-primary teal" onClick={activateBusinessPlan} style={{ transition: 'all 0.3s ease-out' }}>
            Activer avec le plan Business
          </button>
        </div>
      </div>

      <div className="preview-banner">
        <span className="dot"></span>
        <div>
          <strong>Aperçu — module V3, roadmap « Operations Intelligence »</strong><br />
          <span className="muted">Assistant Opérationnel : stocks, achats, fournisseurs. S’appuie sur le même socle (Business Memory, Identity, Event Bus, AI Platform) que Directeur Financier Virtuel et Assistant Commercial.</span>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: '16px' }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Références en stock</div>
          <div className="kpi-value">312</div>
          <div className="kpi-delta flat">18 catégories</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Ruptures fréquentes</div>
          <div className="kpi-value" style={{ color: 'var(--red)' }}>3</div>
          <div className="kpi-delta down">Sur 30 jours</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Fournisseurs actifs</div>
          <div className="kpi-value">9</div>
          <div className="kpi-delta up">↑ 1 ce mois</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Délai moyen livraison</div>
          <div className="kpi-value">4,2 j</div>
          <div className="kpi-delta flat">Stable</div>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: '16px' }}>
        <div className="card">
          <div className="section-title">Stock par référence</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Stock</th>
                <th>Seuil</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {stockEvents.map((ev) => (
                <tr key={ev.id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" onClick={() => simulateOrder(ev.ref)}>
                  <td className="name-cell">{ev.ref}</td>
                  <td className="mono">{ev.stock}</td>
                  <td className="mono">{ev.seuil}</td>
                  <td><span className={`pill ${ev.pillClass}`}>{ev.status}</span></td>
                </tr>
              ))}
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
            Recommandations de réapprovisionnement
          </div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl cursor-pointer" onClick={() => simulateOrder('Licences Microsoft 365')}>
            <span className="pill" style={{ background: 'var(--red)18', color: 'var(--red)', marginRight: '12px' }}>Urgent</span>
            <span style={{ flex: 1, fontSize: '13px' }}>Licences Microsoft 365 : renouveler 60 postes auprès de Microsoft CSP Partner</span>
          </div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl cursor-pointer" onClick={() => simulateOrder('Switch réseau 24 ports')}>
            <span className="pill" style={{ background: 'var(--amber)18', color: 'var(--amber)', marginRight: '12px' }}>Anticipé</span>
            <span style={{ flex: 1, fontSize: '13px' }}>Switch réseau 24 ports : rupture prévue sous 5 j au rythme actuel</span>
          </div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl cursor-pointer" onClick={() => simulateOrder('Dell Technologies Afrique')}>
            <span className="pill" style={{ background: 'var(--indigo)18', color: 'var(--indigo)', marginRight: '12px' }}>Fournisseur</span>
            <span style={{ flex: 1, fontSize: '13px' }}>Dell Technologies Afrique : délai en hausse (4,2 j vs 2,8 j habituel)</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Fournisseurs</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Catégorie</th>
              <th>Délai moyen</th>
              <th>Dette en cours</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" onClick={() => simulateOrder('Payer Dette Dell')}>
              <td className="name-cell">Dell Technologies Afrique</td>
              <td>Matériel informatique</td>
              <td className="mono">4,2 j</td>
              <td className="mono">248 000 F</td>
              <td><span className="pill pill-info">Échéance ce mois</span></td>
            </tr>
            <tr className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
              <td className="name-cell">Microsoft CSP Partner</td>
              <td>Licences logicielles</td>
              <td className="mono">6,8 j</td>
              <td className="mono">0 F</td>
              <td><span className="pill pill-success">À jour</span></td>
            </tr>
            <tr className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
              <td className="name-cell">Orange Business Cameroun</td>
              <td>Connectivité & réseau</td>
              <td className="mono">2,1 j</td>
              <td className="mono">54 000 F</td>
              <td><span className="pill pill-success">À jour</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}

