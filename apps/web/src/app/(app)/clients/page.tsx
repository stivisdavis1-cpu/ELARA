import React from "react";

export default function ClientsPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-clients">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Relations commerciales</span></div>
    <h1 class="page-title">Clients &amp; fournisseurs</h1>
    <p class="page-sub">Suivi des soldes, relances et historique de paiement, en un seul endroit.</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      <button class="btn btn-ghost">Importer</button><button class="btn btn-primary teal">Ajouter un contact</button>
    </div>
  </div>

<div class="grid g4" style="margin-bottom:16px;">
  <div class="card"><div class="kpi-label">Créances clients</div><div class="kpi-value" style="color:var(--red);">612 000 F</div><div class="kpi-delta flat">7 factures en attente</div></div>
  <div class="card"><div class="kpi-label">Dettes fournisseurs</div><div class="kpi-value">248 000 F</div><div class="kpi-delta flat">3 échéances ce mois</div></div>
  <div class="card"><div class="kpi-label">Clients actifs</div><div class="kpi-value">34</div><div class="kpi-delta up">↑ 4 ce mois</div></div>
  <div class="card"><div class="kpi-label">Délai moyen de paiement</div><div class="kpi-value">27 j</div><div class="kpi-delta down">↑ 5 j vs moyenne</div></div>
</div>

<div class="grid g2">
  <div class="card">
    <div class="section-title">Clients</div>
    <table class="tbl">
      <thead><tr><th>Client</th><th>Secteur</th><th>Solde</th><th>Statut</th></tr></thead>
      <tbody>
        <tr><td class="name-cell">Clinique Excellence Santé</td><td>Santé</td><td class="mono" style="color:var(--red);">312 000 F</td><td><span class="pill pill-danger">Retard 42 j</span></td></tr>
        <tr><td class="name-cell">Collège Notre-Dame</td><td>Éducation</td><td class="mono" style="color:var(--red);">148 000 F</td><td><span class="pill pill-danger">Retard 18 j</span></td></tr>
        <tr><td class="name-cell">Groupe Ngassa &amp; Fils</td><td>Industrie</td><td class="mono">152 000 F</td><td><span class="pill pill-warning">À échoir</span></td></tr>
        <tr><td class="name-cell">Cabinet Fotso Consulting</td><td>Conseil</td><td class="mono">89 000 F</td><td><span class="pill pill-info">En cours</span></td></tr>
        <tr><td class="name-cell">Dell Technologies Afrique</td><td>Fournisseur boissons</td><td class="mono">0 F</td><td><span class="pill pill-success">À jour</span></td></tr>
      </tbody>
    </table>
  </div>
  <div>
    <div class="card" style="margin-bottom:16px;">
      <div class="section-title">Créances par ancienneté</div>
      <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">0 – 15 jours</span><strong class="mono">15</strong></div>
    <div class="progress"><div style="width:15%;background:#A9761F"></div></div>
  </div><div style="height:10px;"></div>
      <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">16 – 30 jours</span><strong class="mono">30</strong></div>
    <div class="progress"><div style="width:30%;background:#C06A2C"></div></div>
  </div><div style="height:10px;"></div>
      <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">+ 30 jours</span><strong class="mono">75</strong></div>
    <div class="progress"><div style="width:75%;background:#A23B3B"></div></div>
  </div>
    </div>
    <div class="ai-card">
      <div class="ai-badge"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg>Suggestions Elara</div>
      <div class="list-row"><span class="pill" style="background:var(--red)18;color:var(--red);margin-right:12px;">Relance</span><span style="flex:1;font-size:13px;">Clinique Excellence Santé — 42 j de retard, relance ferme recommandée</span></div>
      <div class="list-row"><span class="pill" style="background:var(--green)18;color:var(--green);margin-right:12px;">Opportunité</span><span style="flex:1;font-size:13px;">Collège Notre-Dame — commandes +18%/mois, bon candidat crédit</span></div>
    </div>
  </div>
</div>
</section>` }} />
  );
}
