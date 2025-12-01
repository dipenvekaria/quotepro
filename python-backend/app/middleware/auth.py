"""
JWT Authentication Middleware for FastAPI
Verifies Supabase JWT tokens
"""

from fastapi import Security, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from typing import Optional, Dict
from functools import wraps

from app.logging_config import get_logger

logger = get_logger(__name__)

security = HTTPBearer()


class AuthUser:
    """Authenticated user information"""
    def __init__(self, user_id: str, email: str, role: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.role = role


async def verify_jwt_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> AuthUser:
    """
    Verify Supabase JWT token
    
    Args:
        credentials: HTTP Bearer token from Authorization header
        
    Returns:
        AuthUser: Authenticated user information
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        token = credentials.credentials
        
        # Get JWT secret from environment
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not jwt_secret:
            logger.error("SUPABASE_JWT_SECRET not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication not configured"
            )
        
        # Decode and verify token
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_exp": True}
        )
        
        # Extract user information
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role")
        
        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        logger.info(
            f"User authenticated: {user_id}",
            extra={'extra_data': {'user_id': user_id, 'email': email}}
        )
        
        return AuthUser(user_id=user_id, email=email, role=role)
        
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


async def verify_company_access(
    company_id: str,
    user: AuthUser,
    db_client
) -> bool:
    """
    Verify user has access to the specified company
    
    Args:
        company_id: Company ID to check access for
        user: Authenticated user
        db_client: Supabase client
        
    Returns:
        bool: True if user has access
        
    Raises:
        HTTPException: If user doesn't have access
    """
    try:
        # Query user's company_id from database
        result = db_client.table('users').select('company_id').eq('id', user.user_id).execute()
        
        if not result.data:
            logger.warning(f"User not found in database: {user.user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_company_id = result.data[0]['company_id']
        
        if user_company_id != company_id:
            logger.warning(
                f"Unauthorized company access attempt",
                extra={'extra_data': {
                    'user_id': user.user_id,
                    'user_company': user_company_id,
                    'requested_company': company_id
                }}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this company"
            )
        
        return True
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Company access verification failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Access verification failed"
        )


# Optional: Decorator for route protection
def require_auth(func):
    """Decorator to require authentication on route"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Authentication is handled by dependency injection
        return await func(*args, **kwargs)
    return wrapper
