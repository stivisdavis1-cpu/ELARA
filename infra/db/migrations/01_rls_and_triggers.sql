-- 1. Enable RLS on all tenant-specific tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fournisseurs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "factures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;

-- 2. Create the function to get current user's tenant context
-- NestJS will SET app.current_tenant_id = 'uuid' on each request
CREATE OR REPLACE FUNCTION current_user_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Create generic policies based on tenant_id
CREATE POLICY tenant_isolation_users ON "users" 
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_clients ON "clients" 
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_fournisseurs ON "fournisseurs" 
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_factures ON "factures" 
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_documents ON "documents" 
  USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- 4. Trigger for Historical Changes
CREATE OR REPLACE FUNCTION log_modifications()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO "historique_modifications" (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO "historique_modifications" (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO "historique_modifications" (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER log_clients_changes
    AFTER INSERT OR UPDATE OR DELETE ON "clients"
    FOR EACH ROW EXECUTE FUNCTION log_modifications();

CREATE TRIGGER log_factures_changes
    AFTER INSERT OR UPDATE OR DELETE ON "factures"
    FOR EACH ROW EXECUTE FUNCTION log_modifications();

CREATE TRIGGER log_fournisseurs_changes
    AFTER INSERT OR UPDATE OR DELETE ON "fournisseurs"
    FOR EACH ROW EXECUTE FUNCTION log_modifications();
