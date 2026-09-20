"""
Udyog Samyog — Signed User Context Verification
Enforces Section 2.1 & 16.3: Trust Boundary & Role Scoping
"""
import time
from typing import List, Optional
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from app.config import settings

security_scheme = HTTPBearer(auto_error=False)


class UserContext(BaseModel):
    sub: str
    role: str
    dept: str = "all"
    is_apex: int = 0
    app_ids: List[str] = []
    aud: str = "ai-service"
    iat: int = 0
    exp: int = 0

    @property
    def user_id(self) -> str:
        return self.sub

    @property
    def department(self) -> str:
        return self.dept


SecurityContext = UserContext


def verify_user_context(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
) -> UserContext:
    if not credentials or not credentials.credentials:
        # For open public advisory (no login required for advisor initial check)
        return UserContext(sub="anonymous", role="public", dept="all", app_ids=[])

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
            audience="ai-service",
            options={"verify_exp": True},
        )
        return UserContext(**payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="User context token has expired.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=403, detail=f"Invalid user context token: {str(e)}")


get_user_context = verify_user_context


def require_role(allowed_roles: List[str]):
    def role_checker(
        credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    ) -> UserContext:
        ctx = verify_user_context(credentials)
        if ctx.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Role '{ctx.role}' is not in authorized list: {allowed_roles}",
            )
        return ctx

    return role_checker


def enforce_application_scope(ctx: UserContext, application_id: str):
    """Enforce that the requested application_id is inside the user's allowed set or user is apex."""
    if ctx.role == "official" and ctx.is_apex:
        return True
    if ctx.app_ids and application_id in ctx.app_ids:
        return True
    if ctx.role == "public":
        raise HTTPException(status_code=403, detail="Public anonymous user cannot access application dossier.")
    raise HTTPException(
        status_code=403,
        detail=f"Access denied: Application '{application_id}' is not in signed user scope.",
    )
