"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { getProfilTenant, type ProfilTenant } from "@/lib/ged-api";
import { HoteNotifications, useRechargementDonnees } from "@/components/page-actions";
import { enregistrerOnboardingAction } from "@/lib/actions";

const SECTEURS = [
  "Services",
  "Distribution",
  "Commerce",
  "Industrie légère",
  "Restauration",
  "Santé",
  "Éducation",
  "BTP & construction",
  "Autre",
];

const SYSTEMES_COMPTABLES = ["SYSCOHADA", "OHADA", "PCG", "IFRS", "Autre"];

/**
 * Deux parcours, parce que la question de départ n'est pas la même selon la
 * situation : une entreprise existante a un historique à intégrer, une
 * création part d'une page blanche. Les étapes du parcours A sont donc
 * différentes, et non un simple renommage.
 */
const PARCOURS = [
  {
    id: "A",
    label: "Parcours A — entreprise existante",
    resume: "Vous avez déjà des factures, des clients et des stocks à reprendre.",
    etapes: ["Identité", "Activité", "Localisation", "Historique", "Récapitulatif"],
  },
  {
    id: "B",
    label: "Parcours B — nouvelle entreprise",
    resume: "Vous démarrez : on part des éléments que vous avez déjà en main.",
    etapes: ["Identité", "Activité", "Localisation", "Documents", "Récapitulatif"],
  },
] as const;

type Reponses = Record<string, string>;

