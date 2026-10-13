"""Non-destructive demo seed — creates the AdWise demo tenant for product video.

Idempotent: re-running updates the existing demo tenant in place (never drops tables).
Run from backend/ as:  python seed_demo.py
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, delete

from app.core.database import async_session, init_db
from app.core.security import hash_password
from app.models.user import User
from app.models.campaign import Campaign, AdSet, Ad
from app.models.tracking import Visitor, Session, Event, Order
from app.models.meta import MetaConnection, MetaInsight
from app.services.tracking.attribution import compute_attribution


# ─── Configuration ───────────────────────────────────────────────────────────

DEMO_EMAIL = "demo@adwise.app"
DEMO_PASSWORD = "AdWiseDemo2026!"
DEMO_NAME = "Shubhang Sethi"
DEMO_COMPANY = "Namyah"

# Demo window: 1 May 2026 – 30 May 2026 (IST). Treat all timestamps as UTC for storage.
IST_OFFSET = timedelta(hours=5, minutes=30)


def ist_to_utc(dt: datetime) -> datetime:
    return (dt - IST_OFFSET).replace(tzinfo=timezone.utc)


def at(month: int, day: int, hour: int, minute: int) -> datetime:
    return ist_to_utc(datetime(2026, month, day, hour, minute))


# ─── Spec data ───────────────────────────────────────────────────────────────

CAMPAIGNS_SPEC = [
    # (meta_id, name, objective, daily_budget_paise, spend, impressions, clicks)
    ("23854920100000001", "Scale - AI Workshop - Broad (WC)",
     "OUTCOME_SALES", 2500, 72000, 1500000, 20835),
    ("23854920100000002", "Scale - AI Workshop - Interest Stack",
     "OUTCOME_SALES", 800, 24000, 500000, 6960),
    ("23854920100000003", "Retargeting - Video Viewers 75%+ (7D)",
     "OUTCOME_SALES", 400, 12000, 120000, 2640),
    ("23854920100000004", "Retargeting - Website Visitors (14D)",
     "OUTCOME_SALES", 267, 8000, 64000, 1536),
    ("23854920100000005", "Testing - New Creative Angles",
     "OUTCOME_SALES", 133, 4000, 83333, 1083),
]

# (campaign_idx, meta_adset_id, name, daily_budget, spend, impressions, clicks)
ADSETS_SPEC = [
    (0, "23854920200000001", "Broad 25-35 M+F (India)", 1042, 30000, 625000, 8375),
    (0, "23854920200000002", "Interest - AI Tools, Tech, Productivity", 833, 24000, 500000, 6700),
    (0, "23854920200000003", "Interest - Students, Young Professionals", 625, 18000, 375000, 5625),
    (1, "23854920200000004", "Entrepreneurs + Business Owners 25-40", 467, 14000, 291667, 3850),
    (1, "23854920200000005", "Students + Freshers 18-24", 333, 10000, 208333, 2917),
    (2, "23854920200000006", "IG Reel Viewers 75%+ - 7 Days", 233, 7000, 70000, 1540),
    (2, "23854920200000007", "FB Video Viewers 75%+ - 7 Days", 167, 5000, 50000, 1100),
    (3, "23854920200000008", "All Website Visitors - 14 Days (All Placements)", 267, 8000, 64000, 1536),
    (4, "23854920200000009", "TG2 CP2 - New Angle Testing (Reels)", 133, 4000, 83333, 1083),
]

# (adset_idx, meta_ad_id, name, format, spend, impressions, clicks, revenue, sales, slug_for_utm_content)
ADS_SPEC = [
    # Campaign 1 > AdSet 1 (Broad) — 3 ads
    (0, "23854920300000001", "How I Replaced My Team with 25 AI Tools", "Reels",
     14000, 291667, 3910, 48902, 98, "ai-replaced-team-reels"),
    (0, "23854920300000002", "Everyone is Using AI. Are You?", "Feed",
     10000, 208333, 2792, 34930, 70, "everyone-using-ai-feed"),
    (0, "23854920300000003", "Learn 25 AI Tools in 3 Hours", "Reels",
     6000, 125000, 1673, 20958, 42, "25-tools-3-hours-reels"),
    # AdSet 2 (Interest)
    (1, "23854920300000004", "AI Tools That Replaced My Job", "Reels",
     12000, 250000, 3350, 41916, 84, "ai-replaced-job-reels"),
    (1, "23854920300000005", "Master AI in 1 Weekend", "Feed",
     12000, 250000, 3350, 41916, 84, "master-ai-weekend-feed"),
    # AdSet 3 (Students)
    (2, "23854920300000006", "AI Skills That Pay More Than a Job", "Reels",
     9000, 187500, 2812, 31437, 63, "ai-skills-pay-more-reels"),
    (2, "23854920300000007", "From Student to AI Pro in 30 Days", "Feed",
     9000, 187500, 2813, 31437, 63, "student-to-ai-pro-feed"),
    # Campaign 2 > AdSet 4 (Entrepreneurs)
    (3, "23854920300000008", "Entrepreneurs Are Using AI Like This", "Reels",
     14000, 291667, 3850, 48902, 98, "entrepreneurs-using-ai-reels"),
    # Campaign 2 > AdSet 5 (Students 18-24)
    (4, "23854920300000009", "Land an AI Internship in 30 Days", "Reels",
     10000, 208333, 2917, 34930, 70, "land-ai-internship-reels"),
    # Campaign 3 > AdSet 6 (IG Reel Viewers)
    (5, "23854920300000010", "Still Thinking About the AI Workshop?", "Reels",
     7000, 70000, 1540, 29940, 60, "still-thinking-soft-cta"),
    # Campaign 3 > AdSet 7 (FB Video Viewers)
    (6, "23854920300000011", "Last Chance: AI Workshop", "Reels",
     5000, 50000, 1100, 20958, 42, "last-chance-ai-workshop"),
    # Campaign 4 > AdSet 8 (Website Visitors)
    (7, "23854920300000012", "Come Back to the Workshop", "Reels",
     8000, 64000, 1536, 27445, 55, "come-back-workshop"),
    # Campaign 5 > AdSet 9 (Testing)
    (8, "23854920300000013", "Angle A - Before/After AI in My Work", "Reels",
     2000, 41667, 542, 3493, 7, "angle-a-before-after"),
    (8, "23854920300000014", "Angle B - A Day in My AI Life", "Reels",
     1200, 25000, 325, 1996, 4, "angle-b-day-in-ai-life"),
    (8, "23854920300000015", "Angle C - AI vs Human Challenge", "Reels",
     800, 16667, 216, 499, 1, "angle-c-ai-vs-human"),
]

# Daily breakdown from spec TABLE 7 — (day_of_may, spend, sales, revenue)
DAILY_BREAKDOWN = [
    (1, 2100, 11, 5489), (2, 2300, 12, 5988), (3, 2400, 14, 6986),
    (4, 2600, 15, 7485), (5, 2800, 18, 8982), (6, 3100, 21, 10479),
    (7, 3200, 22, 10978), (8, 3400, 24, 11976), (9, 3300, 23, 11477),
    (10, 3500, 25, 12475), (11, 3600, 26, 12974), (12, 3700, 27, 13473),
    (13, 3900, 28, 13972), (14, 4100, 30, 14970), (15, 4200, 31, 15469),
    (16, 4300, 30, 14970), (17, 4100, 29, 14471), (18, 4400, 32, 15968),
    (19, 4500, 32, 15968), (20, 4600, 33, 16467), (21, 4700, 34, 16966),
    (22, 4800, 35, 17465), (23, 4900, 36, 17964), (24, 5000, 37, 18463),
    (25, 5100, 37, 18463), (26, 4800, 35, 17465), (27, 5200, 36, 17964),
    (28, 5300, 38, 18962), (29, 5400, 39, 19461), (30, 5100, 34, 16966),
]

# 15 named conversions from spec TABLE 26
CONVERSIONS_SPEC = [
    # (name, email, phone, day, hour, minute, order_id, campaign_idx, adset_idx, ad_idx, source, medium, placement)
    ("Rahul Sharma", "rahul.sharma.del94@gmail.com", "+91 98765 43210",
     2, 9, 14, "order_RahulSha2May26", 0, 0, 0, "instagram", "paid_social", "Instagram Reels"),
    ("Priya Gupta", "priyagupta.2001@gmail.com", "+91 87654 32109",
     3, 19, 42, "order_PriyaGu3May26", 0, 0, 1, "instagram", "paid_social", "Instagram Feed"),
    ("Aakash Mehta", "aakash.mehta.work@gmail.com", "+91 76543 21098",
     5, 11, 23, "order_AakashMe5May26", 1, 3, 7, "facebook", "paid_social", "Facebook Feed"),
    ("Sneha Joshi", "sneha.joshi28@gmail.com", "+91 95432 10987",
     7, 15, 7, "order_SnehaJo7May26", 2, 5, 9, "instagram", "paid_social", "Instagram Feed"),
    ("Rohan Verma", "rohan.verma.99@gmail.com", "+91 84321 09876",
     9, 8, 55, "order_RohanVe9May26", 0, 0, 0, "facebook", "paid_social", "Facebook Reels"),
    ("Anjali Pillai", "anjali.pillai.k@gmail.com", "+91 73210 98765",
     11, 12, 40, "order_AnjaliPi11May26", 0, 0, 0, "instagram", "paid_social", "Instagram Reels"),
    ("Vivek Yadav", "vivek.yadav.in@gmail.com", "+91 92109 87654",
     13, 10, 18, "order_VivekYa13May26", 1, 3, 7, "facebook", "paid_social", "Facebook Feed"),
    ("Neha Kapoor", "neha.kapoor.nk@gmail.com", "+91 81098 76543",
     15, 18, 32, "order_NehaKa15May26", 3, 7, 11, "instagram", "paid_social", "Instagram Feed"),
    ("Arjun Nair", "arjun.nair.k@gmail.com", "+91 70987 65432",
     17, 2, 15, "order_ArjunNa17May26", 0, 0, 0, "instagram", "paid_social", "Instagram Reels"),
    ("Pooja Mishra", "pooja.mishra.pm@gmail.com", "+91 99876 54321",
     19, 16, 48, "order_PoojaM19May26", 0, 0, 1, "facebook", "paid_social", "Facebook Feed"),
    ("Karan Singh", "karan.singh.ks@gmail.com", "+91 88765 43210",
     21, 9, 1, "order_KaranSi21May26", 1, 4, 8, "instagram", "paid_social", "Instagram Reels"),
    ("Divya Reddy", "divya.reddy.hyd@gmail.com", "+91 77654 32109",
     23, 13, 27, "order_DivyaRe23May26", 2, 5, 9, "instagram", "paid_social", "Instagram Reels"),
    ("Sumit Bhatia", "sumit.bhatia.del@gmail.com", "+91 96543 21098",
     25, 17, 9, "order_SumitBh25May26", 0, 0, 0, "facebook", "paid_social", "Facebook Reels"),
    ("Meera Nambiar", "meera.nambiar.m@gmail.com", "+91 85432 10987",
     27, 11, 44, "order_MeeraNa27May26", 0, 0, 1, "instagram", "paid_social", "Instagram Feed"),
    ("Harsh Agarwal", "harsh.agarwal.7@gmail.com", "+91 74321 09876",
     29, 19, 23, "order_HarshAg29May26", 4, 8, 12, "instagram", "paid_social", "Instagram Reels"),
]

# Filler-only first names for the 826 anonymous orders that fill the 841 total
FILLER_FIRST = ["Aarav", "Vihaan", "Aditya", "Vivaan", "Reyansh", "Krishna", "Ishaan",
                "Shaurya", "Atharv", "Advait", "Pranav", "Aryan", "Kabir", "Riaan",
                "Saanvi", "Anaya", "Aadhya", "Aaradhya", "Pari", "Anika", "Kiara",
                "Myra", "Sara", "Ira", "Tara", "Riya", "Diya", "Aisha", "Zara",
                "Avni", "Navya", "Aanya", "Pihu", "Mira", "Avantika"]
FILLER_LAST = ["Kumar", "Patel", "Sharma", "Singh", "Gupta", "Jain", "Shah",
               "Reddy", "Iyer", "Menon", "Pillai", "Nair", "Bose", "Sen", "Das",
               "Mishra", "Yadav", "Verma", "Kapoor", "Khanna", "Malhotra", "Bhatia"]


# ─── Build helpers ───────────────────────────────────────────────────────────

async def get_or_create_user(db) -> User:
    """Find or create the demo user; returns the user with .id set."""
    existing = (await db.execute(select(User).where(User.email == DEMO_EMAIL))).scalar_one_or_none()
    if existing:
        existing.name = DEMO_NAME
        existing.company = DEMO_COMPANY
        existing.hashed_password = hash_password(DEMO_PASSWORD)
        existing.is_active = True
        await db.flush()
        return existing
    user = User(
        email=DEMO_EMAIL,
        name=DEMO_NAME,
        hashed_password=hash_password(DEMO_PASSWORD),
        company=DEMO_COMPANY,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return user


async def wipe_demo_data(db, tid: int):
    """Remove all demo-tenant data so re-runs are clean (does NOT touch other tenants)."""
    await db.execute(delete(Order).where(Order.tenant_id == tid))
    await db.execute(delete(Event).where(Event.tenant_id == tid))
    await db.execute(delete(Session).where(Session.tenant_id == tid))
    await db.execute(delete(Visitor).where(Visitor.tenant_id == tid))
    await db.execute(delete(MetaInsight).where(MetaInsight.tenant_id == tid))
    await db.execute(delete(Ad).where(Ad.tenant_id == tid))
    await db.execute(delete(AdSet).where(AdSet.tenant_id == tid))
    await db.execute(delete(Campaign).where(Campaign.tenant_id == tid))
    await db.execute(delete(MetaConnection).where(MetaConnection.tenant_id == tid))
    await db.flush()


async def upsert_meta_connection(db, tid: int):
    conn = MetaConnection(
        tenant_id=tid,
        ad_account_id="act_4582948555322882",
        access_token_encrypted="DEMO_TOKEN_NOT_REAL",
        token_expires_at=datetime.now(timezone.utc) + timedelta(days=180),
        scopes="ads_read,ads_management,business_management",
        is_active=True,
        connected_at=datetime.now(timezone.utc) - timedelta(days=45),
        last_synced_at=datetime.now(timezone.utc) - timedelta(minutes=12),
    )
    db.add(conn)
    await db.flush()


async def insert_campaigns(db, tid: int):
    cs: list[Campaign] = []
    for meta_id, name, obj, budget, spend, imp, clicks in CAMPAIGNS_SPEC:
        c = Campaign(
            tenant_id=tid, meta_campaign_id=meta_id, name=name, objective=obj,
            status="ACTIVE", daily_budget=budget, spend=float(spend),
            impressions=imp, clicks=clicks,
            synced_at=datetime.now(timezone.utc),
        )
        db.add(c)
        cs.append(c)
    await db.flush()
    return cs


async def insert_adsets(db, tid: int, campaigns):
    asets: list[AdSet] = []
    for camp_idx, meta_id, name, budget, spend, imp, clicks in ADSETS_SPEC:
        a = AdSet(
            tenant_id=tid, campaign_id=campaigns[camp_idx].id,
            meta_adset_id=meta_id, name=name, status="ACTIVE",
            daily_budget=budget, spend=float(spend),
            impressions=imp, clicks=clicks,
        )
        db.add(a)
        asets.append(a)
    await db.flush()
    return asets


async def insert_ads(db, tid: int, adsets):
    ads: list[Ad] = []
    for adset_idx, meta_id, name, fmt, spend, imp, clicks, revenue, sales, slug in ADS_SPEC:
        ad = Ad(
            tenant_id=tid, ad_set_id=adsets[adset_idx].id,
            meta_ad_id=meta_id, name=name, status="ACTIVE",
            creative_type="VIDEO" if fmt == "Reels" else "IMAGE",
            spend=float(spend), impressions=imp, clicks=clicks,
        )
        db.add(ad)
        ads.append(ad)
    await db.flush()
    return ads


async def insert_meta_insights(db, tid: int, campaigns, adsets, ads):
    """Daily MetaInsight rows summing to spec totals; spreads across days proportional to TABLE 7."""
    total_spend = sum(d[1] for d in DAILY_BREAKDOWN)  # ~120,400

    # For each ad, distribute its 30-day total across the 30 days proportional to daily spend share
    for ad_idx, (adset_idx, meta_id, name, fmt, spend, imp, clicks, revenue, sales, slug) in enumerate(ADS_SPEC):
        for day, d_spend, d_sales, d_rev in DAILY_BREAKDOWN:
            share = d_spend / total_spend
            insight = MetaInsight(
                tenant_id=tid, date=f"2026-05-{day:02d}",
                level="ad", object_id=meta_id, object_name=name,
                impressions=int(imp * share),
                clicks=int(clicks * share),
                spend=round(spend * share, 2),
                reach=int(imp * share * 0.7),
                cpm=48.0 if "Retargeting" not in name else 100.0,
                cpc=3.46, ctr=1.39,
                frequency=1.4, conversions=int(sales * share),
                actions=[{"action_type": "purchase", "value": int(sales * share)}],
                conversion_values=round(revenue * share, 2),
            )
            db.add(insight)

    # Also add adset + campaign rollups so /reporting/campaigns can use Meta data directly
    for adset_idx, (camp_idx, meta_id, name, budget, spend, imp, clicks) in enumerate(ADSETS_SPEC):
        for day, d_spend, d_sales, d_rev in DAILY_BREAKDOWN:
            share = d_spend / total_spend
            db.add(MetaInsight(
                tenant_id=tid, date=f"2026-05-{day:02d}",
                level="adset", object_id=meta_id, object_name=name,
                impressions=int(imp * share), clicks=int(clicks * share),
                spend=round(spend * share, 2),
            ))

    for camp_idx, (meta_id, name, obj, budget, spend, imp, clicks) in enumerate(CAMPAIGNS_SPEC):
        for day, d_spend, d_sales, d_rev in DAILY_BREAKDOWN:
            share = d_spend / total_spend
            db.add(MetaInsight(
                tenant_id=tid, date=f"2026-05-{day:02d}",
                level="campaign", object_id=meta_id, object_name=name,
                impressions=int(imp * share), clicks=int(clicks * share),
                spend=round(spend * share, 2),
            ))
    await db.flush()


def _slug_for_ad(ad_idx: int) -> str:
    return ADS_SPEC[ad_idx][9]


def _campaign_utm_slug(camp_name: str) -> str:
    if "Broad" in camp_name:
        return "scale-broad-wc"
    if "Interest Stack" in camp_name:
        return "scale-interest-stack"
    if "Video Viewers" in camp_name:
        return "retargeting-video-viewers"
    if "Website Visitors" in camp_name:
        return "retargeting-website-visitors"
    return "testing-new-angles"


async def insert_named_conversions(db, tid: int, campaigns, adsets, ads):
    """Create the 15 spec'd visitors with full funnels and orders."""
    for spec in CONVERSIONS_SPEC:
        (name, email, phone, day, hour, minute, order_id_str,
         camp_idx, adset_idx, ad_idx, src, med, placement) = spec
        camp = campaigns[camp_idx]
        adset = adsets[adset_idx]
        ad = ads[ad_idx]
        utm_camp = _campaign_utm_slug(camp.name)
        utm_content = _slug_for_ad(ad_idx)

        v = Visitor(
            tenant_id=tid, visitor_uid=f"vis_demo_{uuid.uuid4().hex[:10]}",
            email=email, phone=phone, name=name, identified=True,
            first_seen=at(5, day, max(0, hour - 1), 0),
            last_seen=at(5, day, hour, minute),
            total_visits=1,
            device_info={"device": "Mobile", "os": "Android" if src == "instagram" else "iOS"},
        )
        db.add(v)
        await db.flush()

        # Determine funnel — Sneha gets the multi-session retargeting journey
        is_sneha = order_id_str == "order_SnehaJo7May26"
        is_rahul = order_id_str == "order_RahulSha2May26"
        is_karan = order_id_str == "order_KaranSi21May26"

        landing = "https://namyah.com/ai-mastery-workshop-by-shubhang-sethi"

        if is_sneha:
            await _build_sneha(db, tid, v, ads)
            continue

        # All other journeys: single session, ad click → page view → engagement → checkout → payment
        # Reverse-engineer timing so payment happens at (day, hour, minute)
        if is_rahul:
            ad_click_t = at(5, day, 8, 58)  # 17 min before 9:14
            steps = [
                ("page_view", at(5, day, 8, 58), {"section": "landing"}),
                ("scroll_depth", at(5, day, 9, 2), {"depth_pct": 80, "duration_sec": 240}),
                ("cta_click", at(5, day, 9, 6), {"label": "Watch Now"}),
                ("checkout_started", at(5, day, 9, 8), {"provider": "razorpay"}),
            ]
            session_started = ad_click_t
        elif is_karan:
            ad_click_t = at(5, day, 8, 59)
            steps = [
                ("page_view", at(5, day, 8, 59), {}),
                ("scroll_depth", at(5, day, 9, 0), {"depth_pct": 60}),
                ("cta_click", at(5, day, 9, 1), {"label": "Watch Now"}),
                ("checkout_started", at(5, day, 9, 1), {"provider": "razorpay"}),
            ]
            session_started = ad_click_t
        else:
            # generic: payment 8 minutes after click
            ad_click_t = at(5, day, hour, max(0, minute - 8))
            steps = [
                ("page_view", ad_click_t, {}),
                ("scroll_depth", at(5, day, hour, max(0, minute - 5)), {"depth_pct": 70}),
                ("cta_click", at(5, day, hour, max(0, minute - 3)), {"label": "Watch Now"}),
                ("checkout_started", at(5, day, hour, max(0, minute - 1)), {"provider": "razorpay"}),
            ]
            session_started = ad_click_t

        s = Session(
            tenant_id=tid, visitor_id=v.id,
            session_uid=f"ses_demo_{uuid.uuid4().hex[:10]}",
            utm_source=src, utm_medium=med, utm_campaign=utm_camp,
            utm_content=utm_content, fbclid=f"fb.1.demo.{uuid.uuid4().hex[:8]}",
            landing_page=landing, referrer=f"https://www.{src}.com/",
            device="Mobile" if "Reels" in placement else "Desktop",
            browser="Chrome", page_count=1 + len(steps),
            started_at=session_started,
            last_activity_at=at(5, day, hour, minute),
            has_conversion=True, is_active=False,
        )
        db.add(s)
        await db.flush()

        for ev_name, ev_time, props in steps:
            db.add(Event(
                tenant_id=tid, visitor_id=v.id, session_id=s.id,
                event_name=ev_name, event_time=ev_time,
                page_url=landing, page_title="AI Mastery Workshop",
                utm_source=src, utm_medium=med, utm_campaign=utm_camp,
                utm_content=utm_content, properties=props,
            ))

        purchase_t = at(5, day, hour, minute)
        db.add(Event(
            tenant_id=tid, visitor_id=v.id, session_id=s.id,
            event_name="purchase", event_time=purchase_t,
            page_url=landing, page_title="Order Confirmation",
            utm_source=src, utm_medium=med, utm_campaign=utm_camp,
            utm_content=utm_content,
            properties={"order_id": order_id_str, "amount": 499, "currency": "INR",
                        "payment_method": "UPI" if "Reels" in placement else "Credit Card"},
        ))

        o = Order(
            tenant_id=tid, visitor_id=v.id, session_id=s.id,
            order_id=order_id_str, amount=499.0, currency="INR", status="confirmed",
            utm_source=src, utm_medium=med, utm_campaign=utm_camp,
            utm_content=utm_content, fbclid=s.fbclid,
            converted_at=purchase_t,
            touchpoint_session_ids=[s.id],
        )
        db.add(o)
        await db.flush()
        await compute_attribution(o, db)


