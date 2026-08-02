"""Conftest scoped to Phase 2+ unit tests under `tests/unit/`.

Sets safe env defaults so quotepro.core.config.Settings() loads cleanly
without touching real Supabase / Gemini credentials.
"""

from __future__ import annotations

import os

import pytest

os.environ.setdefault("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("QP_ENV", "local")
os.environ.setdefault("QP_ENABLE_TELEMETRY", "false")
os.environ.setdefault("QP_ENABLE_COST_TRACKING", "false")
os.environ.setdefault("QP_ENABLE_RATE_LIMITING", "false")


@pytest.fixture(autouse=True)
def _clear_context():
    from quotepro.core.logging import clear_request_context

    clear_request_context()
    yield
    clear_request_context()
