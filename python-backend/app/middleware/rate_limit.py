"""
Rate Limiting Middleware for FastAPI
Protects against abuse and DDoS attacks
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse

from app.logging_config import get_logger

logger = get_logger(__name__)

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Default limit
    storage_uri="memory://",  # Use in-memory storage (upgrade to Redis for production)
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom handler for rate limit exceeded
    Logs the violation and returns 429 response
    """
    client_ip = get_remote_address(request)
    
    logger.warning(
        f"Rate limit exceeded",
        extra={'extra_data': {
            'client_ip': client_ip,
            'path': request.url.path,
            'method': request.method,
            'limit': str(exc.detail)
        }}
    )
    
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": "Too many requests. Please try again later.",
            "retry_after": exc.detail.split("Retry after ")[1] if "Retry after" in exc.detail else "60 seconds"
        },
        headers={
            "Retry-After": "60",
            "X-RateLimit-Limit": exc.detail,
        }
    )


# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    # AI endpoints (expensive)
    "ai_generation": "10/minute",      # Quote generation
    "ai_optimization": "20/minute",    # Quote optimization
    "ai_upsells": "20/minute",         # Upsell suggestions
    "ai_update": "15/minute",          # Chat-based updates
    
    # Catalog endpoints
    "catalog_bulk": "1/minute",        # Bulk indexing (very expensive)
    "catalog_single": "100/minute",    # Single item indexing
    "catalog_delete": "50/minute",     # Delete embedding
    "catalog_status": "30/minute",     # Index status
    
    # Analytics endpoints
    "analytics_summary": "30/minute",  # Get analytics
    "analytics_track": "100/minute",   # Track usage
    
    # Quote CRUD endpoints
    "quote_read": "100/minute",        # Read quotes
    "quote_write": "50/minute",        # Create/update quotes
    
    # Health checks
    "health": "100/minute",            # Health endpoint
    
    # Default fallback
    "default": "60/minute",
}


def get_limit_for_endpoint(endpoint: str) -> str:
    """
    Get rate limit for specific endpoint
    
    Args:
        endpoint: Endpoint path or category
        
    Returns:
        str: Rate limit string (e.g., "10/minute")
    """
    return RATE_LIMITS.get(endpoint, RATE_LIMITS["default"])
