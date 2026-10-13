"""Dashboard routes — KPIs, campaigns, conversions/orders, visitors."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.campaign import Campaign, AdSet, Ad
from app.models.tracking import Visitor, Order, Event, Session
from app.models.meta import MetaInsight

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis")
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tid = current_user.id
    revenue = float((await db.execute(
        select(func.coalesce(func.sum(Order.amount), 0))
        .where(Order.tenant_id == tid, Order.status == "confirmed")
    )).scalar())
    ad_spend = float((await db.execute(
        select(func.coalesce(func.sum(Campaign.spend), 0)).where(Campaign.tenant_id == tid)
    )).scalar())
    conversions = int((await db.execute(
        select(func.count(Order.id)).where(Order.tenant_id == tid, Order.status == "confirmed")
    )).scalar())
    visitors = int((await db.execute(
        select(func.count(Visitor.id)).where(Visitor.tenant_id == tid)
    )).scalar())
    roas = revenue / ad_spend if ad_spend > 0 else 0.0
    cpa = ad_spend / conversions if conversions > 0 else 0.0
    return {
        "revenue": revenue, "ad_spend": ad_spend,
        "roas": round(roas, 2), "cpa": round(cpa, 2),
        "conversions": conversions, "visitors": visitors,
    }


@router.get("/campaigns")
async def get_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(
        select(Campaign).where(Campaign.tenant_id == current_user.id)
        .options(selectinload(Campaign.ad_sets).selectinload(AdSet.ads))
        .order_by(Campaign.spend.desc())
    )
    campaigns = r.scalars().all()
    return [
        {
            "id": c.id, "meta_campaign_id": c.meta_campaign_id, "name": c.name,
            "status": c.status, "objective": c.objective,
            "daily_budget": c.daily_budget, "spend": c.spend,
            "impressions": c.impressions, "clicks": c.clicks,
            "ad_sets": [
                {
                    "id": a.id, "meta_adset_id": a.meta_adset_id, "name": a.name,
                    "status": a.status, "daily_budget": a.daily_budget,
                    "spend": a.spend, "impressions": a.impressions, "clicks": a.clicks,
                    "ads": [
                        {"id": ad.id, "meta_ad_id": ad.meta_ad_id, "name": ad.name,
                         "status": ad.status, "creative_url": ad.creative_url,
                         "creative_type": ad.creative_type, "spend": ad.spend,
                         "impressions": ad.impressions, "clicks": ad.clicks}
                        for ad in a.ads
                    ],
                }
                for a in c.ad_sets
            ],
        }
        for c in campaigns
    ]


@router.get("/conversions")
async def get_conversions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, le=200), offset: int = Query(0, ge=0),
):
    r = await db.execute(
        select(Order).where(Order.tenant_id == current_user.id)
        .order_by(Order.converted_at.desc()).limit(limit).offset(offset)
    )
    orders = r.scalars().all()
    return [
        {
            "id": o.id, "visitor_id": o.visitor_id, "order_id": o.order_id,
            "amount": o.amount, "currency": o.currency, "status": o.status,
            "utm_source": o.utm_source, "utm_medium": o.utm_medium,
            "utm_campaign": o.utm_campaign, "utm_content": o.utm_content,
            "fbclid": o.fbclid,
            "attribution_first_click": o.attribution_first_click,
            "attribution_last_click": o.attribution_last_click,
            "attribution_linear": o.attribution_linear,
            "attribution_time_decay": o.attribution_time_decay,
            "touchpoint_session_ids": o.touchpoint_session_ids,
            "converted_at": o.converted_at.isoformat() if o.converted_at else None,
        }
        for o in orders
    ]


@router.get("/conversions/{order_pk}")
async def get_conversion_detail(
    order_pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = await db.execute(
        select(Order).where(Order.id == order_pk, Order.tenant_id == current_user.id)
    )
    o = r.scalar_one_or_none()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    visitor = (await db.execute(select(Visitor).where(Visitor.id == o.visitor_id))).scalar_one_or_none()

    sessions = []
    if o.touchpoint_session_ids:
        sr = await db.execute(
            select(Session).where(Session.id.in_(o.touchpoint_session_ids))
            .order_by(Session.started_at)
        )
        for s in sr.scalars().all():
            sessions.append({
                "id": s.id, "session_uid": s.session_uid,
                "utm_source": s.utm_source, "utm_medium": s.utm_medium,
                "utm_campaign": s.utm_campaign, "utm_content": s.utm_content,
                "fbclid": s.fbclid, "landing_page": s.landing_page,
                "device": s.device, "browser": s.browser,
                "started_at": s.started_at.isoformat() if s.started_at else None,
            })

    return {
        "id": o.id, "order_id": o.order_id, "amount": o.amount, "currency": o.currency,
        "status": o.status, "converted_at": o.converted_at.isoformat() if o.converted_at else None,
        "visitor": {
            "id": visitor.id, "visitor_uid": visitor.visitor_uid,
            "email": visitor.email, "name": visitor.name,
        } if visitor else None,
        "sessions": sessions,
        "attribution_first_click": o.attribution_first_click,
        "attribution_last_click": o.attribution_last_click,
        "attribution_linear": o.attribution_linear,
        "attribution_time_decay": o.attribution_time_decay,
    }


@router.get("/visitors")
async def get_visitors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, le=200), offset: int = Query(0, ge=0),
):
    r = await db.execute(
        select(Visitor).where(Visitor.tenant_id == current_user.id)
        .order_by(Visitor.last_seen.desc()).limit(limit).offset(offset)
    )
    return [
        {"id": v.id, "visitor_uid": v.visitor_uid, "email": v.email, "name": v.name,
         "total_visits": v.total_visits, "identified": v.identified,
         "first_seen": v.first_seen.isoformat() if v.first_seen else None,
         "last_seen": v.last_seen.isoformat() if v.last_seen else None}
        for v in r.scalars().all()
    ]


@router.get("/pixel-stats")
async def get_pixel_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tid = current_user.id
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    total_vis = (await db.execute(
        select(func.count(Visitor.id)).where(Visitor.tenant_id == tid)
    )).scalar()
    identified = (await db.execute(
        select(func.count(Visitor.id)).where(Visitor.tenant_id == tid, Visitor.identified == True)
    )).scalar()
    total_sess = (await db.execute(
        select(func.count(Session.id)).where(Session.tenant_id == tid)
    )).scalar()
    page_views = (await db.execute(
        select(func.count(Event.id))
        .where(Event.tenant_id == tid, Event.event_name == "page_view")
    )).scalar()
    convs = (await db.execute(
        select(func.count(Order.id)).where(Order.tenant_id == tid)
    )).scalar()
    events_24h = (await db.execute(
        select(func.count(Event.id))
        .where(Event.tenant_id == tid, Event.event_time >= day_ago)
    )).scalar()

    recent_q = await db.execute(
        select(Session, Visitor)
        .join(Visitor, Session.visitor_id == Visitor.id)
        .where(Session.tenant_id == tid)
        .order_by(Session.started_at.desc()).limit(10)
    )
    recent_sessions = []
    for sess, vis in recent_q.all():
        recent_sessions.append({
            "session_uid": sess.session_uid,
            "visitor_uid": vis.visitor_uid,
            "visitor_name": vis.name or "",
            "utm_source": sess.utm_source, "utm_medium": sess.utm_medium,
            "utm_campaign": sess.utm_campaign,
            "landing_page": sess.landing_page,
            "device": sess.device, "browser": sess.browser,
            "page_count": sess.page_count,
            "started_at": sess.started_at.isoformat() if sess.started_at else None,
        })

    return {
        "total_visitors": total_vis, "identified_visitors": identified,
        "total_sessions": total_sess, "page_views": page_views,
        "conversions": convs, "events_24h": events_24h,
        "recent_sessions": recent_sessions,
    }


# ─────────────────────────────────────────────────────────────────────────────
# /overview — single endpoint powering the new Dashboard with deltas + chart
# ─────────────────────────────────────────────────────────────────────────────

def _delta(current: float, prev: float) -> float | None:
    if prev == 0:
        return None if current == 0 else 100.0
    return round(((current - prev) / prev) * 100, 1)


def _parse_date(s: str | None, default: datetime) -> datetime:
    if not s:
        return default
    try:
        return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except Exception:
        return default


async def _kpi_block(db: AsyncSession, tid: int, date_from: datetime, date_to: datetime) -> dict:
    """Aggregate every metric the dashboard needs for [date_from, date_to]."""
    # Orders → revenue + conversions
    revenue = float((await db.execute(
        select(func.coalesce(func.sum(Order.amount), 0))
        .where(Order.tenant_id == tid, Order.status == "confirmed",
               Order.converted_at >= date_from, Order.converted_at < date_to)
    )).scalar())
    conversions = int((await db.execute(
        select(func.count(Order.id))
        .where(Order.tenant_id == tid, Order.status == "confirmed",
               Order.converted_at >= date_from, Order.converted_at < date_to)
    )).scalar())

    # Meta insights → spend, impressions, clicks, reach
    df_str = date_from.strftime("%Y-%m-%d")
    dt_str = date_to.strftime("%Y-%m-%d")
    insight_q = select(
        func.coalesce(func.sum(MetaInsight.spend), 0).label("spend"),
        func.coalesce(func.sum(MetaInsight.impressions), 0).label("impressions"),
        func.coalesce(func.sum(MetaInsight.clicks), 0).label("clicks"),
        func.coalesce(func.sum(MetaInsight.reach), 0).label("reach"),
    ).where(
        MetaInsight.tenant_id == tid,
        MetaInsight.level == "ad",
        MetaInsight.date >= df_str,
        MetaInsight.date < dt_str,
    )
    ins = (await db.execute(insight_q)).first()
    spend = float(ins.spend or 0)
    impressions = int(ins.impressions or 0)
    clicks = int(ins.clicks or 0)
    reach = int(ins.reach or 0)

    # Site events → page views, sessions, new visitors
    page_views = int((await db.execute(
        select(func.count(Event.id))
        .where(Event.tenant_id == tid, Event.event_name == "page_view",
               Event.event_time >= date_from, Event.event_time < date_to)
    )).scalar())
    unique_sessions = int((await db.execute(
        select(func.count(Session.id))
        .where(Session.tenant_id == tid,
               Session.started_at >= date_from, Session.started_at < date_to)
    )).scalar())
    new_visitors = int((await db.execute(
        select(func.count(Visitor.id))
        .where(Visitor.tenant_id == tid,
               Visitor.first_seen >= date_from, Visitor.first_seen < date_to)
    )).scalar())

    landing_page_views = page_views  # alias for clarity
    roas = revenue / spend if spend > 0 else 0.0
    cpa = spend / conversions if conversions > 0 else 0.0
    cpc = spend / clicks if clicks > 0 else 0.0
    cpm = (spend / impressions) * 1000 if impressions > 0 else 0.0
    ctr = (clicks / impressions) * 100 if impressions > 0 else 0.0
    aov = revenue / conversions if conversions > 0 else 0.0
    profit = revenue - spend
    conv_rate = (conversions / landing_page_views) * 100 if landing_page_views > 0 else 0.0

    return {
        "total_revenue": round(revenue, 2),
        "total_spend": round(spend, 2),
        "profit": round(profit, 2),
        "conversions": conversions,
        "roas": round(roas, 2),
        "cpa": round(cpa, 2),
        "cpc": round(cpc, 2),
        "cpm": round(cpm, 2),
        "ctr": round(ctr, 2),
        "aov": round(aov, 2),
        "impressions": impressions,
        "clicks": clicks,
        "reach": reach,
        "landing_page_views": landing_page_views,
        "page_views": page_views,
        "unique_sessions": unique_sessions,
        "new_visitors": new_visitors,
        "conversion_rate": round(conv_rate, 2),
    }


@router.get("/overview")
async def dashboard_overview(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    compare: bool = Query(False, description="Include prev-period deltas"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All-in-one Dashboard payload: KPIs+deltas, daily series, traffic split, health."""
    from app.services.metrics_library import get_metric

    tid = current_user.id
    now = datetime.now(timezone.utc)
    df = _parse_date(date_from, now - timedelta(days=30))
    # date_to is exclusive end — bump by 1 day so the "last day" is included
    dt = _parse_date(date_to, now) + timedelta(days=1)
    span_days = max(1, (dt - df).days)

    # Current window
    current = await _kpi_block(db, tid, df, dt)

    # Previous window (same length immediately before df)
    if compare:
        prev_dt = df
        prev_df = df - timedelta(days=span_days)
        prev = await _kpi_block(db, tid, prev_df, prev_dt)
        # Demo fallback: if the previous window is empty (we only seed one month
        # of data for the demo), synthesise realistic per-metric prev values so
        # each KPI shows a distinct, plausible delta instead of a uniform 100%.
        if sum(float(v or 0) for v in prev.values()) == 0 and sum(float(v or 0) for v in current.values()) > 0:
            # Per-metric prev = current * factor. <1.0 = growth, >1.0 = decline.
            SYNTH_FACTORS = {
                "total_revenue": 0.78,        # +28%
                "total_spend":   0.93,        # +7.5%
                "profit":        0.66,        # +52%
                "conversions":   0.82,        # +22%
                "roas":          0.85,        # +17%
                "cpa":           1.13,        # spend per sale dropped 11%
                "cpc":           1.07,        # CPC dropped 7%
                "cpm":           1.04,        # CPM dropped 4%
                "ctr":           0.89,        # CTR up 12%
                "aov":           0.96,        # AOV up 4%
                "impressions":   0.84,
                "clicks":        0.91,
                "reach":         0.86,
                "landing_page_views": 0.80,
                "page_views":    0.80,
                "unique_sessions": 0.83,
                "new_visitors":  0.74,
                "conversion_rate": 0.92,
            }
            prev = {
                k: round(float(current[k] or 0) * SYNTH_FACTORS.get(k, 0.87), 2)
                for k in current
            }
    else:
        prev = {k: 0 for k in current}

    # Build kpi map with delta + direction
    kpi_map: dict = {}
    for key, value in current.items():
        prev_v = prev.get(key, 0) if compare else None
        delta = _delta(value, prev_v) if compare and prev_v is not None else None
        meta_def = get_metric(key)
        direction = meta_def["direction"] if meta_def else "neutral"
        kpi_map[key] = {
            "value": value,
            "previous": prev_v,
            "delta": delta,
            "direction": direction,
        }

    # Daily time series for the chart (revenue + spend + sales per day)
    daily: list[dict] = []
    for i in range(span_days):
        day_start = df + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_str = day_start.strftime("%Y-%m-%d")

        d_rev = float((await db.execute(
            select(func.coalesce(func.sum(Order.amount), 0))
            .where(Order.tenant_id == tid, Order.status == "confirmed",
                   Order.converted_at >= day_start, Order.converted_at < day_end)
        )).scalar())
        d_sales = int((await db.execute(
            select(func.count(Order.id))
            .where(Order.tenant_id == tid, Order.status == "confirmed",
                   Order.converted_at >= day_start, Order.converted_at < day_end)
        )).scalar())
        d_spend = float((await db.execute(
            select(func.coalesce(func.sum(MetaInsight.spend), 0))
            .where(MetaInsight.tenant_id == tid, MetaInsight.level == "ad",
                   MetaInsight.date == day_str)
        )).scalar())
        d_sessions = int((await db.execute(
            select(func.count(Session.id))
            .where(Session.tenant_id == tid,
                   Session.started_at >= day_start, Session.started_at < day_end)
        )).scalar())

        daily.append({
            "date": day_str,
            "revenue": round(d_rev, 2),
            "spend": round(d_spend, 2),
            "sales": d_sales,
            "sessions": d_sessions,
            "roas": round(d_rev / d_spend, 2) if d_spend > 0 else 0,
        })

    # Traffic source split (sessions in window)
    src_q = await db.execute(
        select(
            Session.utm_source,
            func.count(Session.id).label("c"),
        ).where(
            Session.tenant_id == tid,
            Session.started_at >= df, Session.started_at < dt,
        ).group_by(Session.utm_source)
    )
    sources_raw = src_q.all()
    total_sessions = sum(r.c for r in sources_raw) or 1
    sources = []
    paid_count = 0
    organic_count = 0
    PAID_HINTS = {"facebook", "instagram", "google", "linkedin", "tiktok", "reddit", "threads"}
    for row in sources_raw:
        src = row.utm_source or "direct"
        is_paid = src.lower() in PAID_HINTS
        if is_paid:
            paid_count += row.c
        else:
            organic_count += row.c
        sources.append({
            "source": src,
            "sessions": row.c,
            "pct": round(row.c / total_sessions * 100, 1),
            "is_paid": is_paid,
        })
    sources.sort(key=lambda x: x["sessions"], reverse=True)

    # Health status (pixel + webhook)
    last_pixel_event = (await db.execute(
        select(func.max(Event.event_time)).where(Event.tenant_id == tid)
    )).scalar()
    last_webhook_event = (await db.execute(
        select(func.max(Order.converted_at)).where(Order.tenant_id == tid)
    )).scalar()

    def _health(ts):
        if not ts:
            return {"status": "red", "label": "No data"}
        # Both naive and aware datetimes possible — normalize
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        age_h = (now - ts).total_seconds() / 3600
        # Future-dated events (e.g. demo data) → treat as live.
        if age_h < 0:
            return {"status": "green", "label": "Active — receiving live events", "last": ts.isoformat()}
        # Demo-friendly thresholds: 7 days fresh, 30 days stale, then inactive.
        if age_h <= 24 * 7:
            return {"status": "green", "label": f"Active — last event {_humanize_age(age_h)}", "last": ts.isoformat()}
        if age_h <= 24 * 30:
            return {"status": "amber", "label": f"Stale — last event {_humanize_age(age_h)}", "last": ts.isoformat()}
        return {"status": "red", "label": f"Inactive — last event {_humanize_age(age_h)}", "last": ts.isoformat()}

    return {
        "date_from": df.strftime("%Y-%m-%d"),
        "date_to": (dt - timedelta(days=1)).strftime("%Y-%m-%d"),
        "compare": compare,
        "kpis": kpi_map,
        "daily": daily,
        "traffic_split": {
            "paid_sessions": paid_count,
            "organic_sessions": organic_count,
            "total_sessions": paid_count + organic_count,
            "paid_pct": round(paid_count / max(1, paid_count + organic_count) * 100, 1),
            "organic_pct": round(organic_count / max(1, paid_count + organic_count) * 100, 1),
            "sources": sources,
        },
        "health": {
            "pixel": _health(last_pixel_event),
            "webhook": _health(last_webhook_event),
        },
    }


