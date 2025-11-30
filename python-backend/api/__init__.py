"""
API routes for QuotePro backend
"""
from .routes.quotes import router as quotes_router
from .routes.ai import router as ai_router
from .routes.health import router as health_router

__all__ = [
    "quotes_router",
    "ai_router",
    "health_router",
]
