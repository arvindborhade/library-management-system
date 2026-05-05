from __future__ import annotations
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.domain.books.service import BookService
from app.domain.books.schemas import BookCreate, BookUpdate
from app.domain.books.models import Book
from app.core.exceptions import NotFoundError, ConflictError, BadRequestError

def make_book(**kwargs) -> Book:
    defaults = dict(
        id=uuid.uuid4(),
        title="Test Book",
        author="Author",
        isbn="123",
        category="Fiction",
        total_copies=3,
        available_copies=3,
        is_active=True,
    )
    for k, v in kwargs.items():
        defaults[k] = v
    book = MagicMock(spec=Book)
    for k, v in defaults.items():
        setattr(book, k, v)
    book.model_fields_set = set()
    return book

def make_repo(**overrides):
    repo = AsyncMock()
    repo.get_by_isbn = AsyncMock(return_value=None)
    repo.get_by_id = AsyncMock(return_value=None)
    repo.create = AsyncMock()
    repo.list = AsyncMock(return_value=([], 0))
    repo.search = AsyncMock(return_value=[])
    repo.update = AsyncMock()
    repo.soft_delete = AsyncMock()
    repo.count_active = AsyncMock(return_value=0)
    for k, v in overrides.items():
        setattr(repo, k, v)
    return repo


class TestCreateBook:
    async def test_creates_book_successfully(self):
        book = make_book()
        repo = make_repo(create=AsyncMock(return_value=book))
        svc = BookService(repo)
        data = BookCreate(title="Test Book", author="Author", total_copies=3)
        result = await svc.create_book(data)
        repo.create.assert_called_once()
        assert result.title == "Test Book"

    async def test_sets_available_copies_from_total_when_not_provided(self):
        book = make_book(available_copies=5)
        repo = make_repo(create=AsyncMock(return_value=book))
        svc = BookService(repo)
        data = BookCreate(title="X", author="Y", total_copies=5)
        await svc.create_book(data)
        call_payload = repo.create.call_args[0][0]
        assert call_payload["available_copies"] == 5

    async def test_raises_conflict_when_isbn_already_exists(self):
        repo = make_repo(get_by_isbn=AsyncMock(return_value=make_book()))
        svc = BookService(repo)
        data = BookCreate(title="X", author="Y", isbn="123", total_copies=1)
        with pytest.raises(ConflictError):
            await svc.create_book(data)

    async def test_skips_isbn_check_when_isbn_is_none(self):
        book = make_book(isbn=None)
        repo = make_repo(create=AsyncMock(return_value=book))
        svc = BookService(repo)
        data = BookCreate(title="X", author="Y", total_copies=1)
        await svc.create_book(data)
        repo.get_by_isbn.assert_not_called()


class TestGetBook:
    async def test_returns_book_when_found(self):
        book = make_book(title="Found Book")
        repo = make_repo(get_by_id=AsyncMock(return_value=book))
        svc = BookService(repo)
        result = await svc.get_book(book.id)
        assert result.title == "Found Book"

    async def test_raises_not_found_when_missing(self):
        repo = make_repo(get_by_id=AsyncMock(return_value=None))
        svc = BookService(repo)
        with pytest.raises(NotFoundError):
            await svc.get_book(uuid.uuid4())


class TestListBooks:
    async def test_returns_paginated_result(self):
        books = [make_book(title=f"Book {i}") for i in range(3)]
        repo = make_repo(list=AsyncMock(return_value=(books, 3)))
        svc = BookService(repo)
        result = await svc.list_books(page=1, page_size=10)
        assert result.total == 3
        assert len(result.items) == 3
        assert result.page == 1


class TestSearchBooks:
    async def test_returns_matching_books(self):
        books = [make_book(title="Python Book"), make_book(title="Python Crash Course")]
        repo = make_repo(search=AsyncMock(return_value=(books, 2)))
        svc = BookService(repo)
        result = await svc.search_books("python", page=1, page_size=10)
        assert result.total == 2
        assert len(result.items) == 2
        repo.search.assert_called_once_with("python", 1, 10)


class TestUpdateBook:
    async def test_updates_successfully(self):
        book = make_book(title="Old")
        updated = make_book(title="New")
        repo = make_repo(
            get_by_id=AsyncMock(return_value=book),
            get_by_isbn=AsyncMock(return_value=None),
            update=AsyncMock(return_value=updated),
        )
        svc = BookService(repo)
        result = await svc.update_book(book.id, BookUpdate(title="New"))
        assert result.title == "New"

    async def test_raises_not_found_when_book_missing(self):
        repo = make_repo(get_by_id=AsyncMock(return_value=None))
        svc = BookService(repo)
        with pytest.raises(NotFoundError):
            await svc.update_book(uuid.uuid4(), BookUpdate(title="X"))

    async def test_raises_conflict_when_isbn_taken_by_other_book(self):
        book = make_book(isbn="111")
        other = make_book(isbn="222")
        repo = make_repo(
            get_by_id=AsyncMock(return_value=book),
            get_by_isbn=AsyncMock(return_value=other),
        )
        svc = BookService(repo)
        with pytest.raises(ConflictError):
            await svc.update_book(book.id, BookUpdate(isbn="222"))

    async def test_adjusts_available_copies_when_total_changes(self):
        book = make_book(total_copies=5, available_copies=3)
        updated = make_book(total_copies=6, available_copies=4)
        repo = make_repo(
            get_by_id=AsyncMock(return_value=book),
            update=AsyncMock(return_value=updated),
        )
        svc = BookService(repo)
        result = await svc.update_book(book.id, BookUpdate(total_copies=6))
        payload = repo.update.call_args[0][1]
        assert payload["available_copies"] == 4
        assert result.available_copies == 4

    async def test_raises_when_total_is_less_than_borrowed_copies(self):
        book = make_book(total_copies=5, available_copies=2)
        repo = make_repo(get_by_id=AsyncMock(return_value=book))
        svc = BookService(repo)
        with pytest.raises(BadRequestError, match="currently borrowed"):
            await svc.update_book(book.id, BookUpdate(total_copies=2))


class TestDeleteBook:
    async def test_soft_deletes_book(self):
        book = make_book()
        repo = make_repo(get_by_id=AsyncMock(return_value=book))
        svc = BookService(repo)
        await svc.delete_book(book.id)
        repo.soft_delete.assert_called_once_with(book)

    async def test_raises_not_found_when_book_missing(self):
        repo = make_repo(get_by_id=AsyncMock(return_value=None))
        svc = BookService(repo)
        with pytest.raises(NotFoundError):
            await svc.delete_book(uuid.uuid4())
