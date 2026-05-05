from __future__ import annotations
import uuid
from app.domain.members.repository import MemberRepository
from app.domain.members.schemas import MemberCreate, MemberUpdate, MemberResponse, MemberListResponse
from app.core.exceptions import NotFoundError, ConflictError
from app.database import UnitOfWork

class MemberService:
    def __init__(self, repo: MemberRepository, uow: UnitOfWork | None = None):
        self.repo = repo
        self.uow = uow

    async def create_member(self, data: MemberCreate) -> MemberResponse:
        if data.email:
            existing = await self.repo.get_by_email(data.email)
            if existing:
                raise ConflictError(f"Member with email {data.email} already exists")
        if self.uow:
            async with self.uow:
                member = await self.repo.create(data.model_dump())
        else:
            member = await self.repo.create(data.model_dump())
        return MemberResponse.model_validate(member)

    async def get_member(self, member_id: uuid.UUID) -> MemberResponse:
        member = await self.repo.get_by_id(member_id)
        if not member:
            raise NotFoundError(f"Member {member_id} not found")
        return MemberResponse.model_validate(member)

    async def list_members(self, page: int, page_size: int) -> MemberListResponse:
        members, total = await self.repo.list(page, page_size)
        return MemberListResponse(
            items=[MemberResponse.model_validate(m) for m in members],
            total=total, page=page, page_size=page_size
        )

    async def search_members(self, query: str, page: int, page_size: int) -> MemberListResponse:
        members, total = await self.repo.search(query, page, page_size)
        return MemberListResponse(
            items=[MemberResponse.model_validate(m) for m in members],
            total=total, page=page, page_size=page_size
        )

    async def update_member(self, member_id: uuid.UUID, data: MemberUpdate) -> MemberResponse:
        member = await self.repo.get_by_id(member_id)
        if not member:
            raise NotFoundError(f"Member {member_id} not found")
        if data.email and data.email != member.email:
            existing = await self.repo.get_by_email(data.email)
            if existing:
                raise ConflictError(f"Email {data.email} already in use")
        if self.uow:
            async with self.uow:
                updated = await self.repo.update(member, data.model_dump(exclude_none=True))
        else:
            updated = await self.repo.update(member, data.model_dump(exclude_none=True))
        return MemberResponse.model_validate(updated)

    async def delete_member(self, member_id: uuid.UUID) -> None:
        member = await self.repo.get_by_id(member_id)
        if not member:
            raise NotFoundError(f"Member {member_id} not found")
        if self.uow:
            async with self.uow:
                await self.repo.soft_delete(member)
        else:
            await self.repo.soft_delete(member)
