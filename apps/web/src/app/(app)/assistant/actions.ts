"use server";

import { auth } from "@/lib/auth";

export async function askAssistant(question: string) {
  const session = await auth();
  
  // En dev local, on mock un token si l'auth n'est pas complète.
  // @ts-expect-error -- accessToken n'est pas sur le type de session par défaut
  const token = session?.accessToken || "test-token"; 

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  const response = await fetch(`${apiUrl}/v1/assistant/advice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-tenant-id": "test-tenant"
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Backend error:", response.status, errText);
    throw new Error(`Erreur API: ${response.status}`);
  }

  return response.json();
}

export async function getConversationHistory() {
  const session = await auth();

  // En dev local, on mock un token si l'auth n'est pas complète.
  // @ts-expect-error -- accessToken n'est pas sur le type de session par défaut
  const token = session?.accessToken || "test-token";

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const response = await fetch(`${apiUrl}/v1/assistant/conversations`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-tenant-id": "test-tenant",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Backend error history:", response.status, errText);
    throw new Error(`Erreur API historique: ${response.status}`);
  }

  return response.json();
}
