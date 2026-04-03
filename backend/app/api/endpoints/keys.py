from fastapi import APIRouter, Depends

from app.core.auth import AuthenticatedUser, require_user
from app.models.api_key import ApiKeyIssueResponse, ApiKeyMetadata
from app.services.api_key_service import (
    build_metadata,
    get_user_key_doc,
    issue_user_key,
    regenerate_user_key,
)

router = APIRouter()


@router.get("/me", response_model=ApiKeyMetadata)
async def get_my_api_key_metadata(user: AuthenticatedUser = Depends(require_user)):
    doc = get_user_key_doc(user.uid)
    if not doc:
        return ApiKeyMetadata(masked_key="Not issued", created_at="", active=False)
    return ApiKeyMetadata(**build_metadata(doc))


@router.post("/issue", response_model=ApiKeyIssueResponse)
async def issue_api_key(user: AuthenticatedUser = Depends(require_user)):
    created, api_key, payload = issue_user_key(user.uid)

    if created:
        return ApiKeyIssueResponse(
            created=True,
            api_key=api_key,
            metadata=ApiKeyMetadata(**build_metadata(payload)),
            message="Persistent API key issued successfully",
        )

    return ApiKeyIssueResponse(
        created=False,
        api_key=None,
        metadata=ApiKeyMetadata(**build_metadata(payload)),
        message="API key already exists for this user",
    )


@router.post("/regenerate", response_model=ApiKeyIssueResponse)
async def regenerate_api_key(user: AuthenticatedUser = Depends(require_user)):
    rotated_existing, api_key, payload = regenerate_user_key(user.uid)

    return ApiKeyIssueResponse(
        created=True,
        api_key=api_key,
        metadata=ApiKeyMetadata(**build_metadata(payload)),
        message=(
            "API key rotated successfully"
            if rotated_existing
            else "API key created successfully"
        ),
    )
