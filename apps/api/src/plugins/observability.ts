import { metrics, trace } from "@opentelemetry/api";
import { Elysia } from "elysia";
import { randomUUID } from "node:crypto";
import { logger } from "@/observability/logger";

type Resolved = { tenantId?: string; user?: { id: string } };

/**
 * Request id (echoed in `x-request-id`), one access-log line per request, a request-duration
 * histogram with low-cardinality attributes, and error logging.
 */
export const observability = () => {
  // created here (not at import time): instruments made before the SDK starts are never exported
  const duration = metrics
    .getMeter("lms-api")
    .createHistogram("http.server.request.duration", {
      unit: "s",
      description: "Duration of inbound HTTP requests",
      advice: {
        explicitBucketBoundaries: [
          0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
        ],
      },
    });

  return new Elysia({ name: "observability" })
    .derive({ as: "global" }, ({ request, set }) => {
      const requestId = request.headers.get("x-request-id") ?? randomUUID();
      set.headers["x-request-id"] = requestId;
      trace.getActiveSpan()?.setAttribute("http.request_id", requestId);
      return { requestId, startedAt: performance.now() };
    })
    .onAfterResponse({ as: "global" }, (ctx) => {
      const { request, route, set, requestId, startedAt } = ctx;
      const code = typeof set.status === "number" ? set.status : 200;
      const seconds = (performance.now() - startedAt) / 1000;
      duration.record(seconds, {
        "http.request.method": request.method,
        "http.route": route,
        "http.response.status_code": code,
      });
      const r = ctx as unknown as Resolved;
      logger[code >= 500 ? "error" : code >= 400 ? "warn" : "info"](
        {
          request_id: requestId,
          method: request.method,
          route,
          status: code,
          duration_ms: Math.round(seconds * 1000),
          tenant_id: r.tenantId,
          user_id: r.user?.id,
        },
        "request completed",
      );
    })
    .onError({ as: "global" }, ({ code, error, route, requestId }) => {
      const expected =
        code === "NOT_FOUND" || code === "VALIDATION" || code === "PARSE";
      logger[expected ? "warn" : "error"](
        { request_id: requestId, route, code, err: error },
        "request failed",
      );
      if (!expected && error instanceof Error)
        trace.getActiveSpan()?.recordException(error);
    });
};
