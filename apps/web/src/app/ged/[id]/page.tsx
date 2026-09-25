"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, Download, Loader2, FileText, FileOutput, FileType, Image as ImageIcon,
  Save, Plus, Trash2, Lock, ShieldCheck,
} from "lucide-react";
import DocumentViewer from "@/components/DocumentViewer";
import { fetchFileBytes } from "@/lib/fileFetch";
import { exportDocument, type ExportFormat } from "@/lib/exportFile";

const EXPORT_FORMATS: { fmt: ExportFormat; label: string; icon: typeof FileOutput }[] = [
  { fmt: 'pdf', label: 'PDF', icon: FileOutput },
  { fmt: 'docx', label: 'Word', icon: FileType },
  { fmt: 'png', label: 'Images', icon: ImageIcon },
];

function toEntries(obj: any): [string, string][] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([k, v]: [string, any]) => [k, v == null ? '' : String(v)]);
}

/**
 * Vue plein écran d'un document de la GED (ouverture dans un nouvel onglet).
 * Toujours rendu via le pipeline même-origine (?as=base64 puis pdf.js/canvas) :
 * aucun passage par une réponse `application/pdf` de navigation, donc aucun
 * téléchargement déclenché.
 * Outils : ruban de toutes les pages (DocumentViewer), export PDF/Word/Image,
 * consultation/édition des données extraites (édition réservée aux rôles admin).
 */
