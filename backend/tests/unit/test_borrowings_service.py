from __future__ import annotations
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from app.domain.borrowings.service import BorrowingService, FINE_PER_DAY
from app.domain.borrowings.schemas import BorrowRequest
from app.domain.borrowings.models import Borrowing
from app.domain.books.models import Book
from app.domain.members.models import Member
from app.core.exceptions import NotFoundError, ConflictError, BadRequestError
from app.core.enums import BorrowingStatus

def make_member(is_active=True) -> Member:
    m = MagicMock(spec=Member)
    m.id = uuid.uuid4()
    m.name = "Test Member"
    m.email = "t@t.com"
    m.phone = None
    m.address = None
    m.is_active = is_active
    return m

def make_book(available_copies=2) -> Book:
    b = MagicMock(spec=Book)
    b.id = uuid.uuid4()
    b.title = "Test Book"
    b.author = "Author"
    b.isbn = "000"
    b.category = None
    b.total_copies = 3
    b.available_copies = available_copies
    b.is_active = True
    return b

def make_borrowing(status=BorrowingStatus.BORROWED, due_date=None) -> Borrowing:
    br = MagicMock(spec=Borrowing)
    br.id = uuid.uuid4()
    br.book_id = uuid.uuid4()
    br.member_id = uuid.uuid4()
    br.status = status
    br.borrowed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    br.due_date = due_date or (datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=14))
    br.returned_at = None
    br.fine_amount = Decimal("0")
    br.created_at = datetime.now(timezone.utc).replace(tzinfo=None)
    br.book = make_book()
    br.member = make_member()
    return br

def make_service():
    repo = AsyncMock()
    book_repo = AsyncMock()
    member_repo = AsyncMock()
    return BorrowingService(repo, book_repo, member_repo)


class TestBorrowBook:
    async def test_borrows_successfully(self):
        svc = make_service()
        member = make_member()
        book = make_book(available_copies=2)
        borrowing = make_borrowing()
        svc.member_repo.get_by_id = AsyncMock(return_value=member)
        svc.book_repo.get_by_id = AsyncMock(return_value=book)
        svc.repo.get_active_by_book_and_member = AsyncMock(return_value=None)
        svc.repo.create = AsyncMock(return_value=borrowing)
        req = BorrowRequest(
            book_id=book.id,
            member_id=member.id,
            due_date=datetime.now(timezone.utc) + timedelta(days=14),
        )
        result = await svc.borrow_book(req)
        assert result.status == BorrowingStatus.BORROWED
        assert book.available_copies == 1

    async def test_raises_not_found_when_member_missing(self):
        svc = make_service()
        svc.member_repo.get_by_id = AsyncMock(return_value=None)
        req = BorrowRequest(
            book_id=uuid.uuid4(),
            member_id=uuid.uuid4(),
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
        )
        with pytest.raises(NotFoundError):
            await svc.borrow_book(req)

    async def test_raises_bad_request_when_member_inactive(self):
        svc = make_service()
        svc.member_repo.get_by_id = AsyncMock(return_value=make_member(is_active=False))
        req = BorrowRequest(
            book_id=uuid.uuid4(),
            member_id=uuid.uuid4(),
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
        )
        with pytest.raises(BadRequestError, match="inactive"):
            await svc.borrow_book(req)

    async def test_raises_not_found_when_book_missing(self):
        svc = make_service()
        svc.member_repo.get_by_id = AsyncMock(return_value=make_member())
        svc.book_repo.get_by_id = AsyncMock(return_value=None)
        req = BorrowRequest(
            book_id=uuid.uuid4(),
            member_id=uuid.uuid4(),
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
        )
        with pytest.raises(NotFoundError):
            await svc.borrow_book(req)

    async def test_raises_bad_request_when_no_copies_available(self):
        svc = make_service()
        svc.member_repo.get_by_id = AsyncMock(return_value=make_member())
        svc.book_repo.get_by_id = AsyncMock(return_value=make_book(available_copies=0))
        req = BorrowRequest(
            book_id=uuid.uuid4(),
            member_id=uuid.uuid4(),
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
        )
        with pytest.raises(BadRequestError, match="No available"):
            await svc.borrow_book(req)

    async def test_raises_conflict_when_duplicate_active_borrowing(self):
        svc = make_service()
        svc.member_repo.get_by_id = AsyncMock(return_value=make_member())
        svc.book_repo.get_by_id = AsyncMock(return_value=make_book())
        svc.repo.get_active_by_book_and_member = AsyncMock(return_value=make_borrowing())
        req = BorrowRequest(
            book_id=uuid.uuid4(),
            member_id=uuid.uuid4(),
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
        )
        with pytest.raises(ConflictError):
            await svc.borrow_book(req)


