"""Meta Ads sync — hierarchy (campaign/adset/ad) and daily insights with raw storage."""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.campaign import Campaign, AdSet, Ad
from app.models.meta import MetaInsight, RawApiResponse
from app.services.meta.client import MetaGraphClient


async def sync_hierarchy(tenant_id: int, db: AsyncSession, client: MetaGraphClient) -> dict:
    """Fetch campaigns → adsets → ads from Meta and upsert locally."""
    now = datetime.now(timezone.utc)
    stats = {"campaigns": 0, "adsets": 0, "ads": 0}

    raw_campaigns = await client.get_campaigns()
    _store_raw(db, tenant_id, "campaigns", {}, raw_campaigns)

    for c in raw_campaigns:
        meta_id = c["id"]
        result = await db.execute(
            select(Campaign).where(Campaign.tenant_id == tenant_id, Campaign.meta_campaign_id == meta_id)
        )
        campaign = result.scalar_one_or_none()
        if campaign:
            campaign.name = c.get("name", campaign.name)
            campaign.status = c.get("status", campaign.status)
            campaign.objective = c.get("objective", campaign.objective)
            campaign.daily_budget = float(c.get("daily_budget", 0)) / 100
            campaign.synced_at = now
        else:
            campaign = Campaign(
                tenant_id=tenant_id, meta_campaign_id=meta_id,
                name=c.get("name", ""), status=c.get("status", "ACTIVE"),
                objective=c.get("objective", ""),
                daily_budget=float(c.get("daily_budget", 0)) / 100,
                synced_at=now,
            )
            db.add(campaign)
        await db.flush()
        stats["campaigns"] += 1

        # Ad Sets
        raw_adsets = await client.get_ad_sets(campaign_id=meta_id)
        _store_raw(db, tenant_id, f"adsets/{meta_id}", {}, raw_adsets)

        for a in raw_adsets:
            as_meta_id = a["id"]
            r = await db.execute(
                select(AdSet).where(AdSet.tenant_id == tenant_id, AdSet.meta_adset_id == as_meta_id)
            )
            adset = r.scalar_one_or_none()
            if adset:
                adset.name = a.get("name", adset.name)
                adset.status = a.get("status", adset.status)
                adset.targeting = a.get("targeting", adset.targeting)
                adset.daily_budget = float(a.get("daily_budget", 0)) / 100
            else:
                adset = AdSet(
                    campaign_id=campaign.id, tenant_id=tenant_id, meta_adset_id=as_meta_id,
                    name=a.get("name", ""), status=a.get("status", "ACTIVE"),
                    targeting=a.get("targeting", {}),
                    daily_budget=float(a.get("daily_budget", 0)) / 100,
                )
                db.add(adset)
            await db.flush()
            stats["adsets"] += 1

            # Ads
            raw_ads = await client.get_ads(adset_id=as_meta_id)
            _store_raw(db, tenant_id, f"ads/{as_meta_id}", {}, raw_ads)

            for ad_data in raw_ads:
                ad_meta_id = ad_data["id"]
                r2 = await db.execute(
                    select(Ad).where(Ad.tenant_id == tenant_id, Ad.meta_ad_id == ad_meta_id)
                )
                ad = r2.scalar_one_or_none()
                if ad:
                    ad.name = ad_data.get("name", ad.name)
                    ad.status = ad_data.get("status", ad.status)
                else:
                    ad = Ad(
                        ad_set_id=adset.id, tenant_id=tenant_id, meta_ad_id=ad_meta_id,
                        name=ad_data.get("name", ""), status=ad_data.get("status", "ACTIVE"),
                    )
                    db.add(ad)
                await db.flush()
                stats["ads"] += 1

    return stats