async def _build_sneha(db, tid: int, v: Visitor, ads):
    """Sneha: 2 sessions across 2 days. Bounce on first, retargeted, converts."""
    landing = "https://namyah.com/ai-mastery-workshop-by-shubhang-sethi"
    # Session 1: 5 May, Facebook Feed, bounce
    s1_start = at(5, 5, 14, 12)
    s1 = Session(
        tenant_id=tid, visitor_id=v.id,
        session_uid=f"ses_demo_{uuid.uuid4().hex[:10]}",
        utm_source="facebook", utm_medium="paid_social",
        utm_campaign="scale-broad-wc", utm_content="everyone-using-ai-feed",
        fbclid=f"fb.1.demo.{uuid.uuid4().hex[:8]}",
        landing_page=landing, device="Desktop", browser="Firefox",
        page_count=1, started_at=s1_start,
        last_activity_at=at(5, 5, 14, 16),
        has_conversion=False, is_active=False,
    )
    db.add(s1)
    await db.flush()
    db.add(Event(
        tenant_id=tid, visitor_id=v.id, session_id=s1.id,
        event_name="page_view", event_time=at(5, 5, 14, 14),
        page_url=landing, utm_source="facebook", utm_medium="paid_social",
        utm_campaign="scale-broad-wc", utm_content="everyone-using-ai-feed",
        properties={},
    ))
    db.add(Event(
        tenant_id=tid, visitor_id=v.id, session_id=s1.id,
        event_name="bounce", event_time=at(5, 5, 14, 16),
        page_url=landing, utm_source="facebook", utm_medium="paid_social",
        utm_campaign="scale-broad-wc", utm_content="everyone-using-ai-feed",
        properties={"depth_pct": 45},
    ))

    # Session 2: 7 May, Instagram retargeting, converts
    s2_start = at(5, 7, 14, 56)
    s2 = Session(
        tenant_id=tid, visitor_id=v.id,
        session_uid=f"ses_demo_{uuid.uuid4().hex[:10]}",
        utm_source="instagram", utm_medium="paid_social",
        utm_campaign="retargeting-video-viewers", utm_content="still-thinking-soft-cta",
        fbclid=f"fb.1.demo.{uuid.uuid4().hex[:8]}",
        landing_page=landing, device="Mobile", browser="Safari",
        page_count=4, started_at=s2_start,
        last_activity_at=at(5, 7, 15, 7),
        has_conversion=True, is_active=False,
    )
    db.add(s2)
    await db.flush()

    s2_events = [
        ("page_view", at(5, 7, 14, 56), {}),
        ("scroll_depth", at(5, 7, 15, 1), {"depth_pct": 100, "video_watched": True, "duration_sec": 300}),
        ("cta_click", at(5, 7, 15, 4), {"label": "Watch Now"}),
        ("checkout_started", at(5, 7, 15, 5), {"provider": "razorpay"}),
        ("purchase", at(5, 7, 15, 7),
         {"order_id": "order_SnehaJo7May26", "amount": 499, "payment_method": "Credit Card"}),
    ]
    for ev_name, ev_time, props in s2_events:
        db.add(Event(
            tenant_id=tid, visitor_id=v.id, session_id=s2.id,
            event_name=ev_name, event_time=ev_time,
            page_url=landing, utm_source="instagram", utm_medium="paid_social",
            utm_campaign="retargeting-video-viewers", utm_content="still-thinking-soft-cta",
            properties=props,
        ))

    o = Order(
        tenant_id=tid, visitor_id=v.id, session_id=s2.id,
        order_id="order_SnehaJo7May26", amount=499.0, currency="INR", status="confirmed",
        utm_source="instagram", utm_medium="paid_social",
        utm_campaign="retargeting-video-viewers", utm_content="still-thinking-soft-cta",
        fbclid=s2.fbclid,
        converted_at=at(5, 7, 15, 7),
        touchpoint_session_ids=[s1.id, s2.id],
    )
    db.add(o)
    await db.flush()
    await compute_attribution(o, db)


