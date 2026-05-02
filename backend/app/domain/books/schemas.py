from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator

class BookCreate(BaseModel):
    title: str = Field(min_length=1)
    author: str = Field(min_length=1)
    isbn: str | None = None
    category: str | None = None
    total_copies: int = Field(default=1, ge=0)
    available_copies: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_copy_counts(self) -> "BookCreate":
        if self.available_copies is not None and self.available_copies > self.total_copies:
            raise ValueError("available_copies cannot be greater than total_copies")
        return self

class BookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    author: str | None = Field(default=None, min_length=1)
    isbn: str | None = None
    category: str | None = None
    total_copies: int | None = Field(default=None, ge=0)
    available_copies: int | None = Field(default=None, ge=0)
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_copy_counts(self) -> "BookUpdate":
        if (
            self.available_copies is not None
            and self.total_copies is not None
            and self.available_copies > self.total_copies
        ):
            raise ValueError("available_copies cannot be greater than total_copies")
        return self

class BookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    author: str
    isbn: str | None
    category: str | None
    total_copies: int
    available_copies: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

class BookListResponse(BaseModel):
    items: list[BookResponse]
    total: int
    page: int
    page_size: int
