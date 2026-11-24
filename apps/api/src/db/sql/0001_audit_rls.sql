-- Custom migration. Run AFTER drizzle generates/applies the table migration.
-- Use Neon's DIRECT (non-pooled) connection for migrations.

-- ─────────────────────────────────────────────────────────────
-- 1. created_by / updated_by / updated_at maintained in the DB
--    Backend sets per request:  SELECT set_config('app.user_id', '<user id>', true);
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_audit_fields() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE uid text := NULLIF(current_setting('app.user_id', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, uid);
    NEW.updated_by := COALESCE(NEW.updated_by, uid);
  ELSE
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
    NEW.updated_at := now();
    NEW.updated_by := COALESCE(uid, NEW.updated_by);
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name FROM information_schema.columns
    WHERE table_schema IN ('tenant', 'platform') AND column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_fields ON %I.%I', r.table_schema, r.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_fields BEFORE INSERT OR UPDATE ON %I.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields()', r.table_schema, r.table_name);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Append-only logs: block UPDATE / DELETE
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tenant.t_audit_log','platform.t_platform_audit_log'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_append_only ON %s', t);
    EXECUTE format(
      'CREATE TRIGGER trg_append_only BEFORE UPDATE OR DELETE ON %s
       FOR EACH ROW EXECUTE FUNCTION public.block_mutation()', t);
  END LOOP;
END $$;
-- (t_app_log is left deletable so a retention job can purge old rows.)

-- ─────────────────────────────────────────────────────────────
-- 3. Row-Level Security for the tenant schema
--    Backend per request, inside a transaction (required with Neon's pooler):
--      SELECT set_config('app.tenant_id', '<tenant uuid>', true);
--    The application role must NOT own the tables (owners bypass RLS).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tenant.current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'tenant' AND column_name = 'tenant_id'
  LOOP
    EXECUTE format('ALTER TABLE tenant.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON tenant.%I', r.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON tenant.%I
         USING (tenant_id = tenant.current_tenant_id())
         WITH CHECK (tenant_id = tenant.current_tenant_id())', r.table_name);
  END LOOP;
END $$;

-- t_tenant is keyed by id. For signup: generate the uuid in the app, set app.tenant_id to it,
-- then insert (WITH CHECK passes).
ALTER TABLE tenant.t_tenant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenant.t_tenant;
CREATE POLICY tenant_isolation ON tenant.t_tenant
  USING (id = tenant.current_tenant_id())
  WITH CHECK (id = tenant.current_tenant_id());

-- ─────────────────────────────────────────────────────────────
-- 4. Host -> tenant resolution (runs BEFORE a tenant is known, so it bypasses RLS safely)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tenant.resolve_tenant_by_host(p_host text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = tenant, pg_temp AS $$
  SELECT d.tenant_id
  FROM tenant.t_tenant_domain d
  JOIN tenant.t_tenant t ON t.id = d.tenant_id
  WHERE d.host = lower(p_host)
    AND d.effective_end_date IS NULL
    AND d.verification_status = 'VERIFIED'
    AND t.effective_end_date IS NULL
    AND t.status IN ('ACTIVE', 'PENDING')
  LIMIT 1
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Roles / grants (create the roles once in the Neon console, then uncomment)
--    lms_app      : used by the API. Tenant schema CRUD (RLS applies), platform read-only subset.
--    lms_platform : used by admin tooling. Full platform schema, BYPASSRLS for support work.
-- ─────────────────────────────────────────────────────────────
-- GRANT USAGE ON SCHEMA tenant, platform TO lms_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA tenant TO lms_app;
-- GRANT SELECT ON platform.t_plan, platform.t_feature, platform.t_plan_feature,
--                 platform.t_tenant_feature_override, platform.t_tenant_subscription TO lms_app;
-- GRANT INSERT ON platform.t_app_log TO lms_app;
-- GRANT EXECUTE ON FUNCTION tenant.resolve_tenant_by_host(text) TO lms_app;
-- GRANT USAGE ON SCHEMA tenant, platform TO lms_platform;
-- GRANT ALL ON ALL TABLES IN SCHEMA tenant, platform TO lms_platform;
-- ALTER ROLE lms_platform BYPASSRLS;
