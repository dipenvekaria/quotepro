"""Supabase JWT verification + request context injection.

The Supabase JWT signing secret is fetched from settings. On every request
the middleware verifies the token, extracts `sub` (user id) and looks up
`company_id` from public.users, then binds both to the logging context.
"""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, Header, Request

from quotepro.core.config import Settings, get_settings
from quotepro.core.errors import AuthError, ConfigError
from quotepro.core.logging import get_logger, set_request_context
from quotepro.db.client import get_supabase

log = get_logger(__name__)


class AuthContext:
    """Request-scoped authenticated caller identity."""

    __slots__ = ("user_id", "company_id", "role", "email")

    def __init__(
        self,
        user_id: str,
        company_id: str | None,
        role: str | None,
        email: str | None,
    ) -> None:
        self.user_id = user_id
        self.company_id = company_id
        self.role = role
        self.email = email

    def require_company(self) -> str:
        if not self.company_id:
            raise AuthError("Caller is not associated with a company.")
        return self.company_id


def _decode_supabase_jwt(token: str, settings: Settings) -> dict[str, object]:
    secret = settings.supabase_jwt_secret
    if not secret:
        raise ConfigError("SUPABASE_JWT_SECRET is not configured.")
    try:
        return jwt.decode(
            token,
            secret.get_secret_value(),
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as e:
        raise AuthError("Token expired.") from e
    except jwt.InvalidTokenError as e:
        raise AuthError(f"Invalid token: {e}") from e


async def _resolve_company(user_id: str) -> tuple[str | None, str | None]:
    """Look up (company_id, role) for the given auth user id."""
    supabase = get_supabase()
    result = (
        supabase.table("users")
        .select("company_id, role")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    rows = getattr(result, "data", None) or []
    if not rows:
        return None, None
    row = rows[0]
    return row.get("company_id"), row.get("role")


async def require_auth(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> AuthContext:
    """FastAPI dependency: verify JWT, load user's company, bind log context."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("Missing bearer token.")

    token = authorization.split(" ", 1)[1].strip()
    claims = _decode_supabase_jwt(token, settings)

    user_id = str(claims.get("sub", ""))
    email = claims.get("email") if isinstance(claims.get("email"), str) else None
    if not user_id:
        raise AuthError("Token missing subject.")

    company_id, role = await _resolve_company(user_id)

    ctx = AuthContext(user_id=user_id, company_id=company_id, role=role, email=email)
    request.state.auth = ctx

    set_request_context(user_id=user_id, company_id=company_id)
    return ctx


async def optional_auth(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> AuthContext | None:
    """Same as `require_auth` but returns None on missing/invalid token."""
    if not authorization:
        return None
    try:
        return await require_auth(request, authorization, settings)
    except (AuthError, ConfigError):
        return None
