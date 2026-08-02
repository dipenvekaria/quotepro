"""PostgresSessionService — durable Google ADK sessions in `adk_sessions_v2`.

Replaces the default `InMemorySessionService` which loses state on server
restart. Uses asyncpg for low-latency reads/writes.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from quotepro.core.logging import get_logger
from quotepro.db.client import get_pg_pool

if TYPE_CHECKING:
    from google.adk.sessions import Session
    from google.adk.sessions.base_session_service import BaseSessionService  # type: ignore
else:  # pragma: no cover
    try:
        from google.adk.sessions import Session
        from google.adk.sessions.base_session_service import BaseSessionService  # type: ignore
    except ImportError:  # pragma: no cover
        Session = object  # type: ignore[assignment,misc]
        BaseSessionService = object  # type: ignore[assignment,misc]

log = get_logger(__name__)


class PostgresSessionService(BaseSessionService):  # type: ignore[misc]
    """Persist ADK sessions in `public.adk_sessions_v2`.

    Storage schema:
      PRIMARY KEY (app_name, user_id, session_id)
      state  JSONB  — agent state dict
      events JSONB  — list of event dicts
    """

    async def create_session(
        self,
        app_name: str,
        user_id: str,
        session_id: str,
        state: dict[str, Any] | None = None,
    ) -> Session:  # type: ignore[override]
        pool = await get_pg_pool()
        state = state or {}
        events: list[Any] = []
        now = datetime.utcnow()

        await pool.execute(
            """
            INSERT INTO public.adk_sessions_v2 (app_name, user_id, session_id, state, events, created_at, updated_at)
            VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $6)
            ON CONFLICT (app_name, user_id, session_id) DO UPDATE
              SET state = EXCLUDED.state,
                  events = EXCLUDED.events,
                  updated_at = EXCLUDED.updated_at
            """,
            app_name,
            UUID(user_id) if _is_uuid(user_id) else _uuid_ns(user_id),
            session_id,
            json.dumps(state),
            json.dumps(events),
            now,
        )
        log.debug("session_created", app_name=app_name, session_id=session_id)
        return _build_session(app_name, user_id, session_id, state, events)

    async def get_session(
        self,
        app_name: str,
        user_id: str,
        session_id: str,
        _config: Any = None,
    ) -> Session | None:  # type: ignore[override]
        pool = await get_pg_pool()
        row = await pool.fetchrow(
            """
            SELECT state, events
              FROM public.adk_sessions_v2
             WHERE app_name = $1 AND user_id = $2 AND session_id = $3
             LIMIT 1
            """,
            app_name,
            UUID(user_id) if _is_uuid(user_id) else _uuid_ns(user_id),
            session_id,
        )
        if not row:
            return None
        state = json.loads(row["state"]) if row["state"] else {}
        events = json.loads(row["events"]) if row["events"] else []
        return _build_session(app_name, user_id, session_id, state, events)

    async def list_sessions(
        self,
        app_name: str,
        user_id: str,
    ) -> list[Session]:  # type: ignore[override]
        pool = await get_pg_pool()
        rows = await pool.fetch(
            """
            SELECT session_id, state, events
              FROM public.adk_sessions_v2
             WHERE app_name = $1 AND user_id = $2
             ORDER BY updated_at DESC
             LIMIT 100
            """,
            app_name,
            UUID(user_id) if _is_uuid(user_id) else _uuid_ns(user_id),
        )
        return [
            _build_session(
                app_name,
                user_id,
                r["session_id"],
                json.loads(r["state"]) if r["state"] else {},
                json.loads(r["events"]) if r["events"] else [],
            )
            for r in rows
        ]

    async def delete_session(
        self,
        app_name: str,
        user_id: str,
        session_id: str,
    ) -> None:  # type: ignore[override]
        pool = await get_pg_pool()
        await pool.execute(
            """
            DELETE FROM public.adk_sessions_v2
             WHERE app_name = $1 AND user_id = $2 AND session_id = $3
            """,
            app_name,
            UUID(user_id) if _is_uuid(user_id) else _uuid_ns(user_id),
            session_id,
        )

    async def append_event(
        self,
        session: Session,
        event: Any,
    ) -> None:  # type: ignore[override]
        pool = await get_pg_pool()
        # Read-modify-write with row lock — simple and correct at low QPS.
        async with pool.acquire() as conn, conn.transaction():
            row = await conn.fetchrow(
                """
                SELECT events FROM public.adk_sessions_v2
                 WHERE app_name = $1 AND user_id = $2 AND session_id = $3
                 FOR UPDATE
                """,
                session.app_name,
                UUID(session.user_id) if _is_uuid(session.user_id) else _uuid_ns(session.user_id),
                session.id,
            )
            events = json.loads(row["events"]) if row and row["events"] else []
            events.append(_serialize_event(event))
            await conn.execute(
                """
                UPDATE public.adk_sessions_v2
                   SET events = $1::jsonb, updated_at = NOW()
                 WHERE app_name = $2 AND user_id = $3 AND session_id = $4
                """,
                json.dumps(events),
                session.app_name,
                UUID(session.user_id) if _is_uuid(session.user_id) else _uuid_ns(session.user_id),
                session.id,
            )


# ---- helpers ----------------------------------------------------------------

def _is_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _uuid_ns(value: str) -> UUID:
    """Fallback for non-UUID user ids (e.g. anonymous demo)."""
    import uuid as _uuid
    return _uuid.uuid5(_uuid.NAMESPACE_URL, f"quotepro/user/{value}")


def _serialize_event(event: Any) -> dict[str, Any]:
    """Best-effort event → JSONable dict."""
    if hasattr(event, "model_dump"):
        return event.model_dump()
    if hasattr(event, "__dict__"):
        return {k: v for k, v in event.__dict__.items() if not k.startswith("_")}
    return {"repr": repr(event)}


def _build_session(
    app_name: str,
    user_id: str,
    session_id: str,
    state: dict[str, Any],
    events: list[Any],
) -> Session:
    # ADK's Session is a simple data class — construct directly if importable.
    try:
        from google.adk.sessions import Session as ADKSession
        return ADKSession(id=session_id, app_name=app_name, user_id=user_id, state=state, events=events)
    except Exception:  # pragma: no cover
        # Fallback: return a minimal shim
        class _Shim:
            def __init__(self) -> None:
                self.id = session_id
                self.app_name = app_name
                self.user_id = user_id
                self.state = state
                self.events = events
        return _Shim()  # type: ignore[return-value]
