from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


def _gen_pixel_id() -> str:
    """Generate an opaque public pixel ID like 'pxl_a4f9c2k7m8n3'."""
    import secrets
    return "pxl_" + secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:14]


class User(Base):
    """User = tenant for MVP. Each user owns exactly one ad account."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    company = Column(String, default="")
    is_active = Column(Boolean, default=True)
    # Public opaque ID used in the pixel snippet — DO NOT expose user.id to the client.
    pixel_id = Column(String, unique=True, index=True, nullable=True, default=_gen_pixel_id)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # For SaaS: user.id is used as tenant_id across all tables
    # GA integration
    ga_property_id = Column(String, default="")
