"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop, Loader2, X } from "lucide-react";

/**
 * Relance l'OCR sur une zone précise du document.
 *
 * Le backend expose `POST documents/:id/elements/:elementId/ocr` en
 * multipart : il attend le *recadrage* de la zone, pas le document entier.
 * Le recadrage est donc fait ici, dans le navigateur, sur un canvas — c'est
 * ce qui évite de renvoyer un PDF complet à l'OCR pour lire un montant.
 *
 * La sélection se fait à la souris sur la page affichée, et la zone est
 * renvoyée en coordonnées normalisées : la page peut être rendue à une
 * autre résolution que celle du pixel source sans fausser la position.
 */
interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function OcrZonePicker({
  documentId,
  elementId,
  headers,
  onResultat,
  onAnnuler,
}: {
  documentId: string;
  elementId: string;
  headers: Record<string, string>;
  onResultat: (valeur: string) => void;
  onAnnuler: () => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [debut, setDebut] = useState<{ x: number; y: number } | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const chargerImage = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      // L'export PNG rasterise la première page et renvoie du JSON base64 :
      // c'est la seule source qui marche à la fois pour un PDF et pour une
      // image, et le JSON évite d'exposer un `application/pdf` à fetch().
      // Le chemin `file?as=base64` rendait les PDF illisibles dans un <img>.
      const reponse = await fetch(
        `/api/scanner/documents/${encodeURIComponent(documentId)}/export?format=png`,
        { cache: "no-store", headers },
      );
      const corps = await reponse.json().catch(() => null);
      const data = corps?.data ?? corps;
      if (!reponse.ok) {
        setErreur(data?.message || data?.error || `Aperçu indisponible (HTTP ${reponse.status}).`);
        return;
      }
      const pages: string[] = Array.isArray(data?.pages) && data.pages.length
        ? data.pages
        : typeof data?.data === "string"
          ? [data.data]
          : [];
      if (pages.length === 0) {
        setErreur("Ce document n'a aucune page convertible en image.");
        return;
      }
      setPages(pages);
      setPage(0);
      setImage(`data:${data?.mime || "image/png"};base64,${pages[0]}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Aperçu indisponible.");
    } finally {
      setChargement(false);
    }
  }, [documentId, headers]);

  // L'image est en `width:100%` sans hauteur forcée : le conteneur de dessin
  // a exactement les dimensions de l'image, donc les coordonnées normalisées
  // du rectangle correspondent pixel pour pixel aux pixels de l'aperçu.
  useEffect(() => {
    if (!image && !chargement && !erreur) void chargerImage();
  }, [image, chargement, erreur, chargerImage]);

  const position = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const surRelacher = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!debut) return;
    const fin = position(e);
    setDebut(null);
    const x = Math.min(debut.x, fin.x);
    const y = Math.min(debut.y, fin.y);
    const w = Math.abs(fin.x - debut.x);
    const h = Math.abs(fin.y - debut.y);
    // Une sélection trop petite est un clic, pas un recadrage.
    if (w < 0.01 || h < 0.005) {
      setZone(null);
      return;
    }
    setZone({ x, y, w, h });
  };

  const envoyer = async () => {
    const img = imageRef.current;
    if (!zone || !img) return;
    setEnCours(true);
    setErreur(null);
    try {
      const largeur = img.naturalWidth;
      const hauteur = img.naturalHeight;
      const px = { x: Math.round(zone.x * largeur), y: Math.round(zone.y * hauteur) };
      const pw = Math.max(1, Math.round(zone.w * largeur));
      const ph = Math.max(1, Math.round(zone.h * hauteur));

      const canvas = document.createElement("canvas");
      canvas.width = pw;
      canvas.height = ph;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Recadrage impossible dans ce navigateur.");
      ctx.drawImage(img, px.x, px.y, pw, ph, 0, 0, pw, ph);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("Le recadrage de la zone a échoué.");

      const donnees = new FormData();
      donnees.append("file", blob, `zone-${elementId}.png`);
      donnees.append("zone", JSON.stringify(zone));
      // La page est 1-indexée côté base : la zone n'a de sens que si on sait
      // de quelle page elle vient.
      donnees.append("page", String(page + 1));

      const reponse = await fetch(
        `/api/scanner/documents/${encodeURIComponent(documentId)}/elements/${encodeURIComponent(elementId)}/ocr`,
        { method: "POST", body: donnees, headers },
      );
      const corps = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        setErreur((corps?.message || corps?.error || `Échec (${reponse.status})`).toString());
        return;
      }
      const valeur = corps?.data?.valeur ?? corps?.valeur ?? corps?.texte ?? "";
      if (!valeur) {
        setErreur("L'OCR n'a rien lu dans cette zone — élargissez la sélection.");
        return;
      }
      onResultat(String(valeur));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "OCR de zone impossible.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,14,12,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
        padding: 20,
      }}
    >
      <div className="card" style={{ maxWidth: 760, width: "100%", maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div className="section-title">
              <Crop className="w-4 h-4 inline" /> Recadrer la zone à relire
            </div>
            <div className="section-sub">
              Dessinez le rectangle autour de la valeur dans la page. Seule cette zone part à
              l&apos;OCR, et le résultat remplace la valeur de cet élément.
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onAnnuler} aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {erreur ? (
          <div
            style={{
              margin: "12px 0",
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.25)",
              color: "var(--red)",
              fontSize: 12.5,
            }}
          >
            {erreur}
          </div>
        ) : null}

        {chargement ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
            <Loader2 className="w-4 h-4 animate-spin inline" /> Chargement de la page…
          </div>
        ) : null}

        {pages.length > 1 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Page</span>
            <select
              className="select"
              style={{ maxWidth: 120 }}
              value={page}
              onChange={(e) => {
                const cible = Number(e.target.value);
                setPage(cible);
                setImage(`data:image/png;base64,${pages[cible]}`);
                setZone(null);
                setDebut(null);
              }}
            >
              {pages.map((_, i) => (
                <option key={i} value={i}>
                  {i + 1} / {pages.length}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {image ? (
          <div
            onMouseDown={(e) => setDebut(position(e))}
            onMouseUp={surRelacher}
            onMouseLeave={() => setDebut(null)}
            style={{
              position: "relative",
              marginTop: 12,
              userSelect: "none",
              cursor: "crosshair",
              border: "1px solid var(--line)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imageRef} src={image} alt="Page du document" style={{ width: "100%", display: "block" }} />
            {zone ? (
              <div
                style={{
                  position: "absolute",
                  left: `${zone.x * 100}%`,
                  top: `${zone.y * 100}%`,
                  width: `${zone.w * 100}%`,
                  height: `${zone.h * 100}%`,
                  border: "2px solid var(--teal)",
                  background: "rgba(26,74,60,0.12)",
                  pointerEvents: "none",
                }}
              />
            ) : null}
            {debut ? (
              <div
                style={{
                  position: "absolute",
                  left: `${debut.x * 100}%`,
                  top: `${debut.y * 100}%`,
                  width: 2,
                  height: "100%",
                  background: "var(--teal)",
                  opacity: 0.4,
                  pointerEvents: "none",
                }}
              />
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
            {zone ? `Zone sélectionnée : ${Math.round(zone.w * 100)} % × ${Math.round(zone.h * 100)} %` : "Aucune zone sélectionnée"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onAnnuler}>
              Annuler
            </button>
            <button className="btn btn-primary teal" onClick={envoyer} disabled={!zone || enCours}>
              {enCours ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crop className="w-3.5 h-3.5" />}
              Relire la zone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
