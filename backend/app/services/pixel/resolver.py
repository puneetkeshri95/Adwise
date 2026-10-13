"""Identity resolution — matches incoming pixel hits to existing visitors.

Priority:
  1. Cookie visitor_uid (exact match — returning visitor with cookie intact)
  2. Browser fingerprint (same device, cookies cleared)
  3. IP address within 30 days (same network, different browser)
  4. Create new visitor
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.tracking import Visitor
import uuid


async def resolve_visitor(
    user_id: int,
    db: AsyncSession,
    visitor_uid: str | None = None,
    ip_address: str = "",
    fingerprint: str = "",
    device_info: dict | None = None,
) -> Visitor:
    """Resolve an incoming hit to an existing or new Visitor record."""

    # 1. Cookie-based — exact visitor_uid match
    if visitor_uid:
        result = await db.execute(
            select(Visitor).where(
                Visitor.visitor_uid == visitor_uid,
                Visitor.user_id == user_id,
            )
        )
        visitor = result.scalar_one_or_none()
        if visitor:
            visitor.total_visits += 1
            if ip_address:
                visitor.ip_address = ip_address
            if fingerprint and not visitor.fingerprint:
                visitor.fingerprint = fingerprint
            return visitor

    # 2. Fingerprint-based — same device, cookies cleared
    if fingerprint:
        result = await db.execute(
            select(Visitor).where(
                Visitor.fingerprint == fingerprint,
                Visitor.user_id == user_id,
            ).order_by(Visitor.last_seen.desc()).limit(1)
        )
        visitor = result.scalar_one_or_none()
        if visitor:
            visitor.total_visits += 1
            if ip_address:
                visitor.ip_address = ip_address
            return visitor

    # 3. IP-based — same network within 30 days
    if ip_address and ip_address not in ("127.0.0.1", "::1", ""):
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        result = await db.execute(
            select(Visitor).where(
                and_(
                    Visitor.ip_address == ip_address,
                    Visitor.user_id == user_id,
                    Visitor.first_seen >= cutoff,
                )
            ).order_by(Visitor.last_seen.desc()).limit(1)
        )
        visitor = result.scalar_one_or_none()
        if visitor:
            visitor.total_visits += 1
            if fingerprint and not visitor.fingerprint:
                visitor.fingerprint = fingerprint
            return visitor

    # 4. Create new visitor
    new_uid = visitor_uid or str(uuid.uuid4())
    visitor = Visitor(
        user_id=user_id,
        visitor_uid=new_uid,
        ip_address=ip_address,
        fingerprint=fingerprint,
        total_visits=1,
        device_info=device_info or {},
    )
    db.add(visitor)
    await db.flush()
    return visitor


async def identify_visitor(
    visitor: Visitor,
    email: str = "",
    name: str = "",
    db: AsyncSession | None = None,
):
    """Attach real identity (email/name) to a visitor — called when user fills a form."""
    if email:
        visitor.email = email
    if name:
        visitor.name = name
    visitor.identified = True
    if db:
        await db.flush()
