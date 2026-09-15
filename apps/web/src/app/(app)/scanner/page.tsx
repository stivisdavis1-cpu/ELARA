"use client";

import React, { useState } from "react";
import ScannerUploader from "../../../components/ScannerUploader";
import { FileText, X, AlertTriangle, Menu, Crop } from "lucide-react";

export default function ScannerPage() {
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

  const initialDocs = [
    { 
      id: '1', name: 'Facture_AWS_Mai.pdf', time: 'Il y a 10 minutes', 
      status: 'En cours', statusColor: 'var(--teal)', statusBg: 'rgba(169,118,31,0.1)', 
      type: 'Facture Fournisseur', amount: '-', supplier: 'Amazon Web Services',
      extractedData: {
        'N° Facture': 'INV-445902',
        'Date d\'émission': '01/05/2026',
        'Montant HT': '1 250 000 FCFA',
        'TVA (18%)': '225 000 FCFA',
        'IBAN Détecté': 'En cours d\'analyse...'
      },
      ocrText: 'AMAZON WEB SERVICES\nFacture: INV-445902\n\nTotal Due: 1,475,000 FCFA...'
    },
    { 
      id: '3', name: 'Contrat_Prestation_Design.pdf', time: 'Lundi dernier', 
      status: 'Alerte Fraude (Score 8/10)', statusColor: 'var(--red)', statusBg: 'rgba(162, 59, 59, 0.1)', 
      type: 'Contrat Légale', amount: '-', supplier: 'Inconnu LTD', alert: true,
      extractedData: {
        'Type d\'accord': 'Prestation de Service',
        'Partie A': 'OrbitTech Services',
        'Partie B': 'Inconnu LTD',
        'Date d\'effet': '12/05/2026',
        'Durée': 'Indéterminée'
      },
      ocrText: 'CONTRAT DE PRESTATION\nEntre OrbitTech Services et Inconnu LTD...\nArticle 1: Objet...'
    }
  ];

  const [documents, setDocuments] = useState<Array<Record<string, unknown>>>(initialDocs);

  const handleScanComplete = (newDocs: Array<Record<string, unknown>>) => {
    setDocuments(prev => [...newDocs, ...prev]);
    if (newDocs.length > 0) {
      setSelectedDoc(newDocs[0].id as string); // Auto-open the first scanned doc
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
              {documents.map(doc => (
                <div 
                  key={doc.id} 
                  className={`doc-list-item ${selectedDoc === doc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDoc(doc.id)}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{doc.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{doc.time}</div>
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
              {documents.map(doc => (
                <div key={doc.id} className="doc-list-item" onClick={() => setSelectedDoc(doc.id)}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{doc.name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px' }}>{doc.time}</div>
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

              {/* Rendu dynamique des données extraites */}
              {activeDoc?.extractedData && Object.entries(activeDoc.extractedData).map(([key, value]) => (
                <div className="data-row hover-group" key={key}>
                  <div className="data-label">{key}</div>
                  <div className="data-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ 
                      color: value === "Extraction en cours..." ? 'var(--text-faint)' : 'inherit',
                      fontStyle: value === "Extraction en cours..." ? 'italic' : 'normal'
                    }}>
                      {String(value)}
                    </span>
                    <button 
                      className="delete-btn"
                      onClick={() => removeDataField(activeDoc.id, key)}
                      title="Ne pas stocker ce mot-clé"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              
              {!activeDoc?.extractedData && (
                 <>
                  <div className="data-row"><div className="data-label">Type</div><div className="data-value">{activeDoc?.type}</div></div>
                  <div className="data-row"><div className="data-label">Fournisseur</div><div className="data-value">{activeDoc?.supplier}</div></div>
                 </>
              )}

              <div className="data-row" style={{ marginTop: '16px' }}>
                <div className="data-label">Statut</div>
                <div className="data-value" style={{ color: activeDoc?.statusColor, fontWeight: 700 }}>{activeDoc?.status}</div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingTop: '24px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Rejeter</button>
                <button className="btn btn-primary teal" style={{ flex: 1, justifyContent: 'center' }}>Valider & Intégrer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

