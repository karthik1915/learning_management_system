import { openapi } from "@elysiajs/openapi";

/** Tag names used by routers via `doc()`. Order here = order in the docs sidebar. */
export const TAGS = [
  {
    name: "Context",
    description:
      "Signed-in user, tenant and permissions: the dashboard bootstrap.",
  },
  {
    name: "Tenant",
    description:
      "The institute's profile, contacts, addresses, domains and settings.",
  },
  {
    name: "Courses",
    description: "courses",
  },
  {
    name: "Compliance",
    description:
      "Tax and payout details. Admin only; bank numbers are never returned in full.",
  },
  {
    name: "People",
    description: "Members, roles and invitations of the institute.",
  },
  {
    name: "Audit",
    description:
      "Append-only trail of changes inside the institute. Admin only.",
  },
  { name: "System", description: "Operational endpoints." },
] as const;

type Tag = (typeof TAGS)[number]["name"];

/**
 * Per-route OpenAPI details. Every route using `doc()` is documented as requiring a session and
 * lists the common error responses; pass `permission` to show which role permission is needed.
 */
export const doc = (
  tag: Tag,
  summary: string,
  opts: { description?: string; permission?: string } = {},
) => ({
  tags: [tag],
  summary,
  description: [
    opts.description,
    opts.permission && `**Requires permission:** \`${opts.permission}\``,
  ]
    .filter(Boolean)
    .join("\n\n"),
  security: [{ sessionCookie: [] }],
  responses: {
    401: { description: "Not signed in" },
    403: {
      description:
        "Signed in, but not an active tenant member or missing the required permission",
    },
  },
});

export const openapiPlugin = () =>
  openapi({
    path: "/docs",
    specPath: "/docs/json",
    provider: "scalar",
    documentation: {
      info: {
        title: "Aahrbitx LMS API",
        version: process.env.APP_VERSION ?? "0.1.0",
        description:
          "Multi-tenant learning management API for coaching institutes. Each signed-in user acts inside their own " +
          "institute (tenant); data is isolated per tenant and results depend on the caller's role " +
          "(admin, instructor, student). v0.1 is read-only.",
        contact: { name: "Aahrbitx", url: "https://aahrbitx.in" },
      },
      servers: [
        {
          url: process.env.PUBLIC_API_URL ?? "http://localhost:4000",
          description: "Current environment",
        },
      ],
      tags: [...TAGS],
      components: {
        securitySchemes: {
          sessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "better-auth.session_token",
            description:
              "Better Auth session cookie. Sign in via POST /api/auth/sign-in/email first.",
          },
        },
      },
    },
    exclude: { paths: ["/docs", "/docs/json"] },
  });
