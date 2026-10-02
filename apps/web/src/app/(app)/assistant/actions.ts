"use server";

import { auth } from "@/lib/auth";
import { currentTenantId } from "@/lib/ged-api";

/**
 * Accès à l'assistant.
 *
 * Deux erreurs ont été corrigées ici :
 *
 * 1. L'en-tête `x-tenant-id` doit correspondre à l'entreprise réellement
 *    sélectionnée. Il n'existe aucun tenant par défaut.
 * 2. Le jeton `test-token` était utilisé en repli **sans condition
 *    d'environnement**. Il n'existe que pour le contournement de JwtAuthGuard
 *    en développement : s'en servir en production revient à tenter de passer
 *    outre l'authentification, et cela masquait la vraie erreur derrière un
 *    message générique. En production, une session absente est une session
 *    absente.
 */
async function appelAssistant(chemin: string, init: RequestInit = {}) {
  const session = await auth();
  const jeton = session?.accessToken;
  if (!jeton) throw new Error("Session expirée : reconnectez-vous.");

  const tenantId = await currentTenantId();
  const apiUrl = process.env.API_NEST_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const response = await fetch(`${apiUrl}${chemin}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jeton}`,
      "x-tenant-id": tenantId,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    console.error(`[assistant] ${chemin} -> ${response.status} ${detail}`);
    throw new Error(`Erreur API: ${response.status}`);
  }
  return response.json();
}

export async function askAssistant(question: string) {
  return appelAssistant("/v1/assistant/advice", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function getConversationHistory() {
  return appelAssistant("/v1/assistant/conversations");
}
