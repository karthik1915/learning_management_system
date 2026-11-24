import { trace } from "@opentelemetry/api";
import {
  logs,
  SeverityNumber,
  type AnyValueMap,
} from "@opentelemetry/api-logs";
import pino, { type DestinationStream } from "pino";

const SEVERITY: Record<number, SeverityNumber> = {
  10: SeverityNumber.TRACE,
  20: SeverityNumber.DEBUG,
  30: SeverityNumber.INFO,
  40: SeverityNumber.WARN,
  50: SeverityNumber.ERROR,
  60: SeverityNumber.FATAL,
};

/** OTel attributes must be primitives/arrays, so nested objects (e.g. err) are stringified. */
const flatten = (o: Record<string, unknown>): AnyValueMap =>
  Object.fromEntries(
    Object.entries(o).map(([k, v]) => [
      k,
      v !== null && typeof v === "object" ? JSON.stringify(v) : v,
    ]),
  ) as AnyValueMap;

/**
 * Pino -> OpenTelemetry Logs bridge. Every log line is also emitted as an OTel LogRecord.
 * The record is emitted inside the active request context, so trace_id/span_id are attached
 * automatically and logs correlate with traces in SigNoz.
 */
const otelStream: DestinationStream = {
  write(line: string) {
    try {
      const { level, time: _time, msg, ...attrs } = JSON.parse(line);
      logs.getLogger("lms-api").emit({
        severityNumber: SEVERITY[level] ?? SeverityNumber.INFO,
        severityText: pino.levels.labels[level] ?? "",
        body: msg,
        attributes: flatten(attrs),
      });
    } catch {
      /* logging must never throw */
    }
  },
};

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    base: { service: process.env.OTEL_SERVICE_NAME ?? "lms-api" },
    // also put trace ids on the stdout JSON so plain `docker logs` lines can be matched to traces
    mixin: () => {
      const sc = trace.getActiveSpan()?.spanContext();
      return sc ? { trace_id: sc.traceId, span_id: sc.spanId } : {};
    },
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.accountNumber",
    ],
    serializers: { err: pino.stdSerializers.err },
  },
  pino.multistream([{ stream: process.stdout }, { stream: otelStream }]),
);
