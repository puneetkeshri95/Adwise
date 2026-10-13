"""Multi-touch attribution engine — first/last/linear/time-decay models."""
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.tracking import Order, Session, Event
import math


async def compute_attribution(order: Order, db: AsyncSession) -> None:
    """
    Compute attribution for an order across all sessions in the visitor's journey.
    Attribution is session-based: credit is assigned to the session (and its UTMs)
    that drove the visitor, not individual page views.
    """
    # Get all sessions for this visitor that have UTM data (ad-driven)
    result = await db.execute(
        select(Session)
        .where(
            Session.visitor_id == order.visitor_id,
            Session.tenant_id == order.tenant_id,
            Session.utm_source != "",
        )
        .order_by(Session.started_at)
    )
    sessions = result.scalars().all()

    if not sessions:
        return

    session_ids = [s.id for s in sessions]
    order.touchpoint_session_ids = session_ids

    order.attribution_first_click = _first_click(sessions)
    order.attribution_last_click = _last_click(sessions)
    order.attribution_linear = _linear(sessions)
    order.attribution_time_decay = _time_decay(sessions, order.converted_at)

    await db.flush()


def _session_key(session: Session) -> str:
    """Key for attribution dict — use UTM content (ad identifier) or session ID."""
    if session.utm_content:
        return session.utm_content
    return f"session_{session.id}"


def _first_click(sessions: list[Session]) -> dict:
    """100% credit to the first ad-driven session."""
    if not sessions:
        return {}
    key = _session_key(sessions[0])
    return {key: 1.0}


def _last_click(sessions: list[Session]) -> dict:
    """100% credit to the last ad-driven session."""
    if not sessions:
        return {}
    key = _session_key(sessions[-1])
    return {key: 1.0}


def _linear(sessions: list[Session]) -> dict:
    """Equal credit across all ad-driven sessions."""
    if not sessions:
        return {}
    credit = 1.0 / len(sessions)
    result = {}
    for s in sessions:
        key = _session_key(s)
        result[key] = result.get(key, 0) + round(credit, 4)
    return result


def _time_decay(sessions: list[Session], conversion_time: datetime | None, half_life_days: float = 7.0) -> dict:
    """Exponential decay — more recent sessions get more credit."""
    if not sessions:
        return {}

    ref_time = conversion_time or datetime.now(timezone.utc)
    # Strip tzinfo for safe subtraction
    ref_naive = ref_time.replace(tzinfo=None)

    weights = {}
    for s in sessions:
        started = s.started_at or datetime.now(timezone.utc)
        started_naive = started.replace(tzinfo=None)
        days_ago = (ref_naive - started_naive).total_seconds() / 86400
        weight = math.pow(0.5, days_ago / half_life_days)
        key = _session_key(s)
        weights[key] = weights.get(key, 0) + weight

    total_weight = sum(weights.values())
    if total_weight == 0:
        return _linear(sessions)

    return {k: round(v / total_weight, 4) for k, v in weights.items()}


async def recompute_all_attributions(tenant_id: int, db: AsyncSession) -> int:
    """Recompute attribution for all orders belonging to a tenant."""
    result = await db.execute(
        select(Order).where(Order.tenant_id == tenant_id)
    )
    orders = result.scalars().all()
    count = 0
    for order in orders:
        await compute_attribution(order, db)
        count += 1
    return count
