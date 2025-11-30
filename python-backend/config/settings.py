"""
Application settings using Pydantic
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Gemini AI
    gemini_api_key: str
    gemini_model: str = "gemini-2.0-flash"
    gemini_temperature: float = 0.1
    gemini_max_tokens: int = 8192
    
    # Supabase
    next_public_supabase_url: str
    supabase_service_role_key: str
    
    # Optional Supabase Database URL (for direct PostgreSQL connection)
    database_url: Optional[str] = None
    
    # API Settings
    api_title: str = "QuotePro API"
    api_version: str = "2.0.0"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Vector Search / RAG
    embedding_model: str = "gemini-2.0-flash"
    embedding_dimension: int = 1536
    vector_search_limit: int = 10
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    Using lru_cache ensures settings are loaded once and reused
    """
    return Settings()
