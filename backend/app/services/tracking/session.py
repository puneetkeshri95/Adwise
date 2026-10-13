"""Session stitching — 30-minute inactivity timeout, UTM capture at session start."""
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.tracking import Session

SESSION_TIMEOUT = timedelta(minutes=30)


async def get_or_create_session(
    *,
    tenant_id: int,
    visitor_id: int,
    session_id: str | None,
    utms: dict,
    context: dict,
    db: AsyncSession,
) -> tuple[Session, bool]:
    """
    Resume an active session or create a new one.
    Returns (session, is_new).

    A session is expired if last_activity_at > 30 min ago.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - SESSION_TIMEOUT

    # Try to resume by session_uid
    if session_id:
        result = await db.execute(
            select(Session).where(
                Session.session_uid == session_id,
                Session.tenant_id == tenant_id,
                Session.is_active == True,
            )
        )
        session = result.scalar_one_or_none()
        if session:
            # Check if timed out
            last = session.last_activity_at or session.started_at
            if last and last.replace(tzinfo=None) < cutoff.replace(tzinfo=None):
                # Expire it
                session.is_active = False
                session.ended_at = last
                duration = (last - session.started_at).total_seconds() if session.started_at else 0
                session.duration_seconds = int(duration)
            else:
                # Still active — touch it
                session.last_activity_at = now
                session.page_count += 1
                return session, False

    # Also try: find any active session for this visitor that hasn't timed out
    if not session_id:
        result = await db.execute(
            select(Session).where(
                Session.tenant_id == tenant_id,
                Session.visitor_id == visitor_id,
                Session.is_active == True,
                Session.last_activity_at >= cutoff,
            ).order_by(Session.started_at.desc()).limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.last_activity_at = now
            existing.page_count += 1
            return existing, False

    # Create new session
    new_session = Session(
        tenant_id=tenant_id,
        visitor_id=visitor_id,
        session_uid=str(uuid.uuid4()),
        utm_source=utms.get("utm_source", ""),
        utm_medium=utms.get("utm_medium", ""),
        utm_campaign=utms.get("utm_campaign", ""),
        utm_content=utms.get("utm_content", ""),
        utm_term=utms.get("utm_term", ""),
        utm_id=utms.get("utm_id", ""),
        fbclid=utms.get("fbclid", ""),
        gclid=utms.get("gclid", ""),
        landing_page=context.get("page_url", ""),
        referrer=context.get("referrer", ""),
        ip_address=context.get("ip_address", ""),
        device=context.get("device", ""),
        browser=context.get("browser", ""),
        screen_resolution=context.get("screen_resolution", ""),
        user_agent=context.get("user_agent", ""),
        started_at=now,
        last_activity_at=now,
        page_count=1,
    )
    db.add(new_session)
    await db.flush()
    return new_session, True
