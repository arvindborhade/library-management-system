import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import UnitOfWork, get_db
from app.core.pagination import PaginationParams, get_pagination
from app.domain.books.repository import BookRepository
from app.domain.books.service import BookService
from app.domain.books.schemas import BookCreate, BookUpdate, BookResponse, BookListResponse

router = APIRouter(prefix="/api/books", tags=["Books"])

def get_service(db: AsyncSession = Depends(get_db)) -> BookService:
    return BookService(BookRepository(db), UnitOfWork(db))

@router.post("", response_model=BookResponse, status_code=201)
async def create_book(data: BookCreate, svc: BookService = Depends(get_service)):
    return await svc.create_book(data)

@router.get("/search", response_model=BookListResponse)
async def search_books(
    q: str = Query(..., min_length=1),
    pagination: PaginationParams = Depends(get_pagination),
    svc: BookService = Depends(get_service),
):
    return await svc.search_books(q, pagination.page, pagination.page_size)

@router.get("", response_model=BookListResponse)
async def list_books(
    pagination: PaginationParams = Depends(get_pagination),
    svc: BookService = Depends(get_service),
):
    return await svc.list_books(pagination.page, pagination.page_size)

@router.get("/{book_id}", response_model=BookResponse)
async def get_book(book_id: uuid.UUID, svc: BookService = Depends(get_service)):
    return await svc.get_book(book_id)

@router.put("/{book_id}", response_model=BookResponse)
async def update_book(book_id: uuid.UUID, data: BookUpdate, svc: BookService = Depends(get_service)):
    return await svc.update_book(book_id, data)

@router.delete("/{book_id}", status_code=204)
async def delete_book(book_id: uuid.UUID, svc: BookService = Depends(get_service)):
    await svc.delete_book(book_id)
