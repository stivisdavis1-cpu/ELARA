"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, Check, Loader2, Lock, Plus, Trash2, X } from "lucide-react";
import { HoteNotifications } from "./page-actions";

/**
 * Fiche des éléments d'information d'un document.
 *
 * L'extraction plate ne disait pas ce qu'était une valeur : un mot-clé
 * d'indexation était indiscernable d'un montant. Ici chaque élément est
 * affiché avec sa nature, sa valeur et son origine, et les mots-clés que l'IA
 * a validés seule sont séparés de ceux qui attendent une relecture.
 *
 * L'édition est ouverte tant que le document n'est pas archivé : corriger une
 * valeur lue de travers est un acte métier normal. Passé l'archivage, la
 * fiche passe en lecture seule, car l'archive est la copie qui fait foi.
 */

const NATURES = [
  { valeur: "mot_cle", libelle: "Mot-clé" },
  { valeur: "acteur", libelle: "Acteur" },
  { valeur: "date", libelle: "Date" },
  { valeur: "montant", libelle: "Montant" },
  { valeur: "reference", libelle: "Référence" },
  { valeur: "texte", libelle: "Texte" },
  { valeur: "autre", libelle: "Autre" },
] as const;

interface Element {
  id: string;
  nature: string;
  label: string;
  valeur: string;
  page: number | null;
  confiance: number | null;
  statut: string;
  source: string;
}

interface Reponse {
  document_id: string;
  modifiable: boolean;
  seuil_validation: number;
  elements: Element[];
  mots_cles_valides: { id: string; terme: string; valeur: string; confiance: number | null }[];
  a_valider: { id: string; nature: string; label: string; valeur: string; confiance: number | null }[];
}

