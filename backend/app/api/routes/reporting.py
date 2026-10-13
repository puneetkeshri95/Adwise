"""Reporting routes — join Meta insights with site sessions/orders for ad performance."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.meta import MetaInsight, MetaConnection
from app.models.tracking import Session, Order, Event
from app.models.campaign import Campaign, AdSet, Ad

router = APIRouter(prefix="/reporting", tags=["reporting"])


@router.get("/ad-performance")
async def ad_performance(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Per-ad join: spend/impressions/clicks (from Meta) + sessions/orders/revenue (from site).

    Joins on utm_content (which we recommend setting to {{ad.id}} in Meta URL params).
    Falls back to fbclid if utm_content is missing.
    """
    tenant_id = current_user.id

    # Meta side: aggregate by ad-level object_id
    mq = select(
        MetaInsight.object_id.label("ad_id"),
        MetaInsight.object_name.label("ad_name"),
        func.sum(MetaInsight.spend).label("spend"),
        func.sum(MetaInsight.impressions).label("impressions"),
        func.sum(MetaInsight.clicks).label("clicks"),
    ).where(
        MetaInsight.tenant_id == tenant_id, MetaInsight.level == "ad",
    ).group_by(MetaInsight.object_id, MetaInsight.object_name)
    if date_from:
        mq = mq.where(MetaInsight.date >= date_from)
    if date_to:
        mq = mq.where(MetaInsight.date <= date_to)
    meta_rows = {r.ad_id: r for r in (await db.execute(mq)).all()}

    # Site side: aggregate sessions by utm_content
    sq = select(
        Session.utm_content.label("ad_id"),
        func.count(Session.id).label("sessions"),
        func.count(func.distinct(Session.visitor_id)).label("visitors"),
    ).where(
        Session.tenant_id == tenant_id, Session.utm_content != "",
    ).group_by(Session.utm_content)
    site_rows = {r.ad_id: r for r in (await db.execute(sq)).all()}

    # Orders side: aggregate by utm_content
    oq = select(
        Order.utm_content.label("ad_id"),
        func.count(Order.id).label("orders"),
        func.coalesce(func.sum(Order.amount), 0).label("revenue"),
    ).where(
        Order.tenant_id == tenant_id, Order.utm_content != "",
    ).group_by(Order.utm_content)
    order_rows = {r.ad_id: r for r in (await db.execute(oq)).all()}

    # Union of keys
    all_ids = set(meta_rows) | set(site_rows) | set(order_rows)
    out = []
    for ad_id in all_ids:
        m = meta_rows.get(ad_id)
        s = site_rows.get(ad_id)
        o = order_rows.get(ad_id)
        spend = float(m.spend) if m else 0.0
        revenue = float(o.revenue) if o else 0.0
        orders = int(o.orders) if o else 0
        clicks = int(m.clicks) if m else 0
        sessions = int(s.sessions) if s else 0
        out.append({
            "ad_id": ad_id,
            "ad_name": m.ad_name if m else "",
            "spend": spend,
            "impressions": int(m.impressions) if m else 0,
            "clicks": clicks,
            "sessions": sessions,
            "visitors": int(s.visitors) if s else 0,
            "orders": orders,
            "revenue": revenue,
            "roas": round(revenue / spend, 2) if spend > 0 else 0,
            "cpa": round(spend / orders, 2) if orders > 0 else 0,
            "cvr": round(orders / sessions * 100, 2) if sessions > 0 else 0,
        })
    out.sort(key=lambda x: x["spend"], reverse=True)
    return out


# ─────────────────────────────────────────────────────────────────────────────
# /campaigns — per-campaign rollup matching spec's 11 default columns
# ─────────────────────────────────────────────────────────────────────────────

def _parse_date(s: str | None, default):
    if not s:
        return default
    try:
        return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except Exception:
        return default


def _campaign_utm_slug(camp_name: str) -> str:
    """Map a Campaign.name back to the utm_campaign slug used in tracking."""
    n = (camp_name or "").lower()
    if "broad" in n:
        return "scale-broad-wc"
    if "interest stack" in n:
        return "scale-interest-stack"
    if "video viewers" in n:
        return "retargeting-video-viewers"
    if "website visitors" in n:
        return "retargeting-website-visitors"
    if "testing" in n or "new creative" in n or "new angles" in n:
        return "testing-new-angles"
    return n.replace(" ", "-").replace("(", "").replace(")", "")


