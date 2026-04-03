from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NewsBase(BaseModel):
    title: str
    summary: str
    url: str
    source: str
    published_at: datetime

class NewsCreate(NewsBase):
    pass

class NewsArticle(NewsBase):
    id: int

    class Config:
        from_attributes = True