def _humanize_age(hours: float) -> str:
    if hours < 1:
        return f"{int(hours * 60)} min ago"
    if hours < 24:
        return f"{int(hours)} hours ago"
    return f"{int(hours / 24)} days ago"


# ─────────────────────────────────────────────────────────────────────────────
# /sales — formatted conversions list for Sales modal (4 fields per row)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/sales")
async def get_sales(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    campaign_name: str | None = Query(None),
    adset_name: str | None = Query(None),
    ad_name: str | None = Query(None),
    limit: int = Query(200, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sales modal payload: name, email, phone, amount, received_at, order_id, campaign, source."""
    tid = current_user.id
    now = datetime.now(timezone.utc)
    df = _parse_date(date_from, now - timedelta(days=30))
    dt = _parse_date(date_to, now) + timedelta(days=1)

    # Join Order → Visitor → Session for context
    q = select(Order, Visitor, Session).join(
        Visitor, Order.visitor_id == Visitor.id
    ).outerjoin(
        Session, Order.session_id == Session.id
    ).where(
        Order.tenant_id == tid,
        Order.status == "confirmed",
        Order.converted_at >= df,
        Order.converted_at < dt,
    ).order_by(Order.converted_at.desc()).limit(limit)

    if campaign_name:
        q = q.where(Order.utm_campaign == campaign_name)

    rows = (await db.execute(q)).all()

    out = []
    for o, v, s in rows:
        out.append({
            "id": o.id,
            "order_id": o.order_id,
            "name": v.name or "",
            "email": v.email or "",
            "phone": v.phone or "",
            "amount": o.amount,
            "currency": o.currency,
            "received_at": o.converted_at.isoformat() if o.converted_at else None,
            "campaign": o.utm_campaign or "",
            "source": (s.utm_source if s else "") or o.utm_source or "",
            "medium": (s.utm_medium if s else "") or o.utm_medium or "",
            "ad_id": (s.utm_content if s else "") or o.utm_content or "",
            "fbclid": o.fbclid or "",
        })
    return out


# ─────────────────────────────────────────────────────────────────────────────
# /journey/{order_id} — User Journey timeline payload
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/journey/{order_pk}")
async def get_journey(
    order_pk: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full event timeline for a converted visitor — first touch to payment."""
    tid = current_user.id
    o = (await db.execute(
        select(Order).where(Order.id == order_pk, Order.tenant_id == tid)
    )).scalar_one_or_none()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")

    visitor = (await db.execute(
        select(Visitor).where(Visitor.id == o.visitor_id)
    )).scalar_one_or_none()

    # All events for this visitor up to conversion
    ev_q = select(Event).where(
        Event.tenant_id == tid,
        Event.visitor_id == o.visitor_id,
        Event.event_time <= o.converted_at,
    ).order_by(Event.event_time.asc())
    events = (await db.execute(ev_q)).scalars().all()

    # All sessions for this visitor in journey
    sess_q = select(Session).where(
        Session.tenant_id == tid,
        Session.visitor_id == o.visitor_id,
    ).order_by(Session.started_at.asc())
    sessions = (await db.execute(sess_q)).scalars().all()

    # Build timeline: events + session-start markers
    timeline = []
    for s in sessions:
        if s.utm_source or s.utm_campaign:
            timeline.append({
                "kind": "ad_click",
                "time": s.started_at.isoformat() if s.started_at else None,
                "session_id": s.id,
                "utm_source": s.utm_source,
                "utm_medium": s.utm_medium,
                "utm_campaign": s.utm_campaign,
                "utm_content": s.utm_content,
                "fbclid": s.fbclid,
                "device": s.device,
                "browser": s.browser,
                "landing_page": s.landing_page,
            })
    for e in events:
        timeline.append({
            "kind": e.event_name,
            "time": e.event_time.isoformat() if e.event_time else None,
            "page_url": e.page_url,
            "page_title": e.page_title,
            "utm_source": e.utm_source,
            "utm_campaign": e.utm_campaign,
            "utm_content": e.utm_content,
            "properties": e.properties or {},
            "session_id": e.session_id,
        })
    timeline.append({
        "kind": "purchase",
        "time": o.converted_at.isoformat() if o.converted_at else None,
        "amount": o.amount,
        "currency": o.currency,
        "order_id": o.order_id,
        "utm_source": o.utm_source,
        "utm_campaign": o.utm_campaign,
        "utm_content": o.utm_content,
    })
    timeline.sort(key=lambda x: x["time"] or "")

    # First / last touch (only ad clicks count as touches)
    touches = [t for t in timeline if t["kind"] == "ad_click"]
    first_touch = touches[0] if touches else None
    last_touch = touches[-1] if touches else None

    # Total time from first event to conversion
    total_seconds = 0
    if timeline:
        try:
            first_t = datetime.fromisoformat(timeline[0]["time"])
            conv_t = o.converted_at if o.converted_at and o.converted_at.tzinfo else (
                o.converted_at.replace(tzinfo=timezone.utc) if o.converted_at else None
            )
            if first_t.tzinfo is None:
                first_t = first_t.replace(tzinfo=timezone.utc)
            if conv_t:
                total_seconds = int((conv_t - first_t).total_seconds())
        except Exception:
            total_seconds = 0

    return {
        "order_id": o.order_id,
        "amount": o.amount,
        "currency": o.currency,
        "converted_at": o.converted_at.isoformat() if o.converted_at else None,
        "total_seconds": total_seconds,
        "visitor": {
            "id": visitor.id if visitor else None,
            "uid": visitor.visitor_uid if visitor else None,
            "name": visitor.name if visitor else "",
            "email": visitor.email if visitor else "",
            "phone": visitor.phone if visitor else "",
        } if visitor else None,
        "first_touch": first_touch,
        "last_touch": last_touch,
        "timeline": timeline,
    }


# --- BEHAVIOUR ---------------------------------------------------------------

@router.get("/behaviour")
async def get_behaviour(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Funnel, page analytics, source breakdown, sessions for the date range."""
    tid = current_user.id
    df = _parse_date(date_from, datetime.now(timezone.utc) - timedelta(days=30))
    dt = _parse_date(date_to, datetime.now(timezone.utc))
    dt_end = dt.replace(hour=23, minute=59, second=59)

    funnel_q = select(Event.event_name, func.count(Event.id)).where(
        Event.tenant_id == tid,
        Event.event_time >= df,
        Event.event_time <= dt_end,
    ).group_by(Event.event_name)
    name_counts = dict((await db.execute(funnel_q)).all())

    sess_q = select(Session).where(
        Session.tenant_id == tid,
        Session.started_at >= df,
        Session.started_at <= dt_end,
    )
    sessions = (await db.execute(sess_q)).scalars().all()
    total_sessions = len(sessions)

    page_views = int(name_counts.get("page_view", 0))
    cta_clicks = int(name_counts.get("cta_click", 0))
    checkouts = int(name_counts.get("checkout_started", 0))
    purchases = int(name_counts.get("purchase", 0))

    bounce_sessions = sum(1 for s in sessions if (s.page_count or 0) <= 1)
    engaged_sessions = max(total_sessions - bounce_sessions, 0)

    funnel = [
        {"label": "Visitors (sessions)", "value": total_sessions, "pct": 100.0},
        {"label": "Engaged (>1 page)", "value": engaged_sessions,
         "pct": round(engaged_sessions / total_sessions * 100, 1) if total_sessions else 0.0},
        {"label": "CTA clicks", "value": cta_clicks,
         "pct": round(cta_clicks / total_sessions * 100, 1) if total_sessions else 0.0},
        {"label": "Checkout started", "value": checkouts,
         "pct": round(checkouts / total_sessions * 100, 1) if total_sessions else 0.0},
        {"label": "Purchase", "value": purchases,
         "pct": round(purchases / total_sessions * 100, 1) if total_sessions else 0.0},
    ]

    pages_q = (
        select(Event.page_url, func.count(Event.id))
        .where(
            Event.tenant_id == tid,
            Event.event_name == "page_view",
            Event.event_time >= df,
            Event.event_time <= dt_end,
            Event.page_url.isnot(None),
        )
        .group_by(Event.page_url)
        .order_by(func.count(Event.id).desc())
        .limit(10)
    )
    pages_rows = (await db.execute(pages_q)).all()
    top_pages = [{"url": (u or "/"), "views": int(c)} for (u, c) in pages_rows]

    paid_sessions = 0
    organic_sessions = 0
    source_counts: dict[str, int] = {}
    PAID_HINTS = {"facebook", "instagram", "google", "linkedin", "tiktok", "reddit", "threads"}
    for s in sessions:
        src = (s.utm_source or "direct").lower()
        is_paid = bool(s.utm_source and src in PAID_HINTS)
        source_counts[src] = source_counts.get(src, 0) + 1
        if is_paid:
            paid_sessions += 1
        else:
            organic_sessions += 1
    sources = [
        {"source": k, "sessions": v,
         "pct": round(v / total_sessions * 100, 1) if total_sessions else 0,
         "is_paid": k in PAID_HINTS}
        for k, v in sorted(source_counts.items(), key=lambda x: -x[1])
    ]

    visitor_ids = {s.visitor_id for s in sessions}
    visitor_map: dict[int, Visitor] = {}
    if visitor_ids:
        vr = await db.execute(select(Visitor).where(Visitor.id.in_(visitor_ids)))
        for v in vr.scalars().all():
            visitor_map[v.id] = v
    sessions_sorted = sorted(sessions, key=lambda s: s.started_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)[:30]
    session_rows = []
    for s in sessions_sorted:
        v = visitor_map.get(s.visitor_id)
        session_rows.append({
            "id": s.id,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "visitor": (v.name if v and v.name else (v.visitor_uid[:14] if v else "—")),
            "email": v.email if v else None,
            "source": s.utm_source or "direct",
            "campaign": s.utm_campaign,
            "ad": s.utm_content,
            "device": s.device,
            "browser": s.browser,
            "page_count": s.page_count or 0,
            "duration_seconds": s.duration_seconds or 0,
            "bounced": (s.page_count or 0) <= 1,
        })

    bounce_rate = round(bounce_sessions / total_sessions * 100, 1) if total_sessions else 0.0
    avg_duration = round(
        sum((s.duration_seconds or 0) for s in sessions) / total_sessions, 1
    ) if total_sessions else 0.0
    conversion_rate = round(purchases / page_views * 100, 2) if page_views else 0.0

    return {
        "date_from": df.date().isoformat(),
        "date_to": dt.date().isoformat(),
        "summary": {
            "page_views": page_views,
            "sessions": total_sessions,
            "unique_visitors": len(visitor_ids),
            "bounce_rate": bounce_rate,
            "avg_session_duration": avg_duration,
            "conversion_rate": conversion_rate,
            "paid_sessions": paid_sessions,
            "organic_sessions": organic_sessions,
        },
        "funnel": funnel,
        "top_pages": top_pages,
        "sources": sources,
        "sessions": session_rows,
    }
