"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserMinus } from "lucide-react";
import {
  getUtilisateursData,
  changerRoleUtilisateur,
  retirerUtilisateur,
  type CompteUtilisateur,
  type CurrentUser,
} from "@/lib/ged-api";
import { ROLES_UTILISATEUR } from "@/lib/roles";
import { BarreActions, BoutonLigne, HoteNotifications, useRechargementDonnees } from "@/components/page-actions";
import { inviterUtilisateurAction } from "@/lib/actions";

/**
 * Habilitations de référence : ce que chaque rôle peut faire, pas ce que fait
 * votre session. Le backend ne stocke pas ces droits — ils vivent dans le
 * fournisseur d'identité — donc cocher une case ici laisserait croire à une
 * gestion qui n'existe pas. La matrice documente le modèle ; l'attribution
 * réelle se fait sur la fiche de chaque compte.
 */
const PERMISSIONS: { module: string; roles: Record<string, boolean> }[] = [
  { module: "Tableau de bord & rapports", roles: { Administrateur: true, Utilisateur: true, "Assistant IA": true } },
  { module: "CFO — trésorerie & marges", roles: { Administrateur: true, Utilisateur: true, "Assistant IA": true } },
  { module: "Valider et archiver un document", roles: { Administrateur: true, Utilisateur: true, "Assistant IA": false } },
  { module: "Clients & fournisseurs — relances", roles: { Administrateur: true, Utilisateur: true, "Assistant IA": true } },
  { module: "Gérer les utilisateurs et rôles", roles: { Administrateur: true, Utilisateur: false, "Assistant IA": false } },
];

const COLONNES = ROLES_UTILISATEUR.map((r) => r.libelle);

function initiales(nom: string | null): string {
  if (!nom) return "?";
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function UsersPage() {
  const [comptes, setComptes] = useState<CompteUtilisateur[]>([]);
  const [courant, setCourant] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUtilisateursData();
      setComptes(data.comptes);
      setCourant(data.courant);
      setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);
  useRechargementDonnees(charger);

  const invitationsEnAttente = comptes.filter((c) => c.identite?.etat === "pending").length;
  const multiOrg = comptes.filter((c) => c.multi_organisation).length;

  return (
    <motion.section
      className="view"
      id="v-users"
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
            <span>Gouvernance</span>
          </div>
          <h1 className="page-title">Utilisateurs &amp; rôles</h1>
          <p className="page-sub">
            Gestion des accès — les identités et rôles effectifs de l&apos;espace.
          </p>
        </div>
        <BarreActions
          actions={[
            {
              libelle: "Inviter un compte",
              variante: "primaire",
              icone: <UserPlus className="w-3.5 h-3.5" />,
              champs: [
                { cle: "nom", label: "Nom complet", type: "texte", requis: true, colonne: "demi" },
                { cle: "email", label: "Adresse e-mail professionnelle", type: "email", requis: true, colonne: "demi" },
                {
                  cle: "role",
                  label: "Rôle",
                  type: "select",
                  requis: true,
                  colonne: "pleine",
                  defaut: "utilisateur_standard",
                  options: ROLES_UTILISATEUR.map((r) => ({ valeur: r.cle, libelle: `${r.libelle} — ${r.description}` })),
                },
              ],
              executer: (d) => inviterUtilisateurAction(d as { nom: string; email: string; role: string }),
            },
          ]}
        />
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: "16px" }}>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Comptes de l&apos;espace</div>
          <div className="kpi-value">{loading ? "…" : comptes.length}</div>
          <div className="kpi-delta flat">Annuaire du tenant</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Invitations en attente</div>
          <div className="kpi-value">{loading ? "…" : invitationsEnAttente}</div>
          <div className="kpi-delta flat">Créées côté fournisseur d&apos;identité</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Multi-organisations</div>
          <div className="kpi-value">{loading ? "…" : multiOrg}</div>
          <div className="kpi-delta flat">Accès à plusieurs espaces</div>
        </div>
        <div className="card hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out">
          <div className="kpi-label">Rôles disponibles</div>
          <div className="kpi-value">{ROLES_UTILISATEUR.length}</div>
          <div className="kpi-delta flat">Modèle de la plateforme</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="section-title">Comptes de l&apos;espace</div>
        <div className="section-sub">
          Les identités réelles de l&apos;organisation, avec leur rôle et l&apos;état de leur invitation
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>État</th>
              <th>Créé le</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Chargement…</td></tr>
            ) : comptes.length === 0 ? (
              <tr><td colSpan={5} style={{ color: "var(--text-faint)", fontSize: "13px", padding: "16px" }}>Aucun compte dans cet espace — invitez un premier collaborateur.</td></tr>
            ) : (
              comptes.map((c) => {
                const soiMeme = courant?.email && c.email === courant.email;
                return (
                  <tr key={c.id} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="tag-icon" style={{ width: "30px", height: "30px", background: "var(--blue-bg)", color: "var(--indigo-deep)", fontSize: "11px", fontWeight: 700 }}>
                          {initiales(c.nom || c.email)}
                        </div>
                        <div>
                          <div className="name-cell">
                            {c.nom || c.email}
                            {soiMeme ? <span className="pill pill-info" style={{ marginLeft: 6, fontSize: 10 }}>vous</span> : null}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="field" style={{ minWidth: 170 }}>
                        <select
                          className="select"
                          value={c.role}
                          aria-label={`Rôle de ${c.nom || c.email}`}
                          onChange={async (e) => {
                            const precedent = c.role;
                            const suivant = e.target.value;
                            // Mise à jour optimiste : le sélecteur ne revient pas en
                            // arrière si la mutation met une seconde à répondre.
                            setComptes((liste) => liste.map((x) => (x.id === c.id ? { ...x, role: suivant } : x)));
                            const r = await changerRoleUtilisateur(c.id, suivant);
                            if (!r.ok) setComptes((liste) => liste.map((x) => (x.id === c.id ? { ...x, role: precedent } : x)));
                          }}
                        >
                          {ROLES_UTILISATEUR.map((r) => (
                            <option key={r.cle} value={r.cle}>{r.libelle}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      {c.identite?.etat === "pending" ? (
                        <span className="pill pill-warning">Invitation en attente</span>
                      ) : c.identite?.raison ? (
                        <span className="pill pill-danger" title={c.identite.raison}>Non activé</span>
                      ) : (
                        <span className="pill pill-success">Actif</span>
                      )}
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td>
                      <BoutonLigne
                        libelle="Retirer"
                        action={{
                          variante: "fantome",
                          icone: <UserMinus className="w-3.5 h-3.5" />,
                          confirmation: `Retirer ${c.nom || c.email} de cet espace ? La personne perdra l'accès ; ses contributions passées restent attribuées.`,
                          executer: async () => {
                            const r = await retirerUtilisateur(c.id);
                            if (r.ok) setComptes((liste) => liste.filter((x) => x.id !== c.id));
                            return r;
                          },
                        }}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="section-title">Habilitations par rôle</div>
        <div className="section-sub">
          Matrice de référence de la plateforme — l&apos;attribution se fait par compte, ci-dessus
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Module / action</th>
              {COLONNES.map((c) => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.module} className="group hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300">
                <td className="name-cell">{p.module}</td>
                {COLONNES.map((c) => (
                  <td key={c}>
                    <span style={{ color: p.roles[c] ? "var(--teal-deep)" : "var(--line)" }}>
                      {p.roles[c] ? "✓" : "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}
