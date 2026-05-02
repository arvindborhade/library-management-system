import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.domain.members.repository import MemberRepository
from app.domain.members.service import MemberService
from app.domain.members.schemas import MemberCreate, MemberUpdate, MemberResponse, MemberListResponse
from app.domain.borrowings.service import BorrowingService
from app.domain.borrowings.schemas import BorrowingResponse

router = APIRouter(prefix="/api/members", tags=["Members"])

def get_service(db: AsyncSession = Depends(get_db)) -> MemberService:
    return MemberService(MemberRepository(db))

def get_borrowing_service(db: AsyncSession = Depends(get_db)) -> BorrowingService:
    return BorrowingService(db)

@router.post("", response_model=MemberResponse, status_code=201)
async def create_member(data: MemberCreate, svc: MemberService = Depends(get_service)):
    return await svc.create_member(data)

@router.get("/search", response_model=list[MemberResponse])
async def search_members(q: str = Query(..., min_length=1), svc: MemberService = Depends(get_service)):
    return await svc.search_members(q)

@router.get("", response_model=MemberListResponse)
async def list_members(page: int = 1, page_size: int = 10, svc: MemberService = Depends(get_service)):
    return await svc.list_members(page, page_size)

@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(member_id: uuid.UUID, svc: MemberService = Depends(get_service)):
    return await svc.get_member(member_id)

@router.put("/{member_id}", response_model=MemberResponse)
async def update_member(member_id: uuid.UUID, data: MemberUpdate, svc: MemberService = Depends(get_service)):
    return await svc.update_member(member_id, data)

@router.delete("/{member_id}", status_code=204)
async def delete_member(member_id: uuid.UUID, svc: MemberService = Depends(get_service)):
    await svc.delete_member(member_id)

@router.get("/{member_id}/borrowed-books", response_model=list[BorrowingResponse])
async def borrowed_books(member_id: uuid.UUID, svc: BorrowingService = Depends(get_borrowing_service)):
    return await svc.list_active_by_member(member_id)

@router.get("/{member_id}/borrowing-history", response_model=list[BorrowingResponse])
async def borrowing_history(member_id: uuid.UUID, svc: BorrowingService = Depends(get_borrowing_service)):
    return await svc.list_by_member(member_id)
