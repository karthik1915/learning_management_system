import { Elysia } from "elysia";
import { doc } from "@/lib/openapi";
import { session } from "@/plugins/session";
import { TenantRepository } from "@/modules/tenant/tenant.repository";

/** Dashboard bootstrap: who I am, which tenant, my roles and what I'm allowed to do. */
export const meRouter = new Elysia({ prefix: "/me" }).use(session).get(
  "/",
  ({ user, tenantId, member, roles, permissions, scope }) =>
    scope(async (tx) => {
      const p = await new TenantRepository(tx).profile(tenantId);
      return {
        user: { id: user.id, name: user.name, email: user.email },
        tenant: p && {
          id: p.tenant.id,
          slug: p.tenant.slug,
          name: p.detail?.displayName ?? p.tenant.name,
          status: p.tenant.status,
          timezone: p.tenant.timezone,
          locale: p.tenant.locale,
          logoUrl: p.branding?.logoUrl ?? null,
          primaryColor: p.branding?.primaryColor ?? null,
        },
        member,
        roles,
        permissions,
      };
    }),
  {
    detail: doc("Context", "Who am I", {
      description:
        "User, tenant branding, membership, roles and permissions. Call once after sign-in.",
    }),
  },
);
