import React from "react";

export default function SettingsPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-settings">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Configuration</span></div>
    <h1 class="page-title">Paramètres &amp; abonnement</h1>
    <p class="page-sub">Configuration de l’espace OrbitTech Services.</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      <button class="btn btn-ghost">Clés API</button><button class="btn btn-primary teal">Ajouter une intégration</button>
    </div>
  </div>

<div class="card" style="margin-bottom:20px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
    <div><div class="section-title">Utilisation du plan Starter</div><div class="section-sub">Cycle en cours · renouvellement le 30 septembre 2026</div></div>
    <span class="pill pill-success">Actif</span>
  </div>
  <div class="grid g4">
    <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Utilisateurs</span><strong class="mono">2/3</strong></div>
    <div class="progress"><div style="width:67%;background:#1A4A3C"></div></div>
  </div>
    <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Documents</span><strong class="mono">340/500</strong></div>
    <div class="progress"><div style="width:68%;background:#A9761F"></div></div>
  </div>
    <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Questions posées</span><strong class="mono">812/1000</strong></div>
    <div class="progress"><div style="width:81%;background:#1A4A3C"></div></div>
  </div>
    <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Stockage</span><strong class="mono">1,3/2 Go</strong></div>
    <div class="progress"><div style="width:65%;background:#C06A2C"></div></div>
  </div>
  </div>
</div>

<div class="section-title" style="margin-bottom:14px;">Comparer les paliers</div>
<div class="grid g4" style="margin-bottom:24px;">
  
    <div class="card" style="">
      
      <div style="font-family:var(--font-heading);font-weight:700;font-size:17px;">Freemium</div>
      <div style="font-size:20px;font-weight:700;margin:6px 0 14px;font-family:var(--font-heading);">0 F</div>
      <div style="font-size:12px;color:var(--text-dim);line-height:2;margin-bottom:16px;">✓ Business Scanner limité<br>✓ Rapport mensuel ponctuel<br>✓ Assistant restreint</div>
      <button class="btn btn-primary teal" style="width:100%;justify-content:center;">Changer de plan</button>
    </div>
    <div class="card" style="border:1.6px solid var(--indigo);">
      <span class="pill pill-info" style="margin-bottom:10px;">Plan actuel</span>
      <div style="font-family:var(--font-heading);font-weight:700;font-size:17px;">Starter</div>
      <div style="font-size:20px;font-weight:700;margin:6px 0 14px;font-family:var(--font-heading);">9 900 F/mois</div>
      <div style="font-size:12px;color:var(--text-dim);line-height:2;margin-bottom:16px;">✓ Business Scanner illimité<br>✓ Mémoire Entreprise<br>✓ CFO de base</div>
      <button class="btn btn-ghost" style="width:100%;justify-content:center;" disabled="">Plan actif</button>
    </div>
    <div class="card" style="">
      
      <div style="font-family:var(--font-heading);font-weight:700;font-size:17px;">Pro</div>
      <div style="font-size:20px;font-weight:700;margin:6px 0 14px;font-family:var(--font-heading);">24 900 F/mois</div>
      <div style="font-size:12px;color:var(--text-dim);line-height:2;margin-bottom:16px;">✓ Commercial<br>✓ Import WhatsApp<br>✓ Automatisations limitées</div>
      <button class="btn btn-primary teal" style="width:100%;justify-content:center;">Changer de plan</button>
    </div>
    <div class="card" style="">
      
      <div style="font-family:var(--font-heading);font-weight:700;font-size:17px;">Business</div>
      <div style="font-size:20px;font-weight:700;margin:6px 0 14px;font-family:var(--font-heading);">54 900 F/mois</div>
      <div style="font-size:12px;color:var(--text-dim);line-height:2;margin-bottom:16px;">✓ Opérations &amp; agents avancés<br>✓ Intégrations API<br>✓ Multi-utilisateurs</div>
      <button class="btn btn-primary teal" style="width:100%;justify-content:center;">Changer de plan</button>
    </div>
</div>

<div class="grid g2">
  <div class="card">
    <div class="section-title">Modules activés</div>
    
      <div class="list-row"><span style="font-size:13px;font-weight:700;font-family:var(--font-heading);">Business Scanner</span><span class="pill pill-success">Actif</span></div>
      <div class="list-row"><span style="font-size:13px;font-weight:700;font-family:var(--font-heading);">CFO</span><span class="pill pill-success">Actif</span></div>
      <div class="list-row"><span style="font-size:13px;font-weight:700;font-family:var(--font-heading);">Commercial — Plan Pro</span><span class="pill pill-neutral">Verrouillé</span></div>
      <div class="list-row"><span style="font-size:13px;font-weight:700;font-family:var(--font-heading);">Opérations — Plan Business</span><span class="pill pill-neutral">Verrouillé</span></div>
  </div>
  <div class="card">
    <div class="section-title">Intégrations</div>
    
      <div class="list-row"><span style="font-size:13px;font-weight:700;font-family:var(--font-heading);">WhatsApp Business</span><span class="pill pill-success">Connecté</span></div>
      <div class="list-row"><span style="font-size:13px;font-weight:700;font-family:var(--font-heading);">Orange Money / MTN MoMo</span><span class="pill pill-success">Connecté</span></div>
      <div class="list-row"><span style="font-size:13px;font-weight:700;font-family:var(--font-heading);">Logiciel de comptabilité</span><button class="btn btn-ghost" style="padding:5px 12px;font-size:11.5px;">Connecter</button></div>
      <div class="list-row"><span style="font-size:13px;font-weight:700;font-family:var(--font-heading);">API Elara</span><button class="btn btn-ghost" style="padding:5px 12px;font-size:11.5px;">Connecter</button></div>
  </div>
</div>
</section>` }} />
  );
}
