import React from "react";

export default function AgentsPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-agents">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Écosystème Avancé</span></div>
    <h1 class="page-title">Agents &amp; Extensions</h1>
    <p class="page-sub">Directeur Financier Virtuel est le premier agent connecté à votre Mémoire d’entreprise. Chaque agent suivant — interne, partenaire ou tiers — rejoint la même plateforme, sans jamais dupliquer vos données.</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      <button class="btn btn-ghost">Voir un exemple de manifeste</button><button class="btn btn-primary teal">Proposer un agent</button>
    </div>
  </div>

<div class="section-title">Agent actif</div>
<div class="section-sub">Raisonne exclusivement sur les données réelles de votre entreprise</div>
<div class="grid g3" style="margin-bottom:24px;">
  
    <div class="card rm-card">
      <span class="pill pill-success rm-status">Actif</span>
      <div style="width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--gold-bg);color:var(--teal-deep);margin-bottom:10px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 17l5-6 4 3 6-8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M14 6h4v4" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
      <div class="rm-name">Directeur Financier Virtuel</div>
      <p style="font-size:12.5px;color:var(--text-dim);line-height:1.7;margin:2px 0 12px;">Trésorerie, factures, rapprochement bancaire et Mobile Money, TVA et projections à 30 jours.</p>
      <div style="font-size:11.5px;color:var(--text-faint);">Validation humaine requise avant tout envoi</div>
    </div>
</div>

<div class="section-title">Prochains agents (même socle, même registre)</div>
<div class="section-sub">Roadmap déjà planifiée — activés progressivement sans reconstruction de la plateforme</div>
<div class="grid g3" style="margin-bottom:24px;">
  
    <div class="card rm-card">
      <span class="pill pill-warning rm-status">En cours · V2</span>
      <div style="width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--paper);color:var(--ink-3);margin-bottom:10px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 17l6-6 4 4 8-9" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15 6h6v6" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 21h18" stroke-linecap="round"></path></svg></div>
      <div class="rm-name">Assistant Commercial</div>
      <p style="font-size:12.5px;color:var(--text-dim);line-height:1.7;margin:2px 0;">Prospects, pipeline, relances et prévisions commerciales à partir de WhatsApp et de la Mémoire d’entreprise.</p>
    </div>
    <div class="card rm-card">
      <span class="pill pill-neutral rm-status">Planifié · V3</span>
      <div style="width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--paper);color:var(--ink-3);margin-bottom:10px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7l9-4 9 4-9 4-9-4Z" stroke-linejoin="round"></path><path d="M3 7v10l9 4 9-4V7" stroke-linejoin="round"></path><path d="M12 11v10"></path></svg></div>
      <div class="rm-name">Assistant Opérationnel</div>
      <p style="font-size:12.5px;color:var(--text-dim);line-height:1.7;margin:2px 0;">Stocks, fournisseurs, achats et anomalies opérationnelles.</p>
    </div>
    <div class="card rm-card">
      <span class="pill pill-neutral rm-status">Planifié · V4</span>
      <div style="width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--paper);color:var(--ink-3);margin-bottom:10px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="4" width="6.5" height="5.5" rx="1.4"></rect><rect x="15" y="4" width="6.5" height="5.5" rx="1.4"></rect><rect x="9" y="15" width="6.5" height="5.5" rx="1.4"></rect><path d="M9 6.8H6.2a1 1 0 0 0-1 1V17" stroke-linecap="round"></path><path d="M15 6.8h2.8a1 1 0 0 1 1 1V17" stroke-linecap="round"></path><path d="M12.2 15V9.5" stroke-linecap="round"></path></svg></div>
      <div class="rm-name">Agents d’automatisation</div>
      <p style="font-size:12.5px;color:var(--text-dim);line-height:1.7;margin:2px 0;">Workflows complets de bout en bout, toujours avec validation humaine sur les actions sensibles.</p>
    </div>
</div>

<div class="section-title">Extensions futures</div>
<div class="section-sub">Réservées dans l’architecture (Partie X / XXXIV) — hors périmètre du MVP actuel</div>
<div class="grid g3" style="margin-bottom:24px;">
  
    <div class="card" style="display:flex;flex-direction:column;align-items:flex-start;gap:10px;">
      <span class="pill pill-neutral">Extension future</span>
      <div style="font-family:var(--font-heading);font-size:15px;font-weight:700;">Assistant RH</div>
      <button class="btn btn-ghost" style="padding:7px 14px;font-size:12px;">Rejoindre la liste d’attente</button>
    </div>
    <div class="card" style="display:flex;flex-direction:column;align-items:flex-start;gap:10px;">
      <span class="pill pill-neutral">Extension future</span>
      <div style="font-family:var(--font-heading);font-size:15px;font-weight:700;">Assistant Juridique</div>
      <button class="btn btn-ghost" style="padding:7px 14px;font-size:12px;">Rejoindre la liste d’attente</button>
    </div>
    <div class="card" style="display:flex;flex-direction:column;align-items:flex-start;gap:10px;">
      <span class="pill pill-neutral">Extension future</span>
      <div style="font-family:var(--font-heading);font-size:15px;font-weight:700;">Assistant Achats</div>
      <button class="btn btn-ghost" style="padding:7px 14px;font-size:12px;">Rejoindre la liste d’attente</button>
    </div>
