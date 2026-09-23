"use client";

import React, { useState, useEffect, useRef } from "react";
import ScannerUploader from "../../../components/ScannerUploader";
import { FileText, X, AlertTriangle, Menu, Crop, Landmark, Building2, ShieldCheck, ScrollText, CalendarDays, Tags, Scale } from "lucide-react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

interface ScannedDocument {
  id: string;
  name: string;
  time?: string;
  status: string;
  statusColor?: string;
  statusBg?: string;
  type?: string;
  amount?: string;
  supplier?: string;
  alert?: boolean;
  extractedData?: Record<string, string>;
  ocrText?: string;
  localFileUrl?: string;
  mimeType?: string;
  progress?: number;
  progressMessage?: string;
  archive?: { archive_path?: string; checksum?: string; taille?: number; archive_le?: string } | null;
}

const RICH_KEYS = ['Domaine Métier', 'Type de Document', 'Statut', 'Justification Statut', 'Acteurs', 'Dates Clés', 'Mots-clés', 'Résumé'];

type DataFieldClass = 'chips' | 'dates' | 'summary' | 'default';

const classifyKey = (key: string): DataFieldClass => {
  const k = key.toLowerCase();
  if (key === 'Acteurs' || key === 'Mots-clés' || key === 'Mots-clés Indexation') return 'chips';
  if (k.includes('dates') || k === 'date du document') return 'dates';
  if (key === 'Résumé' || k.includes('justification') || key === 'Objet du document' || k.includes('confidentialité') || k.includes('classement')) return 'summary';
  return 'default';
};

const formatFRDate = (raw: string): string => {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  return `${m[3]}/${m[2]}/${m[1]}`;
};

const statusBadge = (status: string): { bg: string; color: string } => {
  const s = status.toUpperCase();
  if (s.includes('BROUILLON') || s.includes('REJET')) return { bg: 'rgba(217,119,6,0.12)', color: '#B45309' };
  if (s.includes('TERMINÉ') || s.includes('ANALYSE') || s.includes('ARCHIV') || s.includes('INTÉGR')) return { bg: 'rgba(20,184,166,0.14)', color: '#0F766E' };
  if (s.includes('ALERTE') || s.includes('FRAUDE')) return { bg: 'rgba(220,38,38,0.12)', color: '#B91C1C' };
  return { bg: 'rgba(10,46,92,0.1)', color: '#0A2E5C' };
};

const RICH_ALIASES: Record<string, string> = {
  'domaine metier': 'Domaine Métier',
  'domaine métier': 'Domaine Métier',
  'type de document': 'Type de Document',
  'type': 'Type de Document',
  'statut': 'Statut',
  'justification statut': 'Justification Statut',
  'justification du statut': 'Justification Statut',
  'acteurs': 'Acteurs',
  'dates cles': 'Dates Clés',
  'dates clés': 'Dates Clés',
  'mots-cles': 'Mots-clés',
  'mots-clés': 'Mots-clés',
  'mots-cles indexation': 'Mots-clés',
  'mots-clés indexation': 'Mots-clés',
  'resume': 'Résumé',
  'résumé': 'Résumé'
};

const normalizeKey = (key: string): string => {
  return RICH_ALIASES[key.trim().toLowerCase()] || key;
};

const collectRichData = (entries: [string, string][]) => {
  const rich: Record<string, string> = {};
  const others: [string, string][] = [];
  for (const [key, value] of entries) {
    const normal = normalizeKey(key);
    if (RICH_KEYS.includes(normal)) {
      if (!rich[normal]) rich[normal] = value;
    } else {
      others.push([key, value]);
    }
  }
  return { rich, others };
};

