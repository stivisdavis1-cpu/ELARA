'use server'

import { cookies } from "next/headers"

/**
 * Inscription : crée le compte et sa première entreprise.
 *
 * Appel volontairement sans jeton : l'utilisateur n'est pas encore connecté,
 * c'est tout l'intérêt de l'inscription. Aucun en-tête `x-tenant-id` n'est
 * envoyé non plus — l'entreprise est précisément celle qui va être créée.
 */
export async function inscrire(formData: FormData) {
  const lire = (cle: string) => String(formData.get(cle) ?? "").trim()

  const corps = {
    email: lire("email"),
    mot_de_passe: lire("mot_de_passe"),
    prenom: lire("prenom"),
    nom: lire("nom"),
    raison_sociale: lire("raison_sociale"),
    pays: lire("pays"),
    ville: lire("ville"),
    secteur: lire("secteur"),
    devise: lire("devise").toUpperCase(),
    systeme_comptable: lire("systeme_comptable") || "SYSCOHADA",
  }

  if (!corps.email || !corps.prenom || !corps.nom || !corps.raison_sociale) {
    return { error: "L'e-mail, le prénom, le nom et la raison sociale sont obligatoires." }
  }
  if (corps.mot_de_passe.length < 10) {
    return { error: "Le mot de passe doit contenir au moins 10 caractères." }
  }
  if (corps.email !== corps.email.toLowerCase()) corps.email = corps.email.toLowerCase()

  const apiUrl = process.env.API_NEST_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  try {
    const reponse = await fetch(`${apiUrl}/v1/inscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
      cache: "no-store",
    })

    const texte = await reponse.text()
    if (!reponse.ok) {
      let message = texte.slice(0, 200)
      try {
        const enveloppe = JSON.parse(texte)
        message = enveloppe?.error?.message || enveloppe?.error || message
      } catch {
        /* on garde le texte brut */
      }
      return { error: typeof message === "string" ? message : "L'inscription a échoué." }
    }

    // Compte créé : on ne connecte pas automatiquement, la session passe par
    // le flux normal de Keycloak avec le mot de passe choisi.
    ;(await cookies()).set("elara_inscrit", "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 300 })
    return { ok: true }
  } catch {
    return { error: "Service d'inscription injoignable. Réessayez dans un instant." }
  }
}
