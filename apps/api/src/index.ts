// Load order matters: the otel import above starts the SDK before anything else creates
// instruments, and the OpenTelemetry plugin is registered first so every later plugin and
// route runs inside a traced request context.
import { otel, shutdownOtel } from "@/observability/otel"; // must stay the first import: starts the SDK

import { Elysia } from "elysia";
import { auth } from "@/lib/auth";
import { cors } from "@elysiajs/cors";
import { openapiPlugin, TAGS } from "@/lib/openapi";
import { auditRouter } from "@/modules/audit/audit.router";

import { meRouter } from "@/modules/me/me.router";
import { coursesRouter } from "@/modules/courses/courses.router";
import { tenantRouter } from "@/modules/tenant/tenant.router";
import { membersRouter } from "@/modules/members/members.router";

import { logger } from "@/observability/logger";
import { observability } from "@/plugins/observability";

const api = new Elysia({ prefix: "/api/v1" })
  .use(meRouter)
  .use(tenantRouter)
  .use(coursesRouter)
  .use(membersRouter)
  .use(auditRouter);

export const app = new Elysia()
  .use(otel())
  .use(observability())
  .use(
    cors({
      origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .use(openapiPlugin())
  .mount(auth.handler) // Better Auth: /api/auth/*
  .get("/health", () => ({ ok: true }), {
    detail: { tags: [TAGS[5].name], summary: "Liveness probe" },
  })
  .use(api)
  .listen(Number(process.env.PORT ?? 4000));

export type App = typeof app;
logger.info({ port: app.server?.port }, "API started");

// flush buffered spans/logs/metrics before exit
for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.on(sig, async () => {
    await app.stop();
    await shutdownOtel(); // flush buffered spans, metrics and logs
    process.exit(0);
  });

export type Api = typeof api;
