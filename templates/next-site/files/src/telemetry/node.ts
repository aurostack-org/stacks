import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

import type { TelemetryConfig } from './config';

/**
 * Starts the OpenTelemetry SDK: traces (Next's own request and render spans,
 * outgoing HTTP, Postgres), logs and metrics over OTLP. Only ever imported by
 * src/instrumentation.ts once telemetry is known to be on.
 */
export function startTelemetry(telemetry: TelemetryConfig): void {
	const { urls, headers } = telemetry;
	// Explicit URLs always come with their headers; without them the SDK reads
	// OTEL_EXPORTER_OTLP_* itself.
	const exporter = (url?: string) => (url && headers ? { url, headers } : {});

	const sdk = new NodeSDK({
		resource: resourceFromAttributes({
			[ATTR_SERVICE_NAME]: telemetry.serviceName,
			'deployment.environment.name': telemetry.environment
		}),
		traceExporter: new OTLPTraceExporter(exporter(urls?.traces)),
		logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter(exporter(urls?.logs)) })],
		metricReaders: [
			new PeriodicExportingMetricReader({
				exporter: new OTLPMetricExporter(exporter(urls?.metrics)),
				exportIntervalMillis: Number(process.env.OTEL_METRIC_EXPORT_INTERVAL) || 60_000
			})
		],
		instrumentations: [
			getNodeAutoInstrumentations({
				// Every file read and DNS lookup as a span is noise, not signal.
				'@opentelemetry/instrumentation-fs': { enabled: false },
				'@opentelemetry/instrumentation-dns': { enabled: false },
				'@opentelemetry/instrumentation-net': { enabled: false }
			})
		]
	});
	sdk.start();

	// Flush what is buffered on the way out, then let the signal do what it
	// would have done without a handler.
	for (const signal of ['SIGTERM', 'SIGINT'] as const) {
		process.once(signal, () => {
			sdk.shutdown().finally(() => process.kill(process.pid, signal));
		});
	}
}
