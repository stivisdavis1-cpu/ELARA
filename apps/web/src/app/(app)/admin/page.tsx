import React from "react";

export default function AdminPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-admin">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Console admin · multi-tenant</span></div>
    <h1 class="page-title">Santé de la plateforme</h1>
    <p class="page-sub">Observabilité tous plans confondus — mis à jour il y a 2 minutes.</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      <button class="btn btn-ghost">30 derniers jours</button><button class="btn btn-primary teal">Voir les traces</button>
    </div>
  </div>

<div class="grid g4" style="margin-bottom:16px;">
  <div class="card"><div class="kpi-label">Uptime plateforme</div><div class="kpi-value">99.97%</div><div class="kpi-delta up">↑ 0,02 pt vs 7 j</div></div>
  <div class="card"><div class="kpi-label">Latence API (P95)</div><div class="kpi-value">312 ms</div><div class="kpi-delta down">↑ 18 ms vs 7 j</div></div>
  <div class="card"><div class="kpi-label">Taux d’erreur</div><div class="kpi-value">0.42%</div><div class="kpi-delta up">↓ 0,08 pt vs 7 j</div></div>
  <div class="card"><div class="kpi-label">Coût moyen / tenant</div><div class="kpi-value">1 840 F</div><div class="kpi-delta down">↑ 6% vs mois dernier</div></div>
</div>

<div class="grid g2" style="margin-bottom:16px;">
  <div class="card">
    <div class="section-title">Tenants par palier d’abonnement</div>
    <div class="section-sub">412 tenants actifs · MRR total 6,4 M F</div>
    <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Freemium · 218 tenants</span><strong class="mono">24</strong></div>
    <div class="progress"><div style="width:24%;background:#9C9986"></div></div>
  </div><div style="height:12px;"></div>
    <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Starter · 132 tenants</span><strong class="mono">52</strong></div>
    <div class="progress"><div style="width:52%;background:#1A4A3C"></div></div>
  </div><div style="height:12px;"></div>
    <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Pro · 47 tenants</span><strong class="mono">72</strong></div>
    <div class="progress"><div style="width:72%;background:#A9761F"></div></div>
  </div><div style="height:12px;"></div>
    <div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;"><span style="color:var(--text-dim);">Business · 15 tenants</span><strong class="mono">88</strong></div>
    <div class="progress"><div style="width:88%;background:#1A4A3C"></div></div>
  </div>
  </div>
  <div class="ai-card">
    <div class="ai-badge"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg>Alertes système actives</div>
    <div class="list-row"><span class="pill" style="background:var(--red)18;color:var(--red);margin-right:12px;">Critique</span><span style="flex:1;font-size:13px;">Pic de consommation — tenant Distribution Boissons Kamga (+180%)</span></div>
    <div class="list-row"><span class="pill" style="background:var(--amber)18;color:var(--amber);margin-right:12px;">Avertissement</span><span style="flex:1;font-size:13px;">Précision OCR en baisse — reçus manuscrits WhatsApp</span></div>
    <div class="list-row"><span class="pill" style="background:var(--indigo)18;color:var(--indigo);margin-right:12px;">Surveillance</span><span style="flex:1;font-size:13px;">Latence élevée — région Douala, P95 à 640 ms</span></div>
  </div>
</div>

<div class="card">
  <div class="section-title">Santé par tenant (échantillon)</div>
  <table class="tbl">
    <thead><tr><th>Tenant</th><th>Plan</th><th>Health score</th><th>Coût moyen (mois)</th><th>Alerte</th></tr></thead>
    <tbody>
      <tr><td class="name-cell">OrbitTech Services</td><td><span class="pill pill-info">Starter</span></td><td>78</td><td class="mono">1 240 F</td><td>—</td></tr>
      <tr><td class="name-cell">Distribution Boissons Kamga</td><td><span class="pill pill-neutral">Pro</span></td><td>64</td><td class="mono">5 920 F</td><td><span class="pill pill-danger">Pic de consommation</span></td></tr>
      <tr><td class="name-cell">Groupe Ngassa &amp; Fils</td><td><span class="pill pill-neutral">Business</span></td><td>88</td><td class="mono">3 110 F</td><td>—</td></tr>
      <tr><td class="name-cell">Collège Notre-Dame</td><td><span class="pill pill-neutral">Freemium</span></td><td>55</td><td class="mono">210 F</td><td><span class="pill pill-warning">Compte inactif 12 j</span></td></tr>
    </tbody>
  </table>
</div>
</section>` }} />
  );
}
