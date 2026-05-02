import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.domain.borrowings.service import BorrowingService
from app.domain.borrowings.schemas import BorrowRequest, BorrowingResponse, BorrowingListResponse

router = APIRouter(prefix="/api/borrowings", tags=["Borrowings"])

def get_service(db: AsyncSession = Depends(get_db)) -> BorrowingService:
    return BorrowingService(db)

@router.post("/borrow", response_model=BorrowingResponse, status_code=201)
async def borrow_book(data: BorrowRequest, svc: BorrowingService = Depends(get_service)):
    return await svc.borrow_book(data)

@router.post("/{borrowing_id}/return", response_model=BorrowingResponse)
async def return_book(borrowing_id: uuid.UUID, svc: BorrowingService = Depends(get_service)):
    return await svc.return_book(borrowing_id)

@router.get("/active", response_model=list[BorrowingResponse])
async def list_active(svc: BorrowingService = Depends(get_service)):
    return await svc.list_active()

@router.get("/overdue", response_model=list[BorrowingResponse])
async def list_overdue(svc: BorrowingService = Depends(get_service)):
    return await svc.list_overdue()

@router.get("", response_model=BorrowingListResponse)
async def list_borrowings(
    page: int = 1,
    page_size: int = 10,
    status: str | None = Query(None),
    q: str | None = Query(None),
    svc: BorrowingService = Depends(get_service)
):
    return await svc.list_borrowings(page, page_size, status, q)

@router.get("/{borrowing_id}", response_model=BorrowingResponse)
async def get_borrowing(borrowing_id: uuid.UUID, svc: BorrowingService = Depends(get_service)):
    return await svc.get_borrowing(borrowing_id)
