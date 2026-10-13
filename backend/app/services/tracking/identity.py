"""Visitor identity resolution — cookie → fingerprint → IP → new."""
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.tracking import Visitor

IP_MATCH_WINDOW = timedelta(days=30)


async def resolve_visitor(
    *,
    tenant_id: int,
    db: AsyncSession,
    visitor_uid: str | None = None,
    ip_address: str = "",
    fingerprint: str = "",
    user_agent: str = "",
    device_info: dict | None = None,
) -> Visitor:
    """
    Resolve or create a visitor using priority-based matching:
    1. Cookie visitor_uid (exact match)
    2. Fingerprint (same device, cookies cleared)
    3. IP address within 30 days (same network)
    4. Create new visitor
    """
    now = datetime.now(timezone.utc)

    # 1. Cookie match
    if visitor_uid:
        result = await db.execute(
            select(Visitor).where(
                Visitor.visitor_uid == visitor_uid,
                Visitor.tenant_id == tenant_id,
            )
        )
        visitor = result.scalar_one_or_none()
        if visitor:
            visitor.last_seen = now
            visitor.total_visits += 1
            if ip_address:
                visitor.ip_address = ip_address
            if fingerprint:
                visitor.fingerprint = fingerprint
            if user_agent:
                visitor.user_agent = user_agent
            return visitor

    # 2. Fingerprint match
    if fingerprint:
        result = await db.execute(
            select(Visitor).where(
                Visitor.fingerprint == fingerprint,
                Visitor.tenant_id == tenant_id,
            ).limit(1)
        )
        visitor = result.scalar_one_or_none()
        if visitor:
            visitor.last_seen = now
            visitor.total_visits += 1
            if ip_address:
                visitor.ip_address = ip_address
            if user_agent:
                visitor.user_agent = user_agent
            return visitor

    # 3. IP match within 30 days
    if ip_address:
        cutoff = now - IP_MATCH_WINDOW
        result = await db.execute(
            select(Visitor).where(
                Visitor.ip_address == ip_address,
                Visitor.tenant_id == tenant_id,
                Visitor.last_seen >= cutoff,
            ).order_by(Visitor.last_seen.desc()).limit(1)
        )
        visitor = result.scalar_one_or_none()
        if visitor:
            visitor.last_seen = now
            visitor.total_visits += 1
            if fingerprint:
                visitor.fingerprint = fingerprint
            if user_agent:
                visitor.user_agent = user_agent
            return visitor

    # 4. New visitor
    visitor = Visitor(
        tenant_id=tenant_id,
        visitor_uid=str(uuid.uuid4()),
        ip_address=ip_address,
        fingerprint=fingerprint,
        user_agent=user_agent,
        device_info=device_info or {},
        total_visits=1,
        first_seen=now,
        last_seen=now,
    )
    db.add(visitor)
    await db.flush()
    return visitor


async def identify_visitor(
    visitor: Visitor,
    *,
    email: str = "",
    phone: str = "",
    name: str = "",
    external_user_id: str = "",
    db: AsyncSession,
) -> None:
    """Attach a real identity to an anonymous visitor."""
    if email:
        visitor.email = email.strip().lower()
    if phone:
        visitor.phone = _normalize_phone(phone)
    if name:
        visitor.name = name
    if email or phone:
        visitor.identified = True
    await db.flush()


def _normalize_phone(phone: str) -> str:
    """Strip everything except digits; keep last 10 (Indian numbers) for matching."""
    if not phone:
        return ""
    digits = "".join(c for c in phone if c.isdigit())
    # Drop country code prefix if present (keep last 10 digits as canonical key)
    if len(digits) > 10:
        digits = digits[-10:]
    return digits
