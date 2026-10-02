import React from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { FournisseurEntreprise } from "@/components/TenantContext";
import { currentTenantId } from "@/lib/ged-api";
import { mesOrganisationsAction, mesOrganisationsResultat } from "@/lib/actions";

/**
 * Charge l'entreprise courante et celles accessibles au compte.
 *
 * Le nom affiché dans la barre latérale vient de l'API : il était écrit en dur
 * dans le composant, ce qui affichait une société qui n'existait pas en base et
 * rendait invisible le fait qu'un compte peut en piloter plusieurs.
 *
 * Un échec de lecture ne doit pas empêcher l'application de s'afficher :
 * `mesOrganisationsAction` renvoie alors une liste vide et l'interface
 * indique qu'aucune entreprise n'est accessible.
 *
 * Cette lecture n'est pas encadrée ici. Le rendu de ce segment est dynamique
 * — il dépend des cookies de session — et Next le signale en levant une erreur
 * pendant la passe de génération statique. La retenir ici empêcherait Next de
 * détecter ce caractère dynamique, au risque de servir une barre latérale
 * vide aux comptes connectés.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ organisations, erreur }, tenantCourant] = await Promise.all([
    mesOrganisationsResultat(),
    currentTenantId().catch(() => null),
  ]);

  // Un compte sans entreprise n'a rien à afficher : on ne peut ni lire ses
  // documents, ni calculer ses indicateurs. Afficher « certains indicateurs
  // n'ont pas pu être chargés » sur chaque page était trompeur — la cause
  // n'était pas une panne de lecture mais l'absence d'entreprise. L'appel API
  // a échoué (`erreur`), on garde l'affichage dégradé d'avant.
  const sansEntreprise = !erreur && organisations.length === 0;

  if (sansEntreprise) {
    return (
      <>
        <div className="app-backdrop" aria-hidden="true"></div>
        <div className="shell">
        <Sidebar organisations={[]} tenantCourant={null} />
        <main className="canvas" id="canvas" tabIndex={-1}>
          <div className="card" style={{ maxWidth: "560px", margin: "48px auto", textAlign: "center" }}>
            <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>
              Aucune entreprise associée à ce compte
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-dim)", marginBottom: "24px" }}>
              Vos documents, vos indicateurs et vos agents sont rattachés à une entreprise.
              Créez la vôtre pour commencer.
            </p>
            <Link className="btn btn-primary" href="/onboarding">
              Créer mon entreprise
            </Link>
          </div>
        </main>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="app-backdrop" aria-hidden="true"></div>
      <div className="shell">
        <Sidebar organisations={organisations} tenantCourant={tenantCourant} />
        <main className="canvas" id="canvas" tabIndex={-1}>
          <FournisseurEntreprise tenantId={tenantCourant}>
            {children}
          </FournisseurEntreprise>
        </main>
      </div>
    </>
  );
}
