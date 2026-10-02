import FormulaireConnexion from './formulaire-connexion'

/** Traduit les codes d'erreur que NextAuth renvoie dans l'URL. */
const messages: Record<string, string> = {
  CredentialsSignin: 'Identifiants invalides.',
  Configuration: "La connexion est mal configurée sur le serveur.",
  AccessDenied: "Accès refusé.",
  SessionRequired: 'Connectez-vous pour continuer.',
  OAuthAccountNotLinked: 'Ce compte est lié à un autre moyen de connexion.',
}

/**
 * Le paramètre `?inscrit=1` est lu ici, côté serveur, et non dans le
 * formulaire.
 *
 * Lire l'URL depuis un composant client impose de le placer derrière une
 * frontière `Suspense` : le HTML initial ne contenait alors que le cadre vide
 * et le formulaire n'apparaissait qu'après le chargement du JavaScript, ce qui
 * donne l'impression d'une page cassée. En le résolvant ici, l'écran de
 * connexion est envoyé complet, comme avant.
 *
 * `?error=` est lu pour la même raison : selon la version, NextAuth signale un
 * refus d'identifiants soit par exception, soit par redirection. Dans ce
 * dernier cas, rien ne pouvait être affiché et la connexion semblait
 * silencieusement sans effet.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const code = typeof params.error === 'string' ? params.error : undefined
  const erreur = code ? messages[code] ?? 'Connexion impossible, réessayez.' : undefined

  return <FormulaireConnexion inscrit={params.inscrit === '1'} erreurInitiale={erreur} />
}
