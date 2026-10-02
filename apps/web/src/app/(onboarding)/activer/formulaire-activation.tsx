"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Saisie du mot de passe par l'invité.
 *
 * L'écran interroge d'abord l'API pour afficher l'adresse invitée et
 * l'entreprise : sans cela, l'invité valide un mot de passe sans savoir à quel
 * compte il va s'appliquer. Un lien invalide ou expiré est signalé ici plutôt
 * qu'à la soumission, quand l'invité a déjà saisi son mot de passe.
 */
export default function FormulaireActivation({ jeton }: { jeton: string }) {
  const router = useRouter();
  const [infos, setInfos] = useState<{ email: string; entreprise: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const r = await fetch(`${API}/v1/activation/${encodeURIComponent(jeton)}`, { cache: "no-store" });
        if (!r.ok) {
          const texte = await r.text();
          let message = texte.slice(0, 160);
          try {
            const enveloppe = JSON.parse(texte);
            message = enveloppe?.error?.message || enveloppe?.error || message;
          } catch {
            /* texte brut */
          }
          if (!annule) setErreur(String(message));
          return;
        }
        const donnees = await r.json();
        const contenu = donnees?.data ?? donnees;
        if (!annule) setInfos({ email: contenu.email, entreprise: contenu.entreprise });
      } catch {
        if (!annule) setErreur("Service d'activation injoignable. Réessayez dans un instant.");
      }
    })();
    return () => {
      annule = true;
    };
  }, [jeton]);

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const donnees = new FormData(e.currentTarget);
    const motDePasse = String(donnees.get("mot_de_passe") ?? "");
    const confirmation = String(donnees.get("confirmation") ?? "");
    // Vérifié ici et non seulement côté API : une confirmation divergente est
    // une faute de saisie, pas une erreur à faire remonter du serveur.
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    demarrer(async () => {
      try {
        const r = await fetch(`${API}/v1/activation/${encodeURIComponent(jeton)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mot_de_passe: motDePasse, confirmation }),
        });
        if (!r.ok) {
          const texte = await r.text();
          let message = texte.slice(0, 160);
          try {
            const enveloppe = JSON.parse(texte);
            message = enveloppe?.error?.message || enveloppe?.error || message;
          } catch {
            /* texte brut */
          }
          setErreur(String(message));
          return;
        }
        router.push("/login?active=1");
      } catch {
        setErreur("Service d'activation injoignable. Réessayez dans un instant.");
      }
    });
  }

  const champ: React.CSSProperties = {
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    outline: "none",
    width: "100%",
    background: "#fff",
  };

  if (erreur && !infos) {
    return (
      <div style={{ fontSize: "14px", color: "var(--text-dim)" }}>
        <p style={{ marginBottom: "20px" }}>{erreur}</p>
        <a className="btn btn-primary" href="/login" style={{ width: "100%", justifyContent: "center" }}>
          Aller à la connexion
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {infos && (
        <div
          style={{
            fontSize: "13px",
            background: "var(--paper)",
            padding: "12px",
            borderRadius: "8px",
            color: "var(--text-dim)",
          }}
        >
          Invitation pour <strong style={{ color: "var(--text-main)" }}>{infos.email}</strong>
          {infos.entreprise ? <> — {infos.entreprise}</> : null}
        </div>
      )}
      {erreur && infos && (
        <div style={{ fontSize: "14px", background: "#ffebee", color: "#B3261E", padding: "10px", borderRadius: "8px" }}>
          {erreur}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label htmlFor="mot_de_passe" style={{ fontSize: "14px", fontWeight: 500 }}>
          Mot de passe
        </label>
        <input
          type="password"
          id="mot_de_passe"
          name="mot_de_passe"
          required
          minLength={10}
          placeholder="Au moins 10 caractères"
          style={champ}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label htmlFor="confirmation" style={{ fontSize: "14px", fontWeight: 500 }}>
          Confirmer le mot de passe
        </label>
        <input
          type="password"
          id="confirmation"
          name="confirmation"
          required
          minLength={10}
          placeholder="Répétez le mot de passe"
          style={champ}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={enCours}
        style={{ width: "100%", justifyContent: "center", opacity: enCours ? 0.7 : 1 }}
      >
        {enCours ? "Activation..." : "Activer mon compte"}
      </button>
    </form>
  );
}