class TestReturnBook:
    async def test_returns_successfully_with_no_fine(self):
        svc = make_service()
        due = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)
        borrowing = make_borrowing(status=BorrowingStatus.BORROWED, due_date=due)
        returned = make_borrowing(status=BorrowingStatus.RETURNED)
        returned.fine_amount = Decimal("0")
        svc.repo.get_by_id = AsyncMock(return_value=borrowing)
        svc.repo.update = AsyncMock(return_value=returned)
        svc.book_repo.get_by_id = AsyncMock(return_value=make_book(available_copies=1))

        result = await svc.return_book(borrowing.id)
        assert result.status == BorrowingStatus.RETURNED
        assert result.fine_amount == Decimal("0")

    async def test_calculates_fine_for_overdue_book(self):
        svc = make_service()
        overdue_days = 5
        due = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=overdue_days)
        borrowing = make_borrowing(status=BorrowingStatus.BORROWED, due_date=due)
        expected_fine = Decimal(overdue_days) * FINE_PER_DAY

        returned = make_borrowing(status=BorrowingStatus.RETURNED)
        returned.fine_amount = expected_fine
        svc.repo.get_by_id = AsyncMock(return_value=borrowing)
        svc.repo.update = AsyncMock(return_value=returned)
        svc.book_repo.get_by_id = AsyncMock(return_value=make_book())

        result = await svc.return_book(borrowing.id)
        assert result.fine_amount == expected_fine

    async def test_raises_not_found_when_borrowing_missing(self):
        svc = make_service()
        svc.repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError):
            await svc.return_book(uuid.uuid4())

    async def test_raises_conflict_when_already_returned(self):
        svc = make_service()
        borrowing = make_borrowing(status=BorrowingStatus.RETURNED)
        svc.repo.get_by_id = AsyncMock(return_value=borrowing)
        with pytest.raises(ConflictError, match="already returned"):
            await svc.return_book(borrowing.id)

    async def test_increments_available_copies_on_return(self):
        svc = make_service()
        due = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)
        borrowing = make_borrowing(status=BorrowingStatus.BORROWED, due_date=due)
        returned = make_borrowing(status=BorrowingStatus.RETURNED)
        returned.fine_amount = Decimal("0")
        book = make_book(available_copies=0)
        svc.repo.get_by_id = AsyncMock(return_value=borrowing)
        svc.repo.update = AsyncMock(return_value=returned)
        svc.book_repo.get_by_id = AsyncMock(return_value=book)

        await svc.return_book(borrowing.id)
        assert book.available_copies == 1


class TestFineCalculation:
    async def test_fine_is_zero_when_returned_on_time(self):
        svc = make_service()
        due = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
        borrowing = make_borrowing(status=BorrowingStatus.BORROWED, due_date=due)
        returned = make_borrowing(status=BorrowingStatus.RETURNED)
        returned.fine_amount = Decimal("0")
        svc.repo.get_by_id = AsyncMock(return_value=borrowing)
        svc.repo.update = AsyncMock(return_value=returned)
        svc.book_repo.get_by_id = AsyncMock(return_value=make_book())

        result = await svc.return_book(borrowing.id)
        assert result.fine_amount == Decimal("0")

    async def test_fine_is_10_per_overdue_day(self):
        assert FINE_PER_DAY == Decimal("10.00")

    async def test_active_overdue_response_includes_projected_fine(self):
        svc = make_service()
        overdue_days = 4
        due = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=overdue_days)
        borrowing = make_borrowing(status=BorrowingStatus.BORROWED, due_date=due)

        result = svc._to_response(borrowing)

        assert result.overdue_days == overdue_days
        assert result.current_fine_amount == Decimal(overdue_days) * FINE_PER_DAY


class TestBorrowingFilters:
    async def test_list_borrowings_accepts_lowercase_overdue_filter(self):
        svc = make_service()
        svc.repo.list = AsyncMock(return_value=([], 0))

        result = await svc.list_borrowings(page=1, page_size=10, status="overdue")

        svc.repo.list.assert_called_once_with(1, 10, BorrowingStatus.OVERDUE, None)
        assert result.total == 0

    async def test_list_borrowings_rejects_unknown_status_filter(self):
        svc = make_service()

        with pytest.raises(BadRequestError, match="status must be one of"):
            await svc.list_borrowings(page=1, page_size=10, status="lost")

    async def test_list_borrowings_passes_trimmed_search_query(self):
        svc = make_service()
        svc.repo.list = AsyncMock(return_value=([], 0))

        await svc.list_borrowings(page=2, page_size=5, status=None, query="  Clean Code  ")

        svc.repo.list.assert_called_once_with(2, 5, None, "Clean Code")
