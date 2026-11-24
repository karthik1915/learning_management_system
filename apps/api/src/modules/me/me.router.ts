import { Elysia, t } from "elysia";
import { doc } from "@/lib/openapi";
import { session } from "@/plugins/session";
import { can } from "@/lib/permissions";

import { TenantRepository } from "@/modules/tenant/tenant.repository";
import { coursesService } from "../courses/courses.router";

export const meRouter = new Elysia({ prefix: "/me" })
  .use(session)
  .get(
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
  )
  .get(
    "/courses",
    ({ scope, tenantId, member, permissions, query }) =>
      scope((tx) =>
        coursesService(tx).mine({
          tenantId,
          membershipId: member.id,
          permissions,
        }),
      ),
    {
      beforeHandle: can("courses.read"),
      detail: doc("Courses", "List user's courses", {
        description: "list of user enrolled courses",
        permission: "courses.manage",
      }),
      query: t.Object({
        q: t.Optional(t.String({ maxLength: 100 })),
        status: t.Optional(
          t.Union([
            t.Literal("DRAFT"),
            t.Literal("PUBLISHED"),
            t.Literal("ARCHIVED"),
          ]),
        ),
        sortBy: t.Optional(
          t.Union([
            t.Literal("title"),
            t.Literal("status"),
            t.Literal("createdAt"),
            t.Literal("updatedAt"),
            t.Literal("publishedAt"),
          ]),
        ),
        order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
    },
  );
