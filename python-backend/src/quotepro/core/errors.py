"""Exception hierarchy + FastAPI exception handlers.

All app errors inherit from QuoteProError so we can render consistent JSON
error bodies with error codes.
"""

from __future__ import annotations

from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from quotepro.core.logging import get_logger

log = get_logger(__name__)


class QuoteProError(Exception):
    """Base for all app errors."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    code: str = "internal_error"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ConfigError(QuoteProError):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    code = "config_error"


class ValidationError(QuoteProError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "validation_error"


class AuthError(QuoteProError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "auth_error"


class ForbiddenError(QuoteProError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"


class NotFoundError(QuoteProError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"


class ConflictError(QuoteProError):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"


class RateLimitError(QuoteProError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "rate_limited"


class UpstreamError(QuoteProError):
    """Downstream service (Gemini, Supabase, Stripe, ...) failed."""

    status_code = status.HTTP_502_BAD_GATEWAY
    code = "upstream_error"


class AgentError(QuoteProError):
    """AI agent produced an invalid response, timed out, or refused."""

    status_code = status.HTTP_502_BAD_GATEWAY
    code = "agent_error"


# ---------- FastAPI handlers -------------------------------------------------

def _error_body(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details:
        body["error"]["details"] = details
    return body


async def quotepro_exception_handler(_: Request, exc: QuoteProError) -> JSONResponse:
    if exc.status_code >= 500:
        log.error("quotepro_error", code=exc.code, message=exc.message, details=exc.details)
    else:
        log.info("quotepro_error", code=exc.code, message=exc.message, details=exc.details)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.code, exc.message, exc.details),
    )


async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(
            code="http_error",
            message=str(exc.detail),
        ),
    )


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body(
            code="validation_error",
            message="Request validation failed.",
            details={"errors": exc.errors()},
        ),
    )


async def uncaught_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    log.exception("uncaught_exception", exc_type=type(exc).__name__)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body("internal_error", "An unexpected error occurred."),
    )
