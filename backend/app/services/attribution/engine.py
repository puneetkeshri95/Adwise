"""
Attribution Engine — computes credit assignment across touchpoints for each conversion.

Supports four models:
  1. First Click  — 100% credit to the first ad touchpoint
  2. Last Click   — 100% credit to the last ad touchpoint before conversion
  3. Linear       — equal credit split across all ad touchpoints
  4. Time Decay   — exponentially more credit to touchpoints closer to conversion
"""
import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.tracking import Conversion, Touchpoint


def _first_click(ad_touchpoints: list[Touchpoint]) -> dict[str, float]:
    """100% credit to the first ad touchpoint."""
    if not ad_touchpoints:
        return {}
    first = ad_touchpoints[0]
    return {str(first.ad_id): 1.0}


def _last_click(ad_touchpoints: list[Touchpoint]) -> dict[str, float]:
    """100% credit to the last ad touchpoint."""
    if not ad_touchpoints:
        return {}
    last = ad_touchpoints[-1]
    return {str(last.ad_id): 1.0}


def _linear(ad_touchpoints: list[Touchpoint]) -> dict[str, float]:
    """Equal credit across all ad touchpoints."""
    if not ad_touchpoints:
        return {}
    credit = 1.0 / len(ad_touchpoints)
    result: dict[str, float] = {}
    for tp in ad_touchpoints:
        key = str(tp.ad_id)
        result[key] = result.get(key, 0) + credit
    return {k: round(v, 4) for k, v in result.items()}


def _time_decay(ad_touchpoints: list[Touchpoint], half_life_days: float = 7.0) -> dict[str, float]:
    """Exponential time decay — touchpoints closer to conversion get more credit.

    Uses a half-life of `half_life_days` days. The last touchpoint gets the most credit.
    """
    if not ad_touchpoints:
        return {}
    if len(ad_touchpoints) == 1:
        return {str(ad_touchpoints[0].ad_id): 1.0}

    last_time = ad_touchpoints[-1].timestamp
    if last_time.tzinfo is not None:
        from datetime import timezone
        last_time = last_time.replace(tzinfo=None)
    decay_rate = math.log(2) / (half_life_days * 86400)  # per second

    weights: list[float] = []
    for tp in ad_touchpoints:
        tp_time = tp.timestamp
        if tp_time.tzinfo is not None:
            tp_time = tp_time.replace(tzinfo=None)
        delta = (last_time - tp_time).total_seconds()
        weights.append(math.exp(-decay_rate * delta))

    total_weight = sum(weights)
    result: dict[str, float] = {}
    for tp, w in zip(ad_touchpoints, weights):
        key = str(tp.ad_id)
        result[key] = result.get(key, 0) + (w / total_weight)
    return {k: round(v, 4) for k, v in result.items()}


MODELS = {
    "first_click": _first_click,
    "last_click": _last_click,
    "linear": _linear,
    "time_decay": _time_decay,
}


async def compute_attribution(conversion: Conversion, db: AsyncSession) -> dict:
    """Compute all four attribution models for a single conversion and save to DB."""
    if not conversion.touchpoint_ids:
        return {}

    # Fetch all touchpoints in order
    result = await db.execute(
        select(Touchpoint)
        .where(Touchpoint.id.in_(conversion.touchpoint_ids))
        .order_by(Touchpoint.timestamp)
    )
    all_touchpoints = result.scalars().all()

    # Filter to ad touchpoints only (those with an ad_id)
    ad_touchpoints = [tp for tp in all_touchpoints if tp.ad_id is not None]

    if not ad_touchpoints:
        return {}

    conversion.attribution_first_click = _first_click(ad_touchpoints)
    conversion.attribution_last_click = _last_click(ad_touchpoints)
    conversion.attribution_linear = _linear(ad_touchpoints)
    conversion.attribution_time_decay = _time_decay(ad_touchpoints)

    await db.flush()

    return {
        "first_click": conversion.attribution_first_click,
        "last_click": conversion.attribution_last_click,
        "linear": conversion.attribution_linear,
        "time_decay": conversion.attribution_time_decay,
    }


async def recompute_all_attributions(user_id: int, db: AsyncSession):
    """Recompute attribution for all conversions of a user. Run after data sync."""
    result = await db.execute(
        select(Conversion).where(Conversion.user_id == user_id)
    )
    conversions = result.scalars().all()
    for conv in conversions:
        await compute_attribution(conv, db)
    return {"recomputed": len(conversions)}
