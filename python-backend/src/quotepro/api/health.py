"""Health and readiness endpoints."""

from __future__ import annotations

import time
from typing import Annotated

from fastapi import APIRouter, Depends

from quotepro.core.config import Settings, get_settings
from quotepro.db.client import get_supabase

router = APIRouter(prefix="/api", tags=["Health"])

_STARTED_AT = time.time()


@router.get("/health")
def health(settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    """Liveness — the process is running."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "env": settings.env,
        "uptime_seconds": int(time.time() - _STARTED_AT),
    }


@router.get("/ready")
def ready(settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    """Readiness — the process can serve traffic (DB reachable, config valid)."""
    checks: dict[str, str] = {}
    ok = True
    try:
        supabase = get_supabase()
        supabase.table("companies").select("id").limit(1).execute()
        checks["supabase"] = "ok"
    except Exception as e:  # noqa: BLE001
        checks["supabase"] = f"error: {e}"[:120]
        ok = False
    return {"status": "ok" if ok else "degraded", "checks": checks, "env": settings.env}
