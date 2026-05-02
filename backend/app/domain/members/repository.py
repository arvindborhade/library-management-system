from __future__ import annotations
import uuid
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.members.models import Member

class MemberRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict) -> Member:
        member = Member(**data)
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)
        return member

    async def get_by_id(self, member_id: uuid.UUID) -> Member | None:
        result = await self.db.execute(select(Member).where(Member.id == member_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Member | None:
        result = await self.db.execute(select(Member).where(Member.email == email))
        return result.scalar_one_or_none()

    async def list(self, page: int, page_size: int) -> tuple[list[Member], int]:
        offset = (page - 1) * page_size
        count_q = await self.db.execute(select(func.count()).select_from(Member))
        total = count_q.scalar_one()
        result = await self.db.execute(
            select(Member).offset(offset).limit(page_size).order_by(Member.created_at.desc())
        )
        return result.scalars().all(), total

    async def search(self, query: str) -> list[Member]:
        q = f"%{query}%"
        result = await self.db.execute(
            select(Member).where(
                or_(Member.name.ilike(q), Member.email.ilike(q), Member.phone.ilike(q))
            )
        )
        return result.scalars().all()

    async def update(self, member: Member, data: dict) -> Member:
        for key, value in data.items():
            setattr(member, key, value)
        await self.db.commit()
        await self.db.refresh(member)
        return member

    async def soft_delete(self, member: Member) -> Member:
        member.is_active = False
        await self.db.commit()
        return member

    async def count_active(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(Member).where(Member.is_active == True))
        return result.scalar_one()
