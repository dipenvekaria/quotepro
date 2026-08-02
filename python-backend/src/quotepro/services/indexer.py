"""Unified indexer service.

Consolidates the pre-rebuild `quote_indexer.py`, `catalog_indexer.py`,
and `auto_indexer.py` polling scripts. One `Indexer.index_entity()` entry
point handles catalog_items and work_items; used by both the arq worker
(fired by Postgres NOTIFY) and the admin backfill endpoint.
"""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from opentelemetry import trace

from quotepro.core.errors import NotFoundError
from quotepro.core.logging import get_logger
from quotepro.db.client import get_supabase
from quotepro.services.ai_client import get_ai_client

log = get_logger(__name__)
tracer = trace.get_tracer(__name__)

EntityType = Literal["catalog_item", "work_item"]


class Indexer:
    """Generate + upsert embeddings for entities. Used by worker & backfill."""

    def __init__(self) -> None:
        self.supabase = get_supabase()
        self.ai = get_ai_client()

    async def index_entity(
        self,
        *,
        entity_type: EntityType,
        entity_id: str | UUID,
        company_id: str | UUID,
    ) -> bool:
        """Fetch entity, build content, upsert embedding. Returns True on success."""
        with tracer.start_as_current_span("indexer.index_entity") as span:
            span.set_attribute("entity.type", entity_type)
            span.set_attribute("entity.id", str(entity_id))

            if entity_type == "catalog_item":
                content, metadata = self._build_catalog_content(str(entity_id), str(company_id))
            elif entity_type == "work_item":
                content, metadata = self._build_work_item_content(str(entity_id), str(company_id))
            else:
                raise ValueError(f"Unknown entity_type: {entity_type}")

            if not content:
                log.info("indexer_skipped_empty_content", entity_id=str(entity_id))
                return False

            embedding = await self.ai.generate_embedding(content)

            row = {
                "company_id": str(company_id),
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "content": content,
                "embedding": embedding,
                "metadata": metadata,
            }
            self.supabase.table("document_embeddings").upsert(
                row, on_conflict="company_id,entity_type,entity_id"
            ).execute()
            log.info("indexer_upserted", entity_type=entity_type, entity_id=str(entity_id))
            return True

    async def delete_entity(
        self,
        *,
        entity_type: EntityType,
        entity_id: str | UUID,
        company_id: str | UUID,
    ) -> None:
        self.supabase.table("document_embeddings").delete().eq(
            "entity_type", entity_type
        ).eq("entity_id", str(entity_id)).eq("company_id", str(company_id)).execute()

    async def backfill_company(
        self,
        company_id: str | UUID,
        *,
        catalog: bool = True,
        work_items: bool = True,
    ) -> dict[str, int]:
        """Reindex all catalog items + accepted/completed work items for a company."""
        counts = {"catalog_items": 0, "work_items": 0, "errors": 0}
        cid = str(company_id)

        if catalog:
            items = (
                self.supabase.table("catalog_items")
                .select("id")
                .eq("company_id", cid)
                .eq("is_active", True)
                .execute()
            )
            for row in items.data or []:
                try:
                    ok = await self.index_entity(
                        entity_type="catalog_item", entity_id=row["id"], company_id=cid
                    )
                    if ok:
                        counts["catalog_items"] += 1
                except Exception as e:
                    counts["errors"] += 1
                    log.warning("indexer_error", entity_type="catalog_item", id=row["id"], error=str(e))

        if work_items:
            wis = (
                self.supabase.table("work_items")
                .select("id")
                .eq("company_id", cid)
                .in_(
                    "status",
                    ["quote_accepted", "job_scheduled", "job_in_progress", "job_completed"],
                )
                .execute()
            )
            for row in wis.data or []:
                try:
                    ok = await self.index_entity(
                        entity_type="work_item", entity_id=row["id"], company_id=cid
                    )
                    if ok:
                        counts["work_items"] += 1
                except Exception as e:
                    counts["errors"] += 1
                    log.warning("indexer_error", entity_type="work_item", id=row["id"], error=str(e))

        return counts

    # ------------------------------------------------------------------------

    def _build_catalog_content(self, entity_id: str, company_id: str) -> tuple[str, dict[str, Any]]:
        result = (
            self.supabase.table("catalog_items")
            .select("*")
            .eq("id", entity_id)
            .eq("company_id", company_id)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            raise NotFoundError(f"catalog_item {entity_id} not found")
        item = rows[0]

        parts: list[str] = []
        if item.get("category"):
            parts.append(f"{item['category']}:")
        parts.append(item["name"])
        if item.get("description"):
            parts.append(f"— {item['description']}")
        if item.get("tags"):
            parts.append(f"tags: {', '.join(item['tags'])}")

        metadata = {
            "id": item["id"],
            "name": item["name"],
            "category": item.get("category"),
            "base_price": float(item.get("base_price") or 0),
            "unit": item.get("unit"),
        }
        return " ".join(parts), metadata

    def _build_work_item_content(self, entity_id: str, company_id: str) -> tuple[str, dict[str, Any]]:
        result = (
            self.supabase.table("quote_details_view")
            .select("*")
            .eq("id", entity_id)
            .eq("company_id", company_id)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            raise NotFoundError(f"work_item {entity_id} not found")
        wi = rows[0]

        parts: list[str] = []
        if wi.get("job_name"):
            parts.append(wi["job_name"])
        if wi.get("description"):
            parts.append(wi["description"])
        if wi.get("customer_name"):
            parts.append(f"Customer: {wi['customer_name']}")
        items = wi.get("items") or []
        if items:
            names = [i.get("name", "") for i in items[:5] if i.get("name")]
            if names:
                parts.append(f"Items: {', '.join(names)}")

        metadata = {
            "id": wi["id"],
            "job_name": wi.get("job_name"),
            "customer_name": wi.get("customer_name"),
            "total": float(wi.get("total") or 0),
            "status": wi.get("status"),
        }
        return " ".join(parts), metadata


_singleton: Indexer | None = None


def get_indexer() -> Indexer:
    global _singleton
    if _singleton is None:
        _singleton = Indexer()
    return _singleton
