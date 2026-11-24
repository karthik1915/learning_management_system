import { Elysia, status, t } from "elysia";
import { doc } from "@/lib/openapi";
import { can } from "@/lib/permissions";
import { session } from "@/plugins/session";
import { MembersRepository } from "./members.repository";

export const membersRouter = new Elysia()
  .use(session)
  .get(
    "/members",
    ({ scope, tenantId, query }) =>
      scope((tx) => new MembersRepository(tx).find(tenantId, query)),
    {
      beforeHandle: can("members.read"),
      detail: doc("People", "List members", {
        description:
          "Search by name or email; filter by role and status; page-based.",
        permission: "members.read",
      }),
      query: t.Object({
        q: t.Optional(t.String()),
        status: t.Optional(t.String()),
        role: t.Optional(t.String()),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
    },
  )
  .get(
    "/members/:id",
    async ({ scope, tenantId, params }) =>
      (await scope((tx) =>
        new MembersRepository(tx).get(tenantId, params.id),
      )) ?? status(404, { error: "MEMBER_NOT_FOUND" }),
    {
      beforeHandle: can("members.read"),
      detail: doc("People", "Get a member", { permission: "members.read" }),
      params: t.Object({ id: t.String({ format: "uuid" }) }),
    },
  )
  .get(
    "/roles",
    ({ scope, tenantId }) =>
      scope((tx) => new MembersRepository(tx).roles(tenantId)),
    {
      beforeHandle: can("roles.read"),
      detail: doc("People", "List roles", {
        description: "Roles with their permission codes.",
        permission: "roles.read",
      }),
    },
  )
  .get(
    "/invitations",
    ({ scope, tenantId }) =>
      scope((tx) => new MembersRepository(tx).invitations(tenantId)),
    {
      beforeHandle: can("invitations.read"),
      detail: doc("People", "List invitations", {
        permission: "invitations.read",
      }),
    },
  );