export default function DocumentElements({ documentId }: { documentId: string }) {
  const { data: session } = useSession();
  const [data, setData] = useState<Reponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [ajout, setAjout] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [form, setForm] = useState<{ nature: string; label: string; valeur: string }>({
    nature: "mot_cle",
    label: "",
    valeur: "",
  });

  const headers = useCallback((): Record<string, string> => {
    const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
    return tenantId ? { "x-tenant-id": tenantId } : {};
  }, [session]);

  const charger = useCallback(async () => {
    if (!documentId) return;
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await fetch(`/api/scanner/documents/${encodeURIComponent(documentId)}/elements`, {
        cache: "no-store",
        headers: headers(),
      });
      const charge = await reponse.json();
      const corps = charge?.data ?? charge;
      if (!reponse.ok) {
        setErreur(corps?.message || corps?.error || `Chargement impossible (${reponse.status}).`);
        setData(null);
        return;
      }
      setData(corps);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setChargement(false);
    }
  }, [documentId, headers]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const appeler = async (chemin: string, options: RequestInit) => {
    setEnCours(true);
    try {
      const reponse = await fetch(chemin, { ...options, headers: { "Content-Type": "application/json", ...headers() } });
      const corps = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        setErreur((corps?.message || corps?.error || `Échec (${reponse.status})`).toString());
        return false;
      }
      await charger();
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Échec de l'opération.");
      return false;
    } finally {
      setEnCours(false);
    }
  };

  const ajouter = async () => {
    if (!form.label.trim() || !form.valeur.trim()) {
      setErreur("Le mot-clé et sa valeur sont tous les deux obligatoires.");
      return;
    }
    const ok = await appeler(`/api/scanner/documents/${encodeURIComponent(documentId)}/elements`, {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (ok) {
      setForm({ nature: "mot_cle", label: "", valeur: "" });
      setAjout(false);
    }
  };

  const supprimer = (elementId: string) =>
    void appeler(`/api/scanner/documents/${encodeURIComponent(documentId)}/elements/${encodeURIComponent(elementId)}`, {
      method: "DELETE",
    });

  const valider = (elementId: string) =>
    void appeler(
      `/api/scanner/documents/${encodeURIComponent(documentId)}/elements/${encodeURIComponent(elementId)}`,
      { method: "PATCH", body: JSON.stringify({ statut: "valide" }) },
    );

  const modifiable = data?.modifiable ?? false;
  const autres = (data?.elements ?? []).filter((e) => e.nature !== "mot_cle");

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <HoteNotifications />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="section-title">Éléments d&apos;information</div>
          <div className="section-sub">
            Chaque information du document, avec sa nature et sa valeur. Les mots-clés que l&apos;IA a
            pu confirmer dans le texte sont validés automatiquement.
          </div>
        </div>
        {modifiable ? (
          <button className="btn btn-ghost" onClick={() => setAjout((v) => !v)}>
            {ajout ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {ajout ? "Annuler" : "Ajouter un élément"}
          </button>
        ) : (
          <span className="pill pill-info" title="L'archive fait foi : la fiche est figée.">
            <Lock className="w-3 h-3" /> Archivé — lecture seule
          </span>
        )}
      </div>

      {erreur ? (
        <div
          style={{
            marginTop: 12,
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

      {ajout && modifiable ? (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 12 }}>
          <div className="field" style={{ minWidth: 140 }}>
            <label className="field-label">Nature</label>
            <select
              className="select"
              value={form.nature}
              onChange={(e) => setForm({ ...form, nature: e.target.value })}
            >
              {NATURES.map((n) => (
                <option key={n.valeur} value={n.valeur}>
                  {n.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label className="field-label">Mot-clé / champ</label>
            <input
              className="input"
              value={form.label}
              placeholder="Ex. TVA"
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div className="field" style={{ flex: 2, minWidth: 200 }}>
            <label className="field-label">Valeur</label>
            <input
              className="input"
              value={form.valeur}
              placeholder="Ex. 19,25 % sur les prestations"
              onChange={(e) => setForm({ ...form, valeur: e.target.value })}
            />
          </div>
          <button className="btn btn-primary teal" onClick={ajouter} disabled={enCours}>
            {enCours ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Enregistrer
          </button>
        </div>
      ) : null}

      {chargement && !data ? (
        <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "16px 0" }}>Chargement…</div>
      ) : null}

      {!chargement && data && data.elements.length === 0 ? (
        <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "16px 0" }}>
          Aucun élément typé pour ce document. Ils sont créés automatiquement à l&apos;extraction, ou
          saisis à la main ci-dessus.
        </div>
      ) : null}

      {data && data.mots_cles_valides.length > 0 ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "18px 0 8px",
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--teal)",
            }}
          >
            <Check className="w-4 h-4" />
            Mots-clés validés automatiquement
            <span className="pill pill-success">{data.mots_cles_valides.length}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Mot-clé</th>
                <th>Valeur</th>
                <th>Confirmé dans le texte</th>
                {modifiable ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {data.mots_cles_valides.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="dossier-chip">{m.terme}</span>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{m.valeur}</td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {m.confiance === null || m.confiance === undefined
                      ? "—"
                      : `${Math.round(m.confiance * 100)} %`}
                  </td>
                  {modifiable ? (
                    <td>
                      <button className="delete-btn" onClick={() => supprimer(m.id)} title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {data && data.a_valider.length > 0 ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "18px 0 8px",
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--amber)",
            }}
          >
            <AlertTriangle className="w-4 h-4" />
            À vérifier
            <span className="pill pill-warning">{data.a_valider.length}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Nature</th>
                <th>Champ</th>
                <th>Valeur proposée</th>
                <th>Confiance</th>
                {modifiable ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {data.a_valider.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontSize: 12 }}>{NATURES.find((n) => n.valeur === a.nature)?.libelle ?? a.nature}</td>
                  <td style={{ fontSize: 12.5 }}>{a.label}</td>
                  <td style={{ fontSize: 12.5 }}>{a.valeur}</td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {a.confiance === null || a.confiance === undefined ? "—" : `${Math.round(a.confiance * 100)} %`}
                  </td>
                  {modifiable ? (
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost" onClick={() => valider(a.id)} title="Valider">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button className="delete-btn" onClick={() => supprimer(a.id)} title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {autres.length > 0 ? (
        <>
          <div className="section-title" style={{ margin: "18px 0 8px", fontSize: 12.5 }}>
            Autres éléments
          </div>
          <div className="dossier-chip-row">
            {autres.map((e) => (
              <span key={e.id} className="dossier-chip" title={`Confiance ${e.confiance ?? "—"}`}>
                {e.label} : {e.valeur}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
