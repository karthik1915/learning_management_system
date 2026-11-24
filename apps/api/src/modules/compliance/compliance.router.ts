import { Elysia } from "elysia";
import { doc } from "@/lib/openapi";
import { can } from "@/lib/permissions";
import { session } from "@/plugins/session";
import { ComplianceRepository } from "./compliance.repository";

export const complianceRouter = new Elysia({ prefix: "/tenant" })
  .use(session)
  .get("/tax-profile", ({ scope, tenantId }) => scope((tx) => new ComplianceRepository(tx).taxProfile(tenantId)), {
    beforeHandle: can("billing.read"),
    detail: doc("Compliance", "Get tax profile", { permission: "billing.read" }),
  })
  .get("/bank-accounts", ({ scope, tenantId }) => scope((tx) => new ComplianceRepository(tx).bankAccounts(tenantId)), {
    beforeHandle: can("billing.read"),
    detail: doc("Compliance", "List bank accounts", { description: "Only the last 4 digits of the account number are returned.", permission: "billing.read" }),
  });
