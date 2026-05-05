from fastapi import APIRouter
from pydantic import BaseModel
from app.core.enums import HealthStatus

router = APIRouter(prefix="/api", tags=["Health"])

class HealthResponse(BaseModel):
    status: HealthStatus

@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status=HealthStatus.OK)
