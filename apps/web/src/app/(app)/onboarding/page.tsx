import React from "react";

export default function OnboardingPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-onboarding">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Configuration initiale · étape 3 sur 5</span></div>
    <h1 class="page-title">Parlez-nous de votre activité</h1>
    <p class="page-sub">Elara construit progressivement votre mémoire d’entreprise — vous pourrez toujours compléter ces informations plus tard.</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      
    </div>
  </div>
<div class="onb-wrap">
  <div class="tab-pill-row">
    <button class="tab-pill active">Parcours B — nouvelle entreprise</button>
    <button class="tab-pill">Parcours A — entreprise existante</button>
  </div>
  <div class="card">
    <div class="steps">
      <div class="step-seg done"></div><div class="step-seg done"></div><div class="step-seg current"></div><div class="step-seg"></div><div class="step-seg"></div>
    </div>
    <div class="field-label">Nom de l’entreprise</div>
    <input class="field" value="Nova Informatique Sarl">
    <div class="field-label">Secteur d’activité</div>
    <div class="opt-grid">
      <div class="opt sel">Services</div><div class="opt">Distribution</div><div class="opt">Commerce</div>
      <div class="opt">Industrie légère</div><div class="opt">Restauration</div><div class="opt">Santé</div>
      <div class="opt">Éducation</div><div class="opt">BTP &amp; construction</div><div class="opt">Autre</div>
    </div>
    <div class="field-label">Ville principale</div>
    <input class="field" value="Yaoundé">
    <div class="divider"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:12.5px;color:var(--text-faint);font-weight:700;cursor:pointer;font-family:var(--font-heading);">Passer cette étape</span>
      <div style="display:flex;gap:10px;"><button class="btn btn-ghost">Retour</button><button class="btn btn-primary teal">Continuer</button></div>
    </div>
  </div>
</div>
</section>` }} />
  );
}
