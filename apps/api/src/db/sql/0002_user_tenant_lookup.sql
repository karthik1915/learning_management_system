-- Finds the tenant a signed-in user belongs to. Needed because RLS hides memberships
-- until app.tenant_id is set. Returns only the caller's own tenant id (v1: one tenant per user).
CREATE OR REPLACE FUNCTION tenant.find_tenant_id_for_user(p_user_id text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = tenant, pg_temp AS $$
  SELECT m.tenant_id
  FROM tenant.t_tenant_membership m
  JOIN tenant.t_tenant t ON t.id = m.tenant_id
  WHERE m.user_id = p_user_id
    AND m.effective_end_date IS NULL
    AND m.status = 'ACTIVE'
    AND t.effective_end_date IS NULL
    AND t.status IN ('ACTIVE', 'PENDING')
  ORDER BY m.joined_at
  LIMIT 1
$$;

-- GRANT EXECUTE ON FUNCTION tenant.find_tenant_id_for_user(text) TO lms_app;
