import { Elysia, status, t } from "elysia";

import { doc } from "@/lib/openapi";
import { can } from "@/lib/permissions";
import { session } from "@/plugins/session";
import { TenantRepository } from "./tenant.repository";

export const tenantRouter = new Elysia({ prefix: "/tenant" })
  .use(session)
  .get(
    "/",
    async ({ scope, tenantId }) =>
      (await scope((tx) => new TenantRepository(tx).profile(tenantId))) ??
      status(404, { error: "TENANT_NOT_FOUND" }),
    {
      beforeHandle: can("tenant.read"),
      detail: doc("Tenant", "Get my institute", {
        description: "Core profile, business detail and branding.",
        permission: "tenant.read",
      }),
    },
  )
  .get(
    "/contacts",
    ({ scope, tenantId }) =>
      scope((tx) => new TenantRepository(tx).contacts(tenantId)),
    {
      beforeHandle: can("tenant.read"),
      detail: doc("Tenant", "List contacts", { permission: "tenant.read" }),
    },
  )
  .get(
    "/addresses",
    ({ scope, tenantId }) =>
      scope((tx) => new TenantRepository(tx).addresses(tenantId)),
    {
      beforeHandle: can("tenant.read"),
      detail: doc("Tenant", "List addresses", { permission: "tenant.read" }),
    },
  )
  .get(
    "/domains",
    ({ scope, tenantId }) =>
      scope((tx) => new TenantRepository(tx).domains(tenantId)),
    {
      beforeHandle: can("domains.read"),
      detail: doc("Tenant", "List domains", {
        description: "Verification tokens are never returned.",
        permission: "domains.read",
      }),
    },
  )
  .get(
    "/settings",
    ({ scope, tenantId, query }) =>
      scope((tx) =>
        new TenantRepository(tx).settings(tenantId, query.namespace),
      ),
    {
      beforeHandle: can("settings.read"),
      detail: doc("Tenant", "List settings", {
        description:
          "Optionally filter by namespace (learning, coding, notifications).",
        permission: "settings.read",
      }),
      query: t.Object({ namespace: t.Optional(t.String()) }),
    },
  )
  .get(
    "/tax-profile",
    ({ scope, tenantId }) =>
      scope((tx) => new TenantRepository(tx).taxProfile(tenantId)),
    {
      beforeHandle: can("billing.read"),
      detail: doc("Compliance", "Get tax profile", {
        permission: "billing.read",
      }),
    },
  )
  .get(
    "/bank-accounts",
    ({ scope, tenantId }) =>
      scope((tx) => new TenantRepository(tx).bankAccounts(tenantId)),
    {
      beforeHandle: can("billing.read"),
      detail: doc("Compliance", "List bank accounts", {
        description:
          "Only the last 4 digits of the account number are returned.",
        permission: "billing.read",
      }),
    },
  );
