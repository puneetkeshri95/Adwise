"""
Tracking API — event ingestion, journeys, funnel analytics, by-ad analytics, pixel JS.
Endpoints:
  POST /track              — ingest events from JS snippet
  GET  /journeys           — stitched journey timeline for a visitor
  GET  /analytics/funnel   — funnel counts (visit → view_product → add_to_cart → checkout → purchase)
  GET  /analytics/by-ad    — group purchases/sessions by UTM + fbclid
  GET  /pixel/namyah.js    — serve tracking JS SDK
  GET  /pixel/p.gif        — 1x1 GIF fallback
"""
import uuid
import base64
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, Response, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, distinct
from pydantic import BaseModel
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from app.models.tracking import Visitor, Session, Event, Order
from app.services.tracking.session import get_or_create_session
from app.services.tracking.identity import resolve_visitor, identify_visitor
from app.services.tracking.attribution import compute_attribution

router = APIRouter(tags=["tracking"])

PIXEL_GIF = base64.b64decode(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
)


# ════════════════════════════════════════════════
#  Schemas
# ════════════════════════════════════════════════

class TrackEventIn(BaseModel):
    tenant_id: int | None = None  # legacy/internal; prefer pixel_id
    pixel_id: str | None = None   # public opaque ID (e.g. pxl_a4f9c2k7m8n3)
    visitor_id: str | None = None  # visitor_uid from cookie
    session_id: str | None = None  # session_uid from sessionStorage
    event_name: str               # page_view, view_product, add_to_cart, checkout, purchase, identify, custom
    event_time: str | None = None  # ISO string; defaults to server now
    page_url: str = ""
    page_title: str = ""
    referrer: str = ""
    # UTM fields (always attached by JS)
    utm_source: str = ""
    utm_medium: str = ""
    utm_campaign: str = ""
    utm_content: str = ""
    utm_term: str = ""
    utm_id: str = ""
    fbclid: str = ""
    gclid: str = ""
    # Optional identity
    user_id: str = ""          # external site user_id
    email: str = ""            # raw email for identify events
    phone: str = ""            # raw phone for identify events
    name: str = ""             # optional display name
    # Event-specific data
    properties: dict = {}
    # Device context (sent by JS)
    fingerprint: str = ""
    device: str = ""
    browser: str = ""
    screen_resolution: str = ""


class TrackEventOut(BaseModel):
    visitor_uid: str
    session_uid: str
    event_id: int
    status: str = "ok"


class JourneyEvent(BaseModel):
    event_id: int
    event_name: str
    event_time: str | None
    page_url: str
    page_title: str
    utm_source: str
    utm_medium: str
    utm_campaign: str
    utm_content: str
    fbclid: str
    session_uid: str | None
    properties: dict


class JourneyOut(BaseModel):
    visitor_uid: str
    visitor_name: str
    visitor_email: str
    identified: bool
    total_visits: int
    first_seen: str | None
    sessions: list[dict]
    events: list[JourneyEvent]


class FunnelStep(BaseModel):
    step: str
    count: int


class FunnelOut(BaseModel):
    steps: list[FunnelStep]
    date_from: str
    date_to: str


class ByAdRow(BaseModel):
    utm_source: str
    utm_medium: str
    utm_campaign: str
    utm_content: str
    fbclid: str
    sessions: int
    visitors: int
    purchases: int
    revenue: float


# ════════════════════════════════════════════════
#  Helpers
# ════════════════════════════════════════════════

def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


def _hash_email(email: str) -> str:
    if not email:
        return ""
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()


async def _resolve_tenant_id(pixel_id: str | None, tenant_id: int | None, db: AsyncSession) -> int:
    """Map a public pixel_id (preferred) or legacy numeric tenant_id to the User.id."""
    if pixel_id:
        r = await db.execute(select(User).where(User.pixel_id == pixel_id, User.is_active == True))
        u = r.scalar_one_or_none()
        if not u:
            raise HTTPException(status_code=400, detail="Invalid pixel_id")
        return u.id
    if tenant_id is not None:
        return tenant_id
    raise HTTPException(status_code=400, detail="pixel_id or tenant_id required")


