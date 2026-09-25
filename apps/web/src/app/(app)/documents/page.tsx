"use client";
import React, { useState, useEffect, useCallback } from "react";
import { FileText, Folder, X, Loader2, AlertTriangle, Search, Archive, Eye } from "lucide-react";
import DocumentViewer from "../../../components/DocumentViewer";

interface DocRow {
  id: string;
  name: string;
  fichier: string;
  type: string | null;
  statut: string;
  date: string | null;
  archive: { archive_path?: string; checksum?: string; taille?: number } | null;
  extraction: any;
}

const API = '/api/scanner/documents';

function fmtDate(v: string | null) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return v;
  }
}

function fmtSize(bytes?: number | null) {
  if (!bytes) return '0 Ko';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}

function statusPill(statut: string) {
  const s = (statut || '').toLowerCase();
  if (s.includes('archiv')) return 'pill pill-info';
  if (s.includes('attente') || s.includes('audit')) return 'pill pill-warning';
  if (s.includes('rejet') || s.includes('anomal')) return 'pill pill-danger';
  return 'pill pill-neutral';
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<DocRow | null>(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let last: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(API, { cache: 'no-store' });
        if (!res.ok) throw new Error('Réponse inattendue (HTTP ' + res.status + ')');
        const payload = await res.json();
        const items = Array.isArray(payload?.data) ? payload.data : [];
        setDocs(items.map((it: any) => ({
          id: it.document_id,
          name: it.nom || it.fichier || 'Document',
          fichier: it.fichier || '',
          type: it.type || null,
          statut: it.statut || 'En attente',
          date: it.date,
          archive: it.archive || null,
          extraction: it.extraction || null,
        })));
        setError('');
        setDetail('');
        setLoading(false);
        return;
      } catch (e: unknown) {
        last = e;
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
    }
    setError('Impossible de charger les documents depuis la GED.');
    setDetail(last instanceof Error ? last.message : String(last));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const filtered = docs.filter(d => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (d.name + ' ' + d.statut + ' ' + (d.type || '') + ' ' + d.fichier).toLowerCase().includes(q);
  });

  const catOf = (d: DocRow): 'archived' | 'pending' | 'treated' | 'running' => {
    const s = (d.statut || '').toLowerCase();
    if (d.archive || s.includes('archiv')) return 'archived';
    if (/attente|audit|valider|brouillon|ambigü|ambigu|rejet|anomal|non conforme|échec|inconnu/i.test(s)) return 'pending';
    if (/valid|termin/i.test(s)) return 'treated';
    return 'running';
  };

  const totalArchives = docs.filter(d => catOf(d) === 'archived').length;
  const totalEnAttente = docs.filter(d => catOf(d) === 'pending').length;
  const totalAArchiver = docs.filter(d => catOf(d) === 'treated').length;
  const totalEnAnalyse = docs.filter(d => catOf(d) === 'running').length;
  const totalSize = docs.reduce((acc, d) => acc + (d.archive?.taille || 0), 0);
  const includedGo = 2 * 1024 * 1024 * 1024;
  const pct = includedGo ? Math.min(100, Math.round((totalSize / includedGo) * 100)) : 0;
  const classementPct = docs.length ? Math.round((totalArchives / docs.length) * 100) : 0;

  return (
    <section className="view" id="v-documents">
      <div className="topbar">
        <div>
          <div className="eyebrow"><span>Mini-GED native</span></div>
          <h1 className="page-title">Documents</h1>
          <p className="page-sub">Tous vos documents scannés et classés, synchronisés avec le Scanner.</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(162, 59, 59, 0.05)', border: '1px solid rgba(162, 59, 59, 0.2)', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--red)', alignItems: 'center' }}>
          <AlertTriangle className="w-4 h-4" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            {error}
            {detail && <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(162, 59, 59, 0.7)', marginTop: 4 }}>{detail}</div>}
          </div>
          <button className="btn btn-primary teal" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => load()}>Réessayer</button>
        </div>
      )}

      <div className="card search-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '14px 18px' }}>
        <Search className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
        <input className="field" style={{ border: 'none', padding: 0 }} placeholder="Filtrer par nom, statut, type…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-primary teal">Rechercher</button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ margin: '0 auto 12px', color: 'var(--teal)' }} />
          Chargement des documents…
        </div>
      ) : (
        <>
          <div className="grid g4" style={{ marginBottom: '16px' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="tag-icon" style={{ background: 'var(--blue-bg)', color: 'var(--indigo-deep)' }}><FileText className="w-4 h-4" /></div>
              <div><div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-heading)' }}>Documents GED</div><div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{docs.length} document(s)</div></div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="tag-icon" style={{ background: 'var(--teal-bg)', color: 'var(--teal)' }}><Archive className="w-4 h-4" /></div>
              <div><div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-heading)' }}>Archivés</div><div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{totalArchives} en diskgroup sécurisé</div></div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="tag-icon" style={{ background: 'rgba(169,118,31,0.12)', color: '#A9761F' }}><Eye className="w-4 h-4" /></div>
              <div><div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-heading)' }}>À valider</div><div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{totalEnAttente} en attente</div></div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="tag-icon" style={{ background: 'var(--blue-bg)', color: 'var(--indigo-deep)' }}><Loader2 className="w-4 h-4" /></div>
              <div><div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-heading)' }}>En analyse</div><div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{totalEnAnalyse} en cours</div></div>
            </div>
          </div>

          <div className="grid g2">
            <div className="card">
              <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Documents récents (GED)</span>
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{filtered.length} affiché(s)</span>
              </div>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-dim)', fontSize: 13 }}>
                  Aucun document. Utilisez le Scanner ou une intégration pour ajouter un document dans la GED.
                </div>
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                  <thead><tr><th>Nom</th><th>Type</th><th>Ajouté</th><th>Statut</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map(d => (
                      <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setPreview(d)}>
                        <td className="name-cell">{d.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{d.type || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{fmtDate(d.date)}</td>
                        <td><span className={statusPill(d.statut)}>{d.statut}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} ><Folder className="w-3 h-3 inline" style={{ marginRight: 2 }} /> Aperçu</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card">
                <div className="section-title">Stockage</div>
                <div className="section-sub">Plan Starter · 2 Go inclus</div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-dim)' }}>{fmtSize(totalSize)} utilisés</span>
                    <strong className="mono">{docs.length}</strong>
                  </div>
                  <div className="progress"><div style={{ width: `${pct}%`, background: '#1A4A3C' }}></div></div>
                </div>
                <div className="divider" />
                <div className="section-title">Qualité du classement</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.8 }}>
                  ✓ {classementPct}% des documents archivés automatiquement en diskgroup sécurisé<br />
                  ⚠ {totalEnAttente} document(s) à valider manuellement
                </div>
              </div>
              <div className="card" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.8 }}>
                <div className="section-title">Flux de travail</div>
                Le Scanner et les intégrations sont les seules portes d'entrée : les documents suivent le même pipeline OCR (extraction, statut, archivage) et sont visibles ici comme dans le Scanner.
              </div>
            </div>
          </div>
        </>
      )}

      {preview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setPreview(null)}>
          <div className="card pv-card" style={{ width: 'min(1100px, 94vw)', height: 'min(780px, 90vh)', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            {(() => {
              const fileUrl = `/api/scanner/file/${encodeURIComponent(preview.id)}`;
              const previewUrl = `${fileUrl}?as=base64`;
              return (
                <>
                  <div className="pv-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--line)', gap: 12 }}>
                    <div className="pv-title" style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        {fmtDate(preview.date)} · <span className={statusPill(preview.statut)}>{preview.statut}</span>
                        {preview.archive ? ` · Chemin : ${preview.archive.archive_path}` : ''}
                      </div>
                    </div>
                    <div className="pv-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <a className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12, textDecoration: 'none' }} href={`/ged/${encodeURIComponent(preview.id)}`} target="_blank" rel="noreferrer">Ouvrir en grand</a>
                      <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => setPreview(null)}><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div style={{ height: 'calc(min(780px, 90vh) - 65px)', overflow: 'hidden' }}>
                    <DocumentViewer url={previewUrl} fileName={preview.fichier || preview.name} title={preview.name} />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
}