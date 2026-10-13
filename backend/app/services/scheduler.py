"""APScheduler in-process background jobs — hierarchy + insights sync."""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import decrypt_token
from app.models.meta import MetaConnection
from app.services.meta.client import MetaGraphClient
from app.services.meta.sync import sync_hierarchy, sync_insights

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _run_for_all_tenants(fn_name: str):
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(MetaConnection).where(MetaConnection.is_active == True))
        conns = r.scalars().all()
        for conn in conns:
            try:
                token = decrypt_token(conn.access_token_encrypted)
                client = MetaGraphClient(access_token=token, ad_account_id=conn.ad_account_id)
                if fn_name == "hierarchy":
                    await sync_hierarchy(conn.tenant_id, db, client)
                elif fn_name == "insights":
                    await sync_insights(conn.tenant_id, db, client, date_preset="last_7d")
                await db.commit()
                logger.info(f"[scheduler] {fn_name} synced for tenant {conn.tenant_id}")
            except Exception as e:
                logger.exception(f"[scheduler] {fn_name} failed for tenant {conn.tenant_id}: {e}")
                await db.rollback()


async def hierarchy_job():
    await _run_for_all_tenants("hierarchy")


async def insights_job():
    await _run_for_all_tenants("insights")


def start_scheduler():
    scheduler.add_job(
        hierarchy_job,
        IntervalTrigger(hours=settings.META_HIERARCHY_SYNC_HOURS),
        id="meta_hierarchy", replace_existing=True,
    )
    scheduler.add_job(
        insights_job,
        CronTrigger(hour=settings.META_INSIGHTS_SYNC_HOUR, minute=0),
        id="meta_insights", replace_existing=True,
    )
    scheduler.start()
    logger.info("[scheduler] Started: hierarchy every %sh, insights daily at %s:00",
                settings.META_HIERARCHY_SYNC_HOURS, settings.META_INSIGHTS_SYNC_HOUR)


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
