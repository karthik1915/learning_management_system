import { status } from "elysia";

/** v1 is read-only. Write permissions (*.manage) arrive with the settings/admin version. */
export const PERMISSIONS = [
  "tenant.read",
  "members.read",
  "roles.read",
  "invitations.read",
  "settings.read",
  "domains.read",
  "billing.read",
  "audit.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Seeded system roles -> permission codes (stored in t_tenant_role.permissions). */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  INSTRUCTOR: ["tenant.read", "members.read"],
  STUDENT: ["tenant.read"],
};

/** Route guard: `{ beforeHandle: can("members.read") }`. Plain function, no macro. */
export const can =
  (permission: Permission) =>
  ({ permissions }: { permissions: string[] }) =>
    permissions.includes(permission) ? undefined : status(403, { error: "FORBIDDEN", permission });
