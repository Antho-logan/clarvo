"""FastAPI authentication dependencies."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import jwt
from fastapi import Header, HTTPException, status


@dataclass(frozen=True)
class AuthenticatedUser:
    """Authenticated user identity decoded from a frontend-issued bearer JWT."""

    user_id: str
    email: Optional[str] = None
    name: Optional[str] = None


def _auth_secret() -> str:
    secret = os.getenv("AUTH_SECRET") or os.getenv("NEXTAUTH_SECRET")
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AUTH_SECRET is required for protected API routes.",
        )
    return secret


def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> AuthenticatedUser:
    """Require and verify a bearer JWT signed with the shared Auth.js secret."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token."
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token."
        )

    try:
        payload = jwt.decode(
            token,
            _auth_secret(),
            algorithms=["HS256"],
            audience="veridicta-api",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token."
        ) from exc

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token subject.",
        )
    email = payload.get("email")
    name = payload.get("name")
    return AuthenticatedUser(
        user_id=subject,
        email=email if isinstance(email, str) else None,
        name=name if isinstance(name, str) else None,
    )
