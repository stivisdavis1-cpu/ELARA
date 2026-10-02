-- =====================================================================================
-- 09 — INVITATIONS DE COMPTES
-- =====================================================================================
-- Inviter un employé ne suffisait pas : l'identité Keycloak était créée avec un
-- mot de passe provisoire aléatoire, jamais transmis, et Keycloak imposait un
-- changement à la première connexion que le realm refusait (`resetPasswordAllowed`
-- désactivé). Le compte était donc créé mais injoignable, sans qu'aucune trace ne
-- permette de comprendre pourquoi.
--
-- Cette table porte le lien d'activation : un jeton à usage unique, conservé
-- uniquement sous forme d'empreinte, valable quelques jours. L'invité définit
-- lui-même son mot de passe ; l'administrateur n'a plus à le choisir ni à le
-- connaître.
--
-- Le jeton n'est jamais stocké en clair : une fuite de la base ne donnerait pas
-- accès aux comptes. Le script est rejouable.
-- =====================================================================================

-- Les identifiants sont en `text` dans ce schéma (`users.id` l'est aussi) : la
-- colonne doit l'être également, faute de quoi la clé étrangère est refusée
-- pour types incompatibles.
CREATE TABLE IF NOT EXISTS "invitations" (
    "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tenant_id"   TEXT        NOT NULL,
    "user_id"     TEXT,
    "email"       TEXT        NOT NULL,
    "role"        TEXT        NOT NULL DEFAULT 'utilisateur_standard',
    "jeton_hash"  TEXT        NOT NULL UNIQUE,
    "expire_le"   TIMESTAMPTZ NOT NULL,
    "utilise_le"  TIMESTAMPTZ,
    "invite_par"  TEXT,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "invitations_tenant_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
    CONSTRAINT "invitations_user_fk"
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
);

-- Recherche par empreinte lors de l'activation, et nettoyage des invitations
-- arrivées à expiration.
CREATE INDEX IF NOT EXISTS "invitations_jeton_hash_idx" ON "invitations" ("jeton_hash");
CREATE INDEX IF NOT EXISTS "invitations_expire_le_idx"  ON "invitations" ("expire_le");
CREATE INDEX IF NOT EXISTS "invitations_tenant_idx"     ON "invitations" ("tenant_id");

-- Le rôle ne peut être qu'un rôle applicatif connu : la contrainte porte la
-- même liste que celle appliquée par l'API, pour qu'une écriture directe en base
-- ne puisse pas inventer un privilège.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_role_check') THEN
        ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_check" CHECK (
            "role" IN ('admin_compte', 'utilisateur_standard', 'assistant_ia_systeme', 'integration_externe')
        );
    END IF;
END $$;
