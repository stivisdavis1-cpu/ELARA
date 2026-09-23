import React from "react";

export default function DocgenPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-docgen">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Production documentaire</span></div>
    <h1 class="page-title">Génération de documents</h1>
    <p class="page-sub">Les documents créés par l’Assistant Virtuel lors de vos échanges, et le modèle Word qui sert de base à leur rédaction.</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      <button class="btn btn-ghost">Historique complet</button><button class="btn btn-primary teal"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg> Générer un document</button>
    </div>
  </div>

<div class="grid g4" style="margin-bottom:16px;">
  <div class="card"><div class="kpi-label">Documents générés (mois)</div><div class="kpi-value">46</div><div class="kpi-delta up">↑ 12% vs mois dernier</div></div>
  <div class="card"><div class="kpi-label">Temps moyen de génération</div><div class="kpi-value">8 s</div><div class="kpi-delta flat">Quasi instantané</div></div>
  <div class="card"><div class="kpi-label">Validés sans modification</div><div class="kpi-value">91%</div><div class="kpi-delta up">↑ 4 pts</div></div>
  <div class="card"><div class="kpi-label">Modèles actifs</div><div class="kpi-value">3</div><div class="kpi-delta flat">3 types de documents couverts</div></div>
</div>

<div class="grid g2" style="margin-bottom:16px;">
  <div class="card">
    <div class="section-title">Documents générés récemment</div>
    <div class="section-sub">Produits automatiquement depuis une conversation avec l’Assistant ou le Directeur Financier Virtuel</div>
    <table class="tbl">
      <thead><tr><th>Document</th><th>Généré depuis</th><th>Modèle utilisé</th><th>Statut</th></tr></thead>
      <tbody>
        <tr><td class="name-cell">Facture proforma — Clinique Excellence Santé.docx</td><td style="font-size:12.5px;color:var(--text-dim);">Assistant · aujourd’hui 08:14</td><td class="mono" style="font-size:12px;">Facture_Standard.docx</td><td><span class="pill pill-success">Prêt</span></td></tr>
        <tr><td class="name-cell">Relance impayé — Collège Notre-Dame.docx</td><td style="font-size:12.5px;color:var(--text-dim);">Assistant · hier 17:02</td><td class="mono" style="font-size:12px;">Lettre_Relance.docx</td><td><span class="pill pill-warning">À relire</span></td></tr>
        <tr><td class="name-cell">Rapport mensuel — Août 2026.docx</td><td style="font-size:12.5px;color:var(--text-dim);">Rapport Automatisé · 1 sept.</td><td class="mono" style="font-size:12px;">Rapport_Mensuel.docx</td><td><span class="pill pill-success">Prêt</span></td></tr>
        <tr><td class="name-cell">Attestation de bonne exécution.docx</td><td style="font-size:12.5px;color:var(--text-dim);">Assistant · 29 août</td><td class="mono" style="font-size:12px;">Attestation.docx</td><td><span class="pill pill-info">Envoyé</span></td></tr>
      </tbody>
    </table>
  </div>
  <div class="ai-card">
    <div class="ai-badge"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" stroke-linejoin="round"></path><path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" stroke-linejoin="round"></path><path d="M4 21l7-7" stroke-linecap="round"></path></svg>Comment ça marche</div>
    <div class="section-title" style="margin-bottom:14px;">De la conversation au document</div>
    <div class="list-row"><span class="pill" style="background:var(--indigo)18;color:var(--indigo);margin-right:12px;">1</span><span style="flex:1;font-size:13px;">Vous décrivez le besoin à l’Assistant Virtuel — ex. « fais-moi une facture proforma pour Dell Technologies »</span></div>
    <div class="list-row"><span class="pill" style="background:var(--indigo)18;color:var(--indigo);margin-right:12px;">2</span><span style="flex:1;font-size:13px;">Elara remplit le modèle Word actif avec les données réelles de l’entreprise</span></div>
    <div class="list-row"><span class="pill" style="background:var(--indigo)18;color:var(--indigo);margin-right:12px;">3</span><span style="flex:1;font-size:13px;">Le document est prêt à relire, télécharger ou envoyer directement</span></div>
  </div>
</div>

<div class="card">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
    <div><div class="section-title">Modèles Word</div><div class="section-sub">Emplacement unique de mise à jour — tout changement s’applique immédiatement aux prochaines générations.</div></div>
  </div>
  <div style="border:1.5px dashed var(--line);border-radius:var(--radius);padding:22px;text-align:center;margin:8px 0 20px;background:var(--paper);">
    <div style="font-size:13.5px;font-weight:700;margin-bottom:4px;font-family:var(--font-heading);">Glissez-déposez un fichier .docx ici</div>
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:14px;">ou remplacez un modèle existant ci-dessous</div>
    <button class="btn btn-primary teal" style="margin:0 auto;">Importer un modèle Word (.docx)</button>
  </div>
  <table class="tbl">
    <thead><tr><th>Modèle</th><th>Type de document</th><th>Dernière mise à jour</th><th>Statut</th><th></th></tr></thead>
    <tbody>
      <tr><td class="name-cell">Facture_Standard.docx</td><td>Factures &amp; devis</td><td>12 août 2026</td><td><span class="pill pill-success">Actif</span></td><td><button class="btn btn-ghost" style="padding:5px 12px;font-size:11.5px;">Remplacer</button></td></tr>
      <tr><td class="name-cell">Lettre_Relance.docx</td><td>Relances clients</td><td>3 juil. 2026</td><td><span class="pill pill-success">Actif</span></td><td><button class="btn btn-ghost" style="padding:5px 12px;font-size:11.5px;">Remplacer</button></td></tr>
      <tr><td class="name-cell">Rapport_Mensuel.docx</td><td>Rapports de gestion</td><td>28 juin 2026</td><td><span class="pill pill-success">Actif</span></td><td><button class="btn btn-ghost" style="padding:5px 12px;font-size:11.5px;">Remplacer</button></td></tr>
      <tr><td class="name-cell">Attestation.docx</td><td>Attestations diverses</td><td>15 mai 2026</td><td><span class="pill pill-neutral">Verrouillé · Plan Pro</span></td><td></td></tr>
    </tbody>
  </table>
</div>
</section>` }} />
  );
}

