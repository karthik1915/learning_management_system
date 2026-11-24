import { opentelemetry } from "@elysiajs/opentelemetry";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

/**
 * One SDK for all three signals (traces, metrics, logs), exported over OTLP/HTTP (protobuf).
 * The exporters read the standard env vars, so no endpoint is hard-coded:
 *   OTEL_EXPORTER_OTLP_ENDPOINT   e.g. http://localhost:4318 (SigNoz collector) or https://ingest.<region>.signoz.cloud:443
 *   OTEL_EXPORTER_OTLP_HEADERS    e.g. signoz-ingestion-key=<key>   (SigNoz Cloud only)
 *   OTEL_SERVICE_NAME             defaults to "lms-api"
 *   OTEL_METRIC_EXPORT_INTERVAL   ms, defaults to 15000
 *   OTEL_SDK_DISABLED=true        no-op SDK (local dev without a collector)
 *
 * We start the SDK ourselves (module load) instead of letting the Elysia plugin do it, because
 * then we can flush + shut it down on SIGTERM, and the plugin detects the running SDK and skips its own.
 * IMPORT THIS MODULE FIRST in index.ts, and create metric instruments lazily (after this runs):
 * instruments created before sdk.start() are never exported.
 */
const serviceName = process.env.OTEL_SERVICE_NAME ?? "lms-api";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    "service.name": serviceName,
    "service.namespace": "aahrbitx",
    "service.version": process.env.APP_VERSION ?? "0.1.0",
    "deployment.environment.name": process.env.NODE_ENV ?? "development",
  }),
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: Number(
      process.env.OTEL_METRIC_EXPORT_INTERVAL ?? 15_000,
    ),
  }),
  logRecordProcessors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
});
sdk.start();

/** Elysia plugin: request/lifecycle spans (Handle, BeforeHandle, ...) on top of the running SDK. */
export const otel = () => opentelemetry({ serviceName });

/** Flushes buffered spans, metrics and logs. Call on shutdown. */
export const shutdownOtel = () => sdk.shutdown();
