"use server";

import { auth } from "@/lib/auth";

async function fetchCfoApi(endpoint: string, options: RequestInit = {}) {
  const session = await auth();
  
  // En dev local, on mock un token si l'auth n'est pas complÃ¨te.
  
  const token = session?.accessToken || "test-token"; 

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-tenant-id": "test-tenant",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Backend error on ${endpoint}:`, response.status, errText);
    throw new Error(`Erreur API: ${response.status}`);
  }

  return response.json();
}

export async function getSyntheseTresorerie() {
  return fetchCfoApi('/v1/cfo/cashflow/synthese');
}

export async function getBFR() {
  return fetchCfoApi('/v1/cfo/cashflow/bfr');
}

export async function triggerTaxAudit(countries: string[]) {
  return fetchCfoApi('/v1/cfo/tax-rules/update', {
    method: 'POST',
    body: JSON.stringify({ countries })
  });
}

export async function getAnomalies() {
  return fetchCfoApi('/v1/cfo/risques/anomalies', {
    // revalidate court pour avoir les alertes fraiches
    next: { revalidate: 10 } 
  });
}
