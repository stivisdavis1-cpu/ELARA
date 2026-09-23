-- 01_fondations.sql

-- Types Enum
CREATE TYPE role_utilisateur AS ENUM ('admin_compte', 'utilisateur_standard');
CREATE TYPE statut_abonnement AS ENUM ('actif', 'suspendu', 'annule', 'essai');

-- Table: tenants (Entreprises)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raison_sociale VARCHAR(255) NOT NULL,
    secteur VARCHAR(100),
    pays VARCHAR(100),
    ville VARCHAR(100),
    devise VARCHAR(10) DEFAULT 'XAF',
    statut_abonnement statut_abonnement DEFAULT 'essai',
    parametres JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: users (Identités locales liées à Supabase/Keycloak)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role role_utilisateur DEFAULT 'utilisateur_standard',
    keycloak_subject_id VARCHAR(255), -- ID de l'Identity Provider (Supabase Auth ou Keycloak)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: user_tenants (Pour l'accès multi-tenant comme les cabinets comptables)
CREATE TABLE user_tenants (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role role_utilisateur DEFAULT 'utilisateur_standard',
    PRIMARY KEY (user_id, tenant_id)
);

-- Création de la fonction utilitaire RLS
CREATE OR REPLACE FUNCTION current_user_tenant_ids()
RETURNS UUID[] AS $$
DECLARE
    tenant_ids UUID[];
BEGIN
    -- Dans un contexte API complet (NestJS), l'app.current_user_id est défini par l'API (via SET app.current_user_id)
    -- Ou, si on utilise directement Supabase JWT, on peut lire auth.uid().
    -- On supporte les deux approches.
    SELECT array_agg(ut.tenant_id) INTO tenant_ids
    FROM user_tenants ut
    WHERE ut.user_id = COALESCE(
        NULLIF(current_setting('app.current_user_id', true), '')::uuid,
        auth.uid()
    );
    
    RETURN COALESCE(tenant_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
