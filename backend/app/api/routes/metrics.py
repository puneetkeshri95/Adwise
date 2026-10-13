"""Metrics Library API — single source of truth that every UI surface reads from.

Combines:
- System metrics (built-in, immutable) from ``app.services.metrics_library``
- User-defined custom metrics (per-tenant CRUD, with a formula expression
  composed of existing metric keys + arithmetic operators).
"""
import re
import unicodedata
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.custom_metric import CustomMetric
from app.services.metrics_library import SYSTEM_METRICS, CATEGORIES

router = APIRouter(prefix="/metrics", tags=["metrics"])


def _slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()
    return s or "metric"


_FORMULA_TOKEN = re.compile(r"[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[+\-*/()]|\s+")


def _validate_formula(formula: str, allowed_keys: set[str]) -> None:
    """Reject formulas that reference unknown metric keys or unsafe tokens."""
    if not formula or not formula.strip():
        raise HTTPException(400, "Formula is required")
    if len(formula) > 500:
        raise HTTPException(400, "Formula too long (max 500 chars)")
    pos = 0
    while pos < len(formula):
        m = _FORMULA_TOKEN.match(formula, pos)
        if not m:
            raise HTTPException(400, f"Invalid character at position {pos}: {formula[pos]!r}")
        tok = m.group()
        pos = m.end()
        if tok.isspace() or tok in "+-*/()":
            continue
        if re.fullmatch(r"\d+(?:\.\d+)?", tok):
            continue
        if tok not in allowed_keys:
            raise HTTPException(400, f"Unknown metric key in formula: {tok!r}")


def _serialize(m: CustomMetric) -> dict:
    return {
        "key": m.key,
        "name": m.name,
        "short": m.short or m.name,
        "category": m.category or "Custom",
        "formula": m.formula,
        "description": m.description or "",
        "direction": m.direction or "neutral",
        "custom": True,
        "id": m.id,
    }


class CustomMetricIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    formula: str = Field(..., min_length=1, max_length=500)
    description: str = Field("", max_length=400)
    direction: str = Field("neutral", pattern="^(higher|lower|neutral)$")
    short: Optional[str] = Field(None, max_length=40)


@router.get("/library")
async def metrics_library(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return system metrics + this tenant's custom metrics, grouped by category."""
    custom_rows = (
        await db.execute(select(CustomMetric).where(CustomMetric.tenant_id == user.id))
    ).scalars().all()
    custom_serialized = [_serialize(c) for c in custom_rows]
    system_serialized = [{**m, "custom": False} for m in SYSTEM_METRICS]

    combined = system_serialized + custom_serialized
    by_cat: dict[str, list] = {c: [] for c in CATEGORIES}
    for m in combined:
        by_cat.setdefault(m["category"], []).append(m)

    return {
        "categories": list(by_cat.keys()),
        "metrics": combined,
        "by_category": by_cat,
        "count": len(combined),
        "system_count": len(system_serialized),
        "custom_count": len(custom_serialized),
    }


@router.post("/custom", status_code=201)
async def create_custom_metric(
    payload: CustomMetricIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    allowed = {m["key"] for m in SYSTEM_METRICS}
    existing = (
        await db.execute(select(CustomMetric).where(CustomMetric.tenant_id == user.id))
    ).scalars().all()
    allowed |= {c.key for c in existing}

    _validate_formula(payload.formula, allowed)

    base_key = _slugify(payload.name)
    key = base_key
    n = 1
    used = {c.key for c in existing} | {m["key"] for m in SYSTEM_METRICS}
    while key in used:
        n += 1
        key = f"{base_key}_{n}"

    row = CustomMetric(
        tenant_id=user.id,
        key=key,
        name=payload.name.strip(),
        short=(payload.short or payload.name)[:40],
        category="Custom",
        formula=payload.formula.strip(),
        description=payload.description.strip(),
        direction=payload.direction,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _serialize(row)


@router.put("/custom/{metric_id}")
async def update_custom_metric(
    metric_id: int,
    payload: CustomMetricIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(CustomMetric).where(
                CustomMetric.id == metric_id, CustomMetric.tenant_id == user.id
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Metric not found")

    allowed = {m["key"] for m in SYSTEM_METRICS}
    others = (
        await db.execute(
            select(CustomMetric).where(
                CustomMetric.tenant_id == user.id, CustomMetric.id != metric_id
            )
        )
    ).scalars().all()
    allowed |= {c.key for c in others}
    _validate_formula(payload.formula, allowed)

    row.name = payload.name.strip()
    row.short = (payload.short or payload.name)[:40]
    row.formula = payload.formula.strip()
    row.description = payload.description.strip()
    row.direction = payload.direction
    await db.commit()
    await db.refresh(row)
    return _serialize(row)


@router.delete("/custom/{metric_id}", status_code=204)
async def delete_custom_metric(
    metric_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(CustomMetric).where(
                CustomMetric.id == metric_id, CustomMetric.tenant_id == user.id
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Metric not found")
    await db.delete(row)
    await db.commit()
    return None
