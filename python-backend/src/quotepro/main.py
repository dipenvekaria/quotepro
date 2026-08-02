"""FastAPI app factory — QuotePro 2.0.

Entry points:
  * `quotepro-api` CLI script → uvicorn.
  * `uv run uvicorn quotepro.main:create_app --factory --reload`.
"""

from __future__ import annotations

import contextlib
import uuid
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from quotepro.api import admin as admin_routes
from quotepro.api import ai as ai_routes
from quotepro.api import catalog as catalog_routes
from quotepro.api import health as health_routes
from quotepro.api import indexing as indexing_routes
from quotepro.api import webhooks as webhook_routes
from quotepro.core.config import Settings, get_settings
from quotepro.core.errors import (
    QuoteProError,
    http_exception_handler,
    quotepro_exception_handler,
    uncaught_exception_handler,
    validation_exception_handler,
)
from quotepro.core.logging import (
    clear_request_context,
    configure_logging,
    get_logger,
    set_request_context,
)
from quotepro.core.observability import setup_observability
from quotepro.core.rate_limit import limiter, rate_limit_exceeded_handler
from quotepro.db.client import close_pg_pool


@contextlib.asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    log = get_logger(__name__)
    log.info("app_startup", version=app.version)
    try:
        yield
    finally:
        log.info("app_shutdown")
        await close_pg_pool()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)
    log = get_logger(__name__)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="QuotePro 2.0 — AI-powered quotes for field service.",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json",
        default_response_class=ORJSONResponse,
        lifespan=_lifespan,
    )

    setup_observability(app, settings)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    app.state.limiter = limiter

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        set_request_context(request_id=rid)
        request.state.request_id = rid
        try:
            response = await call_next(request)
        finally:
            clear_request_context()
        response.headers["X-Request-ID"] = rid
        return response

    # Error handlers
    app.add_exception_handler(QuoteProError, quotepro_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.add_exception_handler(Exception, uncaught_exception_handler)

    # Routers
    app.include_router(health_routes.router)
    app.include_router(ai_routes.router)
    app.include_router(catalog_routes.router)
    app.include_router(indexing_routes.router)
    app.include_router(webhook_routes.router)
    app.include_router(admin_routes.router)

    log.info(
        "app_ready",
        env=settings.env,
        cors_origins=settings.allowed_origins,
        rate_limiting=settings.enable_rate_limiting,
    )
    return app


def cli_main() -> None:
    """Entry point for `quotepro-api` script."""
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "quotepro.main:create_app",
        host=settings.host,
        port=settings.port,
        factory=True,
        reload=settings.is_local,
    )
