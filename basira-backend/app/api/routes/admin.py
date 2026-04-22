from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models import User, Contract, UsageLog
from app.schemas import AdminStatsResponse
from app.services.auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStatsResponse)
async def admin_stats(
    _:  User           = Depends(get_current_admin),
    db: AsyncSession   = Depends(get_db),
):
    users   = (await db.execute(select(func.count()).select_from(User))).scalar()  or 0
    conts   = (await db.execute(select(func.count()).select_from(Contract))).scalar() or 0
    tokens  = (await db.execute(select(func.sum(UsageLog.tokens_used)))).scalar()    or 0
    latency = (await db.execute(select(func.avg(UsageLog.latency_ms)))).scalar()     or 0.0

    return AdminStatsResponse(
        total_users=users,
        total_contracts=conts,
        total_tokens=tokens,
        avg_latency_ms=round(latency, 1),
    )
