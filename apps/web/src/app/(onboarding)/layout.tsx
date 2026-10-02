import React from "react";

/**
 * Écran de première visite : création de l'entreprise puis paramétrage.
 *
 * Volontairement hors du segment `(app)`. Ce segment réserve son affichage aux
 * comptes disposant déjà d'une entreprise ; y placer cet écran le rendait
 * inatteignable, puisque l'écran de création exigeait précisément l'entreprise
 * que le compte n'avait pas encore.
 */
export const dynamic = "force-dynamic";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="app-backdrop" aria-hidden="true"></div>
      <main className="canvas" id="canvas" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
