import Link from "next/link";
import FormulaireActivation from "./formulaire-activation";

export const metadata = { title: "Activer votre compte — Elara" };

/**
 * Écran d'activation d'un compte invité.
 *
 * Page publique : l'invité n'est pas encore connecté, il vient de recevoir un
 * lien. Elle reste volontairement hors du segment `(app)`, qui n'est accessible
 * qu'aux comptes disposant déjà d'une entreprise.
 */
export default async function ActiverPage({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string; erreur?: string; fait?: string }>;
}) {
  const params = await searchParams;
  const jeton = params.jeton?.trim() ?? "";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: "24px",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: "440px", padding: "40px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <svg width="40" height="40" viewBox="0 0 30 26" style={{ margin: "0 auto 16px", display: "block" }}>
            <path
              d="M0 13 L6 13 L8.5 3 L12 23 L15.5 8 L18.5 18 L21 13 L30 13"
              fill="none"
              stroke="#A9761F"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="section-title" style={{ fontSize: "24px" }}>
            Activer votre compte
          </h1>
          <p className="section-sub">Choisissez votre mot de passe</p>
        </div>

        {params.fait && (
          <div
            style={{
              fontSize: "14px",
              textAlign: "center",
              background: "var(--green-bg)",
              color: "#1A4A3C",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "18px",
            }}
          >
            Compte activé. Vous pouvez vous connecter.
          </div>
        )}

        {params.erreur && (
          <div
            style={{
              fontSize: "14px",
              textAlign: "center",
              background: "#ffebee",
              color: "#B3261E",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "18px",
            }}
          >
            {params.erreur}
          </div>
        )}

        {!jeton ? (
          <>
            <p style={{ fontSize: "14px", color: "var(--text-dim)", marginBottom: "20px" }}>
              Ce lien d&apos;activation est incomplet. Demandez à l&apos;administrateur de votre
              entreprise de vous renvoyer le lien d&apos;invitation.
            </p>
            <Link className="btn btn-primary" href="/login" style={{ width: "100%", justifyContent: "center" }}>
              Aller à la connexion
            </Link>
          </>
        ) : (
          <FormulaireActivation jeton={jeton} />
        )}
      </div>
    </div>
  );
}
