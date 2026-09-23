import React from "react";

export default function SecurityPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-security">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Console admin · confiance &amp; conformité</span></div>
    <h1 class="page-title">Sécurité &amp; gouvernance</h1>
    <p class="page-sub">Les principes structurants qui encadrent chaque action de la plateforme, du chiffrement à la validation humaine.</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      
    </div>
  </div>

<div class="grid g3" style="margin-bottom:16px;">
  <div class="card">
    <div class="tag-icon" style="background:var(--blue-bg);color:var(--indigo-deep);margin-bottom:12px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l7 3v6c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6l7-3Z" stroke-linejoin="round"></path><path d="M9 12l2 2 4-4.5" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
    <div class="section-title">Security by design</div>
    <ul style="padding-left:18px;margin:12px 0 0;font-size:13px;line-height:1.9;color:var(--text-dim);">
      <li>Chiffrement des données au repos et en transit</li>
      <li>Authentification multi-facteurs (MFA) et RBAC</li>
      <li>Isolation stricte des tenants (tenant_id + Row-Level Security)</li>
      <li>Secrets centralisés, journaux d’audit, sauvegardes, plan de reprise</li>
    </ul>
  </div>
  <div class="card">
    <div class="tag-icon" style="background:var(--green-bg);color:var(--green);margin-bottom:12px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="8" cy="9" r="3"></circle><circle cx="17" cy="10" r="2.4"></circle><path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14.5 19c0-2.2 1.7-3.8 4-3.8s4 1.6 4 3.8" stroke-linecap="round"></path></svg></div>
    <div class="section-title">Human-in-the-loop</div>
    <p style="font-size:13px;color:var(--text-dim);line-height:1.8;margin:12px 0 0;">
      Aucune action sensible — envoi de message, génération et envoi de facture, modification d’un statut
      financier — n’est exécutée automatiquement sans validation explicite, dès le MVP.
    </p>
  </div>
  <div class="card">
    <div class="tag-icon" style="background:var(--amber-bg);color:var(--amber);margin-bottom:12px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg></div>
    <div class="section-title">AI Governance</div>
    <ul style="padding-left:18px;margin:12px 0 0;font-size:13px;line-height:1.9;color:var(--text-dim);">
      <li>Grounding systématique sur les données réelles, avec citation des sources</li>
      <li>Score de confiance associé aux réponses et recommandations</li>
      <li>Versioning des prompts, des modèles et des jeux d’évaluation</li>
      <li>Audit trail dédié aux actions réalisées par l’Avancé</li>
    </ul>
  </div>
</div>

<div class="grid g2">
  <div class="card">
    <div class="section-title">Actions automatisées en attente de validation</div>
    <div class="section-sub">Exemple du garde-fou « human-in-the-loop » appliqué à une action sensible</div>
    <div class="validate-row">
      <div><div class="name-cell">Envoyer la relance à Clinique Excellence Santé</div><div class="meta">Proposée par Assistant Commercial · confiance 92%</div></div>
      <div style="display:flex;gap:8px;"><button class="btn btn-ghost" style="padding:6px 12px;">Modifier</button><button class="btn btn-primary teal" style="padding:6px 14px;">Valider</button></div>
    </div>
    <div class="validate-row">
      <div><div class="name-cell">Archiver le reçu matériel informatique du 04/09</div><div class="meta">Proposée par Business Scanner · confiance 97%</div></div>
      <div style="display:flex;gap:8px;"><button class="btn btn-ghost" style="padding:6px 12px;">Modifier</button><button class="btn btn-primary teal" style="padding:6px 14px;">Valider</button></div>
    </div>
    <div class="validate-row" style="margin-bottom:0;">
      <div><div class="name-cell">Marquer la facture Dell Technologies comme doublon</div><div class="meta">Proposée par Directeur Financier Virtuel · confiance 81%</div></div>
      <div style="display:flex;gap:8px;"><button class="btn btn-ghost" style="padding:6px 12px;">Modifier</button><button class="btn btn-primary teal" style="padding:6px 14px;">Valider</button></div>
    </div>
  </div>
  <div class="card">
    <div class="section-title">Journal d’audit — Actions automatisées</div>
    <table class="tbl">
      <thead><tr><th>Action</th><th>Agent</th><th>Validé par</th><th>Horodatage</th></tr></thead>
      <tbody>
        <tr><td class="name-cell">Facture #2026-0362 générée</td><td><span class="pill pill-info">Directeur Financier Virtuel</span></td><td>Aïcha Belinga</td><td class="mono">08:02</td></tr>
        <tr><td class="name-cell">Relance envoyée — La Savane</td><td><span class="pill pill-neutral">Assistant Commercial</span></td><td>Jean Tchoumi</td><td class="mono">Hier, 17:40</td></tr>
        <tr><td class="name-cell">Reçu matériel informatique archivé</td><td><span class="pill pill-neutral">Business Scanner</span></td><td>Aïcha Belinga</td><td class="mono">Hier, 09:15</td></tr>
      </tbody>
    </table>
  </div>
</div>
</section>` }} />
  );
}