// Détecte le type MIME depuis le nom de fichier (sert à réafficher les documents
// restaurés depuis la BDD dans la visionneuse via l'endpoint /file).
const mimeFromName = (name?: string): string | undefined => {
  const n = (name || '').toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (n.endsWith('.doc')) return 'application/msword';
  if (n.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (n.endsWith('.rtf')) return 'application/rtf';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.tif') || n.endsWith('.tiff')) return 'image/tiff';
  if (n.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (n.endsWith('.csv')) return 'text/csv';
  if (n.endsWith('.txt')) return 'text/plain';
  return undefined;
};

export default function ScannerPage() {
  const { data: session } = useSession();
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);

  // États pour l'OCR Localisé
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{x: number, y: number} | null>(null);
  const [currentBox, setCurrentBox] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [showFieldPrompt, setShowFieldPrompt] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{w: number, h: number, nw: number, nh: number} | null>(null);

  // La liste démarre vide : seules les données réelles (uploads persistés en BDD
  // + archives GED) apparaissent, restaurées depuis le backend au chargement.
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const documentsRef = useRef<ScannedDocument[]>([]);
  useEffect(() => { documentsRef.current = documents; }, [documents]);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const onFocus = () => setRefreshKey(k => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  const socketRef = useRef<Socket | null>(null);
  const [officePreview, setOfficePreview] = useState<{ type: 'docx'; html: string } | { type: 'pptx'; slides: string[][] } | { type: 'text'; text: string } | null>(null);
  const [officeError, setOfficeError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      const tenantId = (session.user as { tenantId?: string }).tenantId || 'test-tenant';
      const socket = io('http://localhost:3001/v1/scanner/realtime', {
        query: { tenantId }
      });
      
      socket.on('document_status_update', (data) => {
        setDocuments((prevDocs) => {
          return prevDocs.map(doc => {
            if (doc.id === data.documentId) {
              return {
                    ...doc,
                    status: data.status,
                    statusColor: data.statusColor || doc.statusColor,
                    statusBg: data.statusBg || doc.statusBg,
                    ocrText: data.ocrText || doc.ocrText,
                    extractedData: data.extractedData || doc.extractedData,
                    alert: data.alert || doc.alert,
                    progress: undefined,
                    progressMessage: undefined
                  };
            }
            return doc;
          });
        });
      });

      socket.on('document_progress_update', (data) => {
        setDocuments((prevDocs) => {
          return prevDocs.map(doc => {
            if (doc.id === data.documentId) {
              return {
                ...doc,
                progress: data.progress,
                progressMessage: data.message
              };
            }
            return doc;
          });
        });
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    }
  }, [session]);

  // Réhydratation depuis le backend : les documents (et archives GED) persistent
  // après un rafraîchissement de la page — plus rien ne « part ».
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('http://localhost:3001/v1/scanner/documents');
        if (!res.ok) return;
        const payload = await res.json();
        const items = Array.isArray(payload?.data) ? payload.data : [];
        if (cancelled || items.length === 0) return;
        const restored: ScannedDocument[] = items
          .filter((it: any) => !new Set(documentsRef.current.map(d => d.id)).has(it.document_id))
          .map((it: any) => ({
              id: it.document_id,
              name: it.nom,
              status: it.statut,
              statusColor: it.archive ? 'var(--teal)' : (it.niveau_risque >= 7 ? 'var(--red)' : 'var(--teal)'),
              statusBg: it.archive
                ? 'rgba(20, 184, 166, 0.14)'
                : (it.niveau_risque >= 7 ? 'rgba(220,38,38,0.12)' : 'rgba(20,184,166,0.1)'),
              type: it.type || undefined,
              alert: (it.niveau_risque ?? 0) >= 7,
              mimeType: mimeFromName(it.fichier || it.nom) as any,
              localFileUrl: `/api/scanner/file/${encodeURIComponent(it.document_id)}`,
              extractedData: (() => {
                const base: Record<string, string> = {};
                if (it.extraction && typeof it.extraction === 'object') {
                  for (const [k, v] of Object.entries(it.extraction)) {
                    if (v !== null && v !== undefined && String(v) !== '') base[k] = String(v);
                  }
                }
                if (it.archive) {
                  base['Chemin archive'] = it.archive.archive_path || '';
                  base['Empreinte SHA-256'] = it.archive.checksum || '';
                  base['Archivé le'] = it.archive.archive_le || '';
                }
                return Object.keys(base).length > 0 ? base : undefined;
              })(),
              ocrText: it.ocr_text || undefined,
              archive: it.archive || null,
            }));
        setDocuments(prev => [...restored, ...prev]);
      } catch (e) {
        console.error('Réhydratation des documents impossible', e);
      }
})();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Aperçu des documents Word (.docx/.doc) et PowerPoint (.pptx) rendus directement dans le navigateur
  useEffect(() => {
    const doc = documents.find(d => d.id === selectedDoc);
    if (!doc?.localFileUrl) {
      setOfficePreview(null);
      setOfficeError(null);
      return;
    }
    const name = doc.name.toLowerCase();
    const isDocx = doc.mimeType?.includes('word') || name.endsWith('.docx') || name.endsWith('.doc');
    const isPptx = doc.mimeType?.includes('presentation') || name.endsWith('.pptx');
    const isRtf = doc.mimeType?.includes('rtf') || name.endsWith('.rtf');
    if (!isDocx && !isPptx && !isRtf) {
      setOfficePreview(null);
      setOfficeError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setOfficePreview(null);
      setOfficeError(null);
      try {
        const resp = await fetch(doc.localFileUrl!);
        const buf = await resp.arrayBuffer();
        if (cancelled) return;
        if (isDocx) {
          const mammoth = (await import('mammoth')).default;
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (!cancelled) setOfficePreview({ type: 'docx', html: result.value });
        } else if (isRtf) {
          const { rtfToPlainText } = await import('@/lib/rtf');
          const text = rtfToPlainText(buf);
          if (!cancelled) setOfficePreview({ type: 'text', text });
        } else {
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(buf);
          const slideFiles = Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
            .sort((a, b) => {
              const n = (p: string) => parseInt(p.match(/slide(\d+)/)?.[1] || '0', 10);
              return n(a) - n(b);
            });
          const slides: string[][] = [];
          for (const f of slideFiles) {
            const xml = await zip.files[f].async('string');
            const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
              .map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim())
              .filter(Boolean);
            slides.push(texts);
          }
          if (!cancelled) setOfficePreview({ type: 'pptx', slides });
        }
      } catch (e) {
        console.error('Erreur d\'aperçu Office', e);
        if (!cancelled) setOfficeError('Aperçu indisponible pour ce document.');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDoc, documents]);

  const handleScanComplete = (newDocs: ScannedDocument[]) => {
    setDocuments(prev => [...newDocs, ...prev]);
    if (newDocs.length > 0) {
      setSelectedDoc(newDocs[0].id); // Auto-open the first scanned doc
    }
  };

  const removeDataField = (docId: string, keyToRemove: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId && doc.extractedData) {
        const newData = { ...(doc.extractedData as Record<string, string>) };
        delete newData[keyToRemove];
        return { ...doc, extractedData: newData };
      }
      return doc;
    }));
  };

  const addCustomField = async (docId: string, fieldName: string, box: {x: number, y: number, w: number, h: number}) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc || !doc.localFileUrl || !previewSize) return;

    // Simulation visuelle immédiate
    setDocuments(prev => prev.map(d => {
      if (d.id === docId) {
        const newData = { ...(d.extractedData || {}) };
        newData[fieldName] = "Extraction en cours...";
        return { ...d, extractedData: newData };
      }
      return d;
    }));

    try {
      const fileBlob = await fetch(doc.localFileUrl).then(r => r.blob());
      const formData = new FormData();
      formData.append('file', fileBlob, doc.name);
      
      // Conversion des coordonnées (écran -> image naturelle)
      const ratioX = previewSize.nw / previewSize.w;
      const ratioY = previewSize.nh / previewSize.h;
      formData.append('x', String(Math.round(box.x * ratioX)));
      formData.append('y', String(Math.round(box.y * ratioY)));
      formData.append('width', String(Math.round(box.w * ratioX)));
      formData.append('height', String(Math.round(box.h * ratioY)));

      const response = await fetch('http://localhost:3001/v1/scanner/documents/crop-ocr', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const resultWrapper = await response.json();
        const result = resultWrapper.data || resultWrapper;
        setDocuments(current => current.map(d => {
          if (d.id === docId && d.extractedData) {
            const updated = { ...d.extractedData };
            updated[fieldName] = result.text || "[Vide]";
            return { ...d, extractedData: updated };
          }
          return d;
        }));
      }
    } catch(err) {
      console.error(err);
      setDocuments(current => current.map(d => {
        if (d.id === docId && d.extractedData) {
          const updated = { ...d.extractedData };
          updated[fieldName] = "[Erreur OCR]";
          return { ...d, extractedData: updated };
        }
        return d;
      }));
    }
  };

  const handleToggleDrawingMode = async () => {
    if (!isDrawingMode && activeDoc?.localFileUrl) {
      try {
        const fileBlob = await fetch(activeDoc.localFileUrl).then(r => r.blob());
        const formData = new FormData();
        formData.append('file', fileBlob, activeDoc.name);
        
        const response = await fetch('http://localhost:3001/v1/scanner/documents/preview', {
          method: 'POST',
          body: formData
        });
        if (response.ok) {
          const resWrapper = await response.json();
          const res = resWrapper.data || resWrapper;
          setPreviewImage(res.imageBase64);
        }
      } catch(e) { console.error("Erreur preview", e); }
    } else {
      setPreviewImage(null);
    }
    setIsDrawingMode(!isDrawingMode);
    setCurrentBox(null);
    setShowFieldPrompt(false);
  };

  const activeDoc = documents.find(d => d.id === selectedDoc);

  const isOfficeDoc = (doc: ScannedDocument) => {
    const n = doc.name.toLowerCase();
    return doc.mimeType?.includes('word') || doc.mimeType?.includes('presentation') || doc.mimeType?.includes('rtf') || n.endsWith('.docx') || n.endsWith('.doc') || n.endsWith('.pptx') || n.endsWith('.rtf');
  };

  const listKeys = ['Acteurs', 'Mots-clés', 'Dates Clés', 'Domaine Métier'];
  const renderDataValue = (key: string, value: unknown) => {
    const text = String(value ?? '');
    if (listKeys.includes(key) && text.includes(',')) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: '1 1 auto', minWidth: 0 }}>
          {text.split(', ').map((item, i) => (
            <span key={i} style={{ background: 'rgba(20, 184, 166, 0.08)', color: 'var(--ink)', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', lineHeight: '1.6' }}>{item}</span>
          ))}
        </div>
      );
    }
    return (
      <span style={{
        flex: '1 1 auto', minWidth: 0,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6,
        color: text === "Extraction en cours..." ? 'var(--text-faint)' : 'inherit',
        fontStyle: text === "Extraction en cours..." ? 'italic' : 'normal'
      }}>
        {text}
      </span>
    );
  };

  const renderProgressBar = (doc: ScannedDocument) => {
    if (doc.progress === undefined || doc.progress >= 100) return null;
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--text-dim)' }}>{doc.progressMessage || 'Analyse en cours...'}</span>
          <span style={{ fontWeight: 600 }}>{doc.progress}%</span>
        </div>
        <div style={{ width: '100%', backgroundColor: 'var(--line)', borderRadius: '9999px', height: '5px', overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: 'var(--teal)', width: `${doc.progress}%`, transition: 'width 0.3s ease-out' }} />
        </div>
      </div>
    );
  };

  const toggleSidebar = () => {
    const shell = document.querySelector('.shell');
    const sidebar = document.querySelector('.sidebar');
    if (shell) {
      shell.classList.toggle('sidebar-hidden');
    }
    if (sidebar) {
      sidebar.classList.toggle('open');
      // For mobile backdrop if needed
      document.body.classList.toggle('nav-open');
    }
  };

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={toggleSidebar}
            className="btn btn-ghost"
            style={{ padding: '8px', borderRadius: '50%', color: 'var(--ink)' }}
            title="Masquer/Afficher le menu de gauche"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="eyebrow">Traitement Intelligent</div>
            <h1 className="page-title">Scanner Documentaire (Omni-Doc)</h1>
            <p className="page-sub">Importez n'importe quel document (Factures, Contrats, KYC). L'OCR intelligent extrait tout le contenu et le structure automatiquement.</p>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', maxWidth: '400px' }}>
              <input 
                type="text" 
                placeholder="Recherche Sémantique (ex: 'clause de résiliation')" 
                className="input-field"
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    try {
                      const res = await fetch('http://localhost:3001/v1/scanner/search?q=' + encodeURIComponent(e.currentTarget.value));
                      const data = await res.json();
                      alert(JSON.stringify(data.data || data, null, 2));
                    } catch(err) {
                      console.error(err);
                    }
                  }
                }}
              />
              <button className="btn btn-primary teal" style={{ padding: '8px 16px' }}>Chercher</button>
            </div>
          </div>
        </div>
      </div>

      <div className={`scanner-layout ${selectedDoc ? 'has-doc' : ''} ${!historyOpen && selectedDoc ? 'history-closed' : ''}`}>
        
        {/* Colonne de Gauche : Uploader OU Historique */}
        {!selectedDoc ? (
          <ScannerUploader onScanComplete={handleScanComplete} />
        ) : historyOpen ? (
          <div className="card" style={{ height: '600px', overflowY: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div className="section-title" style={{ margin: 0 }}>Historique récent</div>
              <button 
                onClick={() => setHistoryOpen(false)} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                title="Masquer l'historique"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-dim)' }}>
                  <FileText className="w-8 h-8 mx-auto mb-3" style={{ opacity: 0.4 }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Aucun document</div>
                  <div style={{ fontSize: '12px', marginTop: '6px' }}>
                    Importez un fichier (PDF, image, Office) pour l'enregistrer dans la GED.
                  </div>
                </div>
              )}
              {documents.map(doc => (
                <div 
                  key={doc.id} 
                  className={`doc-list-item ${selectedDoc === doc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDoc(doc.id)}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{doc.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{doc.time}</div>
                    {renderProgressBar(doc)}
                  </div>
                  {doc.alert && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </div>
              ))}
            </div>
          </div>
        ) : <div style={{ display: 'none' }}></div>}

        {/* Colonne de Droite : Historique (par défaut) OU Visionneuse */}
        {!selectedDoc ? (
          <div className="card">
            <div className="kpi-label" style={{ marginBottom: '16px' }}>Historique récent</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-dim)' }}>
                  <FileText className="w-8 h-8 mx-auto mb-3" style={{ opacity: 0.4 }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Aucune donnée enregistrée</div>
                  <div style={{ fontSize: '12px', marginTop: '6px' }}>
                    Vos nouveaux documents apparaîtront ici après import (extraction IA + archivage).
                  </div>
                </div>
              )}
              {documents.map(doc => (
                <div key={doc.id} className="doc-list-item" onClick={() => setSelectedDoc(doc.id)}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{doc.name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px' }}>{doc.time}</div>
                    {renderProgressBar(doc)}
                  </div>
                  <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                    <div className="env-pill" style={{ color: doc.statusColor, background: doc.statusBg }}>
                      {doc.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="viewer-container">
            <div className="viewer-preview">
              <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 30, display: 'flex', gap: '8px' }}>
                <button 
                  className={`btn ${isDrawingMode ? 'btn-primary teal' : 'btn-ghost'}`} 
                  style={{ padding: '8px 12px' }}
                  onClick={() => {
                    handleToggleDrawingMode();
                  }}
                >
                  <Crop className="w-4 h-4" /> {isDrawingMode ? 'Désactiver' : 'OCR Localisé'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '8px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  onClick={() => { setSelectedDoc(null); setIsDrawingMode(false); }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="viewer-document" style={{ position: 'relative', padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
                
                {isDrawingMode && (
                  <div 
                    style={{ position: 'absolute', inset: 0, zIndex: 20, cursor: 'crosshair', background: 'rgba(0,0,0,0.02)' }}
                    onMouseDown={(e) => {
                      if (showFieldPrompt) return; // Ne pas dessiner si le prompt est ouvert
                      const rect = e.currentTarget.getBoundingClientRect();
                      setDrawingStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                      setCurrentBox(null);
                    }}
                    onMouseMove={(e) => {
                      if (!drawingStart || showFieldPrompt) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const currentX = e.clientX - rect.left;
                      const currentY = e.clientY - rect.top;
                      setCurrentBox({
                        x: Math.min(drawingStart.x, currentX),
                        y: Math.min(drawingStart.y, currentY),
                        w: Math.abs(currentX - drawingStart.x),
                        h: Math.abs(currentY - drawingStart.y)
                      });
                    }}
                    onMouseUp={() => {
                      if (currentBox && currentBox.w > 20 && currentBox.h > 10) {
                        setShowFieldPrompt(true);
                      } else {
                        setCurrentBox(null);
                      }
                      setDrawingStart(null);
                    }}
                  >
                    {currentBox && (
                      <div style={{
                        position: 'absolute',
                        left: currentBox.x, top: currentBox.y, width: currentBox.w, height: currentBox.h,
                        border: '2px dashed var(--teal)', backgroundColor: 'rgba(20, 184, 166, 0.15)'
                      }} />
                    )}
                    
                    {showFieldPrompt && currentBox && (
                      <div style={{
                        position: 'absolute', left: currentBox.x + currentBox.w + 10, top: currentBox.y,
                        background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                        zIndex: 30, width: '260px', border: '1px solid var(--line)'
                      }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>Nom du champ à extraire :</div>
                        <input 
                          autoFocus
                          type="text" 
                          value={newFieldName} 
                          onChange={e => setNewFieldName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newFieldName.trim() && currentBox) {
                              addCustomField(activeDoc!.id, newFieldName.trim(), currentBox);
                              setShowFieldPrompt(false);
                              setCurrentBox(null);
                              setNewFieldName('');
                              setIsDrawingMode(false);
                              setPreviewImage(null);
                            }
                          }}
                          placeholder="Ex: Montant HT, Signature..."
                          style={{ width: '100%', padding: '8px 12px', fontSize: '13px', marginBottom: '16px', border: '1px solid #E2E8F0', borderRadius: '6px', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-ghost" style={{ flex: 1, padding: '6px', fontSize: '12px' }} onClick={() => { setShowFieldPrompt(false); setCurrentBox(null); }}>Annuler</button>
                          <button className="btn btn-primary teal" style={{ flex: 1, padding: '6px', fontSize: '12px' }} onClick={() => {
                            if (newFieldName.trim() && currentBox) {
                              addCustomField(activeDoc!.id, newFieldName.trim(), currentBox);
                              setShowFieldPrompt(false);
                              setCurrentBox(null);
                              setNewFieldName('');
                              setIsDrawingMode(false);
                              setPreviewImage(null);
                            }
                          }}>Extraire</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeDoc?.localFileUrl ? (
                  activeDoc.mimeType?.includes('pdf') ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {isDrawingMode && previewImage ? (
                      <img 
                        src={previewImage} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          setPreviewSize({ w: img.width, h: img.height, nw: img.naturalWidth, nh: img.naturalHeight });
                        }}
                      />
                    ) : (
                      <iframe src={activeDoc.localFileUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document PDF"></iframe>
                    )}
                  </div>
                  ) : activeDoc.mimeType?.includes('image') ? (
                    <img src={activeDoc.localFileUrl} alt="Document scanné" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : isOfficeDoc(activeDoc) && officePreview?.type === 'docx' ? (
                    <div className="viewer-office" dangerouslySetInnerHTML={{ __html: officePreview.html }} />
                  ) : isOfficeDoc(activeDoc) && officePreview?.type === 'text' ? (
                    <div className="viewer-office">
                      <pre className="rtf-pre">{officePreview.text}</pre>
                    </div>
                  ) : isOfficeDoc(activeDoc) && officePreview?.type === 'pptx' ? (
                    <div className="viewer-pptx">
                      {officePreview.slides.length > 0 ? officePreview.slides.map((lines, i) => (
                        <div className="pptx-slide" key={i}>
                          <div className="pptx-slide-num">{i + 1} / {officePreview!.slides.length}</div>
                          {lines.map((t, j) => (
                            <div key={j} className={j === 0 ? 'pptx-title' : 'pptx-line'}>{t}</div>
                          ))}
                        </div>
                      )) : (
                        <div style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', padding: '40px' }}>
                          Aucun texte détecté dans cette présentation.
                        </div>
                      )}
                    </div>
                  ) : isOfficeDoc(activeDoc) && officeError ? (
                    <div style={{ textAlign: 'center', color: 'var(--red)' }}>
                      <FileText className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--border)' }} />
                      <p>{officeError}</p>
                    </div>
                  ) : isOfficeDoc(activeDoc) ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                      <FileText className="w-16 h-16 animate-pulse" style={{ margin: '0 auto 16px', color: 'var(--border)' }} />
                      <p>Génération de l'aperçu en cours...</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                      <FileText className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--border)' }} />
                      <p>Aperçu non disponible pour ce format de fichier.<br/><span style={{ fontSize: '12px' }}>({activeDoc.mimeType || 'Format inconnu'})</span></p>
                    </div>
                  )
                ) : (
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', borderBottom: '2px solid #E2E8F0', paddingBottom: '16px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#334155' }}>{activeDoc?.supplier}</div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase' }}>{activeDoc?.type}</div>
                        <div>{activeDoc?.name}</div>
                      </div>
                    </div>
                    
                    {/* Mockup de document si pas de vrai fichier local */}
                    <div className="viewer-skeleton-line" style={{ width: '100%' }}></div>
                    <div className="viewer-skeleton-line" style={{ width: '80%' }}></div>
                    <div className="viewer-skeleton-line" style={{ width: '90%' }}></div>
                    
                    <div style={{ marginTop: 'auto', background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '8px' }}>Texte Brut (Extraction OCR)</div>
                      <pre style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: '100px', overflowY: 'auto' }}>
                        {activeDoc?.ocrText === "" ? "(Document purement scanné - Aucun texte brut détecté. Utilisez l'extraction zonale sur l'image ci-contre.)" : (activeDoc?.ocrText || "Analyse OCR en cours...")}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="viewer-data">
              <div style={{ marginBottom: '24px' }}>
                <div className="eyebrow">Extraction Algorithmique</div>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Données structurées ({activeDoc?.type})</h3>
              </div>

              {activeDoc?.alert && (
                <div style={{ background: 'rgba(162, 59, 59, 0.05)', border: '1px solid rgba(162, 59, 59, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--red)', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: 'var(--red)' }}>
                    <strong>Alerte détectée</strong><br/>
                    Le contenu OCR présente des anomalies. Fraude ou non-conformité potentielle (Score 8/10).
                  </div>
                </div>
              )}

              {/* Texte Brut (si fichier réel affiché à côté) */}
              {activeDoc?.localFileUrl && (
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '8px' }}>Texte Brut (Extraction OCR)</div>
                  <pre style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: '150px', overflowY: 'auto' }}>
                    {activeDoc?.ocrText === "" ? "(Document purement scanné - Aucun texte brut détecté. Utilisez l'extraction zonale sur l'image ci-contre.)" : (activeDoc?.ocrText || "Analyse OCR en cours...")}
                  </pre>
                </div>
              )}

              {/* Fiche signalétique — Rendu structuré des données extraites */}
              {activeDoc?.extractedData && (() => {
                const entries = Object.entries(activeDoc.extractedData);
                const { rich, others } = collectRichData(entries);
                const typeVal = rich['Type de Document'] || activeDoc?.type;
                const domaineVal = rich['Domaine Métier'];
                const statutVal = rich['Statut'] || activeDoc.status;
                const justifVal = rich['Justification Statut'];
                const acteursVal = rich['Acteurs'];
                const datesVal = rich['Dates Clés'];
                const motsVal = rich['Mots-clés'];
                const resumeVal = rich['Résumé'];
                const hasRich = Object.keys(rich).length > 0;
                const otherEntries = others;
                const statutBadge = statusBadge(statutVal || '');

                const renderChips = (value: string, extraCls = '') => (
                  <div className="dossier-chip-row">
                    {value.split(',').map((item, i) => {
                      const t = item.trim();
                      return t ? <span key={i} className={`dossier-chip ${extraCls}`}>{t}</span> : null;
                    })}
                  </div>
                );

                const renderDates = (value: string) => {
                  const items = value.split(/,\s*(?=\d{4}-\d{2}-\d{2})/).map(i => i.trim()).filter(Boolean);
                  return (
                    <div className="dossier-chip-row">
                      {items.map((item, i) => {
                        const d = item.match(/^(\d{4}-\d{2}-\d{2})(.*)$/);
                        const text = d ? `${formatFRDate(d[1])}${d[2]}` : item;
                        return <span key={i} className="dossier-chip dossier-date-chip"><CalendarDays className="w-3 h-3" />{text}</span>;
                      })}
                    </div>
                  );
                };

                const renderOther = ([key, value]: [string, string], idx: number) => {
                  const text = String(value ?? '');
                  const cls = classifyKey(key);
                  const delBtn = (
                    <button className="delete-btn" onClick={() => removeDataField(activeDoc.id, key)} title="Ne pas stocker ce mot-clé">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  );
                  if (cls === 'chips' && text.includes(',')) {
                    return (
                      <div className="data-row hover-group" key={idx}>
                        <div className="data-label">{key}</div>
                        <div className="data-value" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          {renderChips(text)}
                          {delBtn}
                        </div>
                      </div>
                    );
                  }
                  if (cls === 'dates') {
                    const rendered = /^\d{4}-\d{2}-\d{2}/.test(text) ? formatFRDate(text) : renderDates(text);
                    return (
                      <div className="data-row hover-group" key={idx}>
                        <div className="data-label">{key}</div>
                        <div className="data-value" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          {typeof rendered === 'string' ? <span>{rendered}</span> : rendered}
                          {delBtn}
                        </div>
                      </div>
                    );
                  }
                  if (cls === 'summary') {
                    return (
                      <div className="data-row hover-group" key={idx} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="data-label">{key}</div>
                          {delBtn}
                        </div>
                        <div className="dossier-summary">{text}</div>
                      </div>
                    );
                  }
                  return (
                    <div className="data-row hover-group" key={idx}>
                      <div className="data-label">{key}</div>
                      <div className="data-value" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        {renderDataValue(key, value)}
                        {delBtn}
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {hasRich && (
                      <div className="dossier-card">
                        <div className="dossier-band">
                          <div className="dossier-eyebrow">
                            <Landmark className="w-3.5 h-3.5" />
                            Dossier documentaire — Extraction
                          </div>
                          <div className="dossier-type">{typeVal || activeDoc?.type || 'Document'}</div>
                          <div className="dossier-meta">
                            {domaineVal && (
                              <span className="dossier-badge"><Building2 className="w-3.5 h-3.5" />{domaineVal}</span>
                            )}
                            {statutVal && (
                              <span className="dossier-badge" style={{ background: statutBadge.bg, color: statutBadge.color, borderColor: 'transparent' }}>
                                <ShieldCheck className="w-3.5 h-3.5" />{statutVal}
                              </span>
                            )}
                            <span className="dossier-badge"><ScrollText className="w-3.5 h-3.5" />{activeDoc?.name}</span>
                          </div>
                        </div>
                        <div className="dossier-body">
                          {justifVal && (
                            <div className="dossier-section">
                              <div className="dossier-section-title"><ShieldCheck className="w-3.5 h-3.5" />Justification du statut</div>
                              <div className="dossier-summary">{justifVal}</div>
                            </div>
                          )}
                          {acteursVal && (
                            <div className="dossier-section">
                              <div className="dossier-section-title"><Scale className="w-3.5 h-3.5" />Acteurs du document</div>
                              {renderChips(acteursVal)}
                            </div>
                          )}
                          {datesVal && (
                            <div className="dossier-section">
                              <div className="dossier-section-title"><CalendarDays className="w-3.5 h-3.5" />Dates clés</div>
                              {renderDates(datesVal)}
                            </div>
                          )}
                          {motsVal && (
                            <div className="dossier-section">
                              <div className="dossier-section-title"><Tags className="w-3.5 h-3.5" />Mots-clés</div>
                              {renderChips(motsVal)}
                            </div>
                          )}
                          {resumeVal && (
                            <div className="dossier-section">
                              <div className="dossier-section-title"><ScrollText className="w-3.5 h-3.5" />Résumé</div>
                              <div className="dossier-summary">{resumeVal}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {otherEntries.map((entry, idx) => renderOther(entry, idx))}

                    {!hasRich && entries.length === 0 && (
                       <>
                        <div className="data-row"><div className="data-label">Type</div><div className="data-value">{activeDoc?.type}</div></div>
                        <div className="data-row"><div className="data-label">Fournisseur</div><div className="data-value">{activeDoc?.supplier}</div></div>
                       </>
                    )}
                  </>
                );
              })()}
              
              {!activeDoc?.extractedData && (
                 <>
                  <div className="data-row"><div className="data-label">Type</div><div className="data-value">{activeDoc?.type}</div></div>
                  <div className="data-row"><div className="data-label">Fournisseur</div><div className="data-value">{activeDoc?.supplier}</div></div>
                 </>
              )}

              {activeDoc?.extractedData && !collectRichData(Object.entries(activeDoc.extractedData)).rich['Statut'] && (
                <div className="data-row" style={{ marginTop: '16px' }}>
                  <div className="data-label">Statut</div>
                  <div className="data-value" style={{ color: activeDoc?.statusColor, fontWeight: 700 }}>{activeDoc?.status}</div>
                </div>
              )}

              <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingTop: '24px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => {
                    setDocuments(prev => prev.map(d => d.id === activeDoc?.id ? { ...d, status: 'Rejeté', statusColor: 'var(--red)', statusBg: 'rgba(162, 59, 59, 0.1)', alert: false } : d));
                    setSelectedDoc(null);
                  }}
                >
                  Rejeter
                </button>
                <button 
                  className="btn btn-primary teal" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={async () => {
                    // Enregistrement distinct : remplace le terme générique par le type entre parenthèses
                    const genericTypes = new Set(['Inconnu', 'Document', 'Document Inconnu', 'Erreur', 'Traitement Lourd']);
                    const base =
                      activeDoc?.type && !genericTypes.has(activeDoc.type)
                        ? activeDoc.type
                        : (activeDoc?.name || 'Document');
                    let title = base;
                    let suffix = 2;
                    while (documents.some(d => d.id !== activeDoc?.id && d.name === title)) {
                      title = `${base} (${suffix})`;
                      suffix += 1;
                    }

                    setDocuments(prev => prev.map(d => d.id === activeDoc?.id ? {
                      ...d,
                      name: title,
                      status: 'Archivage en cours…',
                      statusColor: 'var(--amber)',
                      statusBg: 'rgba(245, 158, 11, 0.1)',
                      alert: false
                    } : d));

                    try {
                      const res = await fetch(`http://localhost:3001/v1/scanner/documents/${encodeURIComponent(activeDoc?.id || '')}/archive`, { method: 'POST' });
                      const data = await res.json().catch(() => null);
                      if (!res.ok) throw new Error((data && data.message) || `Erreur HTTP ${res.status}`);
                      setDocuments(prev => prev.map(d => d.id === activeDoc?.id ? {
                        ...d,
                        name: title,
                        status: 'Archivé & Intégré',
                        statusColor: 'var(--teal)',
                        statusBg: 'rgba(20, 184, 166, 0.1)',
                        alert: false,
                        archive: { archive_path: data.archive_path, checksum: data.checksum, taille: data.taille, archive_le: data.archive_le }
                      } : d));
                      alert(
                        `Document archivé sous « ${title} » avec succès.\n\n` +
                        `• Fichier conservé (diskgroup sécurisé) : ${data.archive_path}\n` +
                        `• Empreinte SHA-256 : ${data.checksum}\n` +
                        `• Taille : ${Math.round((data.taille || 0) / 1024)} Ko\n` +
                        `• Index logique en mémoire + BDD ✅`
                      );
                    } catch (e: any) {
                      setDocuments(prev => prev.map(d => d.id === activeDoc?.id ? {
                        ...d,
                        status: 'Échec archivage',
                        statusColor: 'var(--red)',
                        statusBg: 'rgba(162, 59, 59, 0.1)'
                      } : d));
                      alert(`Erreur d'archivage : ${e.message}`);
                    }
                    setSelectedDoc(null);
                  }}
                >
                  Valider & Archiver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

