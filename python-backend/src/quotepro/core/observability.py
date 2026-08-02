"""OpenTelemetry setup + Sentry initialization.

No-op unless configured. Safe to call at startup regardless of env.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from quotepro.core.config import Settings
from quotepro.core.logging import get_logger

if TYPE_CHECKING:
    from fastapi import FastAPI

log = get_logger(__name__)


def setup_observability(app: "FastAPI", settings: Settings) -> None:
    """Wire up Sentry + OTel if configured. Idempotent."""
    _setup_sentry(settings)
    _setup_otel(app, settings)


def _setup_sentry(settings: Settings) -> None:
    dsn = settings.sentry_dsn
    if not dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.asgi import SentryAsgiMiddleware  # noqa: F401
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=dsn.get_secret_value(),
            environment=settings.env,
            release=settings.app_version,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                StarletteIntegration(transaction_style="endpoint"),
            ],
            send_default_pii=False,
        )
        log.info("sentry_enabled", env=settings.env)
    except Exception as e:  # pragma: no cover
        log.warning("sentry_init_failed", error=str(e))


def _setup_otel(app: "FastAPI", settings: Settings) -> None:
    if not settings.enable_telemetry or not settings.otel_endpoint:
        return
    resource = Resource.create(
        {
            "service.name": settings.otel_service_name,
            "service.version": settings.app_version,
            "deployment.environment": settings.env,
        }
    )
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.otel_endpoint)))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()
    AsyncPGInstrumentor().instrument()

    log.info("otel_enabled", endpoint=settings.otel_endpoint)
