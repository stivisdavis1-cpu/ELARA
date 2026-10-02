import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

/**
 * Le jeton d'accès Keycloak expire en quelques minutes, la session NextAuth
 * pendant des semaines.
 *
 * Sans cette vérification, un cookie de session resté valide suffisait à
 * believed logged in: le lien « Se connecter » redirigeait vers le tableau de
 * bord au lieu d'afficher le formulaire, et chaque appel à l'API échouait en
 * 401. L'utilisateur se trouvait bloqué, sans aucun moyen de saisir ses
 * identifiants à nouveau.
 */
function jetonPerime(accessToken: unknown): boolean {
  if (typeof accessToken !== "string") return true;
  const parties = accessToken.split(".");
  if (parties.length < 2) return true;
  try {
    const charge = JSON.parse(Buffer.from(parties[1], "base64url").toString("utf8"));
    if (typeof charge.exp !== "number") return true;
    // Marge de 30 s : évite d'utiliser un jeton qui expire pendant l'appel.
    return charge.exp * 1000 - 30_000 <= Date.now();
  } catch {
    return true;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Connexion",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        try {
          const url = process.env.KEYCLOAK_ISSUER || "http://localhost:8080/realms/Elara";
          
          console.log("[AUTH] Attempting login for:", credentials.email);
          console.log("[AUTH] Keycloak URL:", url);

          const formData = new URLSearchParams();
          formData.append("grant_type", "password");
          formData.append("client_id", process.env.KEYCLOAK_CLIENT_ID || "elara-web");
          if (process.env.KEYCLOAK_CLIENT_SECRET) {
            formData.append("client_secret", process.env.KEYCLOAK_CLIENT_SECRET);
          }
          formData.append("username", credentials.email as string);
          formData.append("password", credentials.password as string);
          formData.append("scope", "openid profile email");

          const res = await fetch(`${url}/protocol/openid-connect/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error("[AUTH] Keycloak token fetch failed:", res.status, errText);
            return null;
          }

          const tokens = await res.json();
          console.log("[AUTH] Got tokens successfully");
          
          // Parse JWT payload (middle part of the token)
          const payloadBase64 = tokens.access_token.split('.')[1];
          const decodedPayload = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          const user = JSON.parse(decodedPayload);
          
          console.log("[AUTH] Parsed user from token:", user.email);

          // Rôles (Keycloak) : realm_access.roles + resource_access.*.roles, dédupliqués.
          const roles: string[] = [
            ...((user.realm_access?.roles as string[]) || []),
            ...(user.resource_access
              ? Object.values(user.resource_access).flatMap((ra: any) => ra?.roles || [])
              : []),
          ];

          return {
            id: user.sub,
            email: user.email,
            name: user.name || `${user.given_name} ${user.family_name}`,
            accessToken: tokens.access_token,
            roles,
            // Tenant porté par le jeton : claim explicite s'il existe,
            // sinon le claim de client Keycloak. Sert d'en-tête
            // x-tenant-id pour l'API, qui vérifie l'appartenance.
            tenantId: user.tenant_id || user.tenantId || user.organization || null,
          };
        } catch (e) {
          console.error("[AUTH] Exception during authorize:", e);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken
        token.roles = (user as any).roles || []
        token.tenantId = (user as any).tenantId || null
      }
      // Une session relancée sans nouvelle connexion : le jeton d'accès peut
      // avoir expiré. On ne le conserve pas, ce qui ramène l'utilisateur vers
      // l'écran de connexion au lieu de le laisser devant une application qui
      // répond 401.
      if (!user && jetonPerime(token.accessToken)) {
        token.accessToken = undefined
      }
      return token
    },
    async session({ session, token }) {
      const accessToken = jetonPerime(token.accessToken) ? undefined : token.accessToken
      // @ts-ignore
      session.accessToken = accessToken
      // @ts-ignore
      session.user.roles = (token as any).roles || []
      // @ts-ignore
      session.tenantId = (token as any).tenantId || null
      return session
    },
  },
})

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    /** Organisation courante, portée par le claim du jeton. */
    tenantId?: string | null;
    user: {
      id?: string;
      email?: string;
      name?: string;
      roles?: string[];
    };
  }
  interface User {
    accessToken?: string;
    roles?: string[];
    tenantId?: string | null;
  }
}