async def insert_filler_orders(db, tid: int, campaigns, adsets, ads):
    """Add anonymous filler orders to reach the 841-total per spec.

    For each day in DAILY_BREAKDOWN, subtract named conversions on that day, then
    create the remainder as light visitor + session + order rows (no full event funnel).
    """
    import random
    rng = random.Random(2026)

    named_by_day: dict[int, int] = {}
    for spec in CONVERSIONS_SPEC:
        d = spec[3]
        named_by_day[d] = named_by_day.get(d, 0) + 1

    # Map ad → utm_content + campaign slug
    ad_options = []
    for ad_idx, spec in enumerate(ADS_SPEC):
        adset_idx = spec[0]
        camp_idx = ADSETS_SPEC[adset_idx][0]
        ad_options.append({
            "ad_idx": ad_idx, "adset_idx": adset_idx, "camp_idx": camp_idx,
            "utm_content": spec[9],
            "utm_campaign": _campaign_utm_slug(campaigns[camp_idx].name),
        })

    # Weight ads by their share of total revenue so the filler matches Section 6 distribution
    weights = [ADS_SPEC[i][7] for i in range(len(ADS_SPEC))]
    sources = [
        ("instagram", "paid_social", "Instagram Reels", 0.45),
        ("facebook", "paid_social", "Facebook Feed", 0.25),
        ("instagram", "paid_social", "Instagram Feed", 0.20),
        ("facebook", "paid_social", "Facebook Reels", 0.07),
        ("threads", "paid_social", "Threads", 0.01),
        ("", "", "Direct", 0.02),
    ]

    seq = 0
    for day, d_spend, d_sales, d_rev in DAILY_BREAKDOWN:
        target = d_sales - named_by_day.get(day, 0)
        for _ in range(max(0, target)):
            seq += 1
            first = rng.choice(FILLER_FIRST)
            last = rng.choice(FILLER_LAST)
            ad_pick = rng.choices(ad_options, weights=weights, k=1)[0]
            src_pick = rng.choices(sources, weights=[s[3] for s in sources], k=1)[0]
            src, med, placement, _ = src_pick

            hour = rng.randint(8, 22)
            minute = rng.randint(0, 59)
            convert_t = at(5, day, hour, minute)
            session_start = convert_t - timedelta(minutes=rng.randint(5, 90))

            uid = f"vis_filler_{day:02d}_{seq:05d}"
            email = f"{first.lower()}.{last.lower()}.{seq}@example.com" if rng.random() < 0.3 else ""
            phone = "+91 " + "".join([str(rng.randint(0, 9)) for _ in range(10)]) if rng.random() < 0.4 else ""

            v = Visitor(
                tenant_id=tid, visitor_uid=uid,
                email=email, phone=phone,
                name=f"{first} {last}" if email or phone else "",
                identified=bool(email),
                first_seen=session_start, last_seen=convert_t, total_visits=1,
            )
            db.add(v)
            await db.flush()

            s = Session(
                tenant_id=tid, visitor_id=v.id,
                session_uid=f"ses_filler_{day:02d}_{seq:05d}",
                utm_source=src or "", utm_medium=med or "",
                utm_campaign=ad_pick["utm_campaign"] if src else "",
                utm_content=ad_pick["utm_content"] if src else "",
                fbclid=f"fb.1.fill.{seq}" if src else "",
                landing_page="https://namyah.com/ai-mastery-workshop-by-shubhang-sethi",
                device="Mobile" if "Reels" in placement else "Desktop",
                browser="Chrome", page_count=2,
                started_at=session_start, last_activity_at=convert_t,
                has_conversion=True, is_active=False,
            )
            db.add(s)
            await db.flush()

            db.add(Event(
                tenant_id=tid, visitor_id=v.id, session_id=s.id,
                event_name="page_view", event_time=session_start,
                page_url=s.landing_page,
                utm_source=s.utm_source, utm_medium=s.utm_medium,
                utm_campaign=s.utm_campaign, utm_content=s.utm_content,
                properties={},
            ))

            o = Order(
                tenant_id=tid, visitor_id=v.id, session_id=s.id,
                order_id=f"ord_filler_{day:02d}_{seq:05d}",
                amount=499.0, currency="INR", status="confirmed",
                utm_source=s.utm_source, utm_medium=s.utm_medium,
                utm_campaign=s.utm_campaign, utm_content=s.utm_content,
                fbclid=s.fbclid, converted_at=convert_t,
                touchpoint_session_ids=[s.id],
            )
            db.add(o)
        # commit per day to keep memory bounded
        await db.flush()


