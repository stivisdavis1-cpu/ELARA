import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

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
            roles
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
      }
      return token
    },
    async session({ session, token }) {
      // @ts-ignore
      session.accessToken = token.accessToken
      // @ts-ignore
      session.user.roles = (token as any).roles || []
      return session
    },
  },
})

declare module "next-auth" {
  interface Session {
    accessToken?: string;
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
  }
}
