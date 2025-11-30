"""
Configuration module for QuotePro backend
"""
from .settings import get_settings, Settings
from .database import get_supabase, get_db_session

__all__ = [
    "get_settings",
    "Settings",
    "get_supabase",
    "get_db_session",
]
