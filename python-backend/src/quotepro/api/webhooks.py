"""Inbound webhook receivers.

Every payload is:
  1. Signature-verified (per source).
  2. Persisted to `webhooks_inbound` (idempotent via `event_id`).
  3. Dispatched to a per-source handler.

Handlers are intentionally minimal in Phase 2 — Phase 6 wires actual
business logic (Stripe payment success → mark invoice paid, Dropbox Sign
completion → mark quote signed, Twilio SMS → new lead).
"""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request

from quotepro.core.config import get_settings
from quotepro.core.logging import get_logger
from quotepro.db.client import get_supabase

log = get_logger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def _persist(
    *,
    source: str,
    event_id: str | None,
    event_type: str,
    payload: dict[str, Any],
    signature: str | None,
) -> str:
    row = {
        "source": source,
        "event_id": event_id,
        "event_type": event_type,
        "payload": payload,
        "signature": signature,
        "status": "pending",
    }
    try:
        result = (
            get_supabase()
            .table("webhooks_inbound")
            .upsert(row, on_conflict="source,event_id")
            .execute()
        )
        rows = getattr(result, "data", None) or []
        return rows[0]["id"] if rows else "unknown"
    except Exception as e:  # pragma: no cover
        log.error("webhook_persist_failed", source=source, error=str(e))
        raise HTTPException(status_code=500, detail="Webhook storage failure") from e


def _mark_processed(webhook_id: str, status: str = "processed", error: str | None = None) -> None:
    try:
        get_supabase().table("webhooks_inbound").update(
            {"status": status, "processed_at": "now()", "error_message": error}
        ).eq("id", webhook_id).execute()
    except Exception as e:  # pragma: no cover
        log.warning("webhook_mark_failed", error=str(e))


# ---- Stripe ----------------------------------------------------------------


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="stripe-signature"),
) -> dict:
    settings = get_settings()
    body = await request.body()
    if settings.stripe_webhook_secret:
        _verify_stripe_signature(body, stripe_signature, settings.stripe_webhook_secret.get_secret_value())
    payload = json.loads(body or b"{}")
    event_id = payload.get("id")
    event_type = payload.get("type", "unknown")

    wid = _persist(source="stripe", event_id=event_id, event_type=event_type, payload=payload, signature=stripe_signature)
    log.info("stripe_webhook_received", event_id=event_id, event_type=event_type)
    _mark_processed(wid)
    return {"received": True, "id": wid}


def _verify_stripe_signature(payload: bytes, header: str | None, secret: str) -> None:
    if not header:
        raise HTTPException(status_code=400, detail="Missing signature")
    try:
        parts = dict(kv.split("=", 1) for kv in header.split(","))
        signed_payload = f"{parts['t']}.{payload.decode('utf-8')}".encode()
        expected = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, parts.get("v1", "")):
            raise HTTPException(status_code=400, detail="Signature mismatch")
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=400, detail="Malformed signature") from e


# ---- Dropbox Sign ----------------------------------------------------------


@router.post("/dropbox-sign")
async def dropbox_sign_webhook(request: Request) -> dict:
    body = await request.body()
    payload = json.loads(body or b"{}")
    event_type = payload.get("event", {}).get("event_type", "unknown")
    event_id = payload.get("event", {}).get("event_hash")

    wid = _persist(source="dropbox_sign", event_id=event_id, event_type=event_type, payload=payload, signature=None)
    log.info("dropbox_sign_webhook_received", event_type=event_type)
    _mark_processed(wid)
    return {"received": True, "id": wid}


# ---- Twilio SMS ------------------------------------------------------------


@router.post("/twilio-sms")
async def twilio_sms_webhook(request: Request) -> dict:
    form = await request.form()
    payload = {k: v for k, v in form.items()}
    event_id = payload.get("MessageSid")
    wid = _persist(
        source="twilio",
        event_id=event_id,
        event_type="sms_inbound",
        payload=payload,
        signature=request.headers.get("x-twilio-signature"),
    )
    log.info("twilio_sms_received", from_=payload.get("From"))
    _mark_processed(wid)
    return {"received": True, "id": wid}


# ---- LemonSqueezy ----------------------------------------------------------


@router.post("/lemonsqueezy")
async def lemonsqueezy_webhook(
    request: Request,
    x_signature: str | None = Header(default=None, alias="x-signature"),
) -> dict:
    settings = get_settings()
    body = await request.body()
    if settings.lemonsqueezy_webhook_secret and x_signature:
        expected = hmac.new(
            settings.lemonsqueezy_webhook_secret.get_secret_value().encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, x_signature):
            raise HTTPException(status_code=400, detail="Signature mismatch")
    payload = json.loads(body or b"{}")
    event_type = payload.get("meta", {}).get("event_name", "unknown")
    event_id = str(payload.get("meta", {}).get("webhook_id", ""))

    wid = _persist(source="lemonsqueezy", event_id=event_id, event_type=event_type, payload=payload, signature=x_signature)
    log.info("lemonsqueezy_webhook_received", event_type=event_type)
    _mark_processed(wid)
    return {"received": True, "id": wid}
