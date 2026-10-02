"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, Loader2, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { socketScanner } from "@/lib/api-url";
import { useEntrepriseCourante } from "@/components/TenantContext";

interface ScannerUploaderProps {
  onScanComplete?: (documents: any[]) => void;
}

export default function ScannerUploader({ onScanComplete }: ScannerUploaderProps) {
  const { data: session } = useSession();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [scanStep, setScanStep] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  // L'entreprise courante est lue par le layout côté serveur : sans elle, aucun
  // appel API n'est possible. Elle n'est jamais devinée.
  const tenantId = useEntrepriseCourante() || '';

  useEffect(() => {
    if (session?.user) {
      // Sans entreprise, pas de canal de notifications : le tenant d'un
      // document est ce qui l'autorise à en recevoir.
      if (!tenantId) return;
      // Connexion au WebSocket avec le tenantId de l'utilisateur
      const socket = io(socketScanner(), {
        query: { tenantId }
      });      
      socket.on('document_status_update', (data) => {
        setUploadedDocs((prevDocs) => {
          return prevDocs.map(doc => {
            if (doc.id === data.documentId) {
              return {
                ...doc,
                status: data.status,
                statusColor: data.statusColor || doc.statusColor,
                statusBg: data.statusBg || doc.statusBg,
                ocrText: data.ocrText || doc.ocrText,
                extractedData: data.extractedData || doc.extractedData
              };
            }
            return doc;
          });
        });
      });

      socket.on('document_progress_update', (data) => {
        setUploadedDocs((prevDocs) => {
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleScan = async () => {
    if (files.length === 0) return;
    
    setScanState('scanning');
    setScanStep('Extraction OCR Backend en cours...');

    const newDocs: any[] = [];

    // On traite chaque fichier
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        // On passe par le rewrite Next (`/api/scanner/*` → API Nest) plutôt
        // que par `http://localhost:3001` codé en dur : depuis le navigateur,
        // localhost désigne le poste du client, pas le conteneur API, et
        // l'envoi échouait dès que le web tournait en docker.
        const reponse = await fetch('/api/scanner/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(session as any)?.accessToken ?? ''}`,
            ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
          },
          body: formData
        });

        if (reponse.ok) {
          const resultWrapper = await reponse.json();
          const result = resultWrapper.data || resultWrapper;
          if (!result.documentId) {
            // Sans identifiant serveur, la ligne locale deviendrait un doublon
            // permanent au prochain rechargement : mieux vaut le signaler que
            // d'inventer un identifiant qui ne correspond à rien en base.
            throw new Error("Le serveur n'a pas retourné d'identifiant de document.");
          }
          // On ajoute le document avec les données réelles et l'URL Blob du fichier original pour l'affichage local
          newDocs.push({
            id: result.documentId,
            name: result.name || file.name,
            time: 'À l\'instant',
            type: result.type || undefined,
            supplier: result.extractedData?.['Fournisseur probable'] || result.extractedData?.['Entité (Emetteur/Tiers)'] || '',
            status: result.status || 'Terminé',
            statusColor: result.statusColor || 'var(--teal)',
            statusBg: result.statusBg || 'rgba(20, 184, 166, 0.1)',
            extractedData: result.extractedData,
            alert: result.alert,
            ocrText: result.ocrText,
            localFileUrl: URL.createObjectURL(file), // Pour afficher le vrai fichier dans le navigateur !
            mimeType: file.type
          });
        } else {
          // Gérer le cas d'erreur côté serveur.
          //
          // Aucun mot de passe n'est posé dans `ocrText` : y mettre un message
          // d'erreur faisait passer la ligne pour un document lu, et
          // l'écran affichait alors « fraude ou non-conformité potentielle » sur
          // une page que personne n'avait pu lire. Un échec d'analyse n'est
          // pas une anomalie du document.
          const echec = await reponse.json().catch(() => null);
          newDocs.push({
            id: `erreur_${Date.now()}_${file.name}`,
            name: file.name,
            time: 'À l\'instant',
            type: undefined,
            supplier: '',
            status: 'Échec de l\'analyse',
            statusColor: 'var(--red)',
            statusBg: 'rgba(162, 59, 59, 0.1)',
            extractedData: { 'Erreur': 'Le document est corrompu ou illisible par le moteur OCR.' },
            alert: false,
            erreur: (echec && (echec.message || echec.error)) || `Analyse impossible (HTTP ${reponse.status}).`,
            ocrText: '',
            localFileUrl: URL.createObjectURL(file),
            mimeType: file.type
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Envoi impossible.";
        console.error("Erreur lors de l'envoi OCR", err);
        newDocs.push({
          id: `erreur_${Date.now()}_${file.name}`,
          name: file.name,
          time: 'À l\'instant',
          type: undefined,
          supplier: '',
          status: 'Échec de l\'analyse',
          statusColor: 'var(--red)',
          statusBg: 'rgba(162, 59, 59, 0.1)',
          extractedData: { 'Erreur': message },
          alert: false,
          erreur: message,
          ocrText: '',
          localFileUrl: URL.createObjectURL(file),
          mimeType: file.type
        });
      }
    }

    setScanState('done');
    setScanStep('Extraction terminée !');
    
    setTimeout(() => {
      if (onScanComplete && newDocs.length > 0) {
        onScanComplete(newDocs);
      }
      setFiles([]);
      setScanState('idle');
    }, 1000);
  };

  return (
    <div className="card" style={{ padding: '32px' }}>
      <div className="kpi-label" style={{ marginBottom: '16px' }}>Importer des documents réels</div>
      
      <motion.div 
        onClick={() => scanState === 'idle' && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? 'var(--teal)' : 'var(--line)',
          backgroundColor: isDragging ? 'rgba(169,118,31,0.05)' : 'var(--paper)',
          opacity: scanState !== 'idle' ? 0.5 : 1
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{
          border: '2px dashed',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: scanState === 'idle' ? 'pointer' : 'default',
        }}
        className={scanState === 'idle' ? "hover-scale" : ""}
      >
        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
          disabled={scanState !== 'idle'}
        />
        <motion.svg 
          animate={{ y: isDragging ? -5 : 0 }}
          width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px' }}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </motion.svg>
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>Cliquez ou glissez-déposez vos vrais fichiers ici</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>PDF, PNG, JPG, Word/DOCX (Traitement OCR Réel côté serveur)</p>
      </motion.div>

      <AnimatePresence>
        {files.length > 0 && scanState === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: '24px', overflow: 'hidden' }}
          >
            <div className="kpi-label">Fichiers en attente ({files.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <AnimatePresence>
                {files.map((file, idx) => (
                  <motion.div 
                    key={`${file.name}-${idx}`} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 24 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--paper)', borderRadius: '8px', border: '1px solid var(--line-soft)' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{file.name}</span>
                    <span className="env-pill" style={{ color: 'var(--text-dim)', background: 'transparent', border: 'none' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}
            >
               <button className="btn btn-primary teal hover-scale flex items-center gap-2" onClick={handleScan}>
                 <Scan className="w-4 h-4" /> Traitement OCR Intégral ({files.length})
               </button>
            </motion.div>
          </motion.div>
        )}

        {scanState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ marginTop: '32px', textAlign: 'center' }}
          >
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                {scanState === 'scanning' ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--teal)' }} /> : <CheckCircle className="w-6 h-6" style={{ color: 'var(--green)' }} />}
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{scanStep}</div>
             </div>
             {scanState === 'scanning' && (
               <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                 Lecture des pixels et du texte en cours (cela peut prendre quelques secondes)...
                 {uploadedDocs.length > 0 && uploadedDocs[0].progress !== undefined && (
                   <div style={{ marginTop: '16px', textAlign: 'left', background: 'var(--paper)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line-soft)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                       <span>{uploadedDocs[0].progressMessage || 'Analyse en cours...'}</span>
                       <span style={{ fontWeight: 600 }}>{uploadedDocs[0].progress}%</span>
                     </div>
                     <div style={{ width: '100%', backgroundColor: 'var(--line)', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
                       <div 
                         style={{ 
                           height: '100%', 
                           backgroundColor: 'var(--teal)', 
                           width: `${uploadedDocs[0].progress}%`,
                           transition: 'width 0.3s ease-out'
                         }} 
                       />
                     </div>
                   </div>
                 )}
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
