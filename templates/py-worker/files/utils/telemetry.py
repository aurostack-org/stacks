"""
OpenTelemetry: traces, logs and metrics over OTLP, built for OpenObserve.

Two ways to connect, in order of precedence:
- the standard OpenTelemetry variables (OTEL_EXPORTER_OTLP_ENDPOINT and
  friends), which the exporters read themselves, for any OTLP backend;
- OPENOBSERVE_URL + OPENOBSERVE_ORG + OPENOBSERVE_TOKEN, from which the
  OpenObserve endpoints and the org ingestion-token header are built.
With neither, setup_telemetry() does nothing and job_span() is a no-op.
"""
import base64
import logging
import os
from contextlib import contextmanager
from dataclasses import dataclass, field

from opentelemetry import trace

DEFAULT_SERVICE_NAME = "acme"

_providers: list = []


@dataclass
class TelemetryConfig:
    enabled: bool
    service_name: str
    environment: str
    # Signal URLs; empty means the exporters resolve them from OTEL_* vars.
    urls: dict = field(default_factory=dict)
    headers: dict = field(default_factory=dict)


def resolve_telemetry(env=os.environ) -> TelemetryConfig:
    service_name = env.get("OTEL_SERVICE_NAME") or DEFAULT_SERVICE_NAME
    environment = env.get("APP_ENV") or "development"
    off = TelemetryConfig(False, service_name, environment)

    if env.get("OTEL_SDK_DISABLED") == "true":
        return off
    if env.get("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return TelemetryConfig(True, service_name, environment)

    url, org, token = (
        env.get("OPENOBSERVE_URL"),
        env.get("OPENOBSERVE_ORG"),
        env.get("OPENOBSERVE_TOKEN"),
    )
    if not (url and org and token):
        return off

    # OTLP/HTTP endpoints live under /api/<org>; an org ingestion token
    # authenticates as `<org>:<token>`. Logs and traces land in the stream
    # named here, one per service.
    base = f"{url.rstrip('/')}/api/{org}"
    credentials = base64.b64encode(f"{org}:{token}".encode()).decode()
    return TelemetryConfig(
        True,
        service_name,
        environment,
        urls={
            "traces": f"{base}/v1/traces",
            "logs": f"{base}/v1/logs",
            "metrics": f"{base}/v1/metrics",
        },
        headers={
            "Authorization": f"Basic {credentials}",
            "stream-name": env.get("OPENOBSERVE_STREAM") or service_name,
        },
    )


def setup_telemetry() -> bool:
    """Start exporting, if connection settings are present. Call once, first."""
    config = resolve_telemetry()
    if not config.enabled:
        return False

    # Imported here so a worker without telemetry never loads the SDK.
    from opentelemetry._logs import set_logger_provider
    from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.redis import RedisInstrumentor
    from opentelemetry.metrics import set_meter_provider
    from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    def exporter_args(signal: str) -> dict:
        if not config.urls:
            return {}
        return {"endpoint": config.urls[signal], "headers": config.headers}

    resource = Resource.create(
        {
            "service.name": config.service_name,
            "deployment.environment.name": config.environment,
        }
    )

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(**exporter_args("traces")))
    )
    trace.set_tracer_provider(tracer_provider)

    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(**exporter_args("logs")))
    )
    set_logger_provider(logger_provider)
    # Every utils.logger.Logger propagates to the root logger.
    logging.getLogger().addHandler(LoggingHandler(logger_provider=logger_provider))

    meter_provider = MeterProvider(
        resource=resource,
        metric_readers=[
            PeriodicExportingMetricReader(
                OTLPMetricExporter(**exporter_args("metrics"))
            )
        ],
    )
    set_meter_provider(meter_provider)

    RedisInstrumentor().instrument()
    _providers.extend([tracer_provider, logger_provider, meter_provider])
    return True


def shutdown_telemetry() -> None:
    """Flush whatever is buffered. Safe to call when telemetry is off."""
    for provider in _providers:
        provider.shutdown()


@contextmanager
def job_span(queue_name: str, job):
    """One span per job, so each job is its own trace in OpenObserve."""
    tracer = trace.get_tracer("worker")
    with tracer.start_as_current_span(
        f"process {queue_name}",
        attributes={"messaging.system": "bullmq", "messaging.destination.name": queue_name, "bullmq.job.id": str(job.id)},
    ) as span:
        try:
            yield span
        except Exception as error:
            span.record_exception(error)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(error)))
            raise
