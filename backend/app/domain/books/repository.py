from __future__ import annotations
import uuid
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.books.models import Book

class BookRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict) -> Book:
        book = Book(**data)
        self.db.add(book)
        await self.db.commit()
        await self.db.refresh(book)
        return book

    async def get_by_id(self, book_id: uuid.UUID) -> Book | None:
        result = await self.db.execute(select(Book).where(Book.id == book_id, Book.is_active == True))
        return result.scalar_one_or_none()

    async def get_by_isbn(self, isbn: str) -> Book | None:
        result = await self.db.execute(select(Book).where(Book.isbn == isbn))
        return result.scalar_one_or_none()

    async def list(self, page: int, page_size: int) -> tuple[list[Book], int]:
        offset = (page - 1) * page_size
        count_q = await self.db.execute(select(func.count()).select_from(Book).where(Book.is_active == True))
        total = count_q.scalar_one()
        result = await self.db.execute(
            select(Book).where(Book.is_active == True).offset(offset).limit(page_size).order_by(Book.created_at.desc())
        )
        return result.scalars().all(), total

    async def search(self, query: str) -> list[Book]:
        q = f"%{query}%"
        result = await self.db.execute(
            select(Book).where(
                Book.is_active == True,
                or_(Book.title.ilike(q), Book.author.ilike(q), Book.isbn.ilike(q), Book.category.ilike(q))
            )
        )
        return result.scalars().all()

    async def update(self, book: Book, data: dict) -> Book:
        for key, value in data.items():
            setattr(book, key, value)
        await self.db.commit()
        await self.db.refresh(book)
        return book

    async def soft_delete(self, book: Book) -> Book:
        book.is_active = False
        await self.db.commit()
        return book

    async def count_active(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(Book).where(Book.is_active == True))
        return result.scalar_one()
