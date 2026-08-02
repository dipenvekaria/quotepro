"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from quotepro.core.auth import AuthContext, require_auth
from quotepro.core.config import Settings, get_settings

SettingsDep = Annotated[Settings, Depends(get_settings)]
AuthDep = Annotated[AuthContext, Depends(require_auth)]
