"""Generic Meta Graph API client — field names come from caller, not hard-coded."""
import hashlib
import hmac
import json
import httpx
from app.core.config import get_settings

settings = get_settings()


def _appsecret_proof(access_token: str) -> str:
    """Generate appsecret_proof for Meta Graph API calls."""
    return hmac.new(
        settings.META_APP_SECRET.encode("utf-8"),
        access_token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


class MetaGraphClient:
    """
    Thin async wrapper around the Meta Graph API.
    Does NOT invent field names — caller specifies exactly which fields to request.
    Returns raw JSON dicts for the caller to store/normalize.
    """

    BASE = f"https://graph.facebook.com/{settings.META_GRAPH_VERSION}"

    def __init__(self, access_token: str, ad_account_id: str):
        self.access_token = access_token
        self.ad_account_id = ad_account_id  # e.g. "act_123456"
        self._client = httpx.AsyncClient(timeout=60)

    async def close(self):
        await self._client.aclose()

    async def _get(self, url: str, params: dict | None = None) -> dict:
        p = {
            "access_token": self.access_token,
            "appsecret_proof": _appsecret_proof(self.access_token),
            **(params or {}),
        }
        resp = await self._client.get(url, params=p)
        resp.raise_for_status()
        return resp.json()

    async def _get_all_pages(self, url: str, params: dict | None = None) -> list[dict]:
        items = []
        p = {
            "access_token": self.access_token,
            "appsecret_proof": _appsecret_proof(self.access_token),
            "limit": 500,
            **(params or {}),
        }
        while url:
            resp = await self._client.get(url, params=p)
            resp.raise_for_status()
            data = resp.json()
            items.extend(data.get("data", []))
            paging = data.get("paging", {})
            url = paging.get("next")
            p = {}  # next URL already has params baked in
        return items

    # ── Object hierarchy ──

    async def get_campaigns(self, fields: str = "id,name,status,objective,daily_budget,lifetime_budget") -> list[dict]:
        url = f"{self.BASE}/{self.ad_account_id}/campaigns"
        return await self._get_all_pages(url, {"fields": fields})

    async def get_ad_sets(self, campaign_id: str | None = None, fields: str = "id,name,status,targeting,daily_budget,campaign_id") -> list[dict]:
        parent = campaign_id or self.ad_account_id
        url = f"{self.BASE}/{parent}/adsets"
        return await self._get_all_pages(url, {"fields": fields})

    async def get_ads(self, adset_id: str | None = None, fields: str = "id,name,status,creative,adset_id") -> list[dict]:
        parent = adset_id or self.ad_account_id
        url = f"{self.BASE}/{parent}/ads"
        return await self._get_all_pages(url, {"fields": fields})

    # ── Insights (generic) ──

    async def get_insights(
        self,
        object_id: str,
        fields: str = "impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions,cost_per_action_type",
        date_preset: str | None = None,
        time_range: dict | None = None,
        time_increment: str = "1",
        level: str | None = None,
        limit: int = 500,
    ) -> list[dict]:
        url = f"{self.BASE}/{object_id}/insights"
        params: dict = {"fields": fields, "limit": limit, "time_increment": time_increment}
        if date_preset:
            params["date_preset"] = date_preset
        if time_range:
            params["time_range"] = json.dumps(time_range)
        if level:
            params["level"] = level
        return await self._get_all_pages(url, params)

    # ── Account info ──

    async def get_account_info(self, fields: str = "id,name,currency,timezone_name,account_status") -> dict:
        url = f"{self.BASE}/{self.ad_account_id}"
        return await self._get(url, {"fields": fields})
