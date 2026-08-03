"""QuotePro AI backend (compact).

Provides POST /api/ai/generate-quote. If GEMINI_API_KEY is set we ground a
gemini-2.0-flash call on the company's catalog; otherwise we fall back to a
keyword-matched mock so the UI can be exercised end-to-end without a key.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()

# ---------------------------------------------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
    "SUPABASE_SECRET_KEY"
)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment"
    )

sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

USE_REAL_AI = bool(GEMINI_API_KEY)
if USE_REAL_AI:
    import google.generativeai as genai

    genai.configure(api_key=GEMINI_API_KEY)

# ---------------------------------------------------------------------------

app = FastAPI(title="QuotePro AI backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------


class GenerateQuoteRequest(BaseModel):
    company_id: str
    description: str = Field(..., min_length=3, max_length=4000)
    customer_name: str | None = None
    customer_address: str | None = None
    existing_items: list[dict[str, Any]] = Field(default_factory=list)


class LineItemOut(BaseModel):
    name: str
    description: str | None = None
    quantity: float
    unit_price: float
    is_upsell: bool = False
    is_discount: bool = False


class GenerateQuoteResponse(BaseModel):
    line_items: list[LineItemOut]
    tax_rate: float
    reasoning: str
    mode: str  # "gemini" | "mock"
    sources: list[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------


def _fetch_catalog(company_id: str) -> list[dict[str, Any]]:
    resp = (
        sb.table("catalog_items")
        .select("id, name, description, category, base_price, unit")
        .eq("company_id", company_id)
        .eq("is_active", True)
        .limit(200)
        .execute()
    )
    return resp.data or []


def _fetch_tax_rate(company_id: str) -> float:
    resp = (
        sb.table("companies")
        .select("settings")
        .eq("id", company_id)
        .limit(1)
        .execute()
    )
    row = (resp.data or [{}])[0]
    settings = row.get("settings") or {}
    return float(settings.get("tax_rate", 8.5))


# ---------------------------------------------------------------------------
# Mock generator
# ---------------------------------------------------------------------------


_STOPWORDS = {
    "a",
    "an",
    "and",
    "the",
    "to",
    "of",
    "for",
    "with",
    "on",
    "in",
    "at",
    "is",
    "are",
    "we",
    "our",
    "please",
    "need",
    "want",
    "would",
    "like",
    "install",
    "replace",
    "new",
    "job",
    "customer",
    "sarah",
    "john",
}


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in _STOPWORDS and len(t) > 2}


def _score_item(item: dict[str, Any], q: set[str]) -> int:
    hay = " ".join(
        [
            item.get("name") or "",
            item.get("description") or "",
            item.get("category") or "",
        ]
    ).lower()
    hay_tokens = _tokens(hay)
    return len(q & hay_tokens)


def _mock_generate(
    catalog: list[dict[str, Any]], description: str
) -> tuple[list[LineItemOut], str, list[dict[str, Any]]]:
    q = _tokens(description)
    ranked = sorted(
        ((it, _score_item(it, q)) for it in catalog),
        key=lambda x: x[1],
        reverse=True,
    )
    picks = [it for it, score in ranked if score > 0][:4]

    # If no keyword matches, fall back to a labor + trip fee mix
    if not picks:
        picks = [
            it
            for it in catalog
            if any(k in (it.get("name") or "").lower() for k in ["labor", "trip", "diagnos"])
        ][:3]

    line_items: list[LineItemOut] = []
    sources: list[dict[str, Any]] = []
    for i, it in enumerate(picks):
        qty = 2.0 if "labor" in (it.get("name") or "").lower() else 1.0
        line_items.append(
            LineItemOut(
                name=it["name"],
                description=it.get("description"),
                quantity=qty,
                unit_price=float(it["base_price"]),
                is_upsell=i == len(picks) - 1 and len(picks) >= 3,
            )
        )
        sources.append({"id": it["id"], "name": it["name"], "score": 1.0})

    reasoning = (
        f"Mock mode: matched {len(line_items)} catalog items on keywords "
        f"{sorted(list(q))[:5]}. Set GEMINI_API_KEY in python-backend/.env "
        "to enable real generation."
    )
    return line_items, reasoning, sources


# ---------------------------------------------------------------------------
# Real generator (Gemini 2.0 Flash, grounded on catalog)
# ---------------------------------------------------------------------------


_SYSTEM_PROMPT = """You are a senior HVAC / trades estimator. Build a quote grounded ONLY on the catalog provided.

