from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class MemberCreate(BaseModel):
    name: str = Field(min_length=1)
    email: str | None = None
    phone: str | None = None
    address: str | None = None

class MemberUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    is_active: bool | None = None

class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    email: str | None
    phone: str | None
    address: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class MemberListResponse(BaseModel):
    items: list[MemberResponse]
    total: int
    page: int
    page_size: int
