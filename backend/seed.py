import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.config import settings
from app.database import Base
from app.domain.books.models import Book
from app.domain.members.models import Member

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as db:
        books = [
            Book(title="Atomic Habits", author="James Clear", isbn="978-0735211292", category="Self-Help", total_copies=3, available_copies=3),
            Book(title="Clean Code", author="Robert C. Martin", isbn="978-0132350884", category="Programming", total_copies=2, available_copies=2),
            Book(title="Python Crash Course", author="Eric Matthes", isbn="978-1593279288", category="Programming", total_copies=2, available_copies=2),
        ]
        members = [
            Member(name="Rahul Sharma", email="rahul.sharma@example.com", phone="9876543210"),
            Member(name="Priya Mehta", email="priya.mehta@example.com", phone="9876543211"),
        ]
        db.add_all(books)
        db.add_all(members)
        await db.commit()
        print("Seed data inserted successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
