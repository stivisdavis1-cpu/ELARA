import { auth } from "@/lib/auth";

/**
 * Transport binaire pour les Route Handlers.
 *
 * `ged-api.ts` est un module « use server » : ses fonctions ne peuvent pas
 * servir à une route HTTP. On duplique donc le strict nécessaire — jeton de
 * session, header tenant, URL interne — avec un nom différent pour que les
 * deux chemins ne dérivent pas silencieusement.
 */
export async function gedBinaryRoute(
  endpoint: string,
  nomParDefaut: string,
): Promise<{ octets: ArrayBuffer; nom: string }> {
  const session = await auth();
  const apiUrl = process.env.API_NEST_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const token = session?.accessToken ?? (process.env.NODE_ENV !== "production" ? "test-token" : null);
  if (!token) throw new Error("Session expirée : reconnectez-vous.");

  const tenantId = session?.tenantId?.trim() || (process.env.NODE_ENV !== "production" ? "test-tenant" : null);
  if (!tenantId) throw new Error("Aucun tenant dans la session : reconnectez-vous.");

  const reponse = await fetch(`${apiUrl}${endpoint}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
  });

  if (!reponse.ok) {
    const detail = (await reponse.text().catch(() => "")).slice(0, 240);
    throw new Error(`API ${endpoint} → ${reponse.status} ${detail}`);
  }

  const entete = reponse.headers.get("content-disposition") ?? "";
  const trouve = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(entete);
  return {
    octets: await reponse.arrayBuffer(),
    nom: trouve ? decodeURIComponent(trouve[1]) : nomParDefaut,
  };
}
