"""QuotePro AI backend (compact).

Provides POST /api/ai/generate-quote. If GEMINI_API_KEY is set we ground a
Gemini call on the company's catalog, cycling through GEMINI_MODELS until one
succeeds. Falls back to a keyword-matched mock so the UI can be exercised
end-to-end even when Gemini is unavailable or over quota.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from supabase import Client, create_client

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
    "SUPABASE_SECRET_KEY"
)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Vertex AI (GCP-native) toggle. When enabled we authenticate via Application
# Default Credentials (service account / Workload Identity) instead of an API
# key, using the unified google-genai SDK.
USE_VERTEX = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "").strip().lower() in {"1", "true", "yes"}
GCP_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip()
GCP_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1").strip()

# Try latest fast models first, then older/lite variants if quota differs.
GEMINI_MODELS = [
    m.strip()
    for m in os.getenv(
        "GEMINI_MODELS",
        "gemini-2.5-flash,gemini-flash-latest,gemini-2.5-flash-lite,gemini-flash-lite-latest,gemini-2.0-flash",
    ).split(",")
    if m.strip()
]

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment")

sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Unified google-genai client works against either backend:
#   • Vertex AI  → genai.Client(vertexai=True, project=..., location=...)  [ADC]
#   • AI Studio  → genai.Client(api_key=GEMINI_API_KEY)
USE_REAL_AI = bool(GEMINI_API_KEY) or (USE_VERTEX and bool(GCP_PROJECT))
genai_client = None
genai_types = None
AI_MODE = "mock"
if USE_REAL_AI:
    from google import genai
    from google.genai import types as genai_types

    if USE_VERTEX and GCP_PROJECT:
        genai_client = genai.Client(vertexai=True, project=GCP_PROJECT, location=GCP_LOCATION)
        AI_MODE = f"vertex:{GCP_LOCATION}"
    else:
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        AI_MODE = "gemini"

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Rivet AI backend", version="0.3.0")

# Shared secret set on both this service and the Next.js app. Quote generation
# goes through a server action, so no browser ever calls /api/* directly.
BACKEND_SECRET = os.getenv("RIVET_BACKEND_SECRET", "").strip()

# Empty by default: with the browser out of the picture there is no legitimate
# cross-origin caller. Set ALLOWED_ORIGINS only for local curl/Swagger work.
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST"],
    allow_headers=["Content-Type", "X-Rivet-Key"],
)


@app.middleware("http")
async def require_secret(request: Request, call_next):
    """Reject /api/* without the shared secret. /health stays open for Railway."""
    if request.url.path.startswith("/api/"):
        if not BACKEND_SECRET:
            return JSONResponse({"detail": "server misconfigured"}, status_code=503)
        if request.headers.get("x-rivet-key") != BACKEND_SECRET:
            return JSONResponse({"detail": "unauthorized"}, status_code=401)
    return await call_next(request)

# ---------------------------------------------------------------------------
# Schemas
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
    mode: str  # "gemini:<model>" or "mock"
    sources: list[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Supabase helpers
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
# Mock generator (keyword-ranked catalog match)
# ---------------------------------------------------------------------------

_STOPWORDS = {
    "a", "an", "and", "the", "to", "of", "for", "with", "on", "in", "at", "is",
    "are", "we", "our", "please", "need", "want", "would", "like", "install",
    "replace", "new", "job", "customer",
}


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in _STOPWORDS and len(t) > 2}


def _score_item(item: dict[str, Any], q: set[str]) -> int:
    hay = " ".join([
        item.get("name") or "",
        item.get("description") or "",
        item.get("category") or "",
    ]).lower()
    return len(q & _tokens(hay))


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
    if not picks:
        picks = [
            it for it in catalog
            if any(k in (it.get("name") or "").lower() for k in ["labor", "trip", "diagnos"])
        ][:3]

    line_items: list[LineItemOut] = []
    sources: list[dict[str, Any]] = []
    for i, it in enumerate(picks):
        qty = 2.0 if "labor" in (it.get("name") or "").lower() else 1.0
        line_items.append(LineItemOut(
            name=it["name"],
            description=it.get("description"),
            quantity=qty,
            unit_price=float(it["base_price"]),
            is_upsell=(i == len(picks) - 1 and len(picks) >= 3),
        ))
        sources.append({"id": it["id"], "name": it["name"], "score": 1.0})

    reasoning = (
        f"Mock mode: matched {len(line_items)} catalog items on keywords "
        f"{sorted(list(q))[:5]}."
    )
    return line_items, reasoning, sources


# ---------------------------------------------------------------------------
# Real generator (Gemini, grounded on catalog, model-fallback chain)
# ---------------------------------------------------------------------------

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def _load_prompt(name: str, fallback: str) -> str:
    """Read a prompt from prompts/. Behaviour changes belong there, not here.

    Falls back to the inline text if the file is missing so a packaging mistake
    degrades to the previous behaviour instead of taking quoting down.
    """
    try:
        body = (PROMPTS_DIR / name).read_text(encoding="utf-8")
    except OSError:
        return fallback
    # Everything after the first `---` divider is the prompt; the preamble above
    # it is documentation for whoever edits the file.
    _, _, prompt = body.partition("\n---\n")
    return (prompt or body).strip() or fallback


_SYSTEM_PROMPT = """You are a senior HVAC / trades estimator. Build a quote grounded ONLY on the catalog provided.

Rules:
- Use ONLY items from CATALOG. Do not invent items.
- Include labor (typically 1-3 hrs), the primary equipment, and one upsell if it fits.
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
    catalog: list[dict[str, Any]],
    description: str,
    customer: str | None,
    address: str | None,
) -> tuple[list[LineItemOut], str, list[dict[str, Any]], str]:
    catalog_text = "\n".join(
        f"- {c['name']} | {c.get('category') or 'General'} | ${c['base_price']}/{c.get('unit') or 'each'} | {c.get('description') or ''}"
        for c in catalog[:80]
    )
    user_prompt = (
        f"JOB DESCRIPTION:\n{description}\n\n"
        f"CUSTOMER: {customer or 'Unknown'}\n"
        f"ADDRESS: {address or 'Unknown'}\n\n"
        f"CATALOG:\n{catalog_text}\n"
    )

    last_err: Exception | None = None
    raw: str | None = None
    used_model = ""
    for model_name in GEMINI_MODELS:
        try:
            resp = genai_client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                ),
            )
            raw = resp.text or "{}"
            used_model = model_name
            break
        except Exception as e:  # noqa: BLE001 — try the next model
            last_err = e
            continue

    if raw is None:
        raise HTTPException(500, f"All Gemini models failed. Last error: {last_err}")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Gemini ({used_model}) returned invalid JSON: {e}") from e

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
    reasoning = data.get("reasoning") or f"Generated by {used_model}."
    sources = [{"id": c["id"], "name": c["name"]} for c in catalog[:5]]
    return line_items, reasoning, sources, used_model


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "ai_mode": AI_MODE,
        "models": GEMINI_MODELS if USE_REAL_AI else [],
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
            line_items, reasoning, sources, used_model = _real_generate(
                catalog, req.description, req.customer_name, req.customer_address
            )
            mode = f"gemini:{used_model}"
        except Exception as e:  # noqa: BLE001 — never 500 on Gemini flake, use mock
            line_items, reasoning, sources = _mock_generate(catalog, req.description)
            reasoning = f"Gemini failed ({str(e)[:200]}). Fell back to mock. " + reasoning
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


# ---------------------------------------------------------------------------
# Quote explanation — plain language for the homeowner
# ---------------------------------------------------------------------------

_EXPLAIN_FALLBACK = (
    "You are explaining a contractor's quote to the homeowner who received it. "
    "Write a short plain-language summary of the work based ONLY on the line "
    "items provided. Never invent work, parts, prices or timelines. Never "
    "restate prices. Two short paragraphs at most. Return JSON: "
    '{"summary": "..."}'
)


class ExplainQuoteRequest(BaseModel):
    company_id: str
    job_description: str | None = None
    company_name: str | None = None
    line_items: list[dict[str, Any]] = Field(default_factory=list)


class ExplainQuoteResponse(BaseModel):
    summary: str
    mode: str


@app.post("/api/ai/explain-quote", response_model=ExplainQuoteResponse)
def explain_quote(req: ExplainQuoteRequest) -> ExplainQuoteResponse:
    """Turns line items into something a homeowner understands.

    Prices are deliberately not sent to the model. They are rendered directly
    beneath this text, and a model that cannot see them cannot contradict them —
    which matters when the number is the thing being agreed to.
    """
    if not req.line_items:
        raise HTTPException(400, "No line items to explain")

    if not USE_REAL_AI:
        # No plausible keyword fallback here: inventing an explanation is worse
        # than showing none, so the caller decides what to do with an empty one.
        return ExplainQuoteResponse(summary="", mode="mock")

    items_text = "\n".join(
        f"- {it.get('name') or 'Item'}"
        + (f" — {it.get('description')}" if it.get("description") else "")
        + (f" (qty {it.get('quantity')})" if it.get("quantity") not in (None, 1) else "")
        for it in req.line_items[:40]
    )
    user_prompt = (
        f"CONTRACTOR: {req.company_name or 'The contractor'}\n"
        f"JOB DESCRIPTION: {req.job_description or '(none given)'}\n\n"
        f"LINE ITEMS:\n{items_text}\n"
    )

    system = _load_prompt("quote-explanation.md", _EXPLAIN_FALLBACK)

    for model_name in GEMINI_MODELS:
        try:
            resp = genai_client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system,
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            data = json.loads(resp.text or "{}")
            summary = str(data.get("summary") or "").strip()
            return ExplainQuoteResponse(summary=summary, mode=f"gemini:{model_name}")
        except Exception:  # noqa: BLE001 — try the next model in the chain
            continue

    # Every model failed. An empty summary hides the section; a fabricated one
    # would be shown to a customer as the contractor's own words.
    return ExplainQuoteResponse(summary="", mode="mock")
