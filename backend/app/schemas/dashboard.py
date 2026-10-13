from pydantic import BaseModel
from datetime import datetime


# ---------- Campaign ----------
class CampaignOut(BaseModel):
    id: int
    meta_campaign_id: str | None = ""
    name: str
    status: str
    objective: str
    daily_budget: float
    spend: float
    impressions: int
    clicks: int
    ad_sets: list["AdSetOut"] = []

    model_config = {"from_attributes": True}


# ---------- Ad Set ----------
class AdSetOut(BaseModel):
    id: int
    meta_adset_id: str | None = ""
    name: str
    status: str
    daily_budget: float
    spend: float
    impressions: int
    clicks: int
    ads: list["AdOut"] = []

    model_config = {"from_attributes": True}


# ---------- Ad ----------
class AdOut(BaseModel):
    id: int
    meta_ad_id: str | None = ""
    name: str
    status: str
    creative_url: str
    creative_type: str
    spend: float
    impressions: int
    clicks: int

    model_config = {"from_attributes": True}


# ---------- Visitor ----------
class VisitorOut(BaseModel):
    id: int
    visitor_uid: str
    email: str
    name: str
    total_visits: int
    first_seen: datetime | None = None
    last_seen: datetime | None = None

    model_config = {"from_attributes": True}


# ---------- Touchpoint ----------
class TouchpointOut(BaseModel):
    id: int
    visitor_id: int
    ad_id: int | None = None
    event_type: str
    event_data: dict = {}
    source: str
    medium: str
    device: str
    timestamp: datetime | None = None

    model_config = {"from_attributes": True}


# ---------- Conversion ----------
class ConversionOut(BaseModel):
    id: int
    visitor_id: int
    order_id: str
    amount: float
    currency: str
    status: str
    attribution_first_click: dict = {}
    attribution_last_click: dict = {}
    attribution_linear: dict = {}
    attribution_time_decay: dict = {}
    touchpoint_ids: list = []
    converted_at: datetime | None = None

    model_config = {"from_attributes": True}


class ConversionDetail(ConversionOut):
    visitor: VisitorOut | None = None
    touchpoints: list[TouchpointOut] = []


# ---------- Dashboard KPIs ----------
class KPIResponse(BaseModel):
    revenue: float
    ad_spend: float
    roas: float
    cpa: float
    conversions: int
    visitors: int
    revenue_change: float = 0.0
    spend_change: float = 0.0
    roas_change: float = 0.0
    cpa_change: float = 0.0
    conversions_change: float = 0.0
    visitors_change: float = 0.0


# ---------- Attribution ----------
class AttributionRequest(BaseModel):
    model: str = "last_click"  # first_click, last_click, linear, time_decay
    start_date: str | None = None
    end_date: str | None = None
    campaign_id: int | None = None
