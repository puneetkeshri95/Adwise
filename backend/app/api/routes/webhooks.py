"""
Payment gateway webhooks — Razorpay & Stripe.
These match incoming payment events to existing visitors via email/order_id
and create 'purchase' events in the tracking system.

Endpoints:
  POST /webhooks/razorpay   — Razorpay payment.captured webhook
  POST /webhooks/stripe     — Stripe checkout.session.completed webhook
  GET  /webhooks/config     — Return webhook URLs for user to copy
"""
import hashlib
import hmac
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.tracking import Visitor, Session, Event, Order
from app.services.tracking.attribution import compute_attribution

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
log = logging.getLogger(__name__)

# Window for the timing-correlation fallback (last unconverted active session)
RECENT_SESSION_WINDOW = timedelta(minutes=60)


def _normalize_phone(phone: str) -> str:
    """Strip non-digits; keep last 10 digits as canonical key."""
    if not phone:
        return ""
    digits = "".join(c for c in str(phone) if c.isdigit())
    if len(digits) > 10:
        digits = digits[-10:]
    return digits


# ════════════════════════════════════════════════
#  GET /webhooks/config — URLs for user setup
# ════════════════════════════════════════════════

@router.get("/config")
async def webhook_config(request: Request, current_user: User = Depends(get_current_user)):
    """Return the webhook URLs the user should paste into their payment gateway."""
    base = str(request.base_url).rstrip("/")
    pixel_id = current_user.pixel_id or ""
    return {
        "razorpay_url": f"{base}/api/webhooks/razorpay?pixel_id={pixel_id}",
        "stripe_url": f"{base}/api/webhooks/stripe?pixel_id={pixel_id}",
        "pixel_id": pixel_id,
        "instructions": {
            "razorpay": "In Razorpay Dashboard → Settings → Webhooks → Add new. Paste the URL above. Select 'payment.captured' event.",
            "stripe": "In Stripe Dashboard → Developers → Webhooks → Add endpoint. Paste the URL above. Select 'checkout.session.completed' event.",
        },
    }


# ════════════════════════════════════════════════
#  Helpers
# ════════════════════════════════════════════════

async def _resolve_tenant_from_pixel(pixel_id: str, db: AsyncSession) -> int:
    """Map pixel_id to user.id (tenant)."""
    r = await db.execute(select(User).where(User.pixel_id == pixel_id))
    u = r.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=400, detail="Invalid pixel_id")
    return u.id


async def _find_visitor_by_email(tenant_id: int, email: str, db: AsyncSession) -> Visitor | None:
    """Find visitor by email (from identify events)."""
    if not email:
        return None
    r = await db.execute(
        select(Visitor).where(
            Visitor.tenant_id == tenant_id,
            Visitor.email == email.strip().lower(),
        ).order_by(Visitor.last_seen.desc()).limit(1)
    )
    return r.scalar_one_or_none()


async def _find_visitor_by_phone(tenant_id: int, phone: str, db: AsyncSession) -> Visitor | None:
    """Find visitor by normalized phone (last 10 digits)."""
    norm = _normalize_phone(phone)
    if not norm:
        return None
    r = await db.execute(
        select(Visitor).where(
            Visitor.tenant_id == tenant_id,
            Visitor.phone == norm,
        ).order_by(Visitor.last_seen.desc()).limit(1)
    )
    return r.scalar_one_or_none()


async def _find_visitor_by_uid(tenant_id: int, visitor_uid: str, db: AsyncSession) -> Visitor | None:
    """Find visitor by visitor_uid (passed via Razorpay notes/Stripe metadata)."""
    if not visitor_uid:
        return None
    r = await db.execute(
        select(Visitor).where(
            Visitor.tenant_id == tenant_id,
            Visitor.visitor_uid == visitor_uid,
        )
    )
    return r.scalar_one_or_none()