async def insert_extra_landing_views(db, tid: int):
    """Add raw page_view events to reach ~28,040 LP views without orders for organic-flavored noise."""
    import random
    rng = random.Random(7777)
    target = 28040 - 1 - len(CONVERSIONS_SPEC) - sum(d[2] - 0 for d in DAILY_BREAKDOWN) // 2
    # Cap to keep seed fast — 5,000 extra page views is plenty for the demo
    target = min(target, 5000) if target > 0 else 0

    # Bulk-create one ghost visitor + sessions for these — no order rows
    landing = "https://namyah.com/ai-mastery-workshop-by-shubhang-sethi"
    for batch in range(target):
        if batch % 1000 == 0:
            await db.flush()
        day = rng.randint(1, 30)
        hour = rng.randint(7, 23)
        minute = rng.randint(0, 59)
        ts = at(5, day, hour, minute)
        v = Visitor(
            tenant_id=tid, visitor_uid=f"vis_view_{batch:05d}",
            first_seen=ts, last_seen=ts, total_visits=1,
        )
        db.add(v)
        await db.flush()
        s = Session(
            tenant_id=tid, visitor_id=v.id,
            session_uid=f"ses_view_{batch:05d}",
            utm_source="instagram", utm_medium="paid_social",
            utm_campaign="scale-broad-wc",
            utm_content=ADS_SPEC[rng.randint(0, len(ADS_SPEC) - 1)][9],
            landing_page=landing, device="Mobile", browser="Chrome",
            page_count=1, started_at=ts, last_activity_at=ts,
        )
        db.add(s)
        await db.flush()
        db.add(Event(
            tenant_id=tid, visitor_id=v.id, session_id=s.id,
            event_name="page_view", event_time=ts, page_url=landing,
            utm_source=s.utm_source, utm_medium=s.utm_medium,
            utm_campaign=s.utm_campaign, utm_content=s.utm_content, properties={},
        ))
    await db.flush()


