"""Tracking models — visitors, sessions, events (append-only), orders, conversions."""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean, UniqueConstraint, Index
from sqlalchemy.sql import func
from app.core.database import Base


class Visitor(Base):
    """A unique visitor tracked via cookie/fingerprint/IP across sessions."""
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    visitor_uid = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, default="", index=True)
    phone = Column(String, default="", index=True)
    name = Column(String, default="")
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    total_visits = Column(Integer, default=0)
    device_info = Column(JSON, default=dict)
    ip_address = Column(String, default="", index=True)
    fingerprint = Column(String, default="", index=True)
    user_agent = Column(String, default="")
    identified = Column(Boolean, default=False)


class Session(Base):
    """A visit session — captures UTMs/fbclid at session start. New session per 30-min inactivity."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    visitor_id = Column(Integer, ForeignKey("visitors.id"), nullable=False, index=True)
    session_uid = Column(String, unique=True, index=True, nullable=False)
    # UTM parameters captured at session start
    utm_source = Column(String, default="")
    utm_medium = Column(String, default="")
    utm_campaign = Column(String, default="")
    utm_content = Column(String, default="")
    utm_term = Column(String, default="")
    utm_id = Column(String, default="", index=True)
    # Platform click IDs
    fbclid = Column(String, default="", index=True)
    gclid = Column(String, default="")
    # Context
    landing_page = Column(String, default="")
    referrer = Column(String, default="")
    ip_address = Column(String, default="")
    device = Column(String, default="")
    browser = Column(String, default="")
    screen_resolution = Column(String, default="")
    user_agent = Column(String, default="")
    # Timing
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    page_count = Column(Integer, default=0)
    duration_seconds = Column(Integer, default=0)
    # Outcome
    has_conversion = Column(Boolean, default=False)


class Event(Base):
    """Append-only events table — every interaction from the tracking snippet."""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    visitor_id = Column(Integer, ForeignKey("visitors.id"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True, index=True)
    event_name = Column(String, nullable=False, index=True)  # page_view, view_product, add_to_cart, checkout, purchase, identify, custom
    event_time = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    page_url = Column(String, default="")
    page_title = Column(String, default="")
    referrer = Column(String, default="")
    # UTMs are always attached (copied from session for denormalization)
    utm_source = Column(String, default="")
    utm_medium = Column(String, default="")
    utm_campaign = Column(String, default="")
    utm_content = Column(String, default="")
    utm_term = Column(String, default="")
    fbclid = Column(String, default="")
    # Optional user identity
    user_id_external = Column(String, default="")  # site user ID if logged in
    email_hash = Column(String, default="")  # SHA256 of email for matching
    # Arbitrary event properties
    properties = Column(JSON, default=dict)
    ip_address = Column(String, default="")
    user_agent = Column(String, default="")

    __table_args__ = (
        Index("ix_events_tenant_time", "tenant_id", "event_time"),
        Index("ix_events_tenant_name", "tenant_id", "event_name"),
    )


class Order(Base):
    """Purchase events tied to order_id — deduplicated by (tenant_id, order_id)."""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    visitor_id = Column(Integer, ForeignKey("visitors.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True)
    order_id = Column(String, nullable=False, index=True)
    amount = Column(Float, default=0.0)
    currency = Column(String, default="INR")
    status = Column(String, default="confirmed")  # confirmed, refunded
    # Attribution source (from the session that originated this purchase)
    utm_source = Column(String, default="")
    utm_medium = Column(String, default="")
    utm_campaign = Column(String, default="")
    utm_content = Column(String, default="")
    utm_term = Column(String, default="")
    fbclid = Column(String, default="")
    # Attribution results (computed async)
    attribution_first_click = Column(JSON, default=dict)
    attribution_last_click = Column(JSON, default=dict)
    attribution_linear = Column(JSON, default=dict)
    attribution_time_decay = Column(JSON, default=dict)
    touchpoint_session_ids = Column(JSON, default=list)  # ordered session IDs in journey
    converted_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("tenant_id", "order_id", name="uq_tenant_order"),
    )


# Keep Touchpoint as a legacy alias → Event is the new primary
Touchpoint = Event
# Keep Conversion as a legacy alias → Order is the new primary
Conversion = Order
