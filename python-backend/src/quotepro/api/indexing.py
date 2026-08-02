"""Indexing endpoints: backfill embeddings on-demand."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from quotepro.api.deps import AuthDep
from quotepro.core.rate_limit import limiter
from quotepro.services.indexer import get_indexer

router = APIRouter(prefix="/api/index", tags=["Indexing"])


class BackfillRequest(BaseModel):
    catalog: bool = True
    work_items: bool = True


@router.post("/backfill")
@limiter.limit("1/minute")
async def backfill(request: Request, body: BackfillRequest, auth: AuthDep) -> dict:
    if auth.role not in ("owner", "office"):
        raise HTTPException(status_code=403, detail="Owner or office only")
    company_id = auth.require_company()
    counts = await get_indexer().backfill_company(
        company_id, catalog=body.catalog, work_items=body.work_items
    )
    return {"company_id": company_id, "counts": counts}
