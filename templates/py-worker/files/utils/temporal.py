from temporalio.client import Client, TLSConfig
from temporalio.worker import Worker

from config import CONFIG, TemporalTLS
from temporal.activities import greet
from temporal.workflows import Example


def temporal_tls(tls: TemporalTLS) -> TLSConfig | bool:
    """
    mTLS settings from PEM strings; none at all means plaintext (False).
    Escaped \\n are unescaped, so a certificate fits on one line of an env file.
    """
    if not (tls.ca or tls.cert or tls.key):
        return False
    if not (tls.cert and tls.key):
        raise ValueError("TEMPORAL_TLS_CERT and TEMPORAL_TLS_KEY must be set together")

    def pem(value: str) -> bytes:
        return value.replace("\\n", "\n").encode()

    return TLSConfig(
        server_root_ca_cert=pem(tls.ca) if tls.ca else None,
        client_cert=pem(tls.cert),
        client_private_key=pem(tls.key),
    )


async def create_temporal_worker() -> Worker:
    """
    Connect to Temporal and build a worker for TEMPORAL_TASK_QUEUE, running the
    workflows and activities in temporal/. Register new ones in the lists below.
    """
    settings = CONFIG.env.temporal
    interceptors = []
    # @feature:start telemetry
    # A span per workflow and activity, continuing the trace of whatever
    # started the workflow; a no-op while telemetry is off.
    from temporalio.contrib.opentelemetry import TracingInterceptor

    interceptors.append(TracingInterceptor())
    # @feature:end

    client = await Client.connect(
        settings.address,
        namespace=settings.namespace,
        tls=temporal_tls(settings.tls),
        interceptors=interceptors,
    )
    return Worker(
        client,
        task_queue=settings.task_queue,
        workflows=[Example],
        activities=[greet],
    )
