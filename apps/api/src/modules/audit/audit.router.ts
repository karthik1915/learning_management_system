import { Elysia, t } from "elysia";
import { doc } from "@/lib/openapi";
import { can } from "@/lib/permissions";
import { session } from "@/plugins/session";
import { AuditRepository } from "./audit.repository";

export const auditRouter = new Elysia()
  .use(session)
  .get("/audit-logs", ({ scope, tenantId, query }) => scope((tx) => new AuditRepository(tx).find(tenantId, query)), {
    beforeHandle: can("audit.read"),
    detail: doc("Audit", "List audit logs", { description: "Newest first. Cursor pagination: pass `meta.nextBefore` as `before`.", permission: "audit.read" }),
    query: t.Object({
      before: t.Optional(t.String()),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 200 })),
      entityType: t.Optional(t.String()),
      action: t.Optional(t.String()),
      actorUserId: t.Optional(t.String()),
    }),
  });
