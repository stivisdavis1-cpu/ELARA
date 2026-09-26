"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

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

const PARCOURS = [
  { id: "B", label: "Parcours B — nouvelle entreprise", etapes: ["Identité", "Activité", "Localisation", "Documents", "Récapitulatif"] },
  { id: "A", label: "Parcours A — entreprise existante", etapes: ["Identité", "Activité", "Localisation", "Historique", "Récapitulatif"] },
];

export default function OnboardingPage() {
  const [parcours, setParcours] = useState("B");
  const [etape, setEtape] = useState(1);
  const [entreprise, setEntreprise] = useState("");
  const [secteur, setSecteur] = useState<string | null>(null);
  const [ville, setVille] = useState("");

  const etapes = PARCOURS.find((p) => p.id === parcours)?.etapes ?? [];
  const courant = etapes[etape] ?? "";

  return (
    <motion.section
      className="view"
      id="v-onboarding"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
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
            <span>
              Configuration initiale · étape {etape + 1} sur {etapes.length}
            </span>
          </div>
          <h1 className="page-title">{courant}</h1>
          <p className="page-sub">
            Elara construit progressivement votre mémoire d&apos;entreprise — vous pourrez toujours
            compléter ces informations plus tard.
          </p>
        </div>
      </div>

      <div className="onb-wrap">
        <div className="tab-pill-row">
          {PARCOURS.map((p) => (
            <button
              key={p.id}
              className={`tab-pill ${parcours === p.id ? "active" : ""}`}
              onClick={() => { setParcours(p.id); setEtape(0); }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="steps">
            {etapes.map((e, i) => (
              <div
                key={e}
                className={`step-seg ${i < etape ? "done" : i === etape ? "current" : ""}`}
              />
            ))}
          </div>

          <div className="field-label">Nom de l&apos;entreprise</div>
          <input
            className="field"
            value={entreprise}
            placeholder="Ex. OrbitTech Services"
            onChange={(e) => setEntreprise(e.target.value)}
          />

          <div className="field-label">Secteur d&apos;activité</div>
          <div className="opt-grid">
            {SECTEURS.map((s) => (
              <div
                key={s}
                className={`opt ${secteur === s ? "sel" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setSecteur(s)}
              >
                {s}
              </div>
            ))}
          </div>

          <div className="field-label">Ville principale</div>
          <input
            className="field"
            value={ville}
            placeholder="Ex. Yaoundé"
            onChange={(e) => setVille(e.target.value)}
          />

          <div className="divider" />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{ fontSize: "12.5px", color: "var(--text-faint)", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-heading)" }}
              onClick={() => setEtape((e) => Math.min(etapes.length - 1, e + 1))}
            >
              Passer cette étape
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-ghost" onClick={() => setEtape((e) => Math.max(0, e - 1))}>
                Retour
              </button>
              <button
                className="btn btn-primary teal"
                onClick={() => setEtape((e) => Math.min(etapes.length - 1, e + 1))}
                disabled={etape >= etapes.length - 1}
              >
                {etape >= etapes.length - 1 ? "Dernière étape" : "Continuer"}
              </button>
            </div>
          </div>

          <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "14px", lineHeight: 1.7 }}>
            Ces informations restent dans votre navigateur : aucun endpoint ne persiste encore le
            profil d&apos;entreprise. Elles alimenteront la mémoire d&apos;entreprise dès que le
            module d&apos;onboarding sera branché.
          </div>
        </div>
      </div>
    </motion.section>
  );
}