# ════════════════════════════════════════════════
#  POST /track  — Universal event ingestion
# ════════════════════════════════════════════════

@router.post("/track", response_model=TrackEventOut)
@limiter.limit(settings.TRACK_RATE_LIMIT)
async def track_event(payload: TrackEventIn, request: Request, db: AsyncSession = Depends(get_db)):
    """Ingest a single event from the JS tracking snippet."""
    tenant_id = await _resolve_tenant_id(payload.pixel_id, payload.tenant_id, db)
    ip = _get_client_ip(request)
    ua = request.headers.get("user-agent", "")
    now = datetime.now(timezone.utc)

    # 1. Resolve visitor
    visitor = await resolve_visitor(
        tenant_id=tenant_id,
        db=db,
        visitor_uid=payload.visitor_id,
        ip_address=ip,
        fingerprint=payload.fingerprint,
        user_agent=ua,
        device_info={"device": payload.device, "browser": payload.browser, "screen": payload.screen_resolution},
    )

    # 2. Get or create session (30-min inactivity)
    utms = {
        "utm_source": payload.utm_source,
        "utm_medium": payload.utm_medium,
        "utm_campaign": payload.utm_campaign,
        "utm_content": payload.utm_content,
        "utm_term": payload.utm_term,
        "utm_id": payload.utm_id,
        "fbclid": payload.fbclid,
        "gclid": payload.gclid,
    }
    context = {
        "page_url": payload.page_url,
        "referrer": payload.referrer,
        "ip_address": ip,
        "device": payload.device,
        "browser": payload.browser,
        "screen_resolution": payload.screen_resolution,
        "user_agent": ua,
    }
    session, is_new = await get_or_create_session(
        tenant_id=tenant_id,
        visitor_id=visitor.id,
        session_id=payload.session_id,
        utms=utms,
        context=context,
        db=db,
    )

    # 3. Handle identify event — also auto-identify on ANY event carrying email/phone
    #    (e.g. auto-form-detection in pixel JS sends email on form blur via 'form_field' events)
    _id_email = payload.email or payload.properties.get("email", "") or ""
    _id_phone = payload.phone or payload.properties.get("phone", "") or ""
    _id_name = payload.name or payload.properties.get("name", "") or ""
    if _id_email or _id_phone:
        await identify_visitor(
            visitor,
            email=_id_email,
            phone=_id_phone,
            name=_id_name,
            db=db,
        )

    # 4. Create event (append-only)
    event = Event(
        tenant_id=tenant_id,
        visitor_id=visitor.id,
        session_id=session.id,
        event_name=payload.event_name,
        event_time=now,
        page_url=payload.page_url,
        page_title=payload.page_title,
        referrer=payload.referrer,
        utm_source=session.utm_source,
        utm_medium=session.utm_medium,
        utm_campaign=session.utm_campaign,
        utm_content=session.utm_content,
        utm_term=session.utm_term,
        fbclid=session.fbclid,
        user_id_external=payload.user_id,
        email_hash=_hash_email(payload.email),
        properties=payload.properties,
        ip_address=ip,
        user_agent=ua,
    )
    db.add(event)
    await db.flush()

    # 5. Handle purchase → create Order with idempotency
    if payload.event_name == "purchase":
        order_id = payload.properties.get("order_id", "")
        amount = float(payload.properties.get("value", 0))
        currency = payload.properties.get("currency", "INR")

        if order_id:
            # Check idempotency: unique (tenant_id, order_id)
            existing = await db.execute(
                select(Order).where(
                    Order.tenant_id == tenant_id,
                    Order.order_id == order_id,
                )
            )
            if existing.scalar_one_or_none():
                # Duplicate — skip
                return TrackEventOut(
                    visitor_uid=visitor.visitor_uid,
                    session_uid=session.session_uid,
                    event_id=event.id,
                    status="duplicate_order",
                )

        order = Order(
            tenant_id=tenant_id,
            visitor_id=visitor.id,
            session_id=session.id,
            event_id=event.id,
            order_id=order_id or f"auto_{event.id}",
            amount=amount,
            currency=currency,
            utm_source=session.utm_source,
            utm_medium=session.utm_medium,
            utm_campaign=session.utm_campaign,
            utm_content=session.utm_content,
            utm_term=session.utm_term,
            fbclid=session.fbclid,
            converted_at=now,
        )
        db.add(order)
        await db.flush()

        # Mark session as converted
        session.has_conversion = True

        # Compute attribution
        await compute_attribution(order, db)

    return TrackEventOut(
        visitor_uid=visitor.visitor_uid,
        session_uid=session.session_uid,
        event_id=event.id,
    )


