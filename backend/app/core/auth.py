from dataclasses import dataclass
from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth


@dataclass
class AuthenticatedUser:
    uid: str
    email: str | None


def _parse_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be a Bearer token",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    return token


def get_current_user(authorization: str | None = Header(default=None)) -> AuthenticatedUser:
    token = _parse_bearer_token(authorization)

    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token",
        ) from exc

    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing uid",
        )

    return AuthenticatedUser(uid=uid, email=decoded.get("email"))


def require_user(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    return user