export default function GedViewPage() {
  const params = useParams<{ id: string }>();
  const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = raw ? decodeURIComponent(raw) : '';
  const { data: session } = useSession();

  const [meta, setMeta] = useState<{ name: string; status: string | null } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const isAdmin = Array.isArray(session?.user?.roles) &&
    (session!.user.roles!.includes('admin') || session!.user.roles!.includes('administrateur'));

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/scanner/documents', { cache: 'no-store' });
        if (!res.ok) return;
        const payload = await res.json();
        const items = Array.isArray(payload?.data) ? payload.data : [];
        const it = items.find((x: { document_id?: string }) => x.document_id === id);
        if (it && !cancelled) {
          setMeta({ name: it.nom || it.fichier || 'Document', status: it.statut || null });
          setFields(Object.fromEntries(toEntries(it.extraction)));
        }
      } catch { /* la liste est optionnelle */ }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const name = meta?.name || 'Document';
  const url = id ? `/api/scanner/file/${encodeURIComponent(id)}?as=base64` : '';

  const flashSoon = useCallback((m: string) => {
    setFlash(m);
    setErrMsg('');
    window.setTimeout(() => setFlash(''), 3000);
  }, []);

  const handleExport = useCallback(async (fmt: ExportFormat) => {
    if (!id || busyFormat) return;
    setBusyFormat(fmt);
    setErrMsg('');
    setFlash('');
    try {
      await exportDocument(id, fmt, session?.accessToken, (s, m) => {
        if (s === 'done') flashSoon(`Export ${fmt.toUpperCase()} téléchargé.`);
        if (s === 'error') setErrMsg(m || 'Export impossible.');
      });
    } catch { /* message déjà posé */ }
    setBusyFormat(null);
  }, [id, busyFormat, session?.accessToken, flashSoon]);

  const download = useCallback(async () => {
    if (!url || downloading) return;
    setDownloading(true);
    try {
      const { buffer, mime } = await fetchFileBytes(url);
      const blob = new Blob([buffer], { type: mime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch { /* silencieux */ }
    setDownloading(false);
  }, [url, name, downloading]);

  const saveFields = useCallback(async () => {
    if (!id || saving) return;
    setSaving(true);
    setErrMsg('');
    try {
      const res = await fetch(`/api/scanner/documents/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.accessToken ? { authorization: `Bearer ${session.accessToken}` } : {}),
        },
        body: JSON.stringify({ extractedData: fields }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setErrMsg(payload?.error || payload?.data?.error || `HTTP ${res.status}`);
      } else {
        flashSoon('Champs enregistrés.');
      }
    } catch (e: any) {
      setErrMsg(e instanceof Error ? e.message : String(e));
    }
    setSaving(false);
  }, [id, saving, session?.accessToken, fields, flashSoon]);

  const updateField = (k: string, v: string) => setFields(prev => ({ ...prev, [k]: v }));
  const addField = () => {
    const k = `champ_${Date.now()}`;
    setFields(prev => ({ ...prev, [k]: '' }));
  };
  const removeField = (k: string) => {
    setFields(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: '#0F172A' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '10px 18px', background: 'rgba(15,23,42,0.97)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <a
          href="/documents"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Documents
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          {meta?.status ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{meta.status}</div> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {EXPORT_FORMATS.map(({ fmt, label, icon: Icon }) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={!id || !!busyFormat}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: busyFormat === fmt ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '7px 12px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer', font: 'inherit' }}
              title={`Exporter en ${label}`}
            >
              {busyFormat === fmt ? <Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} /> : <Icon className="w-4 h-4" />}
              {busyFormat === fmt ? '…' : `Exporter ${label}`}
            </button>
          ))}
          <button
            onClick={download}
            disabled={!url || downloading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0E7490', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer', font: 'inherit' }}
          >
            {downloading ? <Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} /> : <Download className="w-4 h-4" />}
            {downloading ? 'Préparation…' : 'Télécharger'}
          </button>
        </div>
      </div>

      {(flash || errMsg) && (
        <div style={{ padding: '6px 18px', fontSize: 12.5, background: errMsg ? 'rgba(162,59,59,0.18)' : 'rgba(20,184,166,0.14)', color: errMsg ? '#FCA5A5' : '#5EEAD4', flexShrink: 0 }}>
          {errMsg || flash}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row' }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {!id ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.6)', fontSize: 13, gap: 8 }}>
              <FileText className="w-5 h-5" /> Document introuvable.
            </div>
          ) : (
            <DocumentViewer url={url} fileName={name} title={name} />
          )}
        </div>

        <aside style={{ width: 360, maxWidth: '42vw', minHeight: 0, overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Données extraites</span>
            {!isAdmin && <Lock className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />}
            {isAdmin && <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#5EEAD4' }} />}
          </div>
          <div style={{ padding: '10px 16px 4px' }}>
            {isAdmin && (
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                Édition réservée aux administrateurs — seules les données (extraction) du document sont modifiées, pas le fichier.
              </div>
            )}
            {Object.keys(fields).length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', padding: '14px 0' }}>
                Aucune donnée extraite pour ce document.
              </div>
            ) : (
              Object.entries(fields).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  {isAdmin ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        value={k}
                        onChange={(e) => {
                          const nv = { ...fields }; delete nv[k]; nv[e.target.value || k] = v;
                          setFields(nv);
                        }}
                        style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#E2E8F0', padding: '6px 8px', borderRadius: 6, fontSize: 12, font: 'inherit' }}
                        placeholder="Clé"
                      />
                      <button onClick={() => removeField(k)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', padding: 4 }} title="Supprimer ce champ"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{k}</div>
                  )}
                  {isAdmin ? (
                    <textarea
                      value={v}
                      onChange={(e) => updateField(k, e.target.value)}
                      rows={Math.min(4, Math.max(2, (v || '').split('\n').length))}
                      style={{ width: '100%', boxSizing: 'border-box', marginTop: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#E2E8F0', padding: '6px 8px', borderRadius: 6, fontSize: 12, resize: 'vertical', font: 'inherit' }}
                    />
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v || '—'}</div>
                  )}
                </div>
              ))
            )}
            {isAdmin && (
              <div style={{ display: 'flex', gap: 8, margin: '10px 0 16px' }}>
                <button onClick={addField} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px dashed rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.75)', padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', font: 'inherit' }}>
                  <Plus className="w-4 h-4" /> Ajouter un champ
                </button>
                <button onClick={saveFields} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#0E7490', border: 'none', color: '#fff', padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', font: 'inherit' }}>
                  {saving ? <Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} /> : <Save className="w-4 h-4" />}
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}