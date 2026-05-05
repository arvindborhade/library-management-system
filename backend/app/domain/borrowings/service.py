from __future__ import annotations
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from app.domain.borrowings.repository import BorrowingRepository
from app.domain.borrowings.schemas import BorrowRequest, BorrowingResponse, BorrowingListResponse
from app.domain.books.repository import BookRepository
from app.domain.members.repository import MemberRepository
from app.core.exceptions import NotFoundError, ConflictError, BadRequestError
from app.core.enums import BorrowingStatus
from app.database import UnitOfWork

FINE_PER_DAY = Decimal("10.00")
STATUS_FILTERS = set(BorrowingStatus)

class BorrowingService:
    def __init__(
        self,
        repo: BorrowingRepository,
        book_repo: BookRepository,
        member_repo: MemberRepository,
        uow: UnitOfWork | None = None,
    ):
        self.repo = repo
        self.book_repo = book_repo
        self.member_repo = member_repo
        self.uow = uow

    def _overdue_days(self, borrowing) -> int:
        due_date = borrowing.due_date.replace(tzinfo=None) if borrowing.due_date.tzinfo is not None else borrowing.due_date
        if borrowing.status == BorrowingStatus.RETURNED:
            if not borrowing.returned_at:
                return 0
            reference = borrowing.returned_at
        else:
            reference = datetime.now(timezone.utc).replace(tzinfo=None)
        reference = reference.replace(tzinfo=None) if reference.tzinfo is not None else reference
        if reference <= due_date:
            return 0
        return (reference - due_date).days

    def _to_response(self, borrowing) -> BorrowingResponse:
        overdue_days = self._overdue_days(borrowing)
        current_fine_amount = (
            borrowing.fine_amount
            if borrowing.status == BorrowingStatus.RETURNED
            else Decimal(overdue_days) * FINE_PER_DAY
        )
        return BorrowingResponse.model_validate(borrowing).model_copy(
            update={
                "overdue_days": overdue_days,
                "current_fine_amount": current_fine_amount,
            }
        )

    def _normalize_status_filter(self, status: str | None) -> BorrowingStatus | None:
        if not status:
            return None
        normalized = status.strip().upper()
        try:
            return BorrowingStatus(normalized)
        except ValueError:
            allowed = ", ".join(sorted(s.value for s in STATUS_FILTERS))
            raise BadRequestError(f"status must be one of: {allowed}")

    async def borrow_book(self, data: BorrowRequest) -> BorrowingResponse:
        member = await self.member_repo.get_by_id(data.member_id)
        if not member:
            raise NotFoundError(f"Member {data.member_id} not found")
        if not member.is_active:
            raise BadRequestError("Member is inactive and cannot borrow books")

        book = await self.book_repo.get_by_id(data.book_id)
        if not book:
            raise NotFoundError(f"Book {data.book_id} not found")
        if book.available_copies <= 0:
            raise BadRequestError("No available copies of this book")

        duplicate = await self.repo.get_active_by_book_and_member(data.book_id, data.member_id)
        if duplicate:
            raise ConflictError("Member already has an active borrowing for this book")

        # Strip timezone info so naive DateTime column stores correctly
        due_date = data.due_date.replace(tzinfo=None) if data.due_date.tzinfo is not None else data.due_date

        if self.uow:
            async with self.uow:
                borrowing = await self.repo.create({
                    "book_id": data.book_id,
                    "member_id": data.member_id,
                    "due_date": due_date,
                    "status": BorrowingStatus.BORROWED,
                })
                book.available_copies -= 1
                result = self._to_response(borrowing)
            return result
        else:
            borrowing = await self.repo.create({
                "book_id": data.book_id,
                "member_id": data.member_id,
                "due_date": due_date,
                "status": BorrowingStatus.BORROWED,
            })
            book.available_copies -= 1
            return self._to_response(borrowing)

    async def return_book(self, borrowing_id: uuid.UUID) -> BorrowingResponse:
        borrowing = await self.repo.get_by_id(borrowing_id)
        if not borrowing:
            raise NotFoundError(f"Borrowing {borrowing_id} not found")
        if borrowing.status == BorrowingStatus.RETURNED:
            raise ConflictError("This borrowing record is already returned")

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        due_date = borrowing.due_date.replace(tzinfo=None) if borrowing.due_date.tzinfo is not None else borrowing.due_date
        fine = Decimal("0")
        if now > due_date:
            overdue_days = (now - due_date).days
            fine = Decimal(overdue_days) * FINE_PER_DAY

        if self.uow:
            async with self.uow:
                borrowing = await self.repo.update(borrowing, {
                    "status": BorrowingStatus.RETURNED,
                    "returned_at": now,
                    "fine_amount": fine,
                })
                book = await self.book_repo.get_by_id(borrowing.book_id)
                if book:
                    book.available_copies = min(book.available_copies + 1, book.total_copies)
                result = self._to_response(borrowing)
            return result
        else:
            borrowing = await self.repo.update(borrowing, {
                "status": BorrowingStatus.RETURNED,
                "returned_at": now,
                "fine_amount": fine,
            })
            book = await self.book_repo.get_by_id(borrowing.book_id)
            if book:
                book.available_copies = min(book.available_copies + 1, book.total_copies)
            return self._to_response(borrowing)

    async def list_borrowings(
        self,
        page: int,
        page_size: int,
        status: str | None,
        query: str | None = None,
    ) -> BorrowingListResponse:
        status = self._normalize_status_filter(status)
        query = query.strip() if query else None
        borrowings, total = await self.repo.list(page, page_size, status, query)
        return BorrowingListResponse(
            items=[self._to_response(b) for b in borrowings],
            total=total, page=page, page_size=page_size
        )

    async def list_active(self) -> list[BorrowingResponse]:
        borrowings = await self.repo.list_active()
        return [self._to_response(b) for b in borrowings]

    async def list_overdue(self) -> list[BorrowingResponse]:
        borrowings = await self.repo.list_overdue()
        return [self._to_response(b) for b in borrowings]

    async def get_borrowing(self, borrowing_id: uuid.UUID) -> BorrowingResponse:
        borrowing = await self.repo.get_by_id(borrowing_id)
        if not borrowing:
            raise NotFoundError(f"Borrowing {borrowing_id} not found")
        return self._to_response(borrowing)

    async def list_by_member(self, member_id: uuid.UUID) -> list[BorrowingResponse]:
        member = await self.member_repo.get_by_id(member_id)
        if not member:
            raise NotFoundError(f"Member {member_id} not found")
        borrowings = await self.repo.list_by_member(member_id)
        return [self._to_response(b) for b in borrowings]

    async def list_active_by_member(self, member_id: uuid.UUID) -> list[BorrowingResponse]:
        member = await self.member_repo.get_by_id(member_id)
        if not member:
            raise NotFoundError(f"Member {member_id} not found")
        borrowings = await self.repo.list_active_by_member(member_id)
        return [self._to_response(b) for b in borrowings]

    async def list_recent_activities(self, limit: int = 10) -> list[BorrowingResponse]:
        borrowings = await self.repo.recent_activities(limit=limit)
        return [self._to_response(b) for b in borrowings]
