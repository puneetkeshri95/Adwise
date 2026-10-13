"""Seed dev DB with sample tenant, campaigns, sessions, and orders."""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from app.core.database import engine, async_session, Base
from app.core.security import hash_password
from app.models.user import User
from app.models.campaign import Campaign, AdSet, Ad
from app.models.tracking import Visitor, Session, Event, Order
from app.models.meta import MetaInsight
from app.services.tracking.attribution import compute_attribution


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # ─── User / Tenant ───
        user = User(
            email="demo@namyah.com",
            name="Demo User",
            hashed_password=hash_password("password123"),
            company="Namyah Demo",
        )
        db.add(user)
        await db.flush()
        tid = user.id

        # ─── Campaigns / AdSets / Ads ───
        campaigns_data = [
            ("camp_1", "Summer Collection 2026", "CONVERSIONS", 5000, 42500, 892000, 15230),
            ("camp_2", "Brand Awareness — North India", "REACH", 3000, 28700, 1240000, 8920),
            ("camp_3", "Retargeting — Cart Abandoners", "CONVERSIONS", 2000, 18300, 345000, 12100),
        ]
        campaigns = []
        for cid, name, obj, budget, spend, imp, clicks in campaigns_data:
            c = Campaign(
                tenant_id=tid, meta_campaign_id=cid, name=name, objective=obj,
                daily_budget=budget, spend=spend, impressions=imp, clicks=clicks,
                synced_at=datetime.now(timezone.utc),
            )
            db.add(c)
            await db.flush()
            campaigns.append(c)

        adsets = []
        for c in campaigns:
            for j in range(2):
                a = AdSet(
                    tenant_id=tid, campaign_id=c.id,
                    meta_adset_id=f"as_{c.id}_{j+1}",
                    name=f"{c.name} — Set {j+1}",
                    daily_budget=c.daily_budget // 2,
                    spend=c.spend // 2, impressions=c.impressions // 2, clicks=c.clicks // 2,
                )
                db.add(a)
                await db.flush()
                adsets.append(a)

        ads = []
        for a in adsets:
            for k in range(2):
                ad = Ad(
                    tenant_id=tid, ad_set_id=a.id,
                    meta_ad_id=f"ad_{a.id}_{k+1}",
                    name=f"Creative {k+1} — {a.name[:20]}",
                    creative_type="IMAGE",
                    spend=a.spend // 2, impressions=a.impressions // 2, clicks=a.clicks // 2,
                )
                db.add(ad)
                await db.flush()
                ads.append(ad)

        # ─── Sample Visitors with multi-touch journeys ───
        utms = [
            {"utm_source": "facebook", "utm_medium": "cpc", "utm_campaign": "summer_collection", "utm_content": ads[0].meta_ad_id, "fbclid": "fb.1.abc"},
            {"utm_source": "google", "utm_medium": "organic", "utm_campaign": "", "utm_content": "", "fbclid": ""},
            {"utm_source": "instagram", "utm_medium": "cpc", "utm_campaign": "retargeting", "utm_content": ads[8].meta_ad_id, "fbclid": "fb.1.xyz"},
        ]

        now = datetime.now(timezone.utc)
        for vi in range(15):
            v = Visitor(
                tenant_id=tid, visitor_uid=f"vis_{uuid.uuid4().hex[:12]}",
                email=f"user{vi}@example.com" if vi % 3 == 0 else "",
                name=f"User {vi}" if vi % 3 == 0 else "",
                identified=(vi % 3 == 0),
                first_seen=now - timedelta(days=14 - vi),
                last_seen=now - timedelta(hours=vi),
                total_visits=2 + vi % 3,
            )
            db.add(v)
            await db.flush()

            session_ids = []
            for s_idx in range(2 + vi % 3):
                u = utms[s_idx % len(utms)]
                s_time = now - timedelta(days=10 - vi, hours=s_idx * 6)
                s = Session(
                    tenant_id=tid, visitor_id=v.id,
                    session_uid=f"ses_{uuid.uuid4().hex[:12]}",
                    started_at=s_time, last_activity_at=s_time,
                    landing_page="https://example.com/products/summer-tee",
                    device="desktop", browser="Chrome", page_count=4,
                    has_conversion=(s_idx == (2 + vi % 3) - 1 and vi % 4 != 0),
                    **u,
                )
                db.add(s)
                await db.flush()
                session_ids.append(s.id)

                # Add page_view event
                ev = Event(
                    tenant_id=tid, visitor_id=v.id, session_id=s.id,
                    event_name="page_view", event_time=s_time,
                    page_url=s.landing_page,
                    utm_source=u["utm_source"], utm_medium=u["utm_medium"],
                    utm_campaign=u["utm_campaign"], utm_content=u["utm_content"],
                    fbclid=u["fbclid"],
                )
                db.add(ev)

            # Some visitors place orders
            if vi % 4 != 0:
                last_session_id = session_ids[-1]
                last_session = (await db.execute(
                    __import__("sqlalchemy").select(Session).where(Session.id == last_session_id)
                )).scalar_one()
                o = Order(
                    tenant_id=tid, visitor_id=v.id, session_id=last_session_id,
                    order_id=f"ord_{vi:04d}",
                    amount=2500 + vi * 350, currency="INR", status="confirmed",
                    utm_source=last_session.utm_source, utm_medium=last_session.utm_medium,
                    utm_campaign=last_session.utm_campaign,
                    utm_content=last_session.utm_content,
                    fbclid=last_session.fbclid,
                    converted_at=last_session.started_at + timedelta(minutes=20),
                )
                db.add(o)
                await db.flush()
                await compute_attribution(o, db)

        # ─── Meta insights (last 7 days, account level) ───
        for d in range(7):
            day = (now - timedelta(days=d)).strftime("%Y-%m-%d")
            mi = MetaInsight(
                tenant_id=tid, date=day, level="account", object_id="act_demo",
                object_name="Demo Account",
                impressions=125000 + d * 1000, clicks=2100 + d * 50,
                spend=12000 + d * 200, reach=85000 + d * 500,
                cpm=12.5, cpc=5.7, ctr=1.68, frequency=1.4,
                conversions=15 + d, actions=[{"action_type": "purchase", "value": 15 + d}],
            )
            db.add(mi)

        await db.commit()
        print(f"✅ Seeded tenant {tid}: 3 campaigns, 6 adsets, 12 ads, 15 visitors, ~11 orders, 7d insights.")
        print("   Login: demo@namyah.com / password123")


if __name__ == "__main__":
    asyncio.run(seed())
