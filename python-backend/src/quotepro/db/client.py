"""Supabase clients (service role + anon) and asyncpg pool.

The service role client bypasses RLS for backend operations (indexer,
webhooks, cost tracking). The anon client is for endpoints that need to
respect RLS. asyncpg is used for LISTEN/NOTIFY and heavy queries.
"""

from __future__ import annotations

from functools import lru_cache

import asyncpg
from supabase import Client, create_client

from quotepro.core.config import Settings, get_settings

_pg_pool: asyncpg.Pool | None = None


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Service-role Supabase client — bypasses RLS. Server-side use only."""
    s: Settings = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key.get_secret_value())


@lru_cache(maxsize=1)
def get_supabase_anon() -> Client:
    """Anon Supabase client — respects RLS. Use for public endpoints."""
    s: Settings = get_settings()
    return create_client(s.supabase_url, s.supabase_anon_key.get_secret_value())


async def get_pg_pool() -> asyncpg.Pool:
    """Lazy-init asyncpg pool. Used by PostgresSessionService and LISTEN worker."""
    global _pg_pool
    if _pg_pool is None:
        s = get_settings()
        if not s.database_url:
            raise RuntimeError(
                "SUPABASE_DB_URL is required for asyncpg pool (LISTEN/NOTIFY, session store)."
            )
        _pg_pool = await asyncpg.create_pool(
            s.database_url,
            min_size=2,
            max_size=10,
            command_timeout=30.0,
        )
    return _pg_pool


async def close_pg_pool() -> None:
    global _pg_pool
    if _pg_pool is not None:
        await _pg_pool.close()
        _pg_pool = None
