"""Catalog endpoints: search, import."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request

from quotepro.api.deps import AuthDep
from quotepro.core.rate_limit import limiter
from quotepro.services.rag import get_rag_service

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])


@router.get("/search")
@limiter.limit("60/minute")
async def search_catalog(
    request: Request,
    auth: AuthDep,
    q: Annotated[str, Query(min_length=1, max_length=500)],
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
) -> dict:
    company_id = auth.require_company()
    results = await get_rag_service().similar_catalog_items(
        company_id=company_id, query=q, limit=limit
    )
    return {"query": q, "results": results}
