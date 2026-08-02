"""ADK tools that expose RAG retrieval to agents.

Company scoping is read from a `contextvars.ContextVar` populated by the
auth middleware — no more per-tool `set_company_id()` calls.
"""

from __future__ import annotations

import asyncio
import json
from contextvars import ContextVar
from typing import Any

from quotepro.core.errors import ValidationError
from quotepro.core.logging import get_logger
from quotepro.services.rag import get_rag_service

log = get_logger(__name__)

_company_ctx: ContextVar[str | None] = ContextVar("company_id", default=None)


def set_company_context(company_id: str) -> None:
    _company_ctx.set(company_id)


def _require_company() -> str:
    cid = _company_ctx.get()
    if not cid:
        raise ValidationError("Agent tool called without company context. Set via set_company_context().")
    return cid


def _run_sync(coro: Any) -> Any:
    """Run an async coroutine from an ADK sync tool call."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    if loop.is_running():
        # Called from inside async context — schedule + wait.
        future = asyncio.ensure_future(coro)
        return loop.run_until_complete(future)
    return loop.run_until_complete(coro)


def retrieve_catalog_items(query: str, limit: int = 5) -> str:
    """Search the pricing catalog by meaning + keywords. Returns JSON array of items.

    **Only use retrieved items — never invent products or prices.**

    Args:
        query: Natural-language description of what's needed (e.g. "tankless water heater").
        limit: Max items to retrieve (default 5, max 10).

    Returns:
        JSON string: list of {id, name, description, category, base_price, unit, rrf_score}.
    """
    company_id = _require_company()
    top_k = max(1, min(limit, 10))
    rag = get_rag_service()
    try:
        results = _run_sync(
            rag.similar_catalog_items(company_id=company_id, query=query, limit=top_k)
        )
    except Exception as e:
        log.warning("retrieve_catalog_items_failed", error=str(e))
        return json.dumps({"error": str(e), "results": []})
    return json.dumps(results, default=str)


def retrieve_similar_quotes(query: str, limit: int = 3) -> str:
    """Retrieve up to N past quotes/jobs similar to the given description.

    Args:
        query: Job description to match against.
        limit: Max quotes to retrieve (default 3, max 5).

    Returns:
        JSON string: list of {id, job_name, customer_name, total, items[], rrf_score}.
    """
    company_id = _require_company()
    top_k = max(1, min(limit, 5))
    rag = get_rag_service()
    try:
        results = _run_sync(
            rag.similar_quotes(company_id=company_id, query=query, limit=top_k)
        )
    except Exception as e:
        log.warning("retrieve_similar_quotes_failed", error=str(e))
        return json.dumps({"error": str(e), "results": []})
    return json.dumps(results, default=str)
