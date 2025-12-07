# python-backend/app/services/auth_service.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from config.settings import get_settings

# This should match the security scheme in your frontend
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") 

class TokenData(BaseModel):
    user_id: Optional[UUID] = None

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> UUID:
    """
    Decodes the Supabase JWT to get the user ID.
    
    This is a simplified example. In a real app, you'd want to handle
    token expiration and more robust validation.
    """
    settings = get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, 
            settings.supabase_jwt_secret, 
            algorithms=["HS256"],
            audience="authenticated"
        )
        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        
        return UUID(user_id_str)

    except JWTError:
        raise credentials_exception
