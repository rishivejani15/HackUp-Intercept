from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.db.firebase_admin import db

API_KEYS_COLLECTION = "api_keys"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def _mask_api_key_from_prefix(prefix: str) -> str:
    return f"{prefix}{'*' * 26}"


def _build_api_key() -> str:
    return f"ik_live_{secrets.token_urlsafe(32)}"


def _require_db() -> Any:
    if not db:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firestore not initialized",
        )
    return db


def get_user_key_doc(user_id: str) -> dict[str, Any] | None:
    firestore_db = _require_db()
    snapshot = firestore_db.collection(API_KEYS_COLLECTION).document(user_id).get()
    if not snapshot.exists:
        return None
    return snapshot.to_dict()


def issue_user_key(user_id: str) -> tuple[bool, str | None, dict[str, Any]]:
    firestore_db = _require_db()
    doc_ref = firestore_db.collection(API_KEYS_COLLECTION).document(user_id)
    existing = doc_ref.get()

    if existing.exists:
        existing_data = existing.to_dict()
        return False, None, existing_data

    api_key = _build_api_key()
    created_at = _utc_iso()
    payload = {
        "user_id": user_id,
        "key_hash": _hash_api_key(api_key),
        "key_prefix": api_key[:12],
        "active": True,
        "created_at": created_at,
        "updated_at": created_at,
    }
    doc_ref.set(payload)
    return True, api_key, payload


def regenerate_user_key(user_id: str) -> tuple[bool, str, dict[str, Any]]:
    firestore_db = _require_db()
    doc_ref = firestore_db.collection(API_KEYS_COLLECTION).document(user_id)
    existing = doc_ref.get()

    api_key = _build_api_key()
    now = _utc_iso()

    if existing.exists:
        existing_data = existing.to_dict()
        payload = {
            "user_id": user_id,
            "key_hash": _hash_api_key(api_key),
            "key_prefix": api_key[:12],
            "active": True,
            "created_at": existing_data.get("created_at", now),
            "updated_at": now,
            "rotated_at": now,
        }
        doc_ref.set(payload)
        return True, api_key, payload

    payload = {
        "user_id": user_id,
        "key_hash": _hash_api_key(api_key),
        "key_prefix": api_key[:12],
        "active": True,
        "created_at": now,
        "updated_at": now,
        "rotated_at": now,
    }
    doc_ref.set(payload)
    return False, api_key, payload


def build_metadata(doc: dict[str, Any]) -> dict[str, Any]:
    prefix = doc.get("key_prefix", "ik_live_")
    created_at = doc.get("created_at", _utc_iso())
    return {
        "masked_key": _mask_api_key_from_prefix(prefix),
        "created_at": created_at,
        "active": bool(doc.get("active", True)),
    }


def resolve_user_id_by_api_key(api_key: str) -> str:
    firestore_db = _require_db()
    hashed = _hash_api_key(api_key)
    query = (
        firestore_db.collection(API_KEYS_COLLECTION)
        .where("key_hash", "==", hashed)
        .where("active", "==", True)
        .limit(1)
        .stream()
    )
    docs = list(query)
    if not docs:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    data = docs[0].to_dict()
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key mapping",
        )

    return user_id