export default function OnboardingPage() {
  const [parcours, setParcours] = useState<"A" | "B">("B");
  const [etape, setEtape] = useState(0);
  const [r, setR] = useState<Reponses>({});
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState<string | null>(null);

  const definir = (cle: string, valeur: string) => {
    setR((precedent) => ({ ...precedent, [cle]: valeur }));
    setEnregistrement(null);
  };

  const load = useCallback(async () => {
    setChargement(true);
    try {
      const profil: ProfilTenant = await getProfilTenant();
      // Les réponses déjà enregistrées servent de valeurs initiales : reprendre
      // un onboarding à moitié fait ne doit pas obliger à ressaisir.
      const onboarding = (profil.onboarding ?? {}) as Record<string, unknown>;
      const initial: Reponses = {};
      for (const cle of ["raison_sociale", "secteur", "pays", "ville", "devise", "systeme_comptable", "effectif", "anciennete", "devise", "banque", "comptes_bancaires", "logiciel_comptable"]) {
        const valeur = onboarding[cle];
        if (typeof valeur === "string" && valeur) initial[cle] = valeur;
      }
      if (profil.raison_sociale && !initial.raison_sociale) initial.raison_sociale = profil.raison_sociale;
      if (profil.secteur && !initial.secteur) initial.secteur = profil.secteur;
      if (profil.pays && !initial.pays) initial.pays = profil.pays;
      if (profil.ville && !initial.ville) initial.ville = profil.ville;
      if (profil.devise && !initial.devise) initial.devise = profil.devise;
      if (profil.systeme_comptable && !initial.systeme_comptable) initial.systeme_comptable = profil.systeme_comptable;
      setR(initial);
    } catch {
      setR({});
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRechargementDonnees(load);

  const config = useMemo(() => PARCOURS.find((p) => p.id === parcours) ?? PARCOURS[1], [parcours]);
  const derniere = config.etapes.length - 1;
  const courant = config.etapes[etape] ?? "";
  const engage = (r["termine_le"] || null) ? new Date(String(r["termine_le"])) : null;

  /** Champs exigés par étape : on n'avance pas sur une étape vide. */
  function manquant(): string | null {
    if (etape === 0 && !r.raison_sociale?.trim()) return "Indiquez la raison sociale de l'entreprise.";
    if (etape === 1 && !r.secteur) return "Choisissez un secteur d'activité.";
    if (etape === 2 && !r.ville?.trim()) return "Indiquez la ville principale.";
    if (etape === 2 && !r.pays?.trim()) return "Indiquez le pays.";
    if (etape === 3 && parcours === "B" && !r.effectif?.trim()) return "Indiquez l'effectif, même approximatif (« 1 » pour une activité solitaire).";
    if (etape === 3 && parcours === "A" && !r.anciennete?.trim()) return "Indiquez depuis quand l'entreprise existe.";
    return null;
  }

  const blocage = manquant();

  const avancer = () => {
    if (blocage) return;
    setEtape((e) => Math.min(derniere, e + 1));
  };

  const terminer = async () => {
    if (blocage) return;
    const action = await enregistrerOnboardingAction({ reponses: r });
    setEnregistrement(action.message);
    if (action.ok) await load();
  };

  return (
    <motion.section
      className="view"
      id="v-onboarding"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <HoteNotifications />

      <div className="topbar">
        <div>
          <div className="eyebrow">
            <svg className="wave-rule" viewBox="0 0 46 14" fill="none">
              <path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" strokeWidth="1.4" strokeLinecap="round" fill="none"></path>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="46" y2="0">
                  <stop stopColor="#A9761F"></stop>
                  <stop offset="1" stopColor="#1A4A3C"></stop>
                </linearGradient>
              </defs>
            </svg>
            <span>Configuration initiale · étape {etape + 1} sur {config.etapes.length}</span>
          </div>
          <h1 className="page-title">{courant}</h1>
          <p className="page-sub">
            Elara construit progressivement la mémoire de votre entreprise — vous pourrez compléter
            ces informations plus tard.
          </p>
        </div>
      </div>

      {engage ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 16,
            padding: "10px 16px",
            borderRadius: 10,
            background: "var(--green-bg, rgba(22,163,74,0.08))",
            border: "1px solid rgba(22,163,74,0.3)",
            fontSize: 13,
          }}
        >
          <Check className="w-4 h-4" style={{ color: "var(--green)" }} />
          <span>
            Configuration enregistrée le {engage.toLocaleString("fr-FR")} — les réponses ci-dessous
            restent modifiables.
          </span>
        </div>
      ) : null}

      <div className="onb-wrap">
        <div className="tab-pill-row">
          {PARCOURS.map((p) => (
            <button
              key={p.id}
              className={`tab-pill ${parcours === p.id ? "active" : ""}`}
              onClick={() => { setParcours(p.id); setEtape(0); setEnregistrement(null); }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="steps">
            {config.etapes.map((e, i) => (
              <div key={e} className={`step-seg ${i < etape ? "done" : i === etape ? "current" : ""}`} title={e} />
            ))}
          </div>

          {chargement ? (
            <div style={{ padding: "24px 2px", color: "var(--text-faint)", fontSize: 13 }}>Chargement de votre profil…</div>
          ) : etape === 0 ? (
            <>
              <div className="field-label">Nom de l&apos;entreprise</div>
              <input
                className="field"
                value={r.raison_sociale ?? ""}
                placeholder="Ex. OrbitTech Services"
                onChange={(e) => definir("raison_sociale", e.target.value)}
              />
              <div className="field-label">Système comptable</div>
              <div className="opt-grid">
                {SYSTEMES_COMPTABLES.map((s) => (
                  <div
                    key={s}
                    className={`opt ${r.systeme_comptable === s ? "sel" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => definir("systeme_comptable", s)}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </>
          ) : etape === 1 ? (
            <>
              <div className="field-label">Secteur d&apos;activité</div>
              <div className="opt-grid">
                {SECTEURS.map((s) => (
                  <div
                    key={s}
                    className={`opt ${r.secteur === s ? "sel" : ""}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => definir("secteur", s)}
                  >
                    {s}
                  </div>
                ))}
              </div>
              <div className="field-label">Devise de facturation</div>
              <input
                className="field"
                value={r.devise ?? "XOF"}
                placeholder="XOF"
                onChange={(e) => definir("devise", e.target.value.toUpperCase())}
                style={{ maxWidth: 160 }}
              />
            </>
          ) : etape === 2 ? (
            <>
              <div className="field-label">Ville principale</div>
              <input
                className="field"
                value={r.ville ?? ""}
                placeholder="Ex. Yaoundé"
                onChange={(e) => definir("ville", e.target.value)}
              />
              <div className="field-label">Pays</div>
              <input
                className="field"
                value={r.pays ?? ""}
                placeholder="Ex. Cameroun"
                onChange={(e) => definir("pays", e.target.value)}
              />
            </>
          ) : etape === 3 ? (
            parcours === "B" ? (
              <>
                <div className="field-label">Effectif</div>
                <input
                  className="field"
                  value={r.effectif ?? ""}
                  placeholder="Ex. 4"
                  onChange={(e) => definir("effectif", e.target.value)}
                  style={{ maxWidth: 200 }}
                />
                <div className="field-label">Premier document à intégrer</div>
                <div className="opt-grid">
                  {["Aucun pour l'instant", "Facture", "Devis", "Bilan", "Registre du commerce"].map((o) => (
                    <div
                      key={o}
                      className={`opt ${r.premier_document === o ? "sel" : ""}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => definir("premier_document", o)}
                    >
                      {o}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="field-label">Activité depuis</div>
                <input
                  className="field"
                  value={r.anciennete ?? ""}
                  placeholder="Ex. 2019, ou « 3 ans »"
                  onChange={(e) => definir("anciennete", e.target.value)}
                  style={{ maxWidth: 240 }}
                />
                <div className="field-label">Volume de factures par mois</div>
                <input
                  className="field"
                  value={r.volume_factures ?? ""}
                  placeholder="Ex. 40"
                  onChange={(e) => definir("volume_factures", e.target.value)}
                  style={{ maxWidth: 200 }}
                />
                <div className="field-label">Logiciel de comptabilité actuel</div>
                <input
                  className="field"
                  value={r.logiciel_comptable ?? ""}
                  placeholder="Ex. Sage, Odoo, none…"
                  onChange={(e) => definir("logiciel_comptable", e.target.value)}
                />
              </>
            )
          ) : (
            <div>
              <div className="section-title">Récapitulatif</div>
              <div className="section-sub" style={{ marginBottom: 14 }}>
                {config.resume}
              </div>
              <table className="tbl">
                <thead><tr><th>Information</th><th>Valeur</th></tr></thead>
                <tbody>
                  {[
                    ["Raison sociale", r.raison_sociale],
                    ["Système comptable", r.systeme_comptable],
                    ["Secteur", r.secteur],
                    ["Devise", r.devise],
                    ["Ville", r.ville],
                    ["Pays", r.pays],
                    ["Effectif", r.effectif],
                    ["Activité depuis", r.anciennete],
                    ["Volume de factures / mois", r.volume_factures],
                    ["Logiciel de comptabilité", r.logiciel_comptable],
                    ["Premier document", r.premier_document],
                  ]
                    .filter(([, v]) => v)
                    .map(([libelle, valeur]) => (
                      <tr key={libelle}>
                        <td className="name-cell">{libelle}</td>
                        <td style={{ fontSize: 12.5 }}>{valeur}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="divider" />

          {blocage ? (
            <div style={{ fontSize: "12.5px", color: "var(--amber)", marginBottom: 12 }}>{blocage}</div>
          ) : null}
          {enregistrement ? (
            <div style={{ fontSize: "12.5px", color: "var(--teal-deep)", marginBottom: 12 }}>{enregistrement}</div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "12.5px", color: "var(--text-faint)", fontWeight: 700, fontFamily: "var(--font-heading)" }}>
              {etape === derniere ? "Dernière étape" : `Étape ${etape + 1} / ${config.etapes.length}`}
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-ghost" onClick={() => setEtape((e) => Math.max(0, e - 1))} disabled={etape === 0}>
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour
              </button>
              {etape >= derniere ? (
                <button className="btn btn-primary teal" onClick={() => void terminer()} disabled={Boolean(blocage)}>
                  <Save className="w-3.5 h-3.5" />
                  Enregistrer la configuration
                </button>
              ) : (
                <button className="btn btn-primary teal" onClick={avancer} disabled={Boolean(blocage)}>
                  Continuer
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "14px", lineHeight: 1.7 }}>
            Les informations que l&apos;API connaît comme colonne — raison sociale, secteur, pays,
            ville, devise, système comptable — sont écrites dans la fiche de l&apos;organisation et
            alimentent l&apos;en-tête de tous vos documents. Le reste est conservé comme réponse
            d&apos;onboarding.
          </div>
        </div>
      </div>
    </motion.section>
  );
}
