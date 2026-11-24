-- Run AFTER drizzle has created the learning tables. Use the OWNER / direct connection.
-- Idempotent: safe to run again.

-- 1. created_by / updated_by / updated_at trigger on every learning table (function from 0001)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'learning' AND column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_fields ON learning.%I', r.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_fields BEFORE INSERT OR UPDATE ON learning.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields()', r.table_name);
  END LOOP;
END $$;

-- 2. Row-Level Security: same tenant_isolation policy as the tenant schema (function from 0001)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'learning' AND column_name = 'tenant_id'
  LOOP
    EXECUTE format('ALTER TABLE learning.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON learning.%I', r.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON learning.%I
         USING (tenant_id = tenant.current_tenant_id())
         WITH CHECK (tenant_id = tenant.current_tenant_id())', r.table_name);
  END LOOP;
END $$;

-- 3. Roles already seeded in existing tenants keep their OLD permission arrays, so add the new
--    course permissions to them. (New tenants get them from DEFAULT_ROLE_PERMISSIONS.)
UPDATE tenant.t_tenant_role r
SET permissions = (
  SELECT coalesce(jsonb_agg(DISTINCT p ORDER BY p), '[]'::jsonb)
  FROM jsonb_array_elements_text(r.permissions || v.perms) AS p
)
FROM (VALUES
  ('ADMIN',      '["courses.read","courses.manage","courses.manage_all","enrollments.manage"]'::jsonb),
  ('INSTRUCTOR', '["courses.read","courses.manage"]'::jsonb),
  ('STUDENT',    '["courses.read"]'::jsonb)
) AS v(code, perms)
WHERE r.code = v.code AND r.is_system AND r.effective_end_date IS NULL;

-- 4. Grants for the API role (uncomment once lms_app exists)
-- GRANT USAGE ON SCHEMA learning TO lms_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA learning TO lms_app;
