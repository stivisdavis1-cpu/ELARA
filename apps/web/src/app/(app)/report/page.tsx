"use client";

import React from "react";
import { motion } from "framer-motion";

export default function ReportPage() {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Lien du rapport copié dans le presse-papiers !");
  };

  const triggerSimulatedSupabaseEvent = () => {
    alert("Simulation: Un nouveau rapport mensuel vient d'être généré depuis la base de données.");
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
          <h1 className="page-title">Rapport mensuel</h1>
          <p className="page-sub">OrbitTech Services · période du 1ᵉʳ au 30 août 2026 · généré le 8 septembre 2026.</p>
        </div>
        <div className="topbar-actions hide-on-print">
          <button className="btn-live-stream" onClick={triggerSimulatedSupabaseEvent} title="Simuler l'injection d'un flux Supabase">
            <span className="pulse-dot"></span> Webhook Live
          </button>
          <button className="btn btn-ghost hover-scale" onClick={handleShare}>Partager</button>
          <button className="btn btn-primary teal hover-scale" onClick={handlePrint}>Exporter en PDF</button>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: 'var(--green-bg)', border: 'none' }}>
        <span style={{ fontSize: '15px' }}>📲</span>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-2)' }}>
          <strong>Diffusion automatique :</strong> ce résumé est envoyé chaque lundi 7h par WhatsApp au dirigeant, sans qu'il ait besoin d'ouvrir Elara — les urgences (facture très en retard, anomalie forte) déclenchent une alerte immédiate hors du cycle hebdomadaire.
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '26px', marginBottom: '16px', background: 'var(--ink)', border: 'none', color: '#fff' }}>
        <div className="ring" style={{ width: '90px', height: '90px', background: 'conic-gradient(#A9761F 280.8deg, #ECE9DD 0)' }}>
          <div className="ring-val">78</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#ADB3A4', fontWeight: 700, fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>Business Health Score</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>Bon état général — 3 points à traiter</div>
          <div style={{ fontSize: '12px', color: '#ADB3A4', marginTop: '4px' }}>
            Entreprises du secteur Services/Distribution, région de Yaoundé : moyenne 71 — vous êtes <strong style={{ color: '#fff' }}>7 points au-dessus</strong> (comparaison anonymisée, calculée pour tout secteur et toute ville dès qu’un nombre suffisant de tenants y est actif)
          </div>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: '16px' }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Santé financière</div>
          <div className="kpi-value" style={{ color: 'var(--green)' }}>82</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Santé commerciale</div>
          <div className="kpi-value" style={{ color: 'var(--indigo)' }}>74</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Recouvrement</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>58</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Qualité des données</div>
          <div className="kpi-value" style={{ color: 'var(--green)' }}>91</div>
        </div>
      </div>

      <div className="grid g3">
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="section-title" style={{ color: 'var(--red)' }}>Problèmes détectés</div>
          <ul style={{ paddingLeft: '18px', margin: '14px 0 0', fontSize: '13px', lineHeight: 1.9, color: 'var(--text-dim)' }}>
            <li>3 factures clients &gt; 30 j de retard, soit 460 000 F</li>
            <li>Dépense licences logicielles : écart de 40% vs moyenne</li>
            <li>Marge Support IT en recul (27% vs 33%)</li>
          </ul>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="section-title" style={{ color: 'var(--indigo)' }}>Opportunités</div>
          <ul style={{ paddingLeft: '18px', margin: '14px 0 0', fontSize: '13px', lineHeight: 1.9, color: 'var(--text-dim)' }}>
            <li>3 références matériel en rupture fréquente — commande anticipée conseillée</li>
            <li>Collège Notre-Dame : commandes +18%/mois depuis mai</li>
          </ul>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="section-title" style={{ color: 'var(--green)' }}>Actions prioritaires</div>
          <ul style={{ paddingLeft: '18px', margin: '14px 0 0', fontSize: '13px', lineHeight: 1.9, color: 'var(--text-dim)' }}>
            <li>Relancer Clinique Excellence Santé (312 000 F)</li>
            <li>Vérifier la facture Dell Technologies potentiellement dupliquée</li>
            <li>Passer commande anticipée sur 3 références</li>
          </ul>
        </div>
      </div>
    </motion.section>
  );
}
