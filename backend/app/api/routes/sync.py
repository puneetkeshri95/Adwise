"""Sync routes — manual trigger for attribution recompute."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.tracking.attribution import recompute_all_attributions

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/attribution")
async def recompute_attribution(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await recompute_all_attributions(current_user.id, db)
    return result
