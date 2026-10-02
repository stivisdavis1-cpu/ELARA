import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export default auth((req: any) => {
  // Ces pages sont accessibles sans session. `/register` doit y figurer avec
  // `/login` : sinon la middleware renvoie l visiteur vers la connexion, et le
  // lien « Créer mon compte » de l'écran de connexion ne mène nulle part.
  // `/activer` également : l'invité y définit son mot de passe, il n'a donc pas
  // encore de session. `/onboarding` en revanche reste protégé — il ne sert
  // qu'un compte déjà connecté, et le rendre public afficherait un formulaire de
  // création d'entreprise à un visiteur anonyme.
  const publicRoutes = ['/', '/login', '/register', '/prelancement', '/activer']
  const estPublic = publicRoutes.some(
    route =>
      req.nextUrl.pathname === route ||
      req.nextUrl.pathname.startsWith('/prelancement') ||
      req.nextUrl.pathname.startsWith('/activer'),
  )

  // Un cookie de session ne suffit pas : sans jeton d'accès valide, l'API
  // refuse tous les appels (401). Traiter cela comme une connexion revient à
  // renvoyer l'utilisateur vers un tableau de bord inutilisable — et, depuis
  // « Se connecter », à ne jamais lui demander ses identifiants.
  const connecte = Boolean(req.auth?.accessToken)

  if (!connecte && !estPublic) {
    const newUrl = new URL("/login", req.nextUrl.origin)
    return Response.redirect(newUrl)
  }

  if (connecte && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register')) {
    const newUrl = new URL("/dashboard", req.nextUrl.origin)
    return Response.redirect(newUrl)
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