</div>

<div class="card" style="margin-bottom:24px;">
  <div class="section-title">Comment un agent rejoint Elara</div>
  <div class="section-sub">Le même cycle s’applique à un agent interne, partenaire ou tiers</div>
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
    
      <span class="pill pill-info">Proposition</span><span style="color:var(--text-faint);font-size:13px;">→</span>
    
      <span class="pill pill-info">Sandbox</span><span style="color:var(--text-faint);font-size:13px;">→</span>
    
      <span class="pill pill-info">Gouvernance</span><span style="color:var(--text-faint);font-size:13px;">→</span>
    
      <span class="pill pill-info">Publication limitée</span><span style="color:var(--text-faint);font-size:13px;">→</span>
    
      <span class="pill pill-info">Publication générale</span>
    
  </div>
</div>

<div class="grid g3" style="margin-bottom:24px;">
  
    <div class="card">
      <div class="section-title" style="font-size:14px;">Agents internes</div>
      <span class="pill pill-neutral" style="margin-bottom:10px;">Cycle standard</span>
      <p style="font-size:12.5px;color:var(--text-dim);line-height:1.7;margin:8px 0 0;">Développés par l’équipe produit Elara — Assistant Commercial, Assistant Opérationnel, Assistant RH, Assistant Juridique, Assistant Achats.</p>
    </div>
    <div class="card">
      <div class="section-title" style="font-size:14px;">Agents partenaires</div>
      <span class="pill pill-neutral" style="margin-bottom:10px;">Revue de sécurité renforcée</span>
      <p style="font-size:12.5px;color:var(--text-dim);line-height:1.7;margin:8px 0 0;">Cabinet comptable, assureur ou institution financière branchés via un manifeste scopé à leur domaine.</p>
    </div>
    <div class="card">
      <div class="section-title" style="font-size:14px;">Agents tiers (marketplace, long terme)</div>
      <span class="pill pill-neutral" style="margin-bottom:10px;">Certification requise</span>
      <p style="font-size:12.5px;color:var(--text-dim);line-height:1.7;margin:8px 0 0;">Éditeurs sectoriels indépendants (BTP, santé, restauration…), soumis au sandbox et au partage de revenu.</p>
    </div>
</div>

<div class="ai-card">
  <div class="ai-badge"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 4h4a1 1 0 0 1 1 1v2.2a1.8 1.8 0 0 0 2.6 1.6A1.8 1.8 0 0 1 19.2 10.4 1.8 1.8 0 0 0 20 13a1.8 1.8 0 0 1-1.6 2.6H16a1 1 0 0 1-1-1v-2.2a1.8 1.8 0 0 0-3.4 0V16a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.2a1.8 1.8 0 0 0-2.6-1.6A1.8 1.8 0 0 1 4.8 9 1.8 1.8 0 0 0 4 6.4 1.8 1.8 0 0 1 5.6 3.8 1.8 1.8 0 0 0 8 5.2 1 1 0 0 1 9 4Z" stroke-linejoin="round" stroke-linecap="round"></path></svg>Exemple de manifeste d’agent</div>
  <pre style="margin:0;font-family:monospace;font-size:12px;line-height:1.85;color:var(--ink-2);background:var(--paper);border:1px solid var(--line);border-radius:9px;padding:16px 18px;overflow-x:auto;">{
  "agent_id": "cfo-Avancé",
  "domaine": "finance",
  "editeur": "interne",
  "version": "1.0",
  "permissions_business_memory": ["factures:lire", "paiements:lire", "tresorerie:lire"],
  "actions_exposees": ["generer_rapport", "preparer_relance"],
  "validation_humaine": "requise avant tout envoi",
  "modele_ia": "routing multi-fournisseurs (AI Gateway)",
  "quotas": "selon palier tarifaire du tenant"
}</pre>
  <div style="font-size:11.5px;color:var(--text-dim);margin-top:10px;">Ce même format sera utilisé pour Assistant Commercial, Assistant Opérationnel, puis pour tout futur agent partenaire ou tiers — c’est la seule porte d’entrée dans la plateforme.</div>
</div>
</section>` }} />
  );
}

