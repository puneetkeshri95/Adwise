"""Meta Ads integration models — OAuth connections, insights, raw API storage."""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean, Text, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class MetaConnection(Base):
    """OAuth connection to a Meta Ad Account. Tokens stored encrypted."""
    __tablename__ = "meta_connections"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ad_account_id = Column(String, nullable=False, index=True)  # e.g. "act_123456"
    access_token_encrypted = Column(Text, nullable=False)  # Fernet-encrypted
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    scopes = Column(String, default="")  # comma-separated granted scopes
    is_active = Column(Boolean, default=True)
    connected_at = Column(DateTime(timezone=True), server_default=func.now())
    last_synced_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "ad_account_id", name="uq_tenant_adaccount"),
    )


class MetaInsight(Base):
    """Normalized daily metrics per object level (account/campaign/adset/ad)."""
    __tablename__ = "meta_insights"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    level = Column(String, nullable=False, index=True)  # account, campaign, adset, ad
    object_id = Column(String, nullable=False, index=True)  # meta_campaign_id / adset_id / ad_id
    object_name = Column(String, default="")

    # Core metrics (store what Meta returns; these are the most common)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    spend = Column(Float, default=0.0)
    reach = Column(Integer, default=0)
    cpm = Column(Float, default=0.0)
    cpc = Column(Float, default=0.0)
    ctr = Column(Float, default=0.0)
    frequency = Column(Float, default=0.0)

    # Conversion metrics from Meta
    actions = Column(JSON, default=list)  # raw actions array from Meta
    conversions = Column(Integer, default=0)
    conversion_values = Column(Float, default=0.0)
    cost_per_action = Column(JSON, default=list)

    # Overflow: any additional fields Meta returns
    extra_metrics = Column(JSON, default=dict)

    fetched_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("tenant_id", "date", "level", "object_id", name="uq_insight_row"),
    )


class RawApiResponse(Base):
    """Store raw Meta API JSON for safety/debugging/replay."""
    __tablename__ = "raw_api_responses"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    endpoint = Column(String, nullable=False)  # e.g. "campaigns", "insights"
    request_params = Column(JSON, default=dict)
    response_json = Column(JSON, nullable=False)
    status_code = Column(Integer, default=200)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
