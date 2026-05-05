import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.core.error_handlers import register_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import register_middleware
from app.domain.books.models import Book
from app.domain.members.models import Member
from app.domain.borrowings.models import Borrowing
from app.api import books, members, borrowings, dashboard, health

configure_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.state.logger.info("Database tables created")
    yield

app = FastAPI(
    title="Library Management System",
    version="1.0.0",
    docs_url="/docs",
    lifespan=lifespan,
)

app.state.logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_middleware(app)
register_error_handlers(app)

app.include_router(health.router)
app.include_router(books.router)
app.include_router(members.router)
app.include_router(borrowings.router)
app.include_router(dashboard.router)
