import React from "react";

export default function UsersPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-users">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Gouvernance</span></div>
    <h1 class="page-title">Utilisateurs &amp; rôles</h1>
    <p class="page-sub">Gestion des accès de l’espace OrbitTech Services — plan Business requis au-delà de 3 utilisateurs.</p></div>
    <div class="topbar-actions">
      <button class="btn-live-stream" onclick="triggerSimulatedSupabaseEvent()" title="Simuler l'injection d'un flux Supabase">
        <span class="pulse-dot"></span> Webhook Live
      </button>
      <button class="btn btn-ghost">Rôles personnalisés</button><button class="btn btn-primary teal">Inviter un utilisateur</button>
    </div>
  </div>

<div class="grid g4" style="margin-bottom:16px;">
  <div class="card"><div class="kpi-label">Utilisateurs actifs</div><div class="kpi-value">2 <span style="font-size:13px;color:var(--text-dim);font-weight:500;">/ 3 inclus</span></div></div>
  <div class="card"><div class="kpi-label">Invitations en attente</div><div class="kpi-value">1</div></div>
  <div class="card"><div class="kpi-label">Rôles définis</div><div class="kpi-value">4</div></div>
  <div class="card"><div class="kpi-label">Dernière connexion</div><div class="kpi-value" style="font-size:18px;">Aujourd’hui, 08:14</div></div>
</div>

<div class="card" style="margin-bottom:16px;">
  <div class="section-title">Membres de l’équipe</div>
  <table class="tbl">
    <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Dernière activité</th></tr></thead>
    <tbody>
      <tr><td style="display:flex;align-items:center;gap:10px;"><div class="tag-icon" style="width:30px;height:30px;background:var(--blue-bg);color:var(--indigo-deep);font-size:11px;font-weight:700;">AB</div><div><div class="name-cell">Aïcha Belinga</div><div style="font-size:11.5px;color:var(--text-dim);">aicha@orbittech.cm</div></div></td><td><span class="pill pill-info">Propriétaire</span></td><td><span class="pill pill-success">Actif</span></td><td>Aujourd’hui, 08:14</td></tr>
      <tr><td style="display:flex;align-items:center;gap:10px;"><div class="tag-icon" style="width:30px;height:30px;background:var(--green-bg);color:var(--green);font-size:11px;font-weight:700;">JT</div><div><div class="name-cell">Jean Tchoumi</div><div style="font-size:11.5px;color:var(--text-dim);">jean.tchoumi@orbittech.cm</div></div></td><td><span class="pill pill-neutral">Comptable</span></td><td><span class="pill pill-success">Actif</span></td><td>Hier, 17:40</td></tr>
      <tr><td style="display:flex;align-items:center;gap:10px;"><div class="tag-icon" style="width:30px;height:30px;background:var(--amber-bg);color:var(--amber);font-size:11px;font-weight:700;">EN</div><div><div class="name-cell">Éric Ngono</div><div style="font-size:11.5px;color:var(--text-dim);">eric.ngono@orbittech.cm</div></div></td><td><span class="pill pill-neutral">Commercial</span></td><td><span class="pill pill-warning">Invitation envoyée</span></td><td>—</td></tr>
    </tbody>
  </table>
</div>

<div class="card">
  <div class="section-title">Permissions par rôle</div>
  <div class="section-sub">Contrôle fin de l’accès aux modules et actions sensibles</div>
  <table class="tbl">
    <thead><tr><th>Module / action</th><th>Propriétaire</th><th>Comptable</th><th>Commercial</th><th>Lecture seule</th></tr></thead>
    <tbody>
      <tr><td class="name-cell">Tableau de bord &amp; rapports</td><td><span style="color:var(--teal-deep);">✓</span></td><td><span style="color:var(--teal-deep);">✓</span></td><td><span style="color:var(--teal-deep);">✓</span></td><td><span style="color:var(--teal-deep);">✓</span></td></tr><tr><td class="name-cell">CFO — trésorerie &amp; marges</td><td><span style="color:var(--teal-deep);">✓</span></td><td><span style="color:var(--teal-deep);">✓</span></td><td><span style="color:var(--line);">—</span></td><td><span style="color:var(--teal-deep);">✓</span></td></tr><tr><td class="name-cell">Valider et archiver un document</td><td><span style="color:var(--teal-deep);">✓</span></td><td><span style="color:var(--teal-deep);">✓</span></td><td><span style="color:var(--line);">—</span></td><td><span style="color:var(--line);">—</span></td></tr><tr><td class="name-cell">Clients &amp; fournisseurs — relances</td><td><span style="color:var(--teal-deep);">✓</span></td><td><span style="color:var(--line);">—</span></td><td><span style="color:var(--teal-deep);">✓</span></td><td><span style="color:var(--teal-deep);">✓</span></td></tr><tr><td class="name-cell">Gérer les utilisateurs et rôles</td><td><span style="color:var(--teal-deep);">✓</span></td><td><span style="color:var(--line);">—</span></td><td><span style="color:var(--line);">—</span></td><td><span style="color:var(--line);">—</span></td></tr>
    </tbody>
  </table>
</div>
</section>` }} />
  );
}
