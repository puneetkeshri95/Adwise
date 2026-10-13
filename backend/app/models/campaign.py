from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    meta_campaign_id = Column(String, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")  # ACTIVE, PAUSED, ARCHIVED
    objective = Column(String, default="")
    daily_budget = Column(Float, default=0.0)
    lifetime_budget = Column(Float, default=0.0)
    spend = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    synced_at = Column(DateTime(timezone=True))

    ad_sets = relationship("AdSet", back_populates="campaign", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "meta_campaign_id", name="uq_tenant_campaign"),
    )


class AdSet(Base):
    __tablename__ = "ad_sets"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    meta_adset_id = Column(String, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")
    targeting = Column(JSON, default=dict)
    daily_budget = Column(Float, default=0.0)
    spend = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    campaign = relationship("Campaign", back_populates="ad_sets")
    ads = relationship("Ad", back_populates="ad_set", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "meta_adset_id", name="uq_tenant_adset"),
    )


class Ad(Base):
    __tablename__ = "ads"

    id = Column(Integer, primary_key=True, index=True)
    ad_set_id = Column(Integer, ForeignKey("ad_sets.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    meta_ad_id = Column(String, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")
    creative_url = Column(String, default="")
    creative_type = Column(String, default="")  # IMAGE, VIDEO, CAROUSEL
    spend = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ad_set = relationship("AdSet", back_populates="ads")

    __table_args__ = (
        UniqueConstraint("tenant_id", "meta_ad_id", name="uq_tenant_ad"),
    )