async def sync_insights(
    tenant_id: int,
    db: AsyncSession,
    client: MetaGraphClient,
    date_preset: str | None = "last_30d",
    time_range: dict | None = None,
    levels: list[str] | None = None,
) -> dict:
    """Fetch daily insights and store raw + normalized rows.
    Use either date_preset OR time_range (time_range takes priority).
    time_range example: {"since": "2025-01-01", "until": "2025-12-31"}
    """
    if levels is None:
        levels = ["account", "campaign", "adset", "ad"]

    stats = {"rows_upserted": 0}
    fields = "impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions,cost_per_action_type,campaign_id,adset_id,ad_id,campaign_name,adset_name,ad_name"

    for level in levels:
        raw_rows = await client.get_insights(
            object_id=client.ad_account_id, fields=fields,
            date_preset=None if time_range else date_preset,
            time_range=time_range,
            level=level, time_increment="1",
        )
        _store_raw(db, tenant_id, f"insights/{level}", {"date_preset": date_preset, "time_range": time_range}, raw_rows)

        for row in raw_rows:
            date_str = row.get("date_start", "")
            obj_id = _extract_object_id(row, level, client.ad_account_id)
            obj_name = row.get("campaign_name") or row.get("adset_name") or row.get("ad_name") or ""

            result = await db.execute(
                select(MetaInsight).where(
                    MetaInsight.tenant_id == tenant_id,
                    MetaInsight.date == date_str,
                    MetaInsight.level == level,
                    MetaInsight.object_id == obj_id,
                )
            )
            insight = result.scalar_one_or_none()
            if not insight:
                insight = MetaInsight(
                    tenant_id=tenant_id, date=date_str, level=level,
                    object_id=obj_id, object_name=obj_name,
                )
                db.add(insight)

            insight.impressions = int(row.get("impressions", 0))
            insight.clicks = int(row.get("clicks", 0))
            insight.spend = float(row.get("spend", 0))
            insight.reach = int(row.get("reach", 0))
            insight.cpm = float(row.get("cpm", 0))
            insight.cpc = float(row.get("cpc", 0))
            insight.ctr = float(row.get("ctr", 0))
            insight.frequency = float(row.get("frequency", 0))
            insight.actions = row.get("actions", [])
            insight.cost_per_action = row.get("cost_per_action_type", [])

            conversions = 0
            for action in insight.actions or []:
                if action.get("action_type") in ("purchase", "offsite_conversion.fb_pixel_purchase"):
                    conversions += int(action.get("value", 0))
            insight.conversions = conversions

            insight.extra_metrics = {k: v for k, v in row.items() if k not in (
                "impressions", "clicks", "spend", "reach", "cpm", "cpc", "ctr",
                "frequency", "actions", "cost_per_action_type", "date_start", "date_stop",
                "campaign_id", "adset_id", "ad_id", "campaign_name", "adset_name", "ad_name",
            )}

            await db.flush()
            stats["rows_upserted"] += 1

    await _update_aggregate_metrics(tenant_id, db)
    return stats


async def _update_aggregate_metrics(tenant_id: int, db: AsyncSession):
    """Roll up insight totals into campaign/adset/ad summary fields."""
    for Model, level, id_field in [
        (Campaign, "campaign", "meta_campaign_id"),
        (AdSet, "adset", "meta_adset_id"),
        (Ad, "ad", "meta_ad_id"),
    ]:
        objs = (await db.execute(select(Model).where(Model.tenant_id == tenant_id))).scalars().all()
        for o in objs:
            r = await db.execute(
                select(
                    func.coalesce(func.sum(MetaInsight.spend), 0),
                    func.coalesce(func.sum(MetaInsight.impressions), 0),
                    func.coalesce(func.sum(MetaInsight.clicks), 0),
                ).where(
                    MetaInsight.tenant_id == tenant_id,
                    MetaInsight.level == level,
                    MetaInsight.object_id == getattr(o, id_field),
                )
            )
            row = r.one()
            o.spend = float(row[0])
            o.impressions = int(row[1])
            o.clicks = int(row[2])


def _extract_object_id(row: dict, level: str, ad_account_id: str) -> str:
    if level == "account":
        return ad_account_id
    return row.get(f"{level}_id", "")


def _store_raw(db: AsyncSession, tenant_id: int, endpoint: str, params: dict, data):
    raw = RawApiResponse(
        tenant_id=tenant_id, endpoint=endpoint, request_params=params,
        response_json=data if isinstance(data, dict) else {"data": data},
    )
    db.add(raw)
