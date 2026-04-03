from pydantic import BaseModel, Field


class ApiKeyMetadata(BaseModel):
    masked_key: str
    created_at: str
    active: bool = True


class ApiKeyIssueResponse(BaseModel):
    created: bool
    api_key: str | None = Field(default=None, description="Only returned when a new key is issued")
    metadata: ApiKeyMetadata
    message: str
