-- =====================================================================================
-- 07 — INDEXATION DOCUMENTAIRE
-- =====================================================================================
-- Deux corrections sur `document_chunks`, la table que la recherche consomme.
--
-- 1. `page_number` était NOT NULL alors que l'OCR rend un texte continu, sans
--    frontière de page. L'indexation d'un document échouait donc sur la
--    contrainte. La colonne devient nullable : une citation sans page est
--    honnête, une page inventée est une fausse source.
--
-- 2. L'index HNSW était commenté dans le schéma. Sans lui, chaque recherche
--    vectorielle parcourt tous les fragments : la mémoire du client ne passe pas
--    à l'échelle.
--
-- Le script est rejouable sur une base déjà migrée comme sur une base neuve.
-- =====================================================================================

-- 1. Page nullable -------------------------------------------------------------
ALTER TABLE "document_chunks" ALTER COLUMN "page_number" DROP NOT NULL;

-- 2. Index vectoriel -----------------------------------------------------------
-- La colonne peut ne pas exister sur une base qui n'a pas encore vu la migration
-- 04 (extension vector non activée) : dans ce cas on ne tente pas l'index plutôt
-- que d'échouer et de laisser la migration à moitié appliquée.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_chunks' AND column_name = 'embedding'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
                 ON document_chunks USING hnsw (embedding vector_cosine_ops)';
    END IF;
END $$;
