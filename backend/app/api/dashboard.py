from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.database import UnitOfWork, get_db
from app.domain.books.repository import BookRepository
from app.domain.members.repository import MemberRepository
from app.domain.borrowings.repository import BorrowingRepository
from app.domain.borrowings.service import BorrowingService
from app.domain.borrowings.schemas import BorrowingResponse

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

class DashboardSummary(BaseModel):
    total_books: int
    total_members: int
    active_borrowings: int
    overdue_borrowings: int

@router.get("/summary", response_model=DashboardSummary)
async def get_summary(db: AsyncSession = Depends(get_db)):
    books = BookRepository(db)
    members = MemberRepository(db)
    borrowings = BorrowingRepository(db)
    return DashboardSummary(
        total_books=await books.count_active(),
        total_members=await members.count_active(),
        active_borrowings=await borrowings.count_active(),
        overdue_borrowings=await borrowings.count_overdue(),
    )

@router.get("/recent-activities", response_model=list[BorrowingResponse])
async def recent_activities(db: AsyncSession = Depends(get_db)):
    return await BorrowingService(
        BorrowingRepository(db),
        BookRepository(db),
        MemberRepository(db),
        UnitOfWork(db),
    ).list_recent_activities(limit=10)
