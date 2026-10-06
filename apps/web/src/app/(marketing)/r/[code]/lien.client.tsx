"use client";
import { useEffect, useState } from "react";
import { restaurerPosition, ErreurMarketing, type ResultatLien } from "@/lib/marketing-api";

/**
 * Page publique du lien `/r/CODE` : affiche la POSITION RÉELLE renvoyée par
 * l'API (jamais un nombre local) et boucle vers l'inscription avec ce code
 * comme parrain.
 */
export default function LienParrainageClient({ code }: { code: string }) {
  const [statut, setStatut] = useState<"chargement" | "ok" | "erreur">("chargement");
  const [lien, setLien] = useState<ResultatLien | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let actif = true;
    // Pas de setState synchrone ici : l'état initial est déjà « chargement ».
    restaurerPosition(code)
      .then((resultat) => {
        if (!actif) return;
        setLien(resultat);
        setStatut("ok");
      })
      .catch((err: unknown) => {
        if (!actif) return;
        setMessage(
          err instanceof ErreurMarketing
            ? err.message
            : "Lecture impossible : réessayez dans un instant.",
        );
        setStatut("erreur");
      });
    return () => {
      actif = false;
    };
  }, [code]);

  const carte: React.CSSProperties = {
    maxWidth: 480,
    margin: "10vh auto",
    padding: "36px 30px",
    borderRadius: 16,
    background: "#123229",
    border: "1px solid #1c4a3c",
    textAlign: "center",
    fontFamily: "inherit",
    color: "#e8ede9",
  };

  return (
    <main style={{ background: "#0b1f1a", minHeight: "100vh", padding: "0 20px" }}>
      <div style={carte}>
        <div style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#d9a64a" }}>
          Elara — file d&apos;attente
        </div>

        {statut === "chargement" && (
          <p style={{ marginTop: 24, color: "#9db4aa" }} role="status">
            Lecture de votre position…
          </p>
        )}

        {statut === "erreur" && (
          <>
            <h1 style={{ fontSize: 22, margin: "22px 0 8px" }}>Code introuvable</h1>
            <p style={{ color: "#cdd8d2", fontSize: 15 }}>{message}</p>
          </>
        )}

        {statut === "ok" && lien && (
          <>
            <div style={{ fontSize: 56, fontWeight: 700, color: "#f4f1ea", marginTop: 18 }}>
              #{lien.position}
            </div>
            <p style={{ color: "#cdd8d2", fontSize: 15, marginTop: 4 }}>
              position actuelle de ce lien
              {lien.parrainages > 0
                ? ` — ${lien.parrainages} invitation${lien.parrainages > 1 ? "s" : ""} déjà acceptée${lien.parrainages > 1 ? "s" : ""}`
                : ""}
            </p>
            <p style={{ fontSize: 13, color: "#8fa39a" }}>Code {lien.code_parrain}</p>
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 26 }}>
          <a
            href={`/prelancement?p=${encodeURIComponent(code.toUpperCase())}`}
            style={{
              display: "block",
              padding: "13px 18px",
              borderRadius: 10,
              background: "#d9a64a",
              color: "#10241d",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Rejoindre la liste avec ce parrain
          </a>
          <a
            href="/register"
            style={{
              display: "block",
              padding: "13px 18px",
              borderRadius: 10,
              border: "1px solid #2d6a56",
              color: "#e8ede9",
              textDecoration: "none",
            }}
          >
            Créer mon compte Elara
          </a>
          <a href="/prelancement" style={{ fontSize: 14, color: "#9db4aa", textDecoration: "none" }}>
            Voir les paliers de la liste d&apos;attente
          </a>
        </div>
      </div>
    </main>
  );
}