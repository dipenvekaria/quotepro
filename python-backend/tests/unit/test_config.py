"""Unit tests for config loading."""

from __future__ import annotations

import os

import pytest

from quotepro.core.config import Settings


def test_settings_loads_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "http://x")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service")
    monkeypatch.setenv("GEMINI_API_KEY", "gem")
    monkeypatch.setenv("QP_LOG_LEVEL", "DEBUG")
    s = Settings()  # type: ignore[call-arg]
    assert s.supabase_url == "http://x"
    assert s.log_level == "DEBUG"


def test_allowed_origins_accepts_csv() -> None:
    os.environ["QP_ALLOWED_ORIGINS"] = "http://a.com,http://b.com"
    s = Settings()  # type: ignore[call-arg]
    assert s.allowed_origins == ["http://a.com", "http://b.com"]