async def main():
    await init_db()
    async with async_session() as db:
        print("-> Locating demo user...")
        user = await get_or_create_user(db)
        tid = user.id
        print(f"  demo user id = {tid} ({DEMO_EMAIL})")

        print("-> Wiping prior demo data (tenant-scoped)...")
        await wipe_demo_data(db, tid)

        print("-> Inserting Meta connection...")
        await upsert_meta_connection(db, tid)

        print("-> Inserting campaigns / adsets / ads...")
        campaigns = await insert_campaigns(db, tid)
        adsets = await insert_adsets(db, tid, campaigns)
        ads = await insert_ads(db, tid, adsets)

        print("-> Inserting 30 days of MetaInsight rows (3 levels)...")
        await insert_meta_insights(db, tid, campaigns, adsets, ads)

        print("-> Inserting 15 named visitor journeys + orders...")
        await insert_named_conversions(db, tid, campaigns, adsets, ads)

        print("-> Inserting filler conversions to reach 841 total sales...")
        await insert_filler_orders(db, tid, campaigns, adsets, ads)

        print("-> Inserting extra landing-page views for traffic depth...")
        await insert_extra_landing_views(db, tid)

        await db.commit()

        # Verify counts
        from sqlalchemy import func as sf
        n_orders = (await db.execute(
            select(sf.count(Order.id)).where(Order.tenant_id == tid)
        )).scalar()
        n_visitors = (await db.execute(
            select(sf.count(Visitor.id)).where(Visitor.tenant_id == tid)
        )).scalar()
        total_rev = (await db.execute(
            select(sf.coalesce(sf.sum(Order.amount), 0)).where(Order.tenant_id == tid)
        )).scalar()

        print()
        print("[OK] Demo seed complete.")
        print(f"   Login:    {DEMO_EMAIL}  /  {DEMO_PASSWORD}")
        print(f"   Orders:   {n_orders}")
        print(f"   Revenue:  Rs. {total_rev:,.0f}")
        print(f"   Visitors: {n_visitors}")
        print(f"   Window:   1 May 2026 - 30 May 2026 (IST)")


if __name__ == "__main__":
    asyncio.run(main())
