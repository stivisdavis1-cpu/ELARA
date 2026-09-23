import React from "react";

export default function MobilePage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-mobile">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Surface mobile</span></div>
    <h1 class="page-title">Aperçu mobile — Accueil</h1>
    <p class="page-sub">Même mémoire d’entreprise, pensée pour un usage sur le terrain.</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      
    </div>
  </div>
<div style="display:flex;justify-content:center;">
<div class="phone"><div class="phone-screen">
  <div class="phone-status"><span>9:41</span><span>●●● Orange · 4G</span></div>
  <div class="phone-body" style="flex:1;">
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">OrbitTech Services</div>
    <div style="font-family:var(--font-heading);font-size:20px;font-weight:700;margin-bottom:14px;">Bonjour, Aïcha 👋</div>
    <div class="card" style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
      <div class="ring" style="width:58px;height:58px;background:conic-gradient(#A9761F 280.8deg, #ECE9DD 0)">
    <div class="ring-val">78</div>
  </div>
      <div><div style="font-weight:700;font-size:13.5px;font-family:var(--font-heading);">Business Health Score</div><div style="font-size:11.5px;color:var(--text-dim);">Bon état · 3 points à traiter</div></div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:12px;">
      <div class="card" style="flex:1;padding:14px;"><div style="font-size:10.5px;color:var(--text-dim);font-weight:700;font-family:var(--font-heading);text-transform:uppercase;">Trésorerie</div><div style="font-weight:700;font-size:15px;margin-top:4px;" class="mono">1 065 000 F</div></div>
      <div class="card" style="flex:1;padding:14px;"><div style="font-size:10.5px;color:var(--text-dim);font-weight:700;font-family:var(--font-heading);text-transform:uppercase;">Impayés</div><div style="font-weight:700;font-size:15px;margin-top:4px;color:var(--red);" class="mono">612 000 F</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">
      
        <div class="card" style="text-align:center;padding:12px 4px;"><div style="color:var(--indigo);margin-bottom:6px;display:flex;justify-content:center;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" stroke-linecap="round"></path><path d="M3 12h18" stroke-linecap="round"></path></svg></div><div style="font-size:10px;font-weight:700;font-family:var(--font-heading);">Scanner</div></div>
        <div class="card" style="text-align:center;padding:12px 4px;"><div style="color:var(--indigo);margin-bottom:6px;display:flex;justify-content:center;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 17l5-6 4 3 6-8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M14 6h4v4" stroke-linecap="round" stroke-linejoin="round"></path></svg></div><div style="font-size:10px;font-weight:700;font-family:var(--font-heading);">Mobile Money</div></div>
        <div class="card" style="text-align:center;padding:12px 4px;"><div style="color:var(--indigo);margin-bottom:6px;display:flex;justify-content:center;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.2-3.6A7.96 7.96 0 0 1 4 12Z" stroke-linejoin="round"></path><circle cx="9" cy="12" r=".8" fill="currentColor" stroke="none"></circle><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"></circle><circle cx="15" cy="12" r=".8" fill="currentColor" stroke="none"></circle></svg></div><div style="font-size:10px;font-weight:700;font-family:var(--font-heading);">Assistant</div></div>
        <div class="card" style="text-align:center;padding:12px 4px;"><div style="color:var(--indigo);margin-bottom:6px;display:flex;justify-content:center;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="8" r="3.2"></circle><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke-linecap="round"></path><path d="M16 4.5c1.7.4 3 1.9 3 3.6s-1.3 3.2-3 3.6M20 20c0-2.6-1.7-4.5-4-5.3" stroke-linecap="round"></path></svg></div><div style="font-size:10px;font-weight:700;font-family:var(--font-heading);">Relancer</div></div>
    </div>
    <div style="font-weight:700;font-size:13px;margin-bottom:10px;font-family:var(--font-heading);">Paiements à rapprocher</div>
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding:14px;">
      <div><div style="font-weight:700;font-size:13.5px;" class="mono">+152 000 F reçu</div><div style="font-size:11px;color:var(--text-dim);">Orange Money · 08:14</div></div>
      <span class="pill pill-warning">À lier</span>
    </div>
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:14px;">
      <div><div style="font-weight:700;font-size:13.5px;" class="mono">+89 000 F reçu</div><div style="font-size:11px;color:var(--text-dim);">MTN MoMo · hier 17:32</div></div>
      <span class="pill pill-success">Lié</span>
    </div>
  </div>
  <div class="tabbar">
    <div class="tab-item active"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>Accueil</div>
    <div class="tab-item"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" stroke-linecap="round"></path><path d="M3 12h18" stroke-linecap="round"></path></svg>Scanner</div>
    <div class="tab-item"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.2-3.6A7.96 7.96 0 0 1 4 12Z" stroke-linejoin="round"></path><circle cx="9" cy="12" r=".8" fill="currentColor" stroke="none"></circle><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"></circle><circle cx="15" cy="12" r=".8" fill="currentColor" stroke="none"></circle></svg>Assistant</div>
    <div class="tab-item"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path><path d="M9 13h6M9 17h6M9 9h2" stroke-linecap="round"></path></svg>Rapports</div>
  </div>
</div></div>
</div>
</section>` }} />
  );
}
