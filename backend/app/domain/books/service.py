from __future__ import annotations
import uuid
from app.domain.books.repository import BookRepository
from app.domain.books.schemas import BookCreate, BookUpdate, BookResponse, BookListResponse
from app.core.exceptions import NotFoundError, ConflictError, BadRequestError
from app.database import UnitOfWork

class BookService:
    def __init__(self, repo: BookRepository, uow: UnitOfWork | None = None):
        self.repo = repo
        self.uow = uow

    async def create_book(self, data: BookCreate) -> BookResponse:
        if data.isbn:
            existing = await self.repo.get_by_isbn(data.isbn)
            if existing:
                raise ConflictError(f"Book with ISBN {data.isbn} already exists")
        payload = data.model_dump()
        if payload["available_copies"] is None:
            payload["available_copies"] = payload["total_copies"]
        if self.uow:
            async with self.uow:
                book = await self.repo.create(payload)
        else:
            book = await self.repo.create(payload)
        return BookResponse.model_validate(book)

    async def get_book(self, book_id: uuid.UUID) -> BookResponse:
        book = await self.repo.get_by_id(book_id)
        if not book:
            raise NotFoundError(f"Book {book_id} not found")
        return BookResponse.model_validate(book)

    async def list_books(self, page: int, page_size: int) -> BookListResponse:
        books, total = await self.repo.list(page, page_size)
        return BookListResponse(
            items=[BookResponse.model_validate(b) for b in books],
            total=total, page=page, page_size=page_size
        )

    async def search_books(self, query: str, page: int, page_size: int) -> BookListResponse:
        books, total = await self.repo.search(query, page, page_size)
        return BookListResponse(
            items=[BookResponse.model_validate(b) for b in books],
            total=total, page=page, page_size=page_size
        )

    async def update_book(self, book_id: uuid.UUID, data: BookUpdate) -> BookResponse:
        book = await self.repo.get_by_id(book_id)
        if not book:
            raise NotFoundError(f"Book {book_id} not found")
        if data.isbn and data.isbn != book.isbn:
            existing = await self.repo.get_by_isbn(data.isbn)
            if existing:
                raise ConflictError(f"ISBN {data.isbn} already in use")

        payload = data.model_dump(exclude_none=True)
        if "total_copies" in payload or "available_copies" in payload:
            borrowed_copies = max(book.total_copies - book.available_copies, 0)
            total_copies = payload.get("total_copies", book.total_copies)
            if total_copies < borrowed_copies:
                raise BadRequestError("total_copies cannot be less than currently borrowed copies")

            max_available_copies = total_copies - borrowed_copies
            if "available_copies" in payload:
                if payload["available_copies"] > max_available_copies:
                    raise BadRequestError(
                        f"Available copies cannot exceed {max_available_copies} "
                        f"({borrowed_copies} {'copy is' if borrowed_copies == 1 else 'copies are'} currently borrowed)"
                    )
            elif "total_copies" in payload:
                payload["available_copies"] = max_available_copies

        if self.uow:
            async with self.uow:
                updated = await self.repo.update(book, payload)
        else:
            updated = await self.repo.update(book, payload)
        return BookResponse.model_validate(updated)

    async def delete_book(self, book_id: uuid.UUID) -> None:
        book = await self.repo.get_by_id(book_id)
        if not book:
            raise NotFoundError(f"Book {book_id} not found")
        if self.uow:
            async with self.uow:
                await self.repo.soft_delete(book)
        else:
            await self.repo.soft_delete(book)
