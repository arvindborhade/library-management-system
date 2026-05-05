from __future__ import annotations
import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.domain.books.schemas import BookResponse
from app.domain.members.schemas import MemberResponse
from app.core.enums import BorrowingStatus

class BorrowRequest(BaseModel):
    book_id: uuid.UUID
    member_id: uuid.UUID
    due_date: datetime

class BorrowingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    book_id: uuid.UUID
    member_id: uuid.UUID
    borrowed_at: datetime
    due_date: datetime
    returned_at: datetime | None
    status: BorrowingStatus
    fine_amount: Decimal
    overdue_days: int = 0
    current_fine_amount: Decimal = Decimal("0")
    created_at: datetime
    book: BookResponse | None = None
    member: MemberResponse | None = None

class BorrowingListResponse(BaseModel):
    items: list[BorrowingResponse]
    total: int
    page: int
    page_size: int
