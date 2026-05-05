from __future__ import annotations
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.domain.members.service import MemberService
from app.domain.members.schemas import MemberCreate, MemberUpdate
from app.domain.members.models import Member
from app.core.exceptions import NotFoundError, ConflictError

def make_member(**kwargs) -> Member:
    defaults = dict(
        id=uuid.uuid4(),
        name="Test Member",
        email="test@example.com",
        phone="9999999999",
        address=None,
        is_active=True,
    )
    defaults.update(kwargs)
    m = MagicMock(spec=Member)
    for k, v in defaults.items():
        setattr(m, k, v)
    return m

def make_repo(**overrides):
    repo = AsyncMock()
    repo.get_by_email = AsyncMock(return_value=None)
    repo.get_by_id = AsyncMock(return_value=None)
    repo.create = AsyncMock()
    repo.list = AsyncMock(return_value=([], 0))
    repo.search = AsyncMock(return_value=[])
    repo.update = AsyncMock()
    repo.soft_delete = AsyncMock()
    for k, v in overrides.items():
        setattr(repo, k, v)
    return repo


class TestCreateMember:
    async def test_creates_member_successfully(self):
        member = make_member()
        repo = make_repo(create=AsyncMock(return_value=member))
        svc = MemberService(repo)
        result = await svc.create_member(MemberCreate(name="Test Member", email="test@example.com"))
        assert result.name == "Test Member"

    async def test_raises_conflict_when_email_exists(self):
        repo = make_repo(get_by_email=AsyncMock(return_value=make_member()))
        svc = MemberService(repo)
        with pytest.raises(ConflictError):
            await svc.create_member(MemberCreate(name="X", email="test@example.com"))

    async def test_skips_email_check_when_email_none(self):
        member = make_member(email=None)
        repo = make_repo(create=AsyncMock(return_value=member))
        svc = MemberService(repo)
        await svc.create_member(MemberCreate(name="No Email"))
        repo.get_by_email.assert_not_called()


class TestGetMember:
    async def test_returns_member_when_found(self):
        member = make_member(name="Rahul")
        repo = make_repo(get_by_id=AsyncMock(return_value=member))
        svc = MemberService(repo)
        result = await svc.get_member(member.id)
        assert result.name == "Rahul"

    async def test_raises_not_found_when_missing(self):
        repo = make_repo(get_by_id=AsyncMock(return_value=None))
        svc = MemberService(repo)
        with pytest.raises(NotFoundError):
            await svc.get_member(uuid.uuid4())


class TestListMembers:
    async def test_returns_paginated_result(self):
        members = [make_member(name=f"M{i}") for i in range(5)]
        repo = make_repo(list=AsyncMock(return_value=(members, 5)))
        svc = MemberService(repo)
        result = await svc.list_members(page=1, page_size=10)
        assert result.total == 5
        assert len(result.items) == 5


class TestSearchMembers:
    async def test_returns_paginated_search_result(self):
        members = [make_member(name="Rahul"), make_member(name="Ravi")]
        repo = make_repo(search=AsyncMock(return_value=(members, 2)))
        svc = MemberService(repo)
        result = await svc.search_members("ra", page=1, page_size=10)
        assert result.total == 2
        assert len(result.items) == 2
        repo.search.assert_called_once_with("ra", 1, 10)


class TestUpdateMember:
    async def test_updates_successfully(self):
        member = make_member(name="Old")
        updated = make_member(name="New")
        repo = make_repo(
            get_by_id=AsyncMock(return_value=member),
            update=AsyncMock(return_value=updated),
        )
        svc = MemberService(repo)
        result = await svc.update_member(member.id, MemberUpdate(name="New"))
        assert result.name == "New"

    async def test_raises_not_found_when_member_missing(self):
        repo = make_repo(get_by_id=AsyncMock(return_value=None))
        svc = MemberService(repo)
        with pytest.raises(NotFoundError):
            await svc.update_member(uuid.uuid4(), MemberUpdate(name="X"))

    async def test_raises_conflict_when_new_email_taken(self):
        member = make_member(email="a@x.com")
        other = make_member(email="b@x.com")
        repo = make_repo(
            get_by_id=AsyncMock(return_value=member),
            get_by_email=AsyncMock(return_value=other),
        )
        svc = MemberService(repo)
        with pytest.raises(ConflictError):
            await svc.update_member(member.id, MemberUpdate(email="b@x.com"))

    async def test_allows_update_with_same_email(self):
        member = make_member(email="same@x.com")
        updated = make_member(email="same@x.com", name="Updated")
        repo = make_repo(
            get_by_id=AsyncMock(return_value=member),
            get_by_email=AsyncMock(return_value=None),
            update=AsyncMock(return_value=updated),
        )
        svc = MemberService(repo)
        result = await svc.update_member(member.id, MemberUpdate(name="Updated"))
        assert result.name == "Updated"


class TestDeleteMember:
    async def test_soft_deletes_member(self):
        member = make_member()
        repo = make_repo(get_by_id=AsyncMock(return_value=member))
        svc = MemberService(repo)
        await svc.delete_member(member.id)
        repo.soft_delete.assert_called_once_with(member)

    async def test_raises_not_found_when_missing(self):
        repo = make_repo(get_by_id=AsyncMock(return_value=None))
        svc = MemberService(repo)
        with pytest.raises(NotFoundError):
            await svc.delete_member(uuid.uuid4())
