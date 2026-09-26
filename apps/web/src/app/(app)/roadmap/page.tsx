import React from "react";

export default function RoadmapPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-roadmap">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Vision produit</span></div>
    <h1 class="page-title">Feuille de route</h1>
    <p class="page-sub">Une roadmap modulaire disciplinée — chaque version ajoute une couche fonctionnelle sans reconstruire le socle.</p></div>
    <div class="topbar-actions">
    </div>
  </div>

<div class="rm-track">
  <div class="rm-node on"></div><div class="rm-seg on"></div>
  <div class="rm-node on"></div><div class="rm-seg"></div>
  <div class="rm-node next"></div><div class="rm-seg"></div>
  <div class="rm-node"></div>
</div>

<div class="grid g4" style="margin-bottom:20px;">
  
    <div class="card rm-card">
      <span class="pill pill-success rm-status">Disponible</span>
      <div class="rm-version">V1</div>
      <div class="rm-name">MVP</div>
      <div class="rm-mod"><span class="dot2"></span>Business Scanner</div><div class="rm-mod"><span class="dot2"></span>Mémoire Entreprise</div><div class="rm-mod"><span class="dot2"></span>Directeur Financier Virtuel</div><div class="rm-mod"><span class="dot2"></span>Rapport Automatisé</div><div class="rm-mod"><span class="dot2"></span>Assistant Virtuel</div>
    </div>
    <div class="card rm-card">
      <span class="pill pill-warning rm-status">En cours</span>
      <div class="rm-version">V2</div>
      <div class="rm-name">Commercial Intelligence</div>
      <div class="rm-mod"><span class="dot2"></span>Assistant Commercial</div><div class="rm-mod"><span class="dot2"></span>WhatsApp Business</div><div class="rm-mod"><span class="dot2"></span>CRM léger</div><div class="rm-mod"><span class="dot2"></span>Relances automatiques</div>
    </div>
    <div class="card rm-card">
      <span class="pill pill-neutral rm-status">Planifié</span>
      <div class="rm-version">V3</div>
      <div class="rm-name">Operations Intelligence</div>
      <div class="rm-mod"><span class="dot2"></span>Assistant Opérationnel</div><div class="rm-mod"><span class="dot2"></span>Stocks &amp; achats</div><div class="rm-mod"><span class="dot2"></span>Fournisseurs</div><div class="rm-mod"><span class="dot2"></span>Rapprochement Mobile Money</div>
    </div>
    <div class="card rm-card">
      <span class="pill pill-neutral rm-status">Planifié</span>
      <div class="rm-version">V4</div>
      <div class="rm-name">Automation / Agents</div>
      <div class="rm-mod"><span class="dot2"></span>Automatisations avancées</div><div class="rm-mod"><span class="dot2"></span>Agents autonomes supervisés</div><div class="rm-mod"><span class="dot2"></span>Intégrations ERP / banques</div>
    </div>
</div>

<div class="card">
  <div class="section-title">Modules futurs (au-delà de V4)</div>
  <div class="section-sub">Même socle, agents additionnels — Directeur Financier Virtuel (aujourd’hui) → Assistant Commercial → Assistant Opérationnel → Assistant RH → Assistant Juridique → Assistant Achats</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
    <span class="pill pill-neutral" style="padding:7px 14px;">Assistant RH</span><span class="pill pill-neutral" style="padding:7px 14px;">Assistant Juridique</span><span class="pill pill-neutral" style="padding:7px 14px;">Assistant Achats</span>
  </div>
  <div style="margin-top:14px;"><a href="/agents" style="font-size:12.5px;font-weight:700;color:var(--ink-3);font-family:var(--font-heading);">Voir le détail dans Agents &amp; Extensions →</a></div>
  <div class="divider"></div>
  <div class="section-title" style="font-size:14px;">Trajectoire de montée en charge</div>
  <p style="font-size:13px;color:var(--text-dim);line-height:1.8;margin:10px 0 0;max-width:640px;">
    De 10 entreprises pilotes à plusieurs millions d’utilisateurs, sans réécriture de l’architecture —
    le principe directeur reste : « start simple, design for scale ».
  </p>
</div>
</section>` }} />
  );
}

