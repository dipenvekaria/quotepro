"""Structured JSON logging with per-request context.

Uses structlog. Every log line carries `request_id`, `user_id`, `company_id`
when available (populated by the logging middleware).
"""

from __future__ import annotations

import logging
import sys
from contextvars import ContextVar
from typing import Any

import structlog
from structlog.contextvars import bind_contextvars, clear_contextvars

from quotepro.core.config import Settings

_configured: bool = False

# Context variables populated by middleware
_request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
_user_id_var: ContextVar[str | None] = ContextVar("user_id", default=None)
_company_id_var: ContextVar[str | None] = ContextVar("company_id", default=None)


def _add_context(_: object, __: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    rid = _request_id_var.get()
    uid = _user_id_var.get()
    cid = _company_id_var.get()
    if rid:
        event_dict.setdefault("request_id", rid)
    if uid:
        event_dict.setdefault("user_id", uid)
    if cid:
        event_dict.setdefault("company_id", cid)
    return event_dict


def configure_logging(settings: Settings) -> None:
    """Idempotently configure structlog + stdlib logging."""
    global _configured
    if _configured:
        return

    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _add_context,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if settings.log_json:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    # Route stdlib logging through structlog
    root = logging.getLogger()
    root.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    root.addHandler(handler)
    root.setLevel(level)

    for noisy in ("uvicorn.access", "httpx", "httpcore", "google.adk"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    _configured = True


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a structlog logger. Use module `__name__` as the name."""
    return structlog.get_logger(name)


def set_request_context(
    *,
    request_id: str | None = None,
    user_id: str | None = None,
    company_id: str | None = None,
) -> None:
    if request_id is not None:
        _request_id_var.set(request_id)
    if user_id is not None:
        _user_id_var.set(user_id)
    if company_id is not None:
        _company_id_var.set(company_id)
    bind_contextvars(
        request_id=request_id,
        user_id=user_id,
        company_id=company_id,
    )


def clear_request_context() -> None:
    _request_id_var.set(None)
    _user_id_var.set(None)
    _company_id_var.set(None)
    clear_contextvars()
