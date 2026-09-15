-- =====================================================================================
-- ELARA - SCHÉMA DE BASE DE DONNÉES (SUPABASE) - PARTIE 2
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. TYPES ET FONDATIONS
CREATE TYPE role_utilisateur AS ENUM ('admin_compte', 'utilisateur_standard');
CREATE TYPE statut_abonnement AS ENUM ('actif', 'suspendu', 'annule', 'essai');
CREATE TYPE statut_facture AS ENUM ('brouillon', 'envoyee', 'payee', 'impayee', 'annulee');
CREATE TYPE acteur_type AS ENUM ('utilisateur', 'systeme_ia', 'integration');

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

-- Table: users (Identités)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role role_utilisateur DEFAULT 'utilisateur_standard',
    keycloak_subject_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: user_tenants (Multi-tenant)
CREATE TABLE user_tenants (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role role_utilisateur DEFAULT 'utilisateur_standard',
    PRIMARY KEY (user_id, tenant_id)
);

-- Fonction RLS
CREATE OR REPLACE FUNCTION current_user_tenant_ids()
RETURNS UUID[] AS $$
DECLARE
    tenant_ids UUID[];
BEGIN
    SELECT array_agg(ut.tenant_id) INTO tenant_ids
    FROM user_tenants ut
    WHERE ut.user_id = COALESCE(
        NULLIF(current_setting('app.current_user_id', true), '')::uuid,
        auth.uid()
    );
    RETURN COALESCE(tenant_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================================
-- 2. ENTITÉS MÉTIER
-- =====================================================================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telephone VARCHAR(50),
    adresse TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE fournisseurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telephone VARCHAR(50),
    adresse TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE produits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    prix_unitaire NUMERIC(15,2) NOT NULL,
    taux_tva NUMERIC(5,2) DEFAULT 19.25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE factures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id),
    fournisseur_id UUID REFERENCES fournisseurs(id),
    numero_facture VARCHAR(100),
    statut statut_facture DEFAULT 'brouillon',
    montant_ht NUMERIC(15,2) NOT NULL,
    montant_ttc NUMERIC(15,2) NOT NULL,
    date_emission DATE,
    date_echeance DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_facture_tiers CHECK (client_id IS NOT NULL OR fournisseur_id IS NOT NULL)
);

CREATE TABLE lignes_facture (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    produit_id UUID REFERENCES produits(id),
    description TEXT NOT NULL,
    quantite NUMERIC(10,2) NOT NULL,
    prix_unitaire NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fichier_url TEXT NOT NULL,
    hash_document VARCHAR(255),
    type_document VARCHAR(50),
    score_confiance NUMERIC(3,2),
    statut_validation VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index pour éviter les doublons de documents par locataire
CREATE UNIQUE INDEX idx_documents_tenant_hash ON documents(tenant_id, hash_document) WHERE deleted_at IS NULL AND hash_document IS NOT NULL;

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768)
);

CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
-- Optional HNSW index for performance
-- CREATE INDEX idx_document_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- =====================================================================================
-- 3. HISTORISATION & AUDIT
-- =====================================================================================

CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    acteur_type acteur_type NOT NULL,
    acteur_id VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    entite_concernee VARCHAR(100),
    statut VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE historique_modifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fonction de trigger pour l'historisation automatique
CREATE OR REPLACE FUNCTION audit_record_trigger()
RETURNS trigger AS $$
BEGIN
    INSERT INTO historique_modifications (tenant_id, table_name, record_id, operation, old_data, new_data)
    VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        row_to_json(OLD),
        row_to_json(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application du trigger sur la table factures (exemple, à étendre)
CREATE TRIGGER factures_audit
    AFTER INSERT OR UPDATE OR DELETE ON factures
    FOR EACH ROW EXECUTE FUNCTION audit_record_trigger();


-- =====================================================================================
-- 4. POLITIQUES DE SÉCURITÉ (RLS)
-- =====================================================================================

-- Activation de RLS sur toutes les tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_facture ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique_modifications ENABLE ROW LEVEL SECURITY;

-- Création des politiques génériques (isoler chaque locataire)
-- L'accès est permis si le tenant_id de la ligne correspond à un tenant_id de l'utilisateur actif
CREATE POLICY tenant_isolation_clients ON clients FOR ALL USING (tenant_id = ANY(current_user_tenant_ids()));
CREATE POLICY tenant_isolation_fournisseurs ON fournisseurs FOR ALL USING (tenant_id = ANY(current_user_tenant_ids()));
CREATE POLICY tenant_isolation_produits ON produits FOR ALL USING (tenant_id = ANY(current_user_tenant_ids()));
CREATE POLICY tenant_isolation_factures ON factures FOR ALL USING (tenant_id = ANY(current_user_tenant_ids()));
CREATE POLICY tenant_isolation_lignes_facture ON lignes_facture FOR ALL USING (tenant_id = ANY(current_user_tenant_ids()));
CREATE POLICY tenant_isolation_documents ON documents FOR ALL USING (tenant_id = ANY(current_user_tenant_ids()));
CREATE POLICY tenant_isolation_audit ON audit_trail FOR ALL USING (tenant_id = ANY(current_user_tenant_ids()));
CREATE POLICY tenant_isolation_historique ON historique_modifications FOR ALL USING (tenant_id = ANY(current_user_tenant_ids()));

-- =====================================================================================
-- 5. DONNÉES DE DÉMONSTRATION (SEED)
-- =====================================================================================

DO $$
DECLARE
    demo_tenant_id UUID;
    demo_user_id UUID;
BEGIN
    -- Création d'un locataire
    INSERT INTO tenants (raison_sociale, secteur, pays, ville) 
    VALUES ('Boutique Douala SARL', 'Commerce', 'Cameroun', 'Douala') 
    RETURNING id INTO demo_tenant_id;

    -- Création d'un utilisateur admin
    INSERT INTO users (tenant_id, nom, email, role) 
    VALUES (demo_tenant_id, 'Steve Moutouo', 'stivisdavis1@gmail.com', 'admin_compte')
    RETURNING id INTO demo_user_id;

    -- Liaison user-tenant
    INSERT INTO user_tenants (user_id, tenant_id, role) 
    VALUES (demo_user_id, demo_tenant_id, 'admin_compte');

    -- Création de clients
    INSERT INTO clients (tenant_id, nom, telephone) VALUES (demo_tenant_id, 'Client A', '699000001');
    INSERT INTO clients (tenant_id, nom, telephone) VALUES (demo_tenant_id, 'Client B', '699000002');
END $$;
