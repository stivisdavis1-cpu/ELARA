"use client";

/**
 * Composant d'actions de page.
 *
 * Les pages sont des composants React : les boutons des barres d'action
 * (et les boutons de ligne) sont rendus ici et branchés sur des Server
 * Actions. Un clic ouvre une modale si l'action demande des champs, exécute
 * l'action serveur sinon, puis rafraîchit la page et affiche un retour.
 */
import { ReactNode, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

export interface ResultatAction {
  ok: boolean;
  message: string;
}

export interface ChampAction {
  cle: string;
  label: string;
  type: "texte" | "email" | "nombre" | "date" | "select" | "textarea" | "checkbox";
  options?: { valeur: string; libelle: string }[];
  hint?: string;
  requis?: boolean;
  defaut?: string | number | boolean;
  colonne?: "pleine" | "demi";
}

export interface ActionPage {
  libelle: string;
  variante?: "primaire" | "fantome" | "direct";
  icone?: ReactNode;
  /** confirmation avant d'appeler l'action serveur */
  confirmation?: string;
  /** champs du formulaire ; si absent, exécution directe */
  champs?: ChampAction[];
  /** valeurs injectées dans le formulaire (édition d'une ligne) */
  valeurs?: Record<string, string | number | boolean>;
  /** action serveur, appelée avec les valeurs du formulaire */
  executer?: (donnees: Record<string, unknown>) => Promise<ResultatAction>;
  /** lien de navigation au clic */
  naviguer?: string;
  /** insère un champ fichier dont le contenu est lu puis envoyé en base64 */
  fichier?: { cle: string; label: string; hint?: string; accept?: string };
  /**
   * Rend le résultat dans la modale au lieu de le fermer.
   *
   * Certaines actions ne produisent pas une ligne en base mais un document —
   * un manifeste d'agent, un extrait. Le placer dans un toast le rendrait
   * illisible, et fermer la modale ferait perdre le résultat. Avec `rendu`,
   * la modale reste ouverte et affiche ce que `executer` a renvoyé.
   */
  rendu?: (resultat: ResultatAction) => ReactNode;
  /** libellé du bouton de validation quand `rendu` est présent */
  libelleValidation?: string;
}

export interface ExportPage {
  libelle: string;
  nomFichier: string;
  colonnes: { cle: string; label: string }[];
  lignes: Record<string, unknown>[];
}

/**
 * Rend des composants React à l'intérieur d'une page dont le contenu est un
 * fragment HTML injecté (`dangerouslySetInnerHTML`) : le portail vise le
 * conteneur choisi une fois le HTML monté, ce qui évite de réécrire la page.
 */
export function Portee({ selector, children }: { selector: string; children: ReactNode }) {
  const [cible, setCible] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let annule = false;
    const trouver = (tentative: number) => {
      if (annule) return;
      const noeud = document.querySelector(selector);
      if (noeud) setCible(noeud as HTMLElement);
      else if (tentative < 20) setTimeout(() => trouver(tentative + 1), 50);
    };
    trouver(0);
    return () => {
      annule = true;
    };
  }, [selector]);
  if (!cible) return null;
  return createPortal(children, cible);
}

// ============================================================
// NOTIFICATIONS
// ============================================================

type Toast = { id: number; message: string; ton: "ok" | "ko" };

/**
 * Store de notifications partagé : les boutons de ligne et de barre peuvent
 * être nombreux, on ne veut pas une pile de toasts par bouton.
 */
let compteurToast = 0;
const abonnes = new Set<(liste: Toast[]) => void>();
let toasts: Toast[] = [];

function notifier(message: string, ton: "ok" | "ko") {
  compteurToast += 1;
  const id = compteurToast;
  toasts = [...toasts, { id, message, ton }];
  abonnes.forEach((abonne) => abonne(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    abonnes.forEach((abonne) => abonne(toasts));
  }, 7000);
}