# ════════════════════════════════════════════════
#  GET /journeys — Stitched journey timeline
# ════════════════════════════════════════════════

@router.get("/journeys", response_model=JourneyOut)
async def get_journey(
    visitor_id: str = Query(..., description="visitor_uid"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return stitched journey timeline for a visitor."""
    result = await db.execute(
        select(Visitor).where(
            Visitor.visitor_uid == visitor_id,
            Visitor.tenant_id == current_user.id,
        )
    )
    visitor = result.scalar_one_or_none()
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found")

    # Get all sessions
    sess_result = await db.execute(
        select(Session).where(Session.visitor_id == visitor.id)
        .order_by(Session.started_at)
    )
    sessions = sess_result.scalars().all()
    session_map = {s.id: s for s in sessions}

    # Get all events
    ev_result = await db.execute(
        select(Event).where(Event.visitor_id == visitor.id)
        .order_by(Event.event_time)
    )
    events = ev_result.scalars().all()

    return JourneyOut(
        visitor_uid=visitor.visitor_uid,
        visitor_name=visitor.name or "",
        visitor_email=visitor.email or "",
        identified=visitor.identified,
        total_visits=visitor.total_visits,
        first_seen=visitor.first_seen.isoformat() if visitor.first_seen else None,
        sessions=[
            {
                "session_uid": s.session_uid,
                "utm_source": s.utm_source,
                "utm_medium": s.utm_medium,
                "utm_campaign": s.utm_campaign,
                "utm_content": s.utm_content,
                "fbclid": s.fbclid,
                "landing_page": s.landing_page,
                "device": s.device,
                "page_count": s.page_count,
                "has_conversion": s.has_conversion,
                "started_at": s.started_at.isoformat() if s.started_at else None,
            }
            for s in sessions
        ],
        events=[
            JourneyEvent(
                event_id=e.id,
                event_name=e.event_name,
                event_time=e.event_time.isoformat() if e.event_time else None,
                page_url=e.page_url,
                page_title=e.page_title,
                utm_source=e.utm_source,
                utm_medium=e.utm_medium,
                utm_campaign=e.utm_campaign,
                utm_content=e.utm_content,
                fbclid=e.fbclid,
                session_uid=session_map[e.session_id].session_uid if e.session_id and e.session_id in session_map else None,
                properties=e.properties or {},
            )
            for e in events
        ],
    )


# ════════════════════════════════════════════════
#  GET /analytics/funnel
# ════════════════════════════════════════════════

@router.get("/analytics/funnel", response_model=FunnelOut)
async def get_funnel(
    date_from: str = Query("", description="YYYY-MM-DD"),
    date_to: str = Query("", description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Funnel: visits → view_product → add_to_cart → checkout → purchase."""
    tenant_id = current_user.id
    base_q = select(func.count(distinct(Event.visitor_id))).where(Event.tenant_id == tenant_id)

    if date_from:
        base_q = base_q.where(Event.event_time >= date_from)
    if date_to:
        base_q = base_q.where(Event.event_time <= date_to + "T23:59:59")

    steps = ["page_view", "view_product", "add_to_cart", "checkout", "purchase"]
    results = []
    for step in steps:
        if step == "page_view":
            # Any session = a visit
            sess_q = select(func.count(distinct(Session.visitor_id))).where(Session.tenant_id == tenant_id)
            count = (await db.execute(sess_q)).scalar() or 0
        else:
            count = (await db.execute(base_q.where(Event.event_name == step))).scalar() or 0
        results.append(FunnelStep(step=step, count=count))

    return FunnelOut(steps=results, date_from=date_from, date_to=date_to)


# ════════════════════════════════════════════════
#  GET /analytics/by-ad
# ════════════════════════════════════════════════

@router.get("/analytics/by-ad", response_model=list[ByAdRow])
async def get_by_ad(
    date_from: str = Query("", description="YYYY-MM-DD"),
    date_to: str = Query("", description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Group sessions and purchases by UTM + fbclid fields."""
    tenant_id = current_user.id

    # Sessions grouped by UTM
    sess_q = (
        select(
            Session.utm_source,
            Session.utm_medium,
            Session.utm_campaign,
            Session.utm_content,
            Session.fbclid,
            func.count(Session.id).label("sessions"),
            func.count(distinct(Session.visitor_id)).label("visitors"),
            func.sum(case((Session.has_conversion == True, 1), else_=0)).label("purchases"),
        )
        .where(Session.tenant_id == tenant_id)
        .group_by(
            Session.utm_source, Session.utm_medium, Session.utm_campaign,
            Session.utm_content, Session.fbclid,
        )
    )

    if date_from:
        sess_q = sess_q.where(Session.started_at >= date_from)
    if date_to:
        sess_q = sess_q.where(Session.started_at <= date_to + "T23:59:59")

    sess_rows = (await db.execute(sess_q)).all()

    # Orders grouped by UTM for revenue
    rev_q = (
        select(
            Order.utm_content,
            func.sum(Order.amount).label("revenue"),
        )
        .where(Order.tenant_id == tenant_id)
        .group_by(Order.utm_content)
    )
    rev_rows = (await db.execute(rev_q)).all()
    rev_map = {r.utm_content: r.revenue or 0 for r in rev_rows}

    results = []
    for row in sess_rows:
        results.append(ByAdRow(
            utm_source=row.utm_source or "",
            utm_medium=row.utm_medium or "",
            utm_campaign=row.utm_campaign or "",
            utm_content=row.utm_content or "",
            fbclid=row.fbclid or "",
            sessions=row.sessions,
            visitors=row.visitors,
            purchases=row.purchases,
            revenue=rev_map.get(row.utm_content, 0),
        ))

    return results


# ════════════════════════════════════════════════
#  Pixel endpoints (JS SDK + GIF fallback)
# ════════════════════════════════════════════════

@router.get("/pixel/namyah.js")
async def serve_pixel_js(request: Request, id: str = Query("", description="Tenant/Pixel ID")):
    """Serve the tracking JS SDK with tenant ID and API base baked in."""
    base_url = str(request.base_url).rstrip("/")
    js_content = _generate_pixel_js(id, base_url)
    return Response(
        content=js_content,
        media_type="application/javascript",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@router.get("/pixel/p.gif")
async def pixel_gif(
    request: Request,
    id: str = Query("", description="pixel_id (preferred) or numeric tenant_id (legacy)"),
    db: AsyncSession = Depends(get_db),
):
    """1x1 transparent GIF — no-JS fallback for page view tracking."""
    if id:
        try:
            # Accept either pixel_id (pxl_...) or numeric tenant_id
            if id.startswith("pxl_"):
                tenant_id = await _resolve_tenant_id(id, None, db)
            else:
                tenant_id = int(id)
            ip = _get_client_ip(request)
            ua = request.headers.get("user-agent", "")
            ref = request.headers.get("referer", "")

            visitor = await resolve_visitor(
                tenant_id=tenant_id, db=db, ip_address=ip, user_agent=ua,
            )

            session, _ = await get_or_create_session(
                tenant_id=tenant_id, visitor_id=visitor.id,
                session_id=None, utms={}, context={"ip_address": ip, "user_agent": ua},
                db=db,
            )

            event = Event(
                tenant_id=tenant_id, visitor_id=visitor.id, session_id=session.id,
                event_name="page_view", page_url=ref, user_agent=ua, ip_address=ip,
            )
            db.add(event)
            await db.flush()
        except Exception:
            pass

    return Response(
        content=PIXEL_GIF, media_type="image/gif",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


# ════════════════════════════════════════════════
#  JS SDK generator
# ════════════════════════════════════════════════

def _generate_pixel_js(tenant_id: str, base_url: str) -> str:
    return '''
(function(window, document) {
  "use strict";

  var TENANT_ID = "''' + tenant_id + '''";
  var API_BASE = "''' + base_url + '''";
  var COOKIE_NAME = "_nmyh";
  var COOKIE_DAYS = 365;
  var SESSION_KEY = "_nmyh_sess";
  var SESSION_TIMEOUT = 30 * 60 * 1000;
  var LAST_ACTIVITY_KEY = "_nmyh_last";

  function setCookie(n, v, d) {
    var e = new Date(); e.setTime(e.getTime() + d*864e5);
    document.cookie = n+"="+encodeURIComponent(v)+";expires="+e.toUTCString()+";path=/;SameSite=Lax";
  }
  function getCookie(n) {
    var m = document.cookie.match(new RegExp("(^| )"+n+"=([^;]+)"));
    return m ? decodeURIComponent(m[2]) : null;
  }
  function store(k,v) { try { sessionStorage.setItem(k,v); } catch(e){} }
  function load(k) { try { return sessionStorage.getItem(k); } catch(e){ return null; } }

  function parseUTMs() {
    var p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source")||"", utm_medium: p.get("utm_medium")||"",
      utm_campaign: p.get("utm_campaign")||"", utm_content: p.get("utm_content")||"",
      utm_term: p.get("utm_term")||"", utm_id: p.get("utm_id")||"",
      fbclid: p.get("fbclid")||"", gclid: p.get("gclid")||""
    };
  }

  function getDevice() {
    var u=navigator.userAgent;
    if(/Mobi|Android/i.test(u)) return "mobile";
    if(/Tablet|iPad/i.test(u)) return "tablet";
    return "desktop";
  }
  function getBrowser() {
    var u=navigator.userAgent;
    if(u.indexOf("Chrome")>-1&&u.indexOf("Edg")===-1) return "Chrome";
    if(u.indexOf("Safari")>-1&&u.indexOf("Chrome")===-1) return "Safari";
    if(u.indexOf("Firefox")>-1) return "Firefox";
    if(u.indexOf("Edg")>-1) return "Edge";
    return "Other";
  }

  function fingerprint() {
    var c=[screen.width+"x"+screen.height, screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language, navigator.platform];
    try {
      var cv=document.createElement("canvas"), cx=cv.getContext("2d");
      cx.textBaseline="top"; cx.font="14px Arial"; cx.fillStyle="#f60";
      cx.fillRect(125,1,62,20); cx.fillStyle="#069"; cx.fillText("N",2,15);
      c.push(cv.toDataURL());
    } catch(e){}
    var s=c.join("|"), h=0;
    for(var i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h=h&h; }
    return "fp_"+Math.abs(h).toString(36);
  }

  function send(data, cb) {
    var url = API_BASE + "/api/track";
    var body = JSON.stringify(data);
    if (window.fetch) {
      fetch(url, { method:"POST", headers:{"Content-Type":"application/json"}, body:body, keepalive:true })
        .then(function(r){ return r.json(); })
        .then(function(j){ if(cb) cb(j); })
        .catch(function(){});
    } else if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body],{type:"application/json"}));
    }
  }

  function isExpired() {
    var l=load(LAST_ACTIVITY_KEY);
    if(!l) return true;
    return (Date.now()-parseInt(l,10))>SESSION_TIMEOUT;
  }
  function touch() { store(LAST_ACTIVITY_KEY, Date.now().toString()); }

  var visitorUid = getCookie(COOKIE_NAME)||null;
  var sessionUid = load(SESSION_KEY)||null;
  var fp = fingerprint();
  var utms = parseUTMs();
  if(isExpired()) sessionUid = null;

  function base() {
    var b = {
      visitor_id: visitorUid, session_id: sessionUid,
      utm_source: utms.utm_source, utm_medium: utms.utm_medium,
      utm_campaign: utms.utm_campaign, utm_content: utms.utm_content,
      utm_term: utms.utm_term, utm_id: utms.utm_id,
      fbclid: utms.fbclid, gclid: utms.gclid,
      fingerprint: fp, device: getDevice(), browser: getBrowser(),
      screen_resolution: screen.width+"x"+screen.height
    };
    // Use pixel_id for new opaque IDs (pxl_...) and tenant_id for legacy numeric
    if (TENANT_ID && TENANT_ID.indexOf("pxl_") === 0) b.pixel_id = TENANT_ID;
    else if (TENANT_ID) b.tenant_id = parseInt(TENANT_ID, 10);
    return b;
  }

  function handleResponse(j) {
    if(j&&j.visitor_uid){ visitorUid=j.visitor_uid; setCookie(COOKIE_NAME,visitorUid,COOKIE_DAYS); }
    if(j&&j.session_uid){ sessionUid=j.session_uid; store(SESSION_KEY,sessionUid); }
    touch();
  }

  function init(tid) {
    if(tid) TENANT_ID=String(tid);
    // Deduplicate rapid page_view events (e.g. HMR/fast reloads)
    var now = Date.now();
    var lastInit = parseInt(load("_nmyh_lastinit")||"0",10);
    if(now - lastInit < 2000) return; // Skip if init fired <2s ago
    store("_nmyh_lastinit", now.toString());
    utms = parseUTMs();
    var d = base();
    d.event_name = "page_view";
    d.page_url = window.location.href;
    d.page_title = document.title;
    d.referrer = document.referrer;
    send(d, handleResponse);
  }

  function track(eventName, props) {
    if(isExpired()){ sessionUid=null; init(TENANT_ID); }
    touch();
    var d = base();
    d.event_name = eventName;
    d.page_url = window.location.href;
    d.page_title = document.title;
    d.referrer = document.referrer;
    d.properties = props||{};
    if(props&&props.email) d.email = props.email;
    if(props&&props.user_id) d.user_id = props.user_id;
    send(d, handleResponse);
  }

  function identify(userData) {
    var d = base();
    d.event_name = "identify";
    d.email = (userData&&userData.email)||"";
    d.phone = (userData&&userData.phone)||"";
    d.name = (userData&&userData.name)||"";
    d.properties = userData||{};
    d.page_url = window.location.href;
    send(d, handleResponse);
  }

  // ── Auto-form-detection ──
  // Watches all <input type=email>, <input type=tel>, <input name*="email|phone">.
  // On blur OR form submit, captures the value and fires identify automatically.
  // Uses MutationObserver to catch dynamically inserted forms (SPAs, modals).

  var EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  var seenIdentity = { email: "", phone: "", name: "" };
  var IDENTITY_KEY = "_nmyh_id";
  try {
    var stored = localStorage.getItem(IDENTITY_KEY);
    if (stored) seenIdentity = JSON.parse(stored) || seenIdentity;
  } catch(e){}

  function persistIdentity() {
    try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(seenIdentity)); } catch(e){}
  }

  function autoIdentify(payload) {
    // Only fire if something new was captured
    var changed = false;
    if (payload.email && payload.email !== seenIdentity.email) {
      seenIdentity.email = payload.email; changed = true;
    }
    if (payload.phone && payload.phone !== seenIdentity.phone) {
      seenIdentity.phone = payload.phone; changed = true;
    }
    if (payload.name && payload.name !== seenIdentity.name) {
      seenIdentity.name = payload.name; changed = true;
    }
    if (!changed) return;
    persistIdentity();
    identify({
      email: seenIdentity.email,
      phone: seenIdentity.phone,
      name: seenIdentity.name,
      auto: true
    });
  }

  function looksLikeEmail(name, type) {
    name = (name||"").toLowerCase();
    return type === "email" || /e?mail/.test(name);
  }
  function looksLikePhone(name, type) {
    name = (name||"").toLowerCase();
    return type === "tel" || /phone|mobile|contact|whatsapp/.test(name);
  }
  function looksLikeName(name) {
    name = (name||"").toLowerCase();
    return /(^|[^a-z])name([^a-z]|$)/.test(name) && !/user.?name|file.?name/.test(name);
  }
  function normalizePhone(s) {
    var d = (s||"").replace(/\\D/g, "");
    if (d.length > 10) d = d.slice(-10);
    return d.length >= 10 ? d : "";
  }

  function scanInput(el) {
    if (!el || !el.value) return;
    var nameAttr = el.getAttribute("name") || el.getAttribute("id") || el.getAttribute("autocomplete") || "";
    var type = (el.type || "").toLowerCase();
    var v = String(el.value).trim();
    var payload = {};
    if (looksLikeEmail(nameAttr, type) && EMAIL_RE.test(v)) {
      payload.email = v.toLowerCase();
    } else if (looksLikePhone(nameAttr, type)) {
      var p = normalizePhone(v);
      if (p) payload.phone = p;
    } else if (looksLikeName(nameAttr) && v.length >= 2 && v.length < 60) {
      payload.name = v;
    }
    if (payload.email || payload.phone || payload.name) autoIdentify(payload);
  }

  function scanForm(form) {
    if (!form || !form.elements) return;
    for (var i = 0; i < form.elements.length; i++) scanInput(form.elements[i]);
  }

  function attachFormListeners(root) {
    root = root || document;
    var inputs = root.querySelectorAll ? root.querySelectorAll("input") : [];
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.__nmyhBound) continue;
      el.__nmyhBound = true;
      el.addEventListener("blur", function(e){ scanInput(e.target); }, true);
      el.addEventListener("change", function(e){ scanInput(e.target); }, true);
    }
    var forms = root.querySelectorAll ? root.querySelectorAll("form") : [];
    for (var j = 0; j < forms.length; j++) {
      var f = forms[j];
      if (f.__nmyhBound) continue;
      f.__nmyhBound = true;
      f.addEventListener("submit", function(e){ scanForm(e.target); }, true);
    }
  }

  function startAutoIdentify() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function(){ attachFormListeners(document); });
    } else {
      attachFormListeners(document);
    }
    // Watch dynamic insertions (SPAs, modals)
    if (window.MutationObserver) {
      var mo = new MutationObserver(function(muts){
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (n && n.nodeType === 1) attachFormListeners(n);
          }
        }
      });
      try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch(e){}
    }
    // Replay any previously captured identity (in case session is new but identity persisted)
    if (seenIdentity.email || seenIdentity.phone) {
      identify({
        email: seenIdentity.email,
        phone: seenIdentity.phone,
        name: seenIdentity.name,
        auto: true,
        replay: true
      });
    }
  }
  startAutoIdentify();

  function nmyh(cmd, a1, a2) {
    switch(cmd){
      case "init": init(a1); break;
      case "track": track(a1,a2); break;
      case "identify": identify(a1); break;
    }
  }

  var q = window.namyah&&window.namyah.q ? window.namyah.q : [];
  window.namyah = nmyh;
  for(var i=0;i<q.length;i++) nmyh.apply(null,q[i]);

  window.addEventListener("beforeunload", function(){
    if(visitorUid&&sessionUid){
      var d=base(); d.event_name="page_unload";
      d.page_url=window.location.href;
      if(navigator.sendBeacon)
        navigator.sendBeacon(API_BASE+"/api/track", new Blob([JSON.stringify(d)],{type:"application/json"}));
    }
  });
})(window, document);
'''.strip()