async def _find_visitor_by_recent_session(tenant_id: int, db: AsyncSession) -> Visitor | None:
    """
    Timing-correlation fallback: find a single recently-active session that hasn't
    converted yet. Conservative — only matches when there is exactly ONE candidate
    in the last 60 minutes to avoid mis-attribution.
    """
    cutoff = datetime.now(timezone.utc) - RECENT_SESSION_WINDOW
    # Prefer sessions with a checkout/add_to_cart event in the window
    checkout_q = await db.execute(
        select(Session).where(
            Session.tenant_id == tenant_id,
            Session.last_activity_at >= cutoff,
            Session.has_conversion == False,  # noqa: E712
        ).order_by(Session.last_activity_at.desc()).limit(2)
    )
    candidates = checkout_q.scalars().all()
    if not candidates:
        return None
    # Prefer the one with a checkout event
    for s in candidates:
        ev_q = await db.execute(
            select(func.count()).select_from(Event).where(
                Event.session_id == s.id,
                Event.event_name.in_(["checkout", "begin_checkout", "checkout_initiated", "add_to_cart"]),
                Event.event_time >= cutoff,
            )
        )
        if (ev_q.scalar() or 0) > 0:
            r = await db.execute(select(Visitor).where(Visitor.id == s.visitor_id))
            log.info(f"[webhook] timing-fallback matched session={s.id} visitor={s.visitor_id}")
            return r.scalar_one_or_none()
    # No checkout event — only match if exactly one candidate (high confidence)
    if len(candidates) == 1:
        r = await db.execute(select(Visitor).where(Visitor.id == candidates[0].visitor_id))
        log.info(f"[webhook] timing-fallback matched single-session={candidates[0].id}")
        return r.scalar_one_or_none()
    return None


async def _resolve_visitor_for_payment(
    *,
    tenant_id: int,
    email: str,
    phone: str,
    visitor_uid: str,
    db: AsyncSession,
) -> tuple[Visitor | None, str]:
    """
    Multi-tier fallback chain. Returns (visitor, match_method).
    Order: visitor_uid → email → phone → recent-session → None.
    Also back-fills email/phone onto the matched visitor.
    """
    # 1. Explicit visitor_uid (highest confidence)
    v = await _find_visitor_by_uid(tenant_id, visitor_uid, db)
    if v:
        if email and not v.email:
            v.email = email.strip().lower()
        if phone and not v.phone:
            v.phone = _normalize_phone(phone)
        v.identified = True
        return v, "visitor_uid"

    # 2. Email
    v = await _find_visitor_by_email(tenant_id, email, db)
    if v:
        if phone and not v.phone:
            v.phone = _normalize_phone(phone)
        return v, "email"

    # 3. Phone
    v = await _find_visitor_by_phone(tenant_id, phone, db)
    if v:
        if email and not v.email:
            v.email = email.strip().lower()
            v.identified = True
        return v, "phone"

    # 4. Timing correlation
    v = await _find_visitor_by_recent_session(tenant_id, db)
    if v:
        if email and not v.email:
            v.email = email.strip().lower()
            v.identified = True
        if phone and not v.phone:
            v.phone = _normalize_phone(phone)
        return v, "timing"

    return None, "none"


