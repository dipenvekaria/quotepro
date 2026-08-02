"""Admin endpoints (owner-only): metrics + operational tools."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from quotepro.api.deps import AuthDep
from quotepro.core.rate_limit import limiter
from quotepro.db.client import get_supabase

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def _require_owner(auth: AuthDep) -> None:
    if auth.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")


@router.get("/ai-cost-summary")
@limiter.limit("60/minute")
async def ai_cost_summary(request: Request, auth: AuthDep) -> dict:
    _require_owner(auth)
    company_id = auth.require_company()
    result = (
        get_supabase()
        .table("ai_cost_view")
        .select("*")
        .eq("company_id", company_id)
        .order("day", desc=True)
        .limit(90)
        .execute()
    )
    return {"company_id": company_id, "rows": result.data or []}
