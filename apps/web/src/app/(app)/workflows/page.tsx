import React from "react";

export default function WorkflowsPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-workflows">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Automatisation</span></div>
    <h1 class="page-title">Concepteur de workflows</h1>
    <p class="page-sub">Décrivez un processus en langage naturel — Elara le transforme en workflow automatisé, sans code.</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      <button class="btn btn-ghost">Modèles de workflows</button><button class="btn btn-primary teal">Nouveau workflow</button>
    </div>
  </div>

<div class="grid g4" style="margin-bottom:16px;">
  <div class="card"><div class="kpi-label">Workflows actifs</div><div class="kpi-value">5</div><div class="kpi-delta up">↑ 1 ce mois</div></div>
  <div class="card"><div class="kpi-label">Exécutions (mois)</div><div class="kpi-value">312</div><div class="kpi-delta up">↑ 18%</div></div>
  <div class="card"><div class="kpi-label">Temps estimé gagné</div><div class="kpi-value">14 h<span style="font-size:13px;color:var(--text-dim);font-weight:500;">/mois</span></div><div class="kpi-delta up">↑ 2 h vs mois dernier</div></div>
  <div class="card"><div class="kpi-label">Taux de succès</div><div class="kpi-value">97%</div><div class="kpi-delta flat">Stable</div></div>
</div>

<div class="card" style="margin-bottom:16px;">
  <div class="section-title">Décrire un nouveau workflow</div>
  <div class="section-sub">Exemple : « Quand une facture dépasse 30 jours de retard, envoie une relance WhatsApp et notifie le comptable »</div>
  <div style="display:flex;gap:10px;margin-top:14px;">
    <input class="field" placeholder="Décrivez le processus à automatiser…" style="flex:1;">
    <button class="btn btn-primary teal"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg> Générer le workflow</button>
  </div>
  <div class="chip-row" style="margin-top:12px;">
    <span class="chip" style="background:#fff;border:1px solid var(--line);color:var(--text);">Relancer les factures en retard de +30 jours</span><span class="chip" style="background:#fff;border:1px solid var(--line);color:var(--text);">Envoyer un rapport le 1er de chaque mois</span><span class="chip" style="background:#fff;border:1px solid var(--line);color:var(--text);">Alerter si une dépense dépasse 500 000 F</span>
  </div>
</div>

<div class="section-title" style="margin-bottom:12px;">Workflows actifs</div>

  <div class="card" style="margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;">
      <div><div style="font-weight:700;font-size:14px;margin-bottom:2px;font-family:var(--font-heading);">Relance automatique des factures en retard</div><div style="font-size:11.5px;color:var(--text-dim);">128 exécutions ce mois</div></div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span class="pill pill-success">Actif</span>
        <button class="btn btn-ghost" style="padding:5px 12px;font-size:11.5px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg> Modifier avec l’Avancé</button>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;">
      <span class="pill pill-info">Facture &gt; 30 j de retard</span>
      <span style="color:var(--text-faint);font-size:13px;">→</span>
      <span class="pill pill-warning">Aucun paiement partiel</span>
      <span style="color:var(--text-faint);font-size:13px;">→</span>
      <span class="pill pill-success">Envoyer relance WhatsApp + email</span>
    </div>
  </div>
  <div class="card" style="margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;">
      <div><div style="font-weight:700;font-size:14px;margin-bottom:2px;font-family:var(--font-heading);">Rapport mensuel automatique</div><div style="font-size:11.5px;color:var(--text-dim);">1 exécution ce mois</div></div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span class="pill pill-success">Actif</span>
        <button class="btn btn-ghost" style="padding:5px 12px;font-size:11.5px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg> Modifier avec l’Avancé</button>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;">
      <span class="pill pill-info">1er du mois, 08:00</span>
      <span style="color:var(--text-faint);font-size:13px;">→</span>
      <span class="pill pill-warning">—</span>
      <span style="color:var(--text-faint);font-size:13px;">→</span>
      <span class="pill pill-success">Générer et envoyer le Rapport Automatisé au dirigeant</span>
    </div>
  </div>
  <div class="card" style="margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;">
      <div><div style="font-weight:700;font-size:14px;margin-bottom:2px;font-family:var(--font-heading);">Alerte dépense anormale</div><div style="font-size:11.5px;color:var(--text-dim);">6 exécutions ce mois</div></div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span class="pill pill-success">Actif</span>
        <button class="btn btn-ghost" style="padding:5px 12px;font-size:11.5px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg> Modifier avec l’Avancé</button>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;">
      <span class="pill pill-info">Nouvelle dépense enregistrée</span>
      <span style="color:var(--text-faint);font-size:13px;">→</span>
      <span class="pill pill-warning">Montant &gt; 500 000 F ou +40% vs moyenne</span>
      <span style="color:var(--text-faint);font-size:13px;">→</span>
      <span class="pill pill-success">Notifier le Directeur Financier Virtuel et créer une anomalie</span>
    </div>
  </div>
  <div class="card" style="margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;">
      <div><div style="font-weight:700;font-size:14px;margin-bottom:2px;font-family:var(--font-heading);">Onboarding nouveau client</div><div style="font-size:11.5px;color:var(--text-dim);">Non activé</div></div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span class="pill pill-neutral">Brouillon</span>
        <button class="btn btn-ghost" style="padding:5px 12px;font-size:11.5px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg> Modifier avec l’Avancé</button>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;">
      <span class="pill pill-info">Nouveau client créé</span>
      <span style="color:var(--text-faint);font-size:13px;">→</span>
      <span class="pill pill-warning">—</span>
      <span style="color:var(--text-faint);font-size:13px;">→</span>
      <span class="pill pill-success">Créer le dossier documents et envoyer l’email de bienvenue</span>
    </div>
  </div>

<div class="ai-card">
  <div class="ai-badge"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg>Suggestion Elara</div>
  <div class="list-row"><span class="pill" style="background:var(--indigo)18;color:var(--indigo);margin-right:12px;">Nouveau workflow</span><span style="flex:1;font-size:13px;">8 relances envoyées manuellement ce mois pour le même motif — Elara peut créer un workflow automatique équivalent</span></div>
</div>
</section>` }} />
  );
}

