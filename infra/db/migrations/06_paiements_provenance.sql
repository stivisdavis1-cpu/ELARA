-- =====================================================================================
-- 06 — PROVENANCE DES PAIEMENTS
-- =====================================================================================
-- Un relevé de compte est la seule pièce qui prouve un mouvement de trésorerie :
-- sans lui, la trésorerie reste à zéro même quand les factures sont enregistrées.
-- On rattache donc le règlement à son document d'origine, et à la référence de
-- l'opération lue sur le relevé.
--
-- Deux effets :
--   1. traçabilité — un montant en trésorerie renvoie à la pièce qui l'a produit,
--      ce dont l'agent a besoin pour citer ;
--   2. idempotence — réimporter le même relevé ne recomptabilise pas la sortie.
--
-- L'index unique porte sur (tenant_id, document_id, reference). En SQL, deux
-- NULL ne sont jamais égaux : donc deux mouvements sans référence ne se bloquent
-- pas entre eux, et seul un mouvement doté d'une référence est dédupliqué. C'est
-- exactement le comportement voulu — on ne refuse pas un relevé pour absence de
-- référence, on ne le compte simplement pas deux fois quand elle existe.
-- =====================================================================================

ALTER TABLE "paiements" ADD COLUMN IF NOT EXISTS "document_id" TEXT;
ALTER TABLE "paiements" ADD COLUMN IF NOT EXISTS "reference" TEXT;

-- La colonne peut déjà exister sur une base migrée par un autre chemin : on
-- supprime la contrainte avant de la recréer, pour que le script soit rejouable.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'paiements_tenant_id_document_id_reference_key'
    ) THEN
        ALTER TABLE "paiements" DROP CONSTRAINT "paiements_tenant_id_document_id_reference_key";
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.documents') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            WHERE t.relname = 'paiements' AND c.conname = 'paiements_document_id_fkey'
        ) THEN
            ALTER TABLE "paiements"
                ADD CONSTRAINT "paiements_document_id_fkey"
                FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "paiements_tenant_id_document_id_reference_key"
    ON "paiements" ("tenant_id", "document_id", "reference");

CREATE INDEX IF NOT EXISTS "paiements_tenant_id_date_paiement_idx"
    ON "paiements" ("tenant_id", "date_paiement");
