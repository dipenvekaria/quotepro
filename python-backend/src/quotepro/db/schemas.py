"""Pydantic domain schemas — shared between agents, services, and API layer."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ---- Quote line items -------------------------------------------------------


class LineItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    description: str | None = None
    quantity: float = Field(..., ge=0)
    unit_price: float
    total: float
    option_tier: Literal["good", "better", "best"] | None = None
    is_upsell: bool = False
    is_discount: bool = False
    discount_target: Literal["total", "item"] | None = None
    sort_order: int = 0


class QuoteOutput(BaseModel):
    """Enforced output shape for QuoteBuilder + QuoteUpdater agents."""

    line_items: list[LineItem] = Field(default_factory=list)


class QuoteTotals(BaseModel):
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float


class QuoteResponse(BaseModel):
    line_items: list[LineItem]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    notes: str | None = None
    rag_metadata: dict | None = None


# ---- Router / chat ----------------------------------------------------------


class RouterDecision(BaseModel):
    agent: str
    reason: str | None = None


# ---- Invoice draft ----------------------------------------------------------


class InvoiceDraft(BaseModel):
    line_items: list[LineItem]
    subtotal: float
    notes: str | None = None


# ---- Upsell suggestions -----------------------------------------------------


class UpsellSuggestion(BaseModel):
    name: str
    reason: str
    unit_price: float


# ---- Quote optimizer --------------------------------------------------------


class PricingAdjustment(BaseModel):
    delta_percent: float
    reason: str


class QuoteOptimization(BaseModel):
    win_probability: float = Field(..., ge=0, le=1)
    reasoning: str
    suggested_adjustment: PricingAdjustment | None = None


# ---- Schedule ---------------------------------------------------------------


class ScheduleWindow(BaseModel):
    start: str
    end: str
    reason: str


# ---- Common request wrappers -----------------------------------------------


class GenerateQuoteRequest(BaseModel):
    company_id: UUID
    description: str
    customer_name: str | None = None
    customer_address: str | None = None
    existing_items: list[LineItem] = Field(default_factory=list)


class UpdateQuoteRequest(BaseModel):
    work_item_id: UUID
    company_id: UUID
    user_prompt: str
    existing_items: list[LineItem]


# Central registry — resolves agent output_schema strings from agents.yaml.
SCHEMA_REGISTRY: dict[str, type[BaseModel]] = {
    "QuoteOutput": QuoteOutput,
    "InvoiceDraft": InvoiceDraft,
    "RouterDecision": RouterDecision,
    "QuoteOptimization": QuoteOptimization,
}
