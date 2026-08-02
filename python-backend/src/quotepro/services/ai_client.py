"""Gemini client wrapper with cost tracking + retries + OTel spans.

Every call is logged to `public.ai_conversations` with tokens, cost, latency
so the `/analytics/ai` dashboard can chart spend.
"""

from __future__ import annotations

import json
import time
from typing import Any, Literal
from uuid import UUID

from opentelemetry import trace

from quotepro.core.config import Settings, get_settings
from quotepro.core.errors import UpstreamError
from quotepro.core.logging import get_logger
from quotepro.db.client import get_supabase

log = get_logger(__name__)
tracer = trace.get_tracer(__name__)

# Public Gemini pricing (USD per 1M tokens) — update quarterly.
# Source: https://ai.google.dev/pricing
_PRICING: dict[str, tuple[float, float]] = {
    "gemini-2.0-flash":                   (0.10, 0.40),
    "gemini-2.0-flash-thinking-exp-1219": (0.10, 0.40),
    "gemini-2.0-pro-exp-02-05":           (1.25, 5.00),
    "gemini-1.5-flash":                   (0.075, 0.30),
    "gemini-1.5-pro":                     (1.25, 5.00),
    "text-embedding-004":                 (0.02, 0.0),
}


def estimate_cost_usd(model: str, tokens_input: int, tokens_output: int) -> float:
    """Rough cost estimate. Zero if we don't have pricing for the model."""
    in_rate, out_rate = _PRICING.get(model, (0.0, 0.0))
    return round(
        (tokens_input / 1_000_000) * in_rate + (tokens_output / 1_000_000) * out_rate,
        6,
    )


class AiClient:
    """Thin wrapper around google-genai with cost + trace instrumentation."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        # Lazy-import so tests without google-genai still work
        from google import genai

        self._genai = genai
        self._client = genai.Client(api_key=self.settings.gemini_api_key.get_secret_value())

    async def generate_text(
        self,
        prompt: str,
        *,
        model: str | None = None,
        system_instruction: str | None = None,
        temperature: float | None = None,
        max_output_tokens: int | None = None,
    ) -> str:
        model_name = model or self.settings.gemini_model_default
        with tracer.start_as_current_span("ai.generate_text") as span:
            span.set_attribute("ai.model", model_name)
            span.set_attribute("ai.prompt.length", len(prompt))
            start = time.perf_counter()
            try:
                response = await self._client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "system_instruction": system_instruction,
                        "temperature": temperature if temperature is not None else self.settings.ai_temperature,
                        "max_output_tokens": max_output_tokens or self.settings.ai_max_tokens,
                    },
                )
            except Exception as e:
                raise UpstreamError(f"Gemini generation failed: {e}") from e
            latency_ms = int((time.perf_counter() - start) * 1000)
            span.set_attribute("ai.latency_ms", latency_ms)
            text = getattr(response, "text", "") or ""
            span.set_attribute("ai.response.length", len(text))
            return text

    async def generate_embedding(self, text: str, *, model: str | None = None) -> list[float]:
        model_name = model or self.settings.gemini_embedding_model
        with tracer.start_as_current_span("ai.embedding") as span:
            span.set_attribute("ai.model", model_name)
            span.set_attribute("ai.input.length", len(text))
            try:
                result = await self._client.aio.models.embed_content(
                    model=model_name,
                    contents=text,
                )
            except Exception as e:
                raise UpstreamError(f"Gemini embedding failed: {e}") from e
            embeddings = getattr(result, "embeddings", None)
            if not embeddings:
                raise UpstreamError("Gemini returned no embedding.")
            return list(embeddings[0].values)


def log_conversation(
    *,
    company_id: str | UUID,
    user_id: str | UUID | None,
    agent_name: str,
    model: str,
    purpose: str,
    tokens_input: int,
    tokens_output: int,
    latency_ms: int | None = None,
    entity_type: str | None = None,
    entity_id: str | UUID | None = None,
    messages: list[dict[str, Any]] | None = None,
    status: Literal["success", "error", "partial"] = "success",
    error_message: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Persist an AI call to `ai_conversations`. Non-blocking best effort.

    Uses the service role client — bypasses RLS.
    """
    settings = get_settings()
    if not settings.enable_cost_tracking:
        return

    supabase = get_supabase()
    row = {
        "company_id": str(company_id),
        "user_id": str(user_id) if user_id else None,
        "agent_name": agent_name,
        "model": model,
        "purpose": purpose,
        "messages": json.dumps(messages or []),
        "tokens_input": tokens_input,
        "tokens_output": tokens_output,
        "cost_usd": estimate_cost_usd(model, tokens_input, tokens_output),
        "latency_ms": latency_ms,
        "status": status,
        "error_message": error_message,
        "metadata": metadata or {},
    }
    if entity_type and entity_id:
        row["entity_type"] = entity_type
        row["entity_id"] = str(entity_id)

    try:
        supabase.table("ai_conversations").insert(row).execute()
    except Exception as e:  # pragma: no cover — best effort
        log.warning("ai_conversations_insert_failed", error=str(e))


# ---- Convenience singleton --------------------------------------------------

_client_singleton: AiClient | None = None


def get_ai_client() -> AiClient:
    global _client_singleton
    if _client_singleton is None:
        _client_singleton = AiClient()
    return _client_singleton
