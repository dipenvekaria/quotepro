"""AI endpoints: generate-quote, update-quote, chat (SSE), tax."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from quotepro.api.deps import AuthDep
from quotepro.core.errors import ValidationError
from quotepro.core.logging import get_logger
from quotepro.core.rate_limit import limiter
from quotepro.db.client import get_supabase
from quotepro.db.schemas import (
    GenerateQuoteRequest,
    QuoteResponse,
    UpdateQuoteRequest,
)
from quotepro.services.orchestrator import get_orchestrator
from quotepro.tools.tax import get_tax_rate

log = get_logger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI"])


def _company_tax_rate(company_id: str, fallback: float = 8.5) -> float:
    """Look up company default tax rate from settings JSONB."""
    try:
        result = (
            get_supabase()
            .table("companies")
            .select("settings")
            .eq("id", company_id)
            .single()
            .execute()
        )
        settings = (result.data or {}).get("settings") or {}
        return float(settings.get("tax_rate", fallback))
    except Exception:
        return fallback


def _compute_totals(items: list[dict[str, Any]], tax_rate: float) -> dict[str, float]:
    subtotal = round(sum(float(i.get("total") or 0) for i in items), 2)
    tax_amount = round(subtotal * tax_rate / 100, 2)
    total = round(subtotal + tax_amount, 2)
    return {"subtotal": subtotal, "tax_rate": tax_rate, "tax_amount": tax_amount, "total": total}


# ---- /api/ai/generate-quote -------------------------------------------------


@router.post("/generate-quote", response_model=QuoteResponse)
@limiter.limit("10/minute")
async def generate_quote(request: Request, body: GenerateQuoteRequest, auth: AuthDep) -> QuoteResponse:
    if str(body.company_id) != auth.require_company():
        raise HTTPException(status_code=403, detail="company_id mismatch")

    tax_rate = (
        get_tax_rate(body.customer_address, default_rate=_company_tax_rate(str(body.company_id)))
        if body.customer_address
        else _company_tax_rate(str(body.company_id))
    )

    prompt = _build_generate_prompt(body)

    raw, _ = await get_orchestrator().run(
        agent_name="quote_builder",
        prompt=prompt,
        company_id=body.company_id,
        user_id=auth.user_id,
    )
    data = get_orchestrator().parse_json(raw)
    items = data.get("line_items", [])
    totals = _compute_totals(items, tax_rate)

    return QuoteResponse(
        line_items=items,
        subtotal=totals["subtotal"],
        tax_rate=totals["tax_rate"],
        tax_amount=totals["tax_amount"],
        total=totals["total"],
        notes=data.get("notes"),
        rag_metadata=data.get("rag_metadata"),
    )


# ---- /api/ai/update-quote ---------------------------------------------------


@router.post("/update-quote", response_model=QuoteResponse)
@limiter.limit("10/minute")
async def update_quote(request: Request, body: UpdateQuoteRequest, auth: AuthDep) -> QuoteResponse:
    if str(body.company_id) != auth.require_company():
        raise HTTPException(status_code=403, detail="company_id mismatch")

    tax_rate = _company_tax_rate(str(body.company_id))

    prompt = (
        "Update the quote according to this instruction.\n\n"
        f"Instruction: {body.user_prompt}\n\n"
        f"Current line items:\n{json.dumps([i.model_dump() for i in body.existing_items], indent=2)}\n\n"
        "Return the complete updated line_items array (existing + modifications), "
        "then call recalculate_discount to update percentage discounts."
    )

    raw, _ = await get_orchestrator().run(
        agent_name="quote_updater",
        prompt=prompt,
        company_id=body.company_id,
        user_id=auth.user_id,
        entity_type="work_item",
        entity_id=body.work_item_id,
    )
    data = get_orchestrator().parse_json(raw)
    items = data.get("line_items", [])
    totals = _compute_totals(items, tax_rate)

    return QuoteResponse(
        line_items=items,
        subtotal=totals["subtotal"],
        tax_rate=totals["tax_rate"],
        tax_amount=totals["tax_amount"],
        total=totals["total"],
    )


# ---- /api/ai/chat (SSE stream) ---------------------------------------------


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    session_id: str | None = None
    entity_type: str | None = None
    entity_id: UUID | None = None
    agent: str = "router"


@router.post("/chat")
@limiter.limit("30/minute")
async def chat(request: Request, body: ChatRequest, auth: AuthDep) -> EventSourceResponse:
    """SSE stream. Vercel AI SDK on the frontend consumes this."""
    company_id = auth.require_company()
    prompt = _flatten_messages(body.messages)

    async def event_stream():
        try:
            raw, sid = await get_orchestrator().run(
                agent_name=body.agent,
                prompt=prompt,
                company_id=company_id,
                user_id=auth.user_id,
                session_id=body.session_id,
                entity_type=body.entity_type,
                entity_id=body.entity_id,
            )
            yield {"event": "session", "data": json.dumps({"session_id": sid})}
            for chunk in _stream_chunks(raw):
                yield {"event": "token", "data": chunk}
            yield {"event": "done", "data": json.dumps({"ok": True})}
        except Exception as e:
            log.warning("chat_stream_error", error=str(e))
            yield {"event": "error", "data": json.dumps({"message": str(e)})}

    return EventSourceResponse(event_stream())


# ---- /api/ai/tax ------------------------------------------------------------


class TaxRateRequest(BaseModel):
    address: str
    company_id: UUID | None = None


class TaxRateResponse(BaseModel):
    tax_rate: float
    address: str


@router.post("/tax", response_model=TaxRateResponse)
async def calculate_tax(body: TaxRateRequest, auth: AuthDep) -> TaxRateResponse:
    if body.company_id and str(body.company_id) != auth.require_company():
        raise HTTPException(status_code=403, detail="company_id mismatch")
    default = _company_tax_rate(auth.require_company()) if auth.company_id else 8.5
    rate = get_tax_rate(body.address, default_rate=default)
    return TaxRateResponse(tax_rate=rate, address=body.address)


# ---- helpers ----------------------------------------------------------------


def _build_generate_prompt(body: GenerateQuoteRequest) -> str:
    parts = [f"Generate a quote for: {body.description}"]
    if body.customer_name:
        parts.append(f"Customer: {body.customer_name}")
    if body.customer_address:
        parts.append(f"Address: {body.customer_address}")
    if body.existing_items:
        parts.append(
            "\nExisting items to preserve:\n"
            + json.dumps([i.model_dump() for i in body.existing_items], indent=2)
        )
    parts.append(
        "\nProcess:\n"
        "1. Call retrieve_catalog_items(query=description) to fetch real catalog data.\n"
        "2. Optionally call retrieve_similar_quotes for pricing validation.\n"
        "3. Build line_items using ONLY retrieved data.\n"
        "4. Return QuoteOutput JSON."
    )
    return "\n\n".join(parts)


def _flatten_messages(messages: list[ChatMessage]) -> str:
    if len(messages) == 1:
        return messages[0].content
    return "\n\n".join(f"{m.role.upper()}: {m.content}" for m in messages)


def _stream_chunks(text: str, chunk_size: int = 40) -> list[str]:
    """Cheap chunker for now — real token streaming will come in Phase 4."""
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]
