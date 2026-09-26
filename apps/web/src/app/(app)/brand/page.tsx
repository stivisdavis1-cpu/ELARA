import React from "react";

export default function BrandPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-brand">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Identité visuelle</span></div>
    <h1 class="page-title">Système de marque</h1>
    <p class="page-sub">Le repère graphique commun à toutes les surfaces Elara : marque, couleur, typographie.</p></div>
    <div class="topbar-actions">
    </div>
  </div>

<div class="logo-hero" style="margin-bottom:16px;">
  <div class="brand-lg">
    <svg width="56" height="48" viewBox="0 0 30 26" fill="none">
      <path d="M0 13 L6 13 L8.5 3 L12 23 L15.5 8 L18.5 18 L21 13 L30 13" stroke="url(#g2)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"></path>
      <defs><linearGradient id="g2" x1="0" y1="0" x2="30" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs>
    </svg>
    <div><div class="word">Elara</div><div class="tagline">Elara vous comprend, quelle que soit votre façon de travailler.</div></div>
  </div>
</div>

<div class="grid g3" style="margin-bottom:16px;">
  <div class="card">
    <div class="section-title">Palette</div>
    <div class="section-sub">4 couleurs de marque + neutres</div>
    <div class="swatch-row">
      <div class="swatch" style="background:#0E2A22;"></div>
      <div class="swatch" style="background:#A9761F;"></div>
      <div class="swatch" style="background:#1A4A3C;"></div>
      <div class="swatch" style="background:#C06A2C;"></div>
      <div class="swatch" style="background:#A23B3B;"></div>
      <div class="swatch" style="background:#F6F4EE;"></div>
    </div>
    <div style="font-size:11.5px;color:var(--text-dim);margin-top:12px;line-height:1.9;">
      Encre #0E2A22 · Or (sceau) #A9761F — réservé aux moments Elara · Encre secondaire #1A4A3C · Rouille #C06A2C · Brique #A23B3B · Papier #F6F4EE
    </div>
  </div>
  <div class="card">
    <div class="section-title">Typographie</div>
    <div style="font-family:var(--font-heading);font-size:24px;font-weight:700;margin:12px 0 2px;">Tahoma</div>
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:14px;">Titres, chiffres clés, identité marketing</div>
    <div style="font-family:var(--font-body);font-size:18px;font-weight:700;margin-bottom:2px;">Gill Sans MT</div>
    <div style="font-size:12px;color:var(--text-dim);">Interface, tableaux, données de gestion</div>
  </div>
  <div class="card">
    <div class="section-title">Signature graphique</div>
    <div class="section-sub">Le motif d’onde marque les analyses produites par Elara</div>
    <div style="display:flex;align-items:center;gap:10px;margin-top:14px;">
      <span class="ai-badge" style="margin:0;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg>Généré par Elara</span>
    </div>
    <div style="margin-top:14px;"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg></div>
  </div>
</div>

<div class="card">
  <div class="section-title">Principe de conception</div>
  <p style="font-size:13px;color:var(--text-dim);line-height:1.7;max-width:640px;">
    Les cartes plates à bordure fine portent la donnée brute et vérifiable, comme une écriture de registre.
    Les cartes à liseré or — le sceau — portent exclusivement les analyses produites par Elara : insight,
    anomalie, recommandation. Comme un cachet sur un document officiel, l’or n’apparaît que lorsque
    l’intelligence d’Elara appose sa lecture, afin que l’utilisateur distingue toujours, d’un coup d’œil,
    ce qui vient de ses documents et ce que l’Avancé en déduit.
  </p>
</div>
</section>` }} />
  );
}

