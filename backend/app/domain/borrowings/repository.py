from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.books.models import Book
from app.domain.borrowings.models import Borrowing
from app.domain.members.models import Member
from app.core.enums import BorrowingStatus

class BorrowingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict) -> Borrowing:
        borrowing = Borrowing(**data)
        self.db.add(borrowing)
        await self.db.flush()
        await self.db.refresh(borrowing, attribute_names=["book", "member"])
        return borrowing

    async def get_by_id(self, borrowing_id: uuid.UUID) -> Borrowing | None:
        result = await self.db.execute(select(Borrowing).where(Borrowing.id == borrowing_id))
        return result.scalar_one_or_none()

    async def get_active_by_book_and_member(self, book_id: uuid.UUID, member_id: uuid.UUID) -> Borrowing | None:
        result = await self.db.execute(
            select(Borrowing).where(
                and_(
                    Borrowing.book_id == book_id,
                    Borrowing.member_id == member_id,
                    Borrowing.status == BorrowingStatus.BORROWED,
                )
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        page: int,
        page_size: int,
        status: str | None = None,
        query: str | None = None,
    ) -> tuple[list[Borrowing], int]:
        offset = (page - 1) * page_size
        where = []
        if status == BorrowingStatus.OVERDUE:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            where.extend([Borrowing.status == BorrowingStatus.BORROWED, Borrowing.due_date < now])
        elif status:
            where.append(Borrowing.status == status)

        count_stmt = select(func.count()).select_from(Borrowing)
        list_stmt = select(Borrowing)
        if query:
            q = f"%{query}%"
            count_stmt = count_stmt.join(Book, Borrowing.book_id == Book.id).join(Member, Borrowing.member_id == Member.id)
            list_stmt = list_stmt.join(Book, Borrowing.book_id == Book.id).join(Member, Borrowing.member_id == Member.id)
            where.append(
                or_(
                    Book.title.ilike(q),
                    Book.author.ilike(q),
                    Book.isbn.ilike(q),
                    Book.category.ilike(q),
                    Member.name.ilike(q),
                    Member.email.ilike(q),
                    Member.phone.ilike(q),
                    Borrowing.status.ilike(q),
                )
            )

        count_q = await self.db.execute(count_stmt.where(*where))
        total = count_q.scalar_one()
        result = await self.db.execute(
            list_stmt.where(*where).offset(offset).limit(page_size).order_by(Borrowing.created_at.desc())
        )
        return result.scalars().all(), total

    async def list_active(self) -> list[Borrowing]:
        result = await self.db.execute(select(Borrowing).where(Borrowing.status == BorrowingStatus.BORROWED))
        return result.scalars().all()

    async def list_overdue(self) -> list[Borrowing]:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        result = await self.db.execute(
            select(Borrowing).where(and_(Borrowing.status == BorrowingStatus.BORROWED, Borrowing.due_date < now))
        )
        return result.scalars().all()

    async def list_by_member(self, member_id: uuid.UUID) -> list[Borrowing]:
        result = await self.db.execute(select(Borrowing).where(Borrowing.member_id == member_id))
        return result.scalars().all()

    async def list_active_by_member(self, member_id: uuid.UUID) -> list[Borrowing]:
        result = await self.db.execute(
            select(Borrowing).where(and_(Borrowing.member_id == member_id, Borrowing.status == BorrowingStatus.BORROWED))
        )
        return result.scalars().all()

    async def update(self, borrowing: Borrowing, data: dict) -> Borrowing:
        for key, value in data.items():
            setattr(borrowing, key, value)
        await self.db.flush()
        await self.db.refresh(borrowing, attribute_names=["book", "member"])
        return borrowing

    async def count_active(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(Borrowing).where(Borrowing.status == BorrowingStatus.BORROWED))
        return result.scalar_one()

    async def count_overdue(self) -> int:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        result = await self.db.execute(
            select(func.count()).select_from(Borrowing).where(and_(Borrowing.status == BorrowingStatus.BORROWED, Borrowing.due_date < now))
        )
        return result.scalar_one()

    async def recent_activities(self, limit: int = 10) -> list[Borrowing]:
        result = await self.db.execute(
            select(Borrowing).order_by(Borrowing.created_at.desc()).limit(limit)
        )
        return result.scalars().all()
