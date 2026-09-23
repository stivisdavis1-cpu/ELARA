"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export default function CommercialPage() {
  const [events, setEvents] = useState([
    {
      id: 1,
      text: "“Bonjour, notre serveur de messagerie est en panne depuis ce matin”",
      sub: "Clinique Excellence Santé · converti en ticket #T-0891",
      val: "185 000 F",
    },
    {
      id: 2,
      text: "“Je peux payer vendredi ?”",
      sub: "Collège Notre-Dame · relance planifiée automatiquement",
      val: "—",
    },
    {
      id: 3,
      text: "Devis matériel signé reçu par photo",
      sub: "Cabinet Fotso Consulting · en attente de validation",
      val: "412 000 F",
    }
  ]);

  const triggerSimulatedSupabaseEvent = () => {
    const newEvent = {
      id: Date.now(),
      text: "“Intéressé par votre offre annuelle. On peut s'appeler ?”",
      sub: "Nouveau Contact WhatsApp · opportunité générée",
      val: "En évaluation",
    };
    setEvents([newEvent, ...events]);
  };

  const activateProPlan = () => {
    alert("Activation du plan Pro en cours... (Simulation)");
  };

  return (
    <motion.section 
      className="view" 
      id="v-commercial"
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
            <span>Module · Assistant Commercial</span>
          </div>
          <h1 className="page-title">Assistant Commercial</h1>
          <p className="page-sub">CRM léger, relances automatiques et suivi des opportunités — connecté à WhatsApp Business.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn-live-stream" onClick={triggerSimulatedSupabaseEvent} title="Simuler l'injection d'un flux Supabase">
            <span className="pulse-dot"></span> Webhook Live
          </button>
          <button className="btn btn-primary teal" onClick={activateProPlan} style={{ transition: 'all 0.3s ease-out' }}>
            Activer avec le plan Pro
          </button>
        </div>
      </div>

      <div className="preview-banner">
        <span className="dot"></span>
        <div>
          <strong>Aperçu — module V2, roadmap « Commercial Intelligence »</strong><br />
          <span className="muted">Cet écran illustre le fonctionnement cible du module. Il s’active avec le plan Pro (Partie VI du blueprint).</span>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: '16px' }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Opportunités ouvertes</div>
          <div className="kpi-value">18</div>
          <div className="kpi-delta up">↑ 5 cette semaine</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Pipeline estimé</div>
          <div className="kpi-value">2 340 000 F</div>
          <div className="kpi-delta flat">Toutes étapes</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Relances (WhatsApp)</div>
          <div className="kpi-value">42</div>
          <div className="kpi-delta up">68% de réponse</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Commandes via WhatsApp</div>
          <div className="kpi-value">126 <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 500 }}>ce mois</span></div>
          <div className="kpi-delta up">↑ 21%</div>
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: '16px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9C9986' }}></span>
            <span className="section-title" style={{ margin: 0 }}>Prospection</span>
          </div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl"><span className="name-cell" style={{ fontWeight: 600 }}>Hôtel Le Sahel</span><span className="mono">185 000 F</span></div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl"><span className="name-cell" style={{ fontWeight: 600 }}>Radio Cité FM</span><span className="mono">96 000 F</span></div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl"><span className="name-cell" style={{ fontWeight: 600 }}>Assurance Providence</span><span className="mono">54 000 F</span></div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1A4A3C' }}></span>
            <span className="section-title" style={{ margin: 0 }}>Négociation</span>
          </div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl"><span className="name-cell" style={{ fontWeight: 600 }}>Cabinet Fotso Consulting</span><span className="mono">412 000 F</span></div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl"><span className="name-cell" style={{ fontWeight: 600 }}>Banque du Littoral</span><span className="mono">680 000 F</span></div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A9761F' }}></span>
            <span className="section-title" style={{ margin: 0 }}>Gagné ce mois</span>
          </div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl"><span className="name-cell" style={{ fontWeight: 600 }}>Collège Notre-Dame</span><span className="mono">230 000 F</span></div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl"><span className="name-cell" style={{ fontWeight: 600 }}>Groupe Ngassa & Fils</span><span className="mono">310 000 F</span></div>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="section-title">Fil WhatsApp Business — événements convertis</div>
          <div className="section-sub">Chaque message devient une entrée structurée dans la Business Memory</div>
          {events.map((ev) => (
            <motion.div 
              key={ev.id} 
              className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div>
                <div className="name-cell">{ev.text}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>{ev.sub}</div>
              </div>
              <div className="mono" style={{ fontWeight: 700 }}>{ev.val}</div>
            </motion.div>
          ))}
        </div>
        <div className="ai-card">
          <div className="ai-badge">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
              <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
              <path d="M4 21l7-7" strokeLinecap="round"></path>
            </svg>
            Suggestions Assistant Commercial
          </div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl">
            <span className="pill" style={{ background: 'var(--amber)18', color: 'var(--amber)', marginRight: '12px' }}>Relance</span>
            <span style={{ flex: 1, fontSize: '13px' }}>Radio Cité FM — devis envoyé il y a 6 j sans réponse</span>
          </div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl">
            <span className="pill" style={{ background: 'var(--indigo)18', color: 'var(--indigo)', marginRight: '12px' }}>Opportunité</span>
            <span style={{ flex: 1, fontSize: '13px' }}>Banque du Littoral — volume de tickets en hausse, proposer un forfait infogérance</span>
          </div>
          <div className="list-row group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 rounded-2xl">
            <span className="pill" style={{ background: 'var(--red)18', color: 'var(--red)', marginRight: '12px' }}>Risque</span>
            <span style={{ flex: 1, fontSize: '13px' }}>Hôtel Le Sahel — 2 relances sans réponse, risque de perte</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