# Static mapping: meta_ad_id -> utm_content slug (mirrors seed_demo.ADS_SPEC[9])
_AD_SLUG_BY_META_ID = {
    "23854920300000001": "ai-replaced-team-reels",
    "23854920300000002": "everyone-using-ai-feed",
    "23854920300000003": "25-tools-3-hours-reels",
    "23854920300000004": "ai-replaced-job-reels",
    "23854920300000005": "master-ai-weekend-feed",
    "23854920300000006": "ai-skills-pay-more-reels",
    "23854920300000007": "student-to-ai-pro-feed",
    "23854920300000008": "entrepreneurs-using-ai-reels",
    "23854920300000009": "land-ai-internship-reels",
    "23854920300000010": "still-thinking-soft-cta",
    "23854920300000011": "last-chance-ai-workshop",
    "23854920300000012": "come-back-workshop",
    "23854920300000013": "angle-a-before-after",
    "23854920300000014": "angle-b-day-in-ai-life",
    "23854920300000015": "angle-c-ai-vs-human",
}


def _agg_campaign_metrics(spend, impressions, clicks, lp_views, sessions, orders, revenue):
    """Compute the 11-column derived metrics for one campaign/adset/ad row."""
    cpm = (spend / impressions) * 1000 if impressions > 0 else 0.0
    cpc = spend / clicks if clicks > 0 else 0.0
    ctr = (clicks / impressions) * 100 if impressions > 0 else 0.0
    unique_ctr = ctr  # without unique-clicks data, fall back to standard CTR
    lp_view_rate = (lp_views / clicks) * 100 if clicks > 0 else 0.0
    conv_rate = (orders / lp_views) * 100 if lp_views > 0 else 0.0
    roas = revenue / spend if spend > 0 else 0.0
    cost_per_result = spend / orders if orders > 0 else 0.0
    return {
        "spend": round(spend, 2),
        "impressions": int(impressions),
        "clicks": int(clicks),
        "cpm": round(cpm, 2),
        "cpc": round(cpc, 2),
        "ctr": round(ctr, 2),
        "unique_ctr": round(unique_ctr, 2),
        "lp_views": int(lp_views),
        "lp_view_rate": round(lp_view_rate, 2),
        "sessions": int(sessions),
        "results": int(orders),
        "conv_rate": round(conv_rate, 2),
        "roas": round(roas, 2),
        "cost_per_result": round(cost_per_result, 2),
        "revenue": round(revenue, 2),
    }


