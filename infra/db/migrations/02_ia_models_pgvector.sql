-- ============================================================
-- Migration 02 — Modèles IA (Conseiller & Agent Fiscal) + pgvector
-- Générée hors-ligne via `prisma migrate diff` (aucune exécution DB).
-- Tables : tax_rules, conversations, messages, company_memories
-- ============================================================

-- Extension vectorielle (pgvector) — idempotente
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE IF NOT EXISTS "tax_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "taux_standard_tva" DECIMAL(5,2) NOT NULL,
    "cotisations_sociales" JSONB,
    "date_verification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,

    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "titre" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "company_memories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type_info" TEXT NOT NULL,
    "embedding" vector(768),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tax_rules_tenant_id_pays_key" ON "tax_rules"("tenant_id", "pays");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "company_memories_tenant_id_idx" ON "company_memories"("tenant_id");

-- AddForeignKey
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_memories" ADD CONSTRAINT "company_memories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Isolation multi-tenant (RLS) pour les tables IA
-- Schéma identique à 01_rls_and_triggers.sql (app.current_tenant_id)
-- ============================================================
ALTER TABLE "tax_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_memories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tax_rules ON "tax_rules"
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_conversations ON "conversations"
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_messages ON "messages"
  USING (conversation_id IN (SELECT c.id FROM "conversations" c
                             WHERE c.tenant_id::text = current_setting('app.current_tenant_id', true)));

CREATE POLICY tenant_isolation_company_memories ON "company_memories"
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));