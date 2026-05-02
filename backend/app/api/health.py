from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["Health"])

class HealthResponse(BaseModel):
    status: str

@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok")
