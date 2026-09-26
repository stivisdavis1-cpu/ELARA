-- ============================================================
-- Migration 03 — Modules métier : docgen, workflows, validations,
-- intégrations, journal d'audit et RH.
--
-- Généré hors-ligne via `prisma migrate diff` entre le schéma du
-- commit précédent et `apps/api-nest/prisma/schema.prisma`, puis
-- complété ci-dessous. Idempotent : à appliquer dans l'ordre après
-- 01_fondations.sql, 01_rls_and_triggers.sql et 02_ia_models_pgvector.sql.
--
-- RÔLE DES NOUVELLES TABLES
-- Aucune RLS n'est activée ici, volontairement. Les politiques de
-- 01_rls_and_triggers.sql filtrent sur le GUC `app.current_tenant_id`,
-- que l'API ne pose pas sur ses connexions Prisma : les activer
-- produirait un refus silencieux (0 ligne) sur les tables concernées.
-- L'isolation multi-tenant est donc appliquée côté application —
-- toute requête filtre sur `tenant_id`, alimenté par le
-- TenantInterceptor à partir du JWT. Activer la RLS plus tard exige
-- d'abord de poser le GUC sur chaque connexion (voir
-- apps/api-nest/src/prisma.service.ts).
-- ============================================================

-- Le rôle IA et le rôle d'intégration externe existent côté Prisma mais
-- manquaient dans l'enum PostgreSQL : on les ajoute (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'role_utilisateur' AND e.enumlabel = 'assistant_ia_systeme') THEN
    ALTER TYPE "role_utilisateur" ADD VALUE 'assistant_ia_systeme';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'role_utilisateur' AND e.enumlabel = 'integration_externe') THEN
    ALTER TYPE "role_utilisateur" ADD VALUE 'integration_externe';
  END IF;
END
$$;

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'autre',
    "description" TEXT,
    "corps" TEXT NOT NULL DEFAULT '',
    "champs" JSONB NOT NULL DEFAULT '[]',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_generes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT,
    "document_id" TEXT,
    "numero" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'autre',
    "client_id" TEXT,
    "fournisseur_id" TEXT,
    "destinataire" TEXT,
    "montant" DECIMAL(12,2),
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "donnees" JSONB NOT NULL DEFAULT '{}',
    "fichier" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_generes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "declencheur" TEXT NOT NULL DEFAULT 'manuel',
    "evenement" TEXT,
    "frequence" TEXT,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniere_execution" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'succes',
    "declencheur" TEXT,
    "cible" TEXT,
    "resultat" JSONB NOT NULL DEFAULT '{}',
    "erreur" TEXT,
    "debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMP(3),

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "detail" TEXT,
    "cible_type" TEXT,
    "cible_id" TEXT,
    "montant" DECIMAL(12,2),
    "donnees" JSONB NOT NULL DEFAULT '{}',
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "decide_par" TEXT,
    "decide_at" TIMESTAMP(3),
    "motif" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'webhook',
    "url" TEXT,
    "secret" TEXT,
    "evenements" JSONB NOT NULL DEFAULT '[]',
    "actif" BOOLEAN NOT NULL DEFAULT false,
    "statut" TEXT NOT NULL DEFAULT 'inactif',
    "dernier_appel" TIMESTAMP(3),
    "dernier_statut" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "fonction" TEXT,
    "departement" TEXT,
    "type_contrat" TEXT,
    "salaire_base" DECIMAL(12,2),
    "date_embauche" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_templates_tenant_id_idx" ON "document_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "documents_generes_tenant_id_idx" ON "documents_generes"("tenant_id");

-- CreateIndex
CREATE INDEX "workflows_tenant_id_idx" ON "workflows"("tenant_id");

-- CreateIndex
CREATE INDEX "workflow_executions_tenant_id_idx" ON "workflow_executions"("tenant_id");

-- CreateIndex
CREATE INDEX "workflow_executions_workflow_id_idx" ON "workflow_executions"("workflow_id");

-- CreateIndex
CREATE INDEX "validations_tenant_id_statut_idx" ON "validations"("tenant_id", "statut");

-- CreateIndex
CREATE INDEX "integrations_tenant_id_idx" ON "integrations"("tenant_id");

-- CreateIndex
CREATE INDEX "employes_tenant_id_idx" ON "employes"("tenant_id");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_generes" ADD CONSTRAINT "documents_generes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_generes" ADD CONSTRAINT "documents_generes_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_generes" ADD CONSTRAINT "documents_generes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validations" ADD CONSTRAINT "validations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employes" ADD CONSTRAINT "employes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

