import React from "react";

export default function ArchitecturePage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `<section class="view" id="v-architecture">
<div class="topbar">
    <div><div class="eyebrow"><svg class="wave-rule" viewBox="0 0 46 14" fill="none"><path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" stroke-width="1.4" stroke-linecap="round" fill="none"></path><defs><linearGradient id="wg" x1="0" y1="0" x2="46" y2="0"><stop stop-color="#A9761F"></stop><stop offset="1" stop-color="#1A4A3C"></stop></linearGradient></defs></svg><span>Console admin · vue technique</span></div>
    <h1 class="page-title">Architecture technique</h1>
    <p class="page-sub">Les 6 couches du système, l’isolation multi-tenant et la plateforme Avancé commune — « start simple, design for scale ».</p></div>
    <div class="topbar-actions">
    </div>
  </div>

<div class="grid g2" style="margin-bottom:16px;align-items:start;">
  <div class="card">
    <div class="section-title">Architecture en 6 couches</div>
    <div class="section-sub">Chaque nouveau module se branche sans modifier la structure</div>
    <div class="stack-wrap">
      
        <div class="stack-layer"><div class="stack-num">1</div><div><div class="stack-name">Data Ingestion</div><div class="stack-desc">Photo, PDF, Excel, WhatsApp, Mobile Money — les données brutes, quelle que soit leur forme</div></div></div>
        <div class="stack-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16M6 14l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
      
        <div class="stack-layer"><div class="stack-num">2</div><div><div class="stack-name">Document Intelligence</div><div class="stack-desc">OCR, extraction de champs, classement automatique</div></div></div>
        <div class="stack-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16M6 14l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
      
        <div class="stack-layer"><div class="stack-num">3</div><div><div class="stack-name">Business Memory</div><div class="stack-desc">Représentation structurée et persistante de l’entreprise — le socle unique</div></div></div>
        <div class="stack-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16M6 14l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
      
        <div class="stack-layer"><div class="stack-num">4</div><div><div class="stack-name">Intelligence</div><div class="stack-desc">Analyse, scoring, détection d’anomalies à partir de la Business Memory</div></div></div>
        <div class="stack-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16M6 14l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
      
        <div class="stack-layer"><div class="stack-num">5</div><div><div class="stack-name">AI Agents</div><div class="stack-desc">Directeur Financier Virtuel, Assistant Commercial, Assistant Opérationnel — modules métier branchés sur le socle commun</div></div></div>
        <div class="stack-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16M6 14l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
      
        <div class="stack-layer"><div class="stack-num">6</div><div><div class="stack-name">Action Layer</div><div class="stack-desc">Rapport, relance, facture — toujours avec validation humaine sur les actions sensibles</div></div></div>
        
      
    </div>
  </div>
  <div>
    <div class="card" style="margin-bottom:16px;">
      <div class="section-title">Isolation multi-tenant</div>
      <p style="font-size:13px;color:var(--text-dim);line-height:1.8;margin:10px 0 14px;">
        Chaque tenant dispose d’un espace logiquement isolé : un <code style="background:var(--paper);padding:1px 6px;border-radius:5px;">tenant_id</code>
        sur chaque entité, combiné à la Row-Level Security de PostgreSQL. Un cabinet comptable peut accéder à
        plusieurs tenants depuis un même compte.
      </p>
      <div class="divider"></div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        
          <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;font-weight:700;color:var(--text-dim);font-family:var(--font-heading);">
            <span style="width:8px;height:8px;border-radius:2px;background:var(--indigo);"></span>API Gateway — isolation par tenant_id
          </div>
          <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;font-weight:700;color:var(--text-dim);font-family:var(--font-heading);">
            <span style="width:8px;height:8px;border-radius:2px;background:var(--indigo);"></span>Services applicatifs — isolation par tenant_id
          </div>
          <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;font-weight:700;color:var(--text-dim);font-family:var(--font-heading);">
            <span style="width:8px;height:8px;border-radius:2px;background:var(--indigo);"></span>Base de données (RLS) — isolation par tenant_id
          </div>
      </div>
    </div>
    <div class="ai-card">
      <div class="ai-badge"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l9 5-9 5-9-5 9-5Z" stroke-linejoin="round"></path><path d="M3 13l9 5 9-5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 18l9 5 9-5" stroke-linecap="round" stroke-linejoin="round"></path></svg>AI Platform commune</div>
      <div class="section-sub" style="margin-bottom:14px;">Une plateforme unique pour tous les agents — cohérence, gouvernance, coûts maîtrisés</div>
      
        <div class="list-row" style="padding:9px 0;"><span style="font-size:13px;">Passerelle de routage de modèles (LiteLLM)</span></div>
        <div class="list-row" style="padding:9px 0;"><span style="font-size:13px;">Couche de connaissance — RAG, embeddings, mémoire</span></div>
        <div class="list-row" style="padding:9px 0;"><span style="font-size:13px;">Couche d’exécution — tool calling, orchestration</span></div>
        <div class="list-row" style="padding:9px 0;"><span style="font-size:13px;">Couche de gouvernance — guardrails, évaluation, monitoring</span></div>
    </div>
  </div>
</div>

<div class="card" style="margin-bottom:16px;">
  <div class="section-title">Portabilité du déploiement</div>
  <div class="section-sub">La même base de code (images Docker) supporte deux modes</div>
  <div class="grid g2e">
    <div style="border:1px solid var(--line);border-radius:12px;padding:16px;">
      <span class="pill pill-info" style="margin-bottom:10px;">SaaS multi-tenant</span>
      <p style="font-size:12.5px;color:var(--text-dim);line-height:1.7;margin:8px 0 0;">Kubernetes en cloud, un socle partagé par tous les tenants, montée en charge élastique.</p>
    </div>
    <div style="border:1px solid var(--line);border-radius:12px;padding:16px;">
      <span class="pill pill-neutral" style="margin-bottom:10px;">On-premise mono-tenant</span>
      <p style="font-size:12.5px;color:var(--text-dim);line-height:1.7;margin:8px 0 0;">docker-compose sur un serveur client, LLM auto-hébergé (Ollama) quand les données ne peuvent pas sortir — banques, institutions réglementées.</p>
    </div>
  </div>
</div>

<div class="card">
  <div class="section-title">Stack technique recommandée</div>
  <div class="section-sub">Ouverte, conteneurisable, sans coût de licence — évite tout verrouillage propriétaire</div>
  <table class="tbl">
    <thead><tr><th>Couche</th><th>Outil</th><th>Licence</th></tr></thead>
    <tbody>
      <tr><td class="name-cell">Backend métier</td><td>NestJS (TypeScript)</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Backend Avancé / OCR</td><td>FastAPI (Python)</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Base de données</td><td>PostgreSQL + pgvector</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Stockage objet</td><td>MinIO</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Cache / queues</td><td>Redis</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Event bus</td><td>RabbitMQ</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">OCR</td><td>Tesseract</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">LLM on-premise</td><td>Llama 3 / Mistral (Ollama)</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Orchestration RAG / agents</td><td>LangChain / LlamaIndex</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Auth / RBAC / SSO</td><td>Keycloak</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">API Gateway</td><td>Traefik</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Frontend web / mobile</td><td>Next.js · React Native</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Conteneurisation</td><td>Docker + docker-compose</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Orchestration cloud</td><td>Kubernetes (K3s en petite échelle)</td><td><span class="pill pill-success">Open-source</span></td></tr><tr><td class="name-cell">Observabilité</td><td>Prometheus + Grafana + Loki</td><td><span class="pill pill-success">Open-source</span></td></tr>
    </tbody>
  </table>
</div>
</section>` }} />
  );
}

