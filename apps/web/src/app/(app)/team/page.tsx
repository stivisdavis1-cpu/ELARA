import React from "react";

export default function TeamPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-team">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Ressources humaines</span></div>
    <h1 class="page-title">Employés</h1>
    <p class="page-sub">L’annuaire de votre équipe — distinct des comptes de connexion à la plateforme (voir Utilisateurs &amp; rôles).</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      <button class="btn btn-ghost">Exporter la liste</button><button class="btn btn-primary teal">Ajouter un employé</button>
    </div>
  </div>

<div class="grid g4" style="margin-bottom:16px;">
  <div class="card"><div class="kpi-label">Employés actifs</div><div class="kpi-value">12</div><div class="kpi-delta up">↑ 2 ce trimestre</div></div>
  <div class="card"><div class="kpi-label">Services</div><div class="kpi-value">4</div><div class="kpi-delta flat">Direction, Finance, Commercial, Opérations</div></div>
  <div class="card"><div class="kpi-label">Ancienneté moyenne</div><div class="kpi-value">2,3 ans</div><div class="kpi-delta flat">Stable</div></div>
  <div class="card"><div class="kpi-label">Postes vacants</div><div class="kpi-value">1</div><div class="kpi-delta flat">Commercial terrain</div></div>
</div>

<div class="grid g2">
  <div class="card">
    <div class="section-title">Annuaire</div>
    <table class="tbl">
      <thead><tr><th>Employé</th><th>Poste</th><th>Service</th><th>Entrée</th><th>Statut</th></tr></thead>
      <tbody>
        <tr><td style="display:flex;align-items:center;gap:10px;"><div class="tag-icon" style="width:30px;height:30px;background:var(--blue-bg);color:var(--indigo-deep);font-size:11px;font-weight:700;">AB</div><span class="name-cell">Aïcha Belinga</span></td><td>Directrice générale</td><td>Direction</td><td class="mono" style="font-size:12px;">03/2021</td><td><span class="pill pill-success">Actif</span></td></tr>
        <tr><td style="display:flex;align-items:center;gap:10px;"><div class="tag-icon" style="width:30px;height:30px;background:var(--green-bg);color:var(--green);font-size:11px;font-weight:700;">JT</div><span class="name-cell">Jean Tchoumi</span></td><td>Comptable senior</td><td>Finance</td><td class="mono" style="font-size:12px;">09/2022</td><td><span class="pill pill-success">Actif</span></td></tr>
        <tr><td style="display:flex;align-items:center;gap:10px;"><div class="tag-icon" style="width:30px;height:30px;background:var(--amber-bg);color:var(--amber);font-size:11px;font-weight:700;">EN</div><span class="name-cell">Éric Ngono</span></td><td>Commercial terrain</td><td>Commercial</td><td class="mono" style="font-size:12px;">01/2024</td><td><span class="pill pill-success">Actif</span></td></tr>
        <tr><td style="display:flex;align-items:center;gap:10px;"><div class="tag-icon" style="width:30px;height:30px;background:var(--blue-bg);color:var(--indigo-deep);font-size:11px;font-weight:700;">ME</div><span class="name-cell">Marlène Ekedi</span></td><td>Assistante administrative</td><td>Administration</td><td class="mono" style="font-size:12px;">06/2023</td><td><span class="pill pill-success">Actif</span></td></tr>
        <tr><td style="display:flex;align-items:center;gap:10px;"><div class="tag-icon" style="width:30px;height:30px;background:var(--red-bg);color:var(--red);font-size:11px;font-weight:700;">PA</div><span class="name-cell">Paul Assamba</span></td><td>Technicien support</td><td>Opérations</td><td class="mono" style="font-size:12px;">11/2023</td><td><span class="pill pill-warning">Congé</span></td></tr>
      </tbody>
    </table>
  </div>
  <div>
    <div class="card" style="margin-bottom:16px;">
      <div class="section-title">Répartition par service</div>
      <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Commercial — 4 employés</span><strong class="mono">34</strong></div>
    <div class="progress"><div style="width:34%;background:#A9761F"></div></div>
  </div><div style="height:10px;"></div>
      <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Finance — 3 employés</span><strong class="mono">25</strong></div>
    <div class="progress"><div style="width:25%;background:#1A4A3C"></div></div>
  </div><div style="height:10px;"></div>
      <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Opérations — 3 employés</span><strong class="mono">25</strong></div>
    <div class="progress"><div style="width:25%;background:#C06A2C"></div></div>
  </div><div style="height:10px;"></div>
      <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Direction &amp; Administration — 2 employés</span><strong class="mono">16</strong></div>
    <div class="progress"><div style="width:16%;background:#6B6858"></div></div>
  </div>
    </div>
    <div class="ai-card">
      <div class="ai-badge"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg>Observation Elara</div>
      <div class="list-row"><span class="pill" style="background:var(--amber)18;color:var(--amber);margin-right:12px;">Charge</span><span style="flex:1;font-size:13px;">Service Commercial : 4 personnes pour 34 clients actifs, au-dessus de la moyenne du secteur</span></div>
    </div>
  </div>
</div>
</section>` }} />
  );
}
