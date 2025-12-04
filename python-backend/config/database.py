"""
Database connection management
Supports both Supabase client and direct PostgreSQL connection
"""
from supabase import create_client, Client
from typing import Optional, Generator
from .settings import get_settings
from functools import lru_cache


# Global Supabase client (initialized lazily)
_supabase_client: Optional[Client] = None


@lru_cache()
def get_supabase() -> Client:
    """
    Get or create Supabase client (cached singleton)
    
    Returns:
        Supabase client for auth, storage, and realtime features
    """
    global _supabase_client
    
    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(
            settings.next_public_supabase_url,
            settings.supabase_service_role_key
        )
        print("✅ Supabase client initialized")
    
    return _supabase_client


def get_db_session() -> Generator[Client, None, None]:
    """
    FastAPI dependency for database session
    
    Usage:
        @app.get("/endpoint")
        async def endpoint(db: Client = Depends(get_db_session)):
            result = db.table("quotes").select("*").execute()
    
    Yields:
        Supabase client for database queries
    """
    db = get_supabase()
    try:
        yield db
    finally:
        # Supabase client is stateless, no cleanup needed
        pass


# TODO: Add SQLAlchemy session factory when migrating to direct PostgreSQL
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker, Session
# 
# def get_sqlalchemy_session() -> Generator[Session, None, None]:
#     """SQLAlchemy session for complex queries"""
#     engine = create_engine(get_settings().database_url)
#     SessionLocal = sessionmaker(bind=engine)
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()