async def _create_purchase_event(
    tenant_id: int,
    visitor: Visitor | None,
    order_id: str,
    amount: float,
    currency: str,
    email: str,
    db: AsyncSession,
    *,
    phone: str = "",
    match_method: str = "none",
) -> dict:
    """Create a purchase event and order. Returns status dict."""
    now = datetime.now(timezone.utc)

    # Idempotency check
    existing = await db.execute(
        select(Order).where(Order.tenant_id == tenant_id, Order.order_id == order_id)
    )
    if existing.scalar_one_or_none():
        return {"status": "duplicate", "order_id": order_id}

    # If no visitor found via any fallback, create an anonymous one
    if not visitor:
        visitor = Visitor(
            tenant_id=tenant_id,
            visitor_uid=f"wh_{order_id}",
            email=email.strip().lower() if email else "",
            phone=_normalize_phone(phone),
            first_seen=now,
            last_seen=now,
            total_visits=0,
            identified=bool(email or phone),
        )
        db.add(visitor)
        await db.flush()

    # Get the last session for this visitor (for UTM attribution)
    sess_q = await db.execute(
        select(Session).where(Session.visitor_id == visitor.id).order_by(Session.started_at.desc()).limit(1)
    )
    session = sess_q.scalar_one_or_none()

    # Create the event
    event = Event(
        tenant_id=tenant_id,
        visitor_id=visitor.id,
        session_id=session.id if session else None,
        event_name="purchase",
        event_time=now,
        properties={"order_id": order_id, "value": amount, "currency": currency, "source": "webhook"},
    )
    db.add(event)
    await db.flush()

    # Create the order
    order = Order(
        tenant_id=tenant_id,
        visitor_id=visitor.id,
        session_id=session.id if session else None,
        event_id=event.id,
        order_id=order_id,
        amount=amount,
        currency=currency,
        utm_source=session.utm_source if session else "",
        utm_medium=session.utm_medium if session else "",
        utm_campaign=session.utm_campaign if session else "",
        utm_content=session.utm_content if session else "",
        utm_term=session.utm_term if session else "",
        fbclid=session.fbclid if session else "",
        converted_at=now,
    )
    db.add(order)
    await db.flush()

    if session:
        session.has_conversion = True

    # Compute attribution
    await compute_attribution(order, db)
    await db.commit()

    log.info(f"[webhook] purchase created: tenant={tenant_id} order={order_id} amount={amount} {currency} match={match_method}")
    return {"status": "ok", "order_id": order_id, "amount": amount, "match_method": match_method}


# ════════════════════════════════════════════════
#  POST /webhooks/razorpay
# ════════════════════════════════════════════════