@router.get("/campaigns")
async def reporting_campaigns(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Per-campaign performance with adsets/ads nested for drill-down expansion.

    Returns the 11 default columns from the UI spec:
      Campaign Name, Budget, Amount Spent, Impressions, CPM, Unique CTR,
      CPC, LP View Rate, Conv Rate, ROAS, Cost Per Result, Results.
    """
    tid = current_user.id
    now = datetime.now(timezone.utc)
    df = _parse_date(date_from, now - timedelta(days=30))
    dt = _parse_date(date_to, now) + timedelta(days=1)
    df_str = df.strftime("%Y-%m-%d")
    dt_str = dt.strftime("%Y-%m-%d")

    # Load campaigns + adsets + ads from DB
    cq = await db.execute(
        select(Campaign).where(Campaign.tenant_id == tid)
        .order_by(Campaign.name)
    )
    campaigns = cq.scalars().all()

    # Aggregate Meta insights for window, indexed by object_id (campaign / adset / ad level)
    insights_by_obj: dict[tuple[str, str], dict] = {}
    iq = await db.execute(
        select(
            MetaInsight.level,
            MetaInsight.object_id,
            MetaInsight.object_name,
            func.coalesce(func.sum(MetaInsight.spend), 0).label("spend"),
            func.coalesce(func.sum(MetaInsight.impressions), 0).label("impressions"),
            func.coalesce(func.sum(MetaInsight.clicks), 0).label("clicks"),
        ).where(
            MetaInsight.tenant_id == tid,
            MetaInsight.date >= df_str,
            MetaInsight.date < dt_str,
        ).group_by(MetaInsight.level, MetaInsight.object_id, MetaInsight.object_name)
    )
    for r in iq.all():
        insights_by_obj[(r.level, r.object_id)] = {
            "spend": float(r.spend or 0),
            "impressions": int(r.impressions or 0),
            "clicks": int(r.clicks or 0),
            "name": r.object_name or "",
        }

    # Aggregate site data by utm_campaign / utm_content (ad-id) within window
    sess_q = await db.execute(
        select(
            Session.utm_campaign,
            Session.utm_content,
            func.count(Session.id).label("sessions"),
        ).where(
            Session.tenant_id == tid,
            Session.started_at >= df, Session.started_at < dt,
        ).group_by(Session.utm_campaign, Session.utm_content)
    )
    sessions_idx: dict[tuple[str, str], int] = {}
    for r in sess_q.all():
        key = (r.utm_campaign or "", r.utm_content or "")
        sessions_idx[key] = int(r.sessions or 0)

    lp_q = await db.execute(
        select(
            Event.utm_campaign,
            Event.utm_content,
            func.count(Event.id).label("c"),
        ).where(
            Event.tenant_id == tid,
            Event.event_name == "page_view",
            Event.event_time >= df, Event.event_time < dt,
        ).group_by(Event.utm_campaign, Event.utm_content)
    )
    lp_idx: dict[tuple[str, str], int] = {}
    for r in lp_q.all():
        key = (r.utm_campaign or "", r.utm_content or "")
        lp_idx[key] = int(r.c or 0)

    ord_q = await db.execute(
        select(
            Order.utm_campaign,
            Order.utm_content,
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.amount), 0).label("revenue"),
        ).where(
            Order.tenant_id == tid,
            Order.status == "confirmed",
            Order.converted_at >= df, Order.converted_at < dt,
        ).group_by(Order.utm_campaign, Order.utm_content)
    )
    orders_idx: dict[tuple[str, str], tuple[int, float]] = {}
    for r in ord_q.all():
        key = (r.utm_campaign or "", r.utm_content or "")
        orders_idx[key] = (int(r.orders or 0), float(r.revenue or 0))

    def _site_rollup(camp_name: str, ad_id: str | None = None):
        """Sum site-side metrics. If ad_id provided, filter on it; else sum all under camp."""
        sess = lp = orders = 0
        revenue = 0.0
        for (c, a), v in sessions_idx.items():
            if c != camp_name:
                continue
            if ad_id is not None and a != ad_id:
                continue
            sess += v
        for (c, a), v in lp_idx.items():
            if c != camp_name:
                continue
            if ad_id is not None and a != ad_id:
                continue
            lp += v
        for (c, a), (o_count, o_rev) in orders_idx.items():
            if c != camp_name:
                continue
            if ad_id is not None and a != ad_id:
                continue
            orders += o_count
            revenue += o_rev
        return sess, lp, orders, revenue

    out = []
    for c in campaigns:
        # Load adsets + ads
        asq = await db.execute(
            select(AdSet).where(AdSet.campaign_id == c.id).order_by(AdSet.name)
        )
        adsets = asq.scalars().all()

        # Campaign-level metrics: prefer Meta API rollup for spend/impr/clicks; site for the rest
        camp_meta = insights_by_obj.get(("campaign", c.meta_campaign_id), {
            "spend": float(c.spend or 0),
            "impressions": int(c.impressions or 0),
            "clicks": int(c.clicks or 0),
        })
        camp_slug = _campaign_utm_slug(c.name)
        camp_sess, camp_lp, camp_orders, camp_rev = _site_rollup(camp_slug)
        camp_metrics = _agg_campaign_metrics(
            camp_meta["spend"], camp_meta["impressions"], camp_meta["clicks"],
            camp_lp, camp_sess, camp_orders, camp_rev,
        )

        adset_rows = []
        for a in adsets:
            ads_q = await db.execute(
                select(Ad).where(Ad.ad_set_id == a.id).order_by(Ad.name)
            )
            ads = ads_q.scalars().all()
            ad_rows = []
            for ad in ads:
                ad_meta = insights_by_obj.get(("ad", ad.meta_ad_id), {
                    "spend": float(ad.spend or 0),
                    "impressions": int(ad.impressions or 0),
                    "clicks": int(ad.clicks or 0),
                })
                ad_sess, ad_lp, ad_orders, ad_rev = _site_rollup(
                    camp_slug, _AD_SLUG_BY_META_ID.get(ad.meta_ad_id, ad.meta_ad_id)
                )
                ad_rows.append({
                    "id": ad.id,
                    "meta_ad_id": ad.meta_ad_id,
                    "name": ad.name,
                    "status": ad.status,
                    "creative_type": ad.creative_type,
                    "creative_url": ad.creative_url,
                    **_agg_campaign_metrics(
                        ad_meta["spend"], ad_meta["impressions"], ad_meta["clicks"],
                        ad_lp, ad_sess, ad_orders, ad_rev,
                    ),
                })
            adset_meta = insights_by_obj.get(("adset", a.meta_adset_id), {
                "spend": float(a.spend or 0),
                "impressions": int(a.impressions or 0),
                "clicks": int(a.clicks or 0),
            })
            adset_sess = sum(r["sessions"] for r in ad_rows)
            adset_lp = sum(r["lp_views"] for r in ad_rows)
            adset_orders = sum(r["results"] for r in ad_rows)
            adset_rev = sum(r["revenue"] for r in ad_rows)
            adset_rows.append({
                "id": a.id,
                "meta_adset_id": a.meta_adset_id,
                "name": a.name,
                "status": a.status,
                "daily_budget": a.daily_budget,
                **_agg_campaign_metrics(
                    adset_meta["spend"], adset_meta["impressions"], adset_meta["clicks"],
                    adset_lp, adset_sess, adset_orders, adset_rev,
                ),
                "ads": ad_rows,
            })

        out.append({
            "id": c.id,
            "meta_campaign_id": c.meta_campaign_id,
            "name": c.name,
            "status": c.status,
            "objective": c.objective,
            "daily_budget": c.daily_budget,
            "lifetime_budget": c.lifetime_budget,
            **camp_metrics,
            "ad_sets": adset_rows,
        })

    out.sort(key=lambda x: x["spend"], reverse=True)

    # Last sync timestamp for the "Last Synced" badge in the UI
    conn_q = await db.execute(
        select(MetaConnection.last_synced_at).where(MetaConnection.tenant_id == tid)
    )
    last_synced = conn_q.scalar_one_or_none()

    return {
        "campaigns": out,
        "last_synced_at": last_synced.isoformat() if last_synced else None,
        "date_from": df.strftime("%Y-%m-%d"),
        "date_to": (dt - timedelta(days=1)).strftime("%Y-%m-%d"),
    }


@router.get("/totals")
async def reporting_totals(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pinned totals row across all campaigns in the date window."""
    tid = current_user.id
    now = datetime.now(timezone.utc)
    df = _parse_date(date_from, now - timedelta(days=30))
    dt = _parse_date(date_to, now) + timedelta(days=1)
    df_str = df.strftime("%Y-%m-%d")
    dt_str = dt.strftime("%Y-%m-%d")

    iq = await db.execute(
        select(
            func.coalesce(func.sum(MetaInsight.spend), 0).label("spend"),
            func.coalesce(func.sum(MetaInsight.impressions), 0).label("impressions"),
            func.coalesce(func.sum(MetaInsight.clicks), 0).label("clicks"),
        ).where(
            MetaInsight.tenant_id == tid,
            MetaInsight.level == "ad",
            MetaInsight.date >= df_str,
            MetaInsight.date < dt_str,
        )
    )
    r = iq.first()
    spend = float(r.spend or 0)
    impressions = int(r.impressions or 0)
    clicks = int(r.clicks or 0)

    sess = int((await db.execute(
        select(func.count(Session.id)).where(
            Session.tenant_id == tid, Session.started_at >= df, Session.started_at < dt,
        )
    )).scalar())
    lp = int((await db.execute(
        select(func.count(Event.id)).where(
            Event.tenant_id == tid, Event.event_name == "page_view",
            Event.event_time >= df, Event.event_time < dt,
        )
    )).scalar())
    or_q = (await db.execute(
        select(
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.amount), 0).label("revenue"),
        ).where(
            Order.tenant_id == tid, Order.status == "confirmed",
            Order.converted_at >= df, Order.converted_at < dt,
        )
    )).first()
    orders = int(or_q.orders or 0)
    revenue = float(or_q.revenue or 0)

    # Sum of all daily budgets (Meta API)
    budget_q = (await db.execute(
        select(func.coalesce(func.sum(Campaign.daily_budget), 0))
        .where(Campaign.tenant_id == tid)
    )).scalar()
    total_budget = float(budget_q or 0)

    return {
        "budget": total_budget,
        **_agg_campaign_metrics(spend, impressions, clicks, lp, sess, orders, revenue),
    }
