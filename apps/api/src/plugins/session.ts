import { setAttributes } from "@elysiajs/opentelemetry";
import { sql } from "drizzle-orm";
import { Elysia, status } from "elysia";
import { db, withTenant, type Tx } from "@/db/client";
import { auth } from "@/lib/auth";
import { MembersRepository } from "@/modules/members/members.repository";

/**
 * Every route behind this plugin requires a signed-in user who is an active member of a tenant.
 * Resolves: user, tenantId, member, roles, permissions, and `scope(fn)` which runs `fn` in a
 * tenant-scoped transaction (RLS + audit variables set). No macros.
 */
export const session = new Elysia({ name: "session" }).resolve(
  { as: "scoped" },
  async ({ request }) => {
    const s = await auth.api.getSession({ headers: request.headers });
    if (!s) return status(401, { error: "UNAUTHORIZED" });

    // RLS hides memberships until a tenant is set, so this one lookup is a SECURITY DEFINER function.
    const { rows } = await db.execute<{ id: string | null }>(
      sql`select tenant.find_tenant_id_for_user(${s.user.id}) as id`,
    );
    const tenantId = rows[0]?.id;
    if (!tenantId) return status(403, { error: "NO_TENANT_MEMBERSHIP" });

    const scope = <T>(fn: (tx: Tx) => Promise<T>) =>
      withTenant(tenantId, s.user.id, fn);
    const access = await scope((tx) =>
      new MembersRepository(tx).findContext(tenantId, s.user.id),
    );
    if (!access) return status(403, { error: "NO_TENANT_MEMBERSHIP" });

    setAttributes({ "enduser.id": s.user.id, "tenant.id": tenantId }); // searchable in SigNoz
    return { user: s.user, tenantId, scope, ...access };
  },
);
