from pydantic import BaseModel
from datetime import datetime

class AlertBase(BaseModel):
    title: str
    description: str
    severity: str
    status: str = "active"

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
