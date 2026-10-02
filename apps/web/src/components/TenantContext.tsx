"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";

/**
 * Entreprise courante, lue une seule fois côté serveur.
 *
 * Les écrans sont des composants clients : ils ne peuvent pas lire les cookies.
 * L'en-tête `x-tenant-id` est pourtant obligatoire, sans quoi `TenantInterceptor`
 * rejette la requête (403). Il n'existe aucun tenant par défaut vers lequel se
 * rabattre : sans entreprise choisie, aucun appel API n'est possible.
 */
const ContexteEntreprise = createContext<string | null>(null);

export function FournisseurEntreprise({ tenantId, children }: { tenantId: string | null; children: React.ReactNode }) {
  return <ContexteEntreprise.Provider value={tenantId}>{children}</ContexteEntreprise.Provider>;
}

/** Identifiant de l'entreprise courante, ou `null` si aucune n'est accessible. */
export function useEntrepriseCourante(): string | null {
  return useContext(ContexteEntreprise);
}

/** En-têtes d'appel API : vides tant qu'aucune entreprise n'est connue. */
export function useEntetesTenant(): Record<string, string> {
  const tenantId = useEntrepriseCourante();
  // Référence stable : sans cela, chaque rendu produirait un nouvel objet et
  // relancerait les effets qui en dépendent.
  return useMemo(() => {
    const entetes: Record<string, string> = {};
    if (tenantId) entetes["x-tenant-id"] = tenantId;
    return entetes;
  }, [tenantId]);
}

/**
 * En-têtes complets pour un appel API depuis le navigateur.
 *
 * Le proxy Next ne relaie que l'URL : le jeton et l'entreprise doivent être
 * transmis explicitement. Chaque écran construisait ses en-têtes à sa manière —
 * certains lisaient `session.user.tenantId`, qui est `null` pour un compte
 * multi-organisation, d'autresoubliaient le jeton — et l'API répondait 401 ou
 * 403 sans que rien ne l'explique à l'écran.
 */
export function useEntetesApi(): Record<string, string> {
  const { data: session } = useSession();
  const jeton = (session as { accessToken?: string } | null)?.accessToken ?? "";
  const entetesTenant = useEntetesTenant();
  return useMemo(
    () => ({ ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...entetesTenant }),
    [jeton, entetesTenant],
  );
}
