"""Pydantic Settings v2 — all runtime configuration.

Loaded once at process start. Fails loudly on missing required vars.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        env_prefix="QP_",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- App metadata ------------------------------------------------------
    app_name: str = "QuotePro API"
    app_version: str = "2.0.0"
    env: Literal["local", "preview", "production"] = "local"
    debug: bool = False

    # ---- HTTP surface ------------------------------------------------------
    host: str = "0.0.0.0"
    port: int = 8000
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # ---- Supabase ----------------------------------------------------------
    supabase_url: str = Field(alias="NEXT_PUBLIC_SUPABASE_URL")
    supabase_anon_key: SecretStr = Field(alias="NEXT_PUBLIC_SUPABASE_ANON_KEY")
    supabase_service_role_key: SecretStr = Field(alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: SecretStr | None = Field(default=None, alias="SUPABASE_JWT_SECRET")
    database_url: str | None = Field(default=None, alias="SUPABASE_DB_URL")

    # ---- AI ----------------------------------------------------------------
    gemini_api_key: SecretStr = Field(alias="GEMINI_API_KEY")
    gemini_model_default: str = "gemini-2.0-flash"
    gemini_model_reasoning: str = "gemini-2.0-flash-thinking-exp-1219"
    gemini_embedding_model: str = "text-embedding-004"
    gemini_embedding_dim: int = 768
    ai_temperature: float = 0.1
    ai_max_tokens: int = 4096
    ai_rag_top_k: int = 5
    ai_rag_rrf_k: int = 60

    # ---- Redis / arq -------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"
    arq_max_jobs: int = 10

    # ---- Logging + observability -------------------------------------------
    log_level: str = "INFO"
    log_json: bool = True
    otel_endpoint: str | None = None
    otel_service_name: str = "quotepro-api"
    sentry_dsn: SecretStr | None = None
    sentry_traces_sample_rate: float = 0.1

    # ---- Rate limits (per user) --------------------------------------------
    rl_ai_per_min: int = 10
    rl_crud_per_min: int = 100
    rl_public_per_min: int = 30

    # ---- Integrations ------------------------------------------------------
    resend_api_key: SecretStr | None = None
    resend_from_email: str = "no-reply@quotepro.demo"
    twilio_account_sid: SecretStr | None = None
    twilio_auth_token: SecretStr | None = None
    twilio_from_number: str | None = None
    stripe_secret_key: SecretStr | None = None
    stripe_webhook_secret: SecretStr | None = None
    dropbox_sign_api_key: SecretStr | None = None
    dropbox_sign_webhook_secret: SecretStr | None = None
    lemonsqueezy_webhook_secret: SecretStr | None = None

    # ---- Feature flags -----------------------------------------------------
    enable_rag: bool = True
    enable_rate_limiting: bool = True
    enable_cost_tracking: bool = True
    enable_telemetry: bool = False

    # ------------------------------------------------------------------------
    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def is_local(self) -> bool:
        return self.env == "local"

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings singleton — call anywhere without env re-reads."""
    return Settings()  # type: ignore[call-arg]
