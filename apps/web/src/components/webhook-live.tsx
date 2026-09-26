"use client";

/**
 * Bouton « Webhook Live » des barres d'action.
 *
 * Il ouvre un panneau alimenté par le journal d'audit réellement écrit en
 * base (`audit_trail`) et rafraîchit tant qu'il est ouvert. Le point pulse
 * uniquement quand le flux tourne.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { lireActiviteAction } from "@/lib/actions";

interface Entree {
  id: string;
  action: string;
  entite: string;
  statut: "SUCCESS" | "FAILED";
  acteur: string;
  quand: string;
}

function depuis(dureeMs: number): string {
  const secondes = Math.max(0, Math.round((Date.now() - new Date(dureeMs).getTime()) / 1000));
  if (secondes < 60) return `il y a ${secondes} s`;
  const minutes = Math.round(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  return new Date(dureeMs).toLocaleDateString("fr-FR");
}

export function BoutonWebhookLive() {
  const [ouvert, setOuvert] = useState(false);
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const rafraichir = useRef<ReturnType<typeof setInterval> | null>(null);

  const charger = () => {
    demarrer(async () => {
      try {
        const reponse = await lireActiviteAction(25);
        setEntrees(reponse.entrees);
        setTotal(reponse.total);
        setErreur(null);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Journal inaccessible.");
      }
    });
  };

  useEffect(() => {
    if (!ouvert) {
      if (rafraichir.current) clearInterval(rafraichir.current);
      rafraichir.current = null;
      return;
    }
    charger();
    rafraichir.current = setInterval(charger, 10000);
    return () => {
      if (rafraichir.current) clearInterval(rafraichir.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    if (ouvert) document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [ouvert]);

  return (
    <>
      <button
        type="button"
        className="btn-live-stream"
        data-actif={ouvert ? "true" : "false"}
        aria-expanded={ouvert}
        onClick={() => setOuvert((v) => !v)}
        title="Activité récente de votre organisation, lue dans le journal d'audit"
      >
        <span className="pulse-dot" data-actif={ouvert ? "true" : "false"} /> Webhook Live
      </button>

      {ouvert ? (
        <div className="live-panel" role="dialog" aria-label="Activité en direct">
          <div className="live-head">
            <span className="live-title">
              <span className="pulse-dot" data-actif="true" /> Activité en direct
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "4px 11px", fontSize: 11.5 }}
                onClick={charger}
                disabled={enCours}
              >
                {enCours ? "…" : "Actualiser"}
              </button>
              <button type="button" className="modal-close" onClick={() => setOuvert(false)} aria-label="Fermer">
                ×
              </button>
            </div>
          </div>

          <div className="live-list">
            {erreur ? <div className="live-item">{erreur}</div> : null}
            {!erreur && !entrees.length ? (
              <div className="live-item">
                <div>
                  <div className="live-text">Aucune écriture enregistrée pour l’instant.</div>
                  <div className="live-meta">Le journal se remplit dès la première action sur vos données.</div>
                </div>
              </div>
            ) : null}
            {entrees.map((e) => (
              <div className="live-item" key={e.id}>
                <span className={`live-badge ${e.statut === "SUCCESS" ? "live-badge-ok" : "live-badge-ko"}`}>
                  {e.statut === "SUCCESS" ? "OK" : "ERR"}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="live-text">
                    {e.action} · {e.entite}
                  </div>
                  <div className="live-meta">
                    {e.acteur} — {depuis(Date.parse(e.quand))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="live-head" style={{ background: "var(--paper)", borderTop: "1px solid var(--line-soft)", borderBottom: "none" }}>
            <span className="live-meta">
              {total === null ? "Chargement…" : `${total} écriture(s) au total · rafraîchissement toutes les 10 s`}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