/** À monter une fois par page : c'est lui qui affiche la pile de toasts. */
export function HoteNotifications() {
  const [liste, setListe] = useState<Toast[]>(toasts);
  useEffect(() => {
    abonnes.add(setListe);
    setListe(toasts);
    return () => {
      abonnes.delete(setListe);
    };
  }, []);
  if (!liste.length) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {liste.map((t) => (
        <div key={t.id} className={`toast ${t.ton === "ok" ? "toast-ok" : "toast-ko"}`}>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// RECHARGEMENT DES DONNÉES
// ============================================================

/**
 * Bus de rechargement.
 *
 * Ces pages sont des composants client qui chargent leurs données dans un
 * `useEffect` via une Server Action. `router.refresh()` ne rejoue pas cet
 * effet — la page afficherait donc la liste d'avant la mutation. On publie
 * donc un compteur de révision après chaque écriture réussie, et les pages
 * s'y abonnent pour recharger.
 */
let revisionDonnees = 0;
const abonnesRevision = new Set<(r: number) => void>();

function publierRevisionDonnees() {
  revisionDonnees += 1;
  abonnesRevision.forEach((abonne) => abonne(revisionDonnees));
}

/** À appeler dans la fonction `load` d'une page pour qu'elle suive les actions. */
export function useRechargementDonnees(load: () => void | Promise<void>) {
  useEffect(() => {
    const abonne = () => {
      void load();
    };
    abonnesRevision.add(abonne);
    return () => {
      abonnesRevision.delete(abonne);
    };
  }, [load]);
}

// ============================================================
// MODALE
// ============================================================

function Modale({
  titre,
  sousTitre,
  children,
  pied,
  onFermer,
  large,
}: {
  titre: string;
  sousTitre?: string;
  children: ReactNode;
  pied?: ReactNode;
  onFermer: () => void;
  large?: boolean;
}) {
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [onFermer]);

  return (
    <div className="modal-backdrop" onClick={onFermer} role="presentation">
      <div
        className={`modal${large ? " modal-lg" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 className="modal-title">{titre}</h2>
            {sousTitre ? <p className="modal-sub">{sousTitre}</p> : null}
          </div>
          <button type="button" className="modal-close" onClick={onFermer} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {pied ? <div className="modal-foot">{pied}</div> : null}
      </div>
    </div>
  );
}

function Champ({ champ, valeur, onChange }: { champ: ChampAction; valeur: string | number | boolean; onChange: (v: string) => void }) {
  if (champ.type === "checkbox") {
    return (
      <label className="checkbox-row">
        <input type="checkbox" checked={Boolean(valeur)} onChange={(e) => onChange(e.target.checked ? "true" : "")} />
        {champ.label}
      </label>
    );
  }
  if (champ.type === "textarea") {
    return (
      <div className="field">
        <label className="field-label">{champ.label}</label>
        <textarea className="textarea" value={String(valeur ?? "")} onChange={(e) => onChange(e.target.value)} />
        {champ.hint ? <span className="field-hint">{champ.hint}</span> : null}
      </div>
    );
  }
  if (champ.type === "select") {
    return (
      <div className="field">
        <label className="field-label">{champ.label}</label>
        <select className="select" value={String(valeur ?? "")} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(champ.options ?? []).map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
        {champ.hint ? <span className="field-hint">{champ.hint}</span> : null}
      </div>
    );
  }
  return (
    <div className="field">
      <label className="field-label">{champ.label}</label>
      <input
        className="input"
        type={champ.type === "nombre" ? "number" : champ.type === "date" ? "date" : champ.type === "email" ? "email" : "text"}
        value={String(valeur ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
      {champ.hint ? <span className="field-hint">{champ.hint}</span> : null}
    </div>
  );
}

// ============================================================
// BOUTON D'ACTION
// ============================================================

export function BoutonAction({ action, notifier }: { action: ActionPage; notifier: (m: string, t: "ok" | "ko") => void }) {
  const router = useRouter();
  const [ouverte, setOuverte] = useState(false);
  const [valeurs, setValeurs] = useState<Record<string, string | number | boolean>>({});
  const [enCours, demarrer] = useTransition();
  const [confirme, setConfirme] = useState(false);
  const [affichage, setAffichage] = useState<ReactNode>(null);
  const inputFichier = useRef<HTMLInputElement>(null);

  const variante = action.variante ?? "primaire";
  const classes =
    variante === "direct" ? "btn-live-stream" : variante === "fantome" ? "btn btn-ghost" : "btn btn-primary teal";

  const initialiser = useCallback(() => {
    const base: Record<string, string | number | boolean> = { ...(action.valeurs ?? {}) };
    for (const champ of action.champs ?? []) {
      if (base[champ.cle] === undefined) base[champ.cle] = champ.defaut ?? (champ.type === "checkbox" ? "" : "");
    }
    setValeurs(base);
  }, [action]);

  const executer = useCallback(
    (donnees: Record<string, unknown>) => {
      demarrer(async () => {
        try {
          const resultat = await action.executer!(donnees);
          if (resultat.ok && action.rendu) {
            // Le rendu prend la main : la modale reste ouverte sur le résultat.
            setAffichage(action.rendu(resultat));
            return;
          }
          notifier(resultat.message, resultat.ok ? "ok" : "ko");
          if (resultat.ok) {
            setOuverte(false);
            // Les pages rechargent via le bus de révision : `router.refresh()`
            // seul ne rejouerait pas leur `useEffect` de chargement.
            publierRevisionDonnees();
            router.refresh();
          }
        } catch (e) {
          notifier(e instanceof Error ? e.message : "L'opération a échoué.", "ko");
        }
      });
    },
    [action, notifier, router],
  );

  const auClic = () => {
    if (action.naviguer) {
      router.push(action.naviguer);
      return;
    }
    if (action.confirmation && !confirme) {
      setConfirme(true);
      return;
    }
    if (!action.champs?.length && !action.fichier) {
      executer({});
      return;
    }
    initialiser();
    setOuverte(true);
  };

  const surConfirmation = action.confirmation && confirme ? (
    <>
      <div className="note note-warn">{action.confirmation}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-ghost" onClick={() => setConfirme(false)}>
          Annuler
        </button>
        <button
          type="button"
          className="btn btn-primary teal"
          disabled={enCours}
          onClick={() => {
            if (!action.champs?.length && !action.fichier) executer({});
            else {
              initialiser();
              setOuverte(true);
              setConfirme(false);
            }
          }}
        >
          {enCours ? "En cours…" : "Confirmer"}
        </button>
      </div>
    </>
  ) : null;

  return (
    <>
      <button type="button" className={classes} onClick={auClic} disabled={enCours} data-elara={action.libelle}>
        {variante === "direct" ? <span className="pulse-dot" /> : null}
        {action.icone}
        {action.libelle}
      </button>

      {ouverte ? (
        <Modale
          titre={action.libelle}
          sousTitre={affichage ? undefined : "Les valeurs sont enregistrées immédiatement en base."}
          onFermer={() => { setOuverte(false); setAffichage(null); }}
          pied={
            affichage ? (
              <button
                type="button"
                className="btn btn-primary teal"
                onClick={() => { setOuverte(false); setAffichage(null); }}
              >
                Fermer
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => setOuverte(false)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary teal"
                  disabled={enCours}
                  onClick={() => {
                    const donnees: Record<string, unknown> = { ...valeurs };
                    if (action.fichier && inputFichier.current?.files?.[0]) {
                      const fichier = inputFichier.current.files[0];
                      const lecteur = new FileReader();
                      lecteur.onload = () => {
                        donnees[action.fichier!.cle] = String(lecteur.result ?? "").split(",")[1] ?? "";
                        executer(donnees);
                      };
                      lecteur.readAsDataURL(fichier);
                      return;
                    }
                    executer(donnees);
                  }}
                >
                  {enCours ? "Enregistrement…" : (action.libelleValidation ?? "Enregistrer")}
                </button>
              </>
            )
          }
        >
          {affichage ?? (
            <>
          {action.fichier ? (
            <div className="field">
              <label className="field-label">{action.fichier.label}</label>
              <input
                ref={inputFichier}
                className="input"
                type="file"
                accept={action.fichier.accept}
                onChange={(e) => {
                  const fichier = e.target.files?.[0];
                  if (fichier) setValeurs((v) => ({ ...v, nom: fichier.name.replace(/\.[^.]+$/, "") }));
                }}
              />
              {action.fichier.hint ? <span className="field-hint">{action.fichier.hint}</span> : null}
            </div>
          ) : null}
          {(action.champs ?? []).map((champ) => (
            <Champ
              key={champ.cle}
              champ={champ}
              valeur={valeurs[champ.cle] ?? ""}
              onChange={(v) => setValeurs((actuel) => ({ ...actuel, [champ.cle]: v }))}
            />
          ))}
            </>
          )}
        </Modale>
      ) : null}

      {surConfirmation ? (
        <Modale titre={action.libelle} onFermer={() => setConfirme(false)}>
          {surConfirmation}
        </Modale>
      ) : null}
    </>
  );
}

// ============================================================
// BARRE D'ACTIONS
// ============================================================

/** Barre d'actions : la liste de boutons déclarée par la page, dans l'ordre. */
export function BarreActions({ actions }: { actions: ActionPage[] }) {
  return (
    <div className="topbar-actions">
      {actions.map((a) => (
        <BoutonAction key={a.libelle} action={a} notifier={notifier} />
      ))}
    </div>
  );
}

// ============================================================
// EXPORT CSV
// ============================================================

/**
 * Export de la liste affichée : construit un vrai CSV à partir des lignes
 * reçues et le télécharge. Le BOM UTF-8 évite qu'Excel massacre les accents.
 */
export function BoutonExport({
  libelle,
  nomFichier,
  colonnes,
  lignes,
}: {
  libelle: string;
  nomFichier: string;
  colonnes: { cle: string; label: string }[];
  lignes: Record<string, unknown>[];
}) {
  const telecharger = () => {
    const echapper = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const entete = colonnes.map((c) => echapper(c.label)).join(";");
    const corps = lignes.map((l) => colonnes.map((c) => echapper(l[c.cle])).join(";"));
    const contenu = "﻿" + [entete, ...corps].join("\r\n");
    const blob = new Blob([contenu], { type: "text/csv;charset=utf-8;" });
    const lien = URL.createObjectURL(blob);
    const ancre = document.createElement("a");
    ancre.href = lien;
    ancre.download = nomFichier;
    ancre.click();
    URL.revokeObjectURL(lien);
    notifier(`${lignes.length} ligne(s) exportée(s) dans ${nomFichier}.`, "ok");
  };

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={telecharger}
      disabled={!lignes.length}
      title={lignes.length ? `Exporter ${lignes.length} ligne(s)` : "Aucune donnée à exporter"}
    >
      {libelle}
    </button>
  );
}

/**
 * Variante pour les boutons de ligne : même moteur d'action, mais rendue
 * dans une cellule de tableau plutôt qu'en barre supérieure. Le libellé vient
 * du bouton, pas de l'action.
 */
export function BoutonLigne({
  libelle,
  variante = "fantome",
  action,
}: {
  libelle: string;
  variante?: ActionPage["variante"];
  action: Omit<ActionPage, "libelle">;
}) {
  return <BoutonAction action={{ ...action, libelle, variante }} notifier={notifier} />;
}

/** Force la revalidation après une action déclenchée ailleurs. */
export function useRafraichir() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const rafraichir = () =>
    demarrer(() => {
      router.refresh();
    });
  return { rafraichir, enCours };
}
