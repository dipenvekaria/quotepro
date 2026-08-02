"""Smoke tests — verify the app boots and public endpoints respond."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_app_imports_cleanly() -> None:
    from quotepro.main import create_app

    app = create_app()
    assert app.title == "QuotePro API"
    assert app.version == "2.0.0"


def test_health_endpoint_returns_ok() -> None:
    from quotepro.main import create_app

    client = TestClient(create_app())
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["app"] == "QuotePro API"


def test_openapi_schema_available() -> None:
    from quotepro.main import create_app

    client = TestClient(create_app())
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    paths = schema["paths"]
    assert "/api/health" in paths
    assert "/api/ai/generate-quote" in paths
    assert "/api/catalog/search" in paths
    assert "/webhooks/stripe" in paths