@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    pixel_id: str = "",
    db: AsyncSession = Depends(get_db),
):
    """
    Razorpay webhook endpoint.
    Handles: payment.captured, subscription.charged, subscription.cancelled
    The pixel_id is passed as a query param in the webhook URL.
    """
    if not pixel_id:
        raise HTTPException(status_code=400, detail="pixel_id query param required")

    tenant_id = await _resolve_tenant_from_pixel(pixel_id, db)
    body = await request.json()

    event_type = body.get("event", "")

    # ── payment.captured ──
    if event_type == "payment.captured":
        payload = body.get("payload", {}).get("payment", {}).get("entity", {})
        if not payload:
            return {"status": "ignored", "reason": "no payment entity"}

        order_id = payload.get("order_id", "") or payload.get("id", "")
        amount = float(payload.get("amount", 0)) / 100  # Razorpay sends paise
        currency = payload.get("currency", "INR")
        email = payload.get("email", "") or payload.get("customer", {}).get("email", "")
        phone = payload.get("contact", "") or payload.get("customer", {}).get("contact", "")
        # Optional: merchant can pass our visitor_uid in razorpay notes for 100% match
        notes = payload.get("notes", {}) or {}
        visitor_uid = notes.get("namyah_visitor_uid", "") or notes.get("visitor_uid", "") or ""

        visitor, match_method = await _resolve_visitor_for_payment(
            tenant_id=tenant_id, email=email, phone=phone, visitor_uid=visitor_uid, db=db,
        )
        result = await _create_purchase_event(
            tenant_id, visitor, order_id, amount, currency, email, db,
            phone=phone, match_method=match_method,
        )
        return result

    # ── subscription.charged (recurring payment success) ──
    elif event_type == "subscription.charged":
        payload = body.get("payload", {})
        payment = payload.get("payment", {}).get("entity", {})
        subscription = payload.get("subscription", {}).get("entity", {})

        if not payment:
            return {"status": "ignored", "reason": "no payment entity in subscription.charged"}

        order_id = payment.get("order_id", "") or payment.get("id", "")
        amount = float(payment.get("amount", 0)) / 100
        currency = payment.get("currency", "INR")
        email = payment.get("email", "") or ""
        phone = payment.get("contact", "") or ""
        subscription_id = subscription.get("id", "")

        # Use subscription_id + payment_id as unique order reference
        unique_order_id = f"sub_{subscription_id}_{order_id}" if subscription_id else order_id

        notes = payment.get("notes", {}) or {}
        visitor_uid = notes.get("namyah_visitor_uid", "") or notes.get("visitor_uid", "") or ""
        visitor, match_method = await _resolve_visitor_for_payment(
            tenant_id=tenant_id, email=email, phone=phone, visitor_uid=visitor_uid, db=db,
        )
        result = await _create_purchase_event(
            tenant_id, visitor, unique_order_id, amount, currency, email, db,
            phone=phone, match_method=match_method,
        )
        log.info(f"[webhook] subscription.charged: sub={subscription_id} amount={amount} match={match_method}")
        return result

    # ── subscription.cancelled ──
    elif event_type == "subscription.cancelled":
        subscription = body.get("payload", {}).get("subscription", {}).get("entity", {})
        subscription_id = subscription.get("id", "")
        log.info(f"[webhook] subscription.cancelled: sub={subscription_id}")

        # Record as a cancellation event (not a purchase)
        now = datetime.now(timezone.utc)
        email = subscription.get("customer_email", "") or ""
        visitor = await _find_visitor_by_email(tenant_id, email, db)

        if visitor:
            event = Event(
                tenant_id=tenant_id,
                visitor_id=visitor.id,
                session_id=None,
                event_name="subscription_cancelled",
                event_time=now,
                properties={
                    "subscription_id": subscription_id,
                    "source": "webhook",
                    "plan_id": subscription.get("plan_id", ""),
                },
            )
            db.add(event)
            await db.commit()

        return {"status": "ok", "event": "subscription_cancelled", "subscription_id": subscription_id}

    # ── Unknown events — acknowledge but ignore ──
    else:
        log.info(f"[webhook] unhandled razorpay event: {event_type}")
        return {"status": "ignored", "event": event_type}


# ════════════════════════════════════════════════
#  POST /webhooks/stripe
# ════════════════════════════════════════════════

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    pixel_id: str = "",
    db: AsyncSession = Depends(get_db),
):
    """
    Stripe webhook endpoint. Expects 'checkout.session.completed' events.
    The pixel_id is passed as a query param in the webhook URL.
    """
    if not pixel_id:
        raise HTTPException(status_code=400, detail="pixel_id query param required")

    tenant_id = await _resolve_tenant_from_pixel(pixel_id, db)
    body = await request.json()

    event_type = body.get("type", "")
    if event_type != "checkout.session.completed":
        return {"status": "ignored", "event": event_type}

    session_obj = body.get("data", {}).get("object", {})
    if not session_obj:
        return {"status": "ignored", "reason": "no session object"}

    order_id = session_obj.get("id", "")  # Stripe checkout session ID
    amount = float(session_obj.get("amount_total", 0)) / 100  # Stripe sends cents/paise
    currency = (session_obj.get("currency", "inr")).upper()
    details = session_obj.get("customer_details", {}) or {}
    email = session_obj.get("customer_email", "") or details.get("email", "")
    phone = details.get("phone", "") or session_obj.get("customer_phone", "") or ""
    metadata = session_obj.get("metadata", {}) or {}
    visitor_uid = metadata.get("namyah_visitor_uid", "") or metadata.get("visitor_uid", "") or ""

    visitor, match_method = await _resolve_visitor_for_payment(
        tenant_id=tenant_id, email=email, phone=phone, visitor_uid=visitor_uid, db=db,
    )
    result = await _create_purchase_event(
        tenant_id, visitor, order_id, amount, currency, email, db,
        phone=phone, match_method=match_method,
    )
    return result
