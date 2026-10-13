"""Per-tenant user-defined metrics.

Custom metrics live alongside the system Metrics Library defined in
``app.services.metrics_library``. A user composes a formula referencing
existing metric keys (operands), then it is available everywhere — KPI
cards, reporting columns, etc.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.core.database import Base


class CustomMetric(Base):
    __tablename__ = "custom_metrics"
    __table_args__ = (
        Index("ix_custom_metric_tenant_key", "tenant_id", "key", unique=True),
    )

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    key = Column(String, nullable=False)            # slug, eg "blended_roas"
    name = Column(String, nullable=False)           # display name
    short = Column(String, default="")              # short label for column headers
    category = Column(String, default="Custom")
    formula = Column(String, nullable=False)        # human-readable expression
    description = Column(String, default="")
    direction = Column(String, default="neutral")   # "higher" | "lower" | "neutral"

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
