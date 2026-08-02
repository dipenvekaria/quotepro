"""Indexer worker.

Two responsibilities:
1. Consume `index_entity` jobs from Redis (arq) and refresh embeddings.
2. Bridge Postgres NOTIFY (`work_item_indexed`, `catalog_item_indexed`) into
   the arq queue.

Run: `uv run arq quotepro.workers.indexer_worker.WorkerSettings`
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import asyncpg
from arq.connections import RedisSettings

from quotepro.core.config import get_settings
from quotepro.core.logging import configure_logging, get_logger
from quotepro.db.client import get_pg_pool
from quotepro.services.indexer import get_indexer

log = get_logger(__name__)

# ---- Job function -----------------------------------------------------------


async def index_entity(
    ctx: dict[str, Any],
    *,
    entity_type: str,
    entity_id: str,
    company_id: str,
) -> dict[str, Any]:
    """arq job — refresh embeddings for one entity."""
    indexer = get_indexer()
    ok = await indexer.index_entity(
        entity_type=entity_type,  # type: ignore[arg-type]
        entity_id=entity_id,
        company_id=company_id,
    )
    return {"ok": ok, "entity_type": entity_type, "entity_id": entity_id}


# ---- Postgres LISTEN bridge -------------------------------------------------

_CHANNELS = ("work_item_indexed", "catalog_item_indexed")


async def _listen_and_enqueue(ctx: dict[str, Any]) -> None:
    """Background task: LISTEN on Postgres channels → enqueue arq jobs."""
    settings = get_settings()
    if not settings.database_url:
        log.warning("indexer_listen_disabled_no_db_url")
        return

    redis = ctx["redis"]

    while True:
        try:
            conn = await asyncpg.connect(settings.database_url)
            for channel in _CHANNELS:
                await conn.add_listener(channel, _make_handler(channel, redis))
            log.info("indexer_listener_started", channels=list(_CHANNELS))
            while True:
                await asyncio.sleep(3600)  # keep the task alive
        except (asyncpg.PostgresError, ConnectionError, OSError) as e:
            log.warning("indexer_listener_error_retry", error=str(e))
            await asyncio.sleep(5)


def _make_handler(channel: str, redis: Any):
    async def _handler(_conn: Any, _pid: int, _channel: str, payload: str) -> None:
        try:
            data = json.loads(payload)
            entity_id = data.get("id")
            company_id = data.get("company_id")
            if not entity_id or not company_id:
                log.warning("indexer_notify_missing_fields", channel=channel, payload=payload)
                return
            entity_type = "work_item" if channel == "work_item_indexed" else "catalog_item"
            await redis.enqueue_job(
                "index_entity",
                entity_type=entity_type,
                entity_id=entity_id,
                company_id=company_id,
            )
            log.debug("indexer_enqueued", channel=channel, entity_id=entity_id)
        except Exception as e:  # noqa: BLE001
            log.error("indexer_handler_error", channel=channel, error=str(e))

    return _handler


# ---- arq lifecycle hooks ---------------------------------------------------


async def on_startup(ctx: dict[str, Any]) -> None:
    settings = get_settings()
    configure_logging(settings)
    log.info("indexer_worker_startup", env=settings.env)
    # Warm the asyncpg pool so the first job doesn't pay setup cost.
    await get_pg_pool()
    # Kick the LISTEN loop off in the background.
    ctx["listen_task"] = asyncio.create_task(_listen_and_enqueue(ctx))


async def on_shutdown(ctx: dict[str, Any]) -> None:
    task = ctx.get("listen_task")
    if task and not task.done():
        task.cancel()
    log.info("indexer_worker_shutdown")


class WorkerSettings:
    """arq worker configuration."""

    functions = [index_entity]
    on_startup = on_startup
    on_shutdown = on_shutdown

    @classmethod
    def redis_settings(cls) -> RedisSettings:
        return RedisSettings.from_dsn(get_settings().redis_url)


def cli_main() -> None:
    """Entry point for `uv run quotepro-worker`."""
    from arq.cli import cli

    cli(["quotepro.workers.indexer_worker.WorkerSettings"])