Rules:
- Use ONLY items from CATALOG. Do not invent items.
- Include labor (typically 1–3 hrs), the primary equipment, and one upsell if it fits.
- Return valid JSON only. No markdown, no prose.

Schema:
{
  "line_items": [
    {"name": "...", "description": "...", "quantity": 1.0, "unit_price": 0.0, "is_upsell": false, "is_discount": false}
  ],
  "reasoning": "One short paragraph explaining why these items."
}
"""


def _real_generate(
    catalog: list[dict[str, Any]], description: str, customer: str | None, address: str | None
) -> tuple[list[LineItemOut], str, list[dict[str, Any]]]:
    catalog_text = "\n".join(
        f"- {c['name']} | {c.get('category') or 'General'} | ${c['base_price']}/{c.get('unit') or 'each'} | {c.get('description') or ''}"
        for c in catalog[:80]
    )
    user_prompt = f"""JOB DESCRIPTION:
{description}

CUSTOMER: {customer or 'Unknown'}
ADDRESS: {address or 'Unknown'}

CATALOG:
{catalog_text}
"""
    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        system_instruction=_SYSTEM_PROMPT,
        generation_config={"response_mime_type": "application/json"},
    )
    resp = model.generate_content(user_prompt)
    raw = resp.text or "{}"

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Gemini returned invalid JSON: {e}") from e

    items_in = data.get("line_items", [])
    line_items = [
        LineItemOut(
            name=str(li.get("name", "")).strip() or "Item",
            description=li.get("description"),
            quantity=float(li.get("quantity") or 1),
            unit_price=float(li.get("unit_price") or 0),
            is_upsell=bool(li.get("is_upsell")),
            is_discount=bool(li.get("is_discount")),
        )
        for li in items_in
        if li.get("name")
    ]
    reasoning = data.get("reasoning") or "Generated by gemini-2.0-flash."
    sources = [{"id": c["id"], "name": c["name"]} for c in catalog[:5]]
    return line_items, reasoning, sources


# ---------------------------------------------------------------------------


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "ai_mode": "gemini" if USE_REAL_AI else "mock",
        "supabase_url": SUPABASE_URL,
    }


@app.post("/api/ai/generate-quote", response_model=GenerateQuoteResponse)
def generate_quote(req: GenerateQuoteRequest) -> GenerateQuoteResponse:
    catalog = _fetch_catalog(req.company_id)
    if not catalog:
        raise HTTPException(400, "No active catalog items for company")

    tax_rate = _fetch_tax_rate(req.company_id)

    if USE_REAL_AI:
        try:
            line_items, reasoning, sources = _real_generate(
                catalog, req.description, req.customer_name, req.customer_address
            )
            mode = "gemini"
        except Exception as e:  # noqa: BLE001 — fall back to mock rather than 500
            line_items, reasoning, sources = _mock_generate(catalog, req.description)
            reasoning = f"Gemini call failed ({e}). Fell back to mock. " + reasoning
            mode = "mock"
    else:
        line_items, reasoning, sources = _mock_generate(catalog, req.description)
        mode = "mock"

    return GenerateQuoteResponse(
        line_items=line_items,
        tax_rate=tax_rate,
        reasoning=reasoning,
        mode=mode,
        sources=sources,
    )
