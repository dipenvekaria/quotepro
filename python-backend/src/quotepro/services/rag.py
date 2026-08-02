"""Hybrid RAG service — thin wrapper around the `match_documents` RPC.

The heavy lifting (vector cosine + BM25 tsvector + Reciprocal Rank Fusion)
lives in Postgres. This service only orchestrates: embed the query, call
the RPC, hydrate metadata.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from opentelemetry import trace

from quotepro.core.config import get_settings
from quotepro.core.errors import UpstreamError
from quotepro.core.logging import get_logger
from quotepro.db.client import get_supabase
from quotepro.services.ai_client import get_ai_client

log = get_logger(__name__)
tracer = trace.get_tracer(__name__)


class RagService:
    """Hybrid retriever backed by `document_embeddings` + `match_documents` RPC."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.supabase = get_supabase()
        self.ai = get_ai_client()

    async def search(
        self,
        *,
        company_id: str | UUID,
        query: str,
        entity_type: str | None = None,
        limit: int | None = None,
        vector_threshold: float = 0.6,
    ) -> list[dict[str, Any]]:
        """Return top-N most relevant embeddings for the given query."""
        top_k = limit or self.settings.ai_rag_top_k
        with tracer.start_as_current_span("rag.search") as span:
            span.set_attribute("rag.entity_type", entity_type or "all")
            span.set_attribute("rag.query.length", len(query))
            span.set_attribute("rag.top_k", top_k)

            embedding = await self.ai.generate_embedding(query)
            try:
                result = self.supabase.rpc(
                    "match_documents",
                    {
                        "query_embedding": embedding,
                        "query_text": query,
                        "match_company_id": str(company_id),
                        "match_entity_type": entity_type,
                        "match_count": top_k,
                        "vector_threshold": vector_threshold,
                        "rrf_k": self.settings.ai_rag_rrf_k,
                    },
                ).execute()
            except Exception as e:
                raise UpstreamError(f"match_documents RPC failed: {e}") from e

            rows: list[dict[str, Any]] = getattr(result, "data", None) or []
            span.set_attribute("rag.results", len(rows))
            return rows

    async def similar_catalog_items(
        self,
        *,
        company_id: str | UUID,
        query: str,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieve catalog items and hydrate with base_price + unit."""
        matches = await self.search(
            company_id=company_id,
            query=query,
            entity_type="catalog_item",
            limit=limit,
        )
        if not matches:
            return []
        ids = [m["entity_id"] for m in matches if m.get("entity_id")]
        items = (
            self.supabase.table("catalog_items")
            .select("id, name, description, category, base_price, unit, tags")
            .in_("id", ids)
            .eq("company_id", str(company_id))
            .eq("is_active", True)
            .execute()
        )
        by_id = {row["id"]: row for row in (items.data or [])}
        # Preserve RRF ordering
        return [
            {**by_id[m["entity_id"]], "rrf_score": m.get("rrf_score", 0.0)}
            for m in matches
            if m.get("entity_id") in by_id
        ]

    async def similar_quotes(
        self,
        *,
        company_id: str | UUID,
        query: str,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieve past quotes/work_items and hydrate with line items."""
        matches = await self.search(
            company_id=company_id,
            query=query,
            entity_type="work_item",
            limit=limit,
        )
        if not matches:
            return []
        ids = [m["entity_id"] for m in matches if m.get("entity_id")]
        rows = (
            self.supabase.table("quote_details_view")
            .select("*")
            .in_("id", ids)
            .execute()
        )
        by_id = {row["id"]: row for row in (rows.data or [])}
        return [
            {**by_id[m["entity_id"]], "rrf_score": m.get("rrf_score", 0.0)}
            for m in matches
            if m.get("entity_id") in by_id
        ]


_singleton: RagService | None = None


def get_rag_service() -> RagService:
    global _singleton
    if _singleton is None:
        _singleton = RagService()
    return _singleton
