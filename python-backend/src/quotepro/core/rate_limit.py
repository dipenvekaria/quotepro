"""Per-user rate limiting via slowapi.

Falls back to per-IP if no auth is attached to the request.
"""

from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

from quotepro.core.config import get_settings


def _key_func(request: Request) -> str:
    """Prefer user id from auth context, fall back to IP."""
    auth = getattr(request.state, "auth", None)
    if auth and getattr(auth, "user_id", None):
        return f"user:{auth.user_id}"
    return f"ip:{get_remote_address(request)}"


settings = get_settings()

limiter = Limiter(
    key_func=_key_func,
    storage_uri=settings.redis_url if not settings.is_local else "memory://",
    default_limits=[f"{settings.rl_crud_per_min}/minute"],
    enabled=settings.enable_rate_limiting,
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler that emits our error envelope."""
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "rate_limited",
                "message": f"Rate limit exceeded: {exc.detail}",
                "details": {"retry_after_seconds": exc.retry_after},
            }
        },
        headers={"Retry-After": str(exc.retry_after)},
    )
