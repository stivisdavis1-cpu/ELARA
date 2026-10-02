-- =====================================================================================
-- PURGE DES DONNEES DE DEMONSTRATION
-- =====================================================================================
-- Supprime uniquement les lignes identifiables comme fictives.
--
-- Deux schémas ont coexisté dans ce dépôt : celui de Prisma
-- (apps/api-nest/prisma/schema.prisma, qui fait foi pour l'application) et
-- celui de infra/db/init_supabase.sql, plus ancien et divergent — il ignore
-- la table `paiements` et nomme la facture `numero_facture`. Ce script
-- teste donc l'existence de chaque table avant d'y écrire : sur un schéma
-- donné, il ne supprime que ce qui existe, et ne échoue jamais.
--
--   psql "$DATABASE_URL" -f infra/db/purge_demo.sql
-- =====================================================================================

BEGIN;

-- ---------------------------------------------------------------------------------
-- 1. Jeu « SARL AFRIK DISTRIBUTION » (ancien infra/db/seed.sql)
-- ---------------------------------------------------------------------------------
DO $$
DECLARE
    t UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    IF to_regclass('public.paiements') IS NOT NULL THEN
        DELETE FROM paiements
         WHERE tenant_id = t
            OR facture_id IN (SELECT id FROM factures WHERE tenant_id = t);
    END IF;

    IF to_regclass('public.lignes_facture') IS NOT NULL THEN
        DELETE FROM lignes_facture
         WHERE tenant_id = t
            OR facture_id IN (SELECT id FROM factures WHERE tenant_id = t);
    END IF;

    IF to_regclass('public.document_elements') IS NOT NULL THEN
        DELETE FROM document_elements
         WHERE tenant_id = t
            OR document_id IN (SELECT id FROM documents WHERE tenant_id = t);
    END IF;

    IF to_regclass('public.document_chunks') IS NOT NULL THEN
        DELETE FROM document_chunks WHERE tenant_id = t;
    END IF;

    IF to_regclass('public.documents') IS NOT NULL THEN
        DELETE FROM documents WHERE tenant_id = t;
    END IF;

    IF to_regclass('public.factures') IS NOT NULL THEN
        DELETE FROM factures WHERE tenant_id = t;
    END IF;

    DELETE FROM clients     WHERE tenant_id = t;
    DELETE FROM fournisseurs WHERE tenant_id = t;
    DELETE FROM user_tenants WHERE tenant_id = t;
    DELETE FROM users       WHERE tenant_id = t;
    DELETE FROM tenants     WHERE id = t;
END $$;

-- ---------------------------------------------------------------------------------
-- 2. Jeu « Boutique Douala SARL » + « Client A/B »
--    (ancien bloc de démonstration de init_supabase.sql)
--    Ces lignes étaient créées par un DO $$ sans identifiant fixe : on les
--    reconnaît à leur raison sociale.
-- ---------------------------------------------------------------------------------
DO $$
DECLARE
    t UUID;
BEGIN
    SELECT id INTO t FROM tenants WHERE raison_sociale = 'Boutique Douala SARL' LIMIT 1;
    IF t IS NULL THEN
        RETURN;
    END IF;

    IF to_regclass('public.lignes_facture') IS NOT NULL THEN
        DELETE FROM lignes_facture
         WHERE tenant_id = t
            OR facture_id IN (SELECT id FROM factures WHERE tenant_id = t);
    END IF;

    IF to_regclass('public.paiements') IS NOT NULL THEN
        DELETE FROM paiements
         WHERE tenant_id = t
            OR facture_id IN (SELECT id FROM factures WHERE tenant_id = t);
    END IF;

    IF to_regclass('public.documents') IS NOT NULL THEN
        DELETE FROM documents WHERE tenant_id = t;
    END IF;

    DELETE FROM factures      WHERE tenant_id = t;
    DELETE FROM clients       WHERE tenant_id = t;
    DELETE FROM fournisseurs  WHERE tenant_id = t;
    DELETE FROM user_tenants  WHERE tenant_id = t;
    DELETE FROM users         WHERE tenant_id = t;
    DELETE FROM tenants       WHERE id = t;
END $$;

-- ---------------------------------------------------------------------------------
-- 3. Tenant technique de test, créé par prisma/seed.ts
--    Il ne contient aucune donnée métier, mais son nom apparaît dans
--    l'interface : on le retire pour qu'aucun tenant n'ait de nom fictif.
-- ---------------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT := 'test-tenant';
BEGIN
    IF to_regclass('public.paiements') IS NOT NULL THEN
        DELETE FROM paiements
         WHERE tenant_id = t
            OR facture_id IN (SELECT id FROM factures WHERE tenant_id = t);
    END IF;

    IF to_regclass('public.lignes_facture') IS NOT NULL THEN
        DELETE FROM lignes_facture
         WHERE tenant_id = t
            OR facture_id IN (SELECT id FROM factures WHERE tenant_id = t);
    END IF;

    IF to_regclass('public.documents') IS NOT NULL THEN
        DELETE FROM documents WHERE tenant_id = t;
    END IF;

    DELETE FROM factures      WHERE tenant_id = t;
    DELETE FROM clients       WHERE tenant_id = t;
    DELETE FROM fournisseurs  WHERE tenant_id = t;
    DELETE FROM user_tenants  WHERE tenant_id = t;
    DELETE FROM users         WHERE tenant_id = t;
    DELETE FROM tenants       WHERE id = t;
END $$;

COMMIT;

-- =====================================================================================
-- Vérification — ces requêtes doivent renvoyer 0.
--
--   SELECT count(*) FROM tenants
--    WHERE raison_sociale IN ('SARL AFRIK DISTRIBUTION','Boutique Douala SARL','Elara Test');
--   SELECT count(*) FROM clients
--    WHERE nom IN ('Client A','Client B','Boutique Le Phare','Superette du Coin');
--   SELECT count(*) FROM users WHERE email IN ('admin@afrik-distribution.cm','stivisdavis1@gmail.com');
-- =====================================================================================
