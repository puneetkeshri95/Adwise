"""Tests for tracking attribution + session stitching."""
import asyncio
import uuid
import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Force in-memory SQLite for tests BEFORE app imports
import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from app.core.database import Base
from app.models.user import User
from app.models.tracking import Visitor, Session, Event, Order
from app.services.tracking.attribution import _first_click, _last_click, _linear, _time_decay, compute_attribution
from app.services.tracking.session import get_or_create_session, SESSION_TIMEOUT


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Sm = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Sm() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def tenant(db):
    u = User(email="t@x.com", name="t", hashed_password="x")
    db.add(u); await db.flush()
    return u


def _mk_session(tid, vid, source, days_ago=0):
    return Session(
        tenant_id=tid, visitor_id=vid,
        session_uid=f"s_{uuid.uuid4().hex[:8]}",
        utm_source=source, utm_content=f"ad_{source}",
        started_at=datetime.now(timezone.utc) - timedelta(days=days_ago),
        last_activity_at=datetime.now(timezone.utc) - timedelta(days=days_ago),
    )


@pytest.mark.asyncio
async def test_attribution_models(db, tenant):
    v = Visitor(tenant_id=tenant.id, visitor_uid="vx")
    db.add(v); await db.flush()

    sessions = [
        _mk_session(tenant.id, v.id, "facebook", days_ago=10),
        _mk_session(tenant.id, v.id, "google", days_ago=5),
        _mk_session(tenant.id, v.id, "instagram", days_ago=1),
    ]
    for s in sessions:
        db.add(s)
    await db.flush()
    o = Order(tenant_id=tenant.id, visitor_id=v.id, order_id="o1", amount=1000)

    fc = _first_click(sessions)
    lc = _last_click(sessions)
    lin = _linear(sessions)
    td = _time_decay(sessions, datetime.now(timezone.utc))

    assert "ad_facebook" in fc and fc["ad_facebook"] == 1.0
    assert "ad_instagram" in lc and lc["ad_instagram"] == 1.0
    assert sum(lin.values()) == pytest.approx(1.0, abs=0.01)
    assert sum(td.values()) == pytest.approx(1.0, abs=0.01)
    # time decay: most recent session weighted highest
    assert td["ad_instagram"] > td["ad_facebook"]


@pytest.mark.asyncio
async def test_session_stitching_within_30min(db, tenant):
    v = Visitor(tenant_id=tenant.id, visitor_uid="vy")
    db.add(v); await db.flush()

    s1, new1 = await get_or_create_session(
        tenant_id=tenant.id, visitor_id=v.id, session_id=None,
        utms={"utm_source": "fb"}, context={"ip_address": "1.1.1.1"}, db=db,
    )
    assert new1 is True
    await db.flush()

    # Same visitor within timeout — should resume
    s2, new2 = await get_or_create_session(
        tenant_id=tenant.id, visitor_id=v.id, session_id=None,
        utms={}, context={"ip_address": "1.1.1.1"}, db=db,
    )
    assert new2 is False
    assert s2.id == s1.id


@pytest.mark.asyncio
async def test_order_idempotency(db, tenant):
    v = Visitor(tenant_id=tenant.id, visitor_uid="vz")
    db.add(v); await db.flush()
    o = Order(tenant_id=tenant.id, visitor_id=v.id, order_id="dup-1", amount=100)
    db.add(o)
    await db.flush()
    # Second insert with same (tenant_id, order_id) must violate uniqueness
    o2 = Order(tenant_id=tenant.id, visitor_id=v.id, order_id="dup-1", amount=100)
    db.add(o2)
    with pytest.raises(Exception):
        await db.flush()
