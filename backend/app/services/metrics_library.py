"""Metrics Library — single source of truth for every metric in AdWise.

Each metric defines: name, short label (column header), category, formula text,
description, and direction ("higher" or "lower" is better — drives delta-color logic).
"""
from typing import Literal, TypedDict


class MetricDef(TypedDict):
    key: str
    name: str
    short: str
    category: str
    formula: str
    description: str
    direction: Literal["higher", "lower", "neutral"]
    system: bool


SYSTEM_METRICS: list[MetricDef] = [
    # ─── Cost & Spend ────────────────────────────────────────────────────────
    {"key": "total_spend", "name": "Total Spend", "short": "Spend",
     "category": "Cost & Spend",
     "formula": "Sum of all ad spend in the period",
     "description": "Total money spent across all active campaigns.",
     "direction": "neutral", "system": True},
    {"key": "cpm", "name": "CPM", "short": "CPM",
     "category": "Cost & Spend",
     "formula": "(Spend / Impressions) × 1,000",
     "description": "Cost per 1,000 impressions served.",
     "direction": "lower", "system": True},
    {"key": "cpc", "name": "CPC", "short": "CPC",
     "category": "Cost & Spend",
     "formula": "Spend / Clicks",
     "description": "Cost per link click.",
     "direction": "lower", "system": True},
    {"key": "cpl", "name": "CPL", "short": "CPL",
     "category": "Cost & Spend",
     "formula": "Spend / Leads",
     "description": "Cost to generate one lead (form fill or lead ad).",
     "direction": "lower", "system": True},
    {"key": "cpa", "name": "CPA", "short": "CPA",
     "category": "Cost & Spend",
     "formula": "Spend / Conversions",
     "description": "Cost to generate one conversion (payment event).",
     "direction": "lower", "system": True},
    {"key": "cpvc", "name": "CPVC", "short": "CPVC",
     "category": "Cost & Spend",
     "formula": "Spend / Completed Video Views",
     "description": "Cost for each full video play.",
     "direction": "lower", "system": True},

    # ─── Revenue & Return ────────────────────────────────────────────────────
    {"key": "total_revenue", "name": "Total Revenue", "short": "Revenue",
     "category": "Revenue & Return",
     "formula": "Sum of all payment webhook events",
     "description": "Server-tracked first-party revenue — our most accurate number.",
     "direction": "higher", "system": True},
    {"key": "roas", "name": "ROAS", "short": "ROAS",
     "category": "Revenue & Return",
     "formula": "Total Revenue / Total Spend",
     "description": "Revenue returned per rupee spent on ads.",
     "direction": "higher", "system": True},
    {"key": "roi", "name": "ROI", "short": "ROI",
     "category": "Revenue & Return",
     "formula": "((Revenue − Spend) / Spend) × 100",
     "description": "Net return on investment as a percentage.",
     "direction": "higher", "system": True},
    {"key": "profit", "name": "Profit", "short": "Profit",
     "category": "Revenue & Return",
     "formula": "Total Revenue − Total Spend",
     "description": "Gross profit attributed to ads.",
     "direction": "higher", "system": True},
    {"key": "aov", "name": "AOV", "short": "AOV",
     "category": "Revenue & Return",
     "formula": "Total Revenue / Number of Conversions",
     "description": "Average value of each order.",
     "direction": "higher", "system": True},
    {"key": "reported_revenue", "name": "Reported Revenue", "short": "Rep. Revenue",
     "category": "Revenue & Return",
     "formula": "Revenue as reported by Meta (pixel-based)",
     "description": "Meta's own attribution — compare vs Total Revenue to see the discrepancy.",
     "direction": "higher", "system": True},
    {"key": "attribution_gap", "name": "Attribution Gap", "short": "Attr. Gap",
     "category": "Revenue & Return",
     "formula": "Reported Revenue − Total Revenue",
     "description": "Difference between Meta-reported and server-tracked revenue. Negative = Meta over-reporting.",
     "direction": "neutral", "system": True},

    # ─── Reach ───────────────────────────────────────────────────────────────
    {"key": "impressions", "name": "Impressions", "short": "Impr.",
     "category": "Reach",
     "formula": "Total ad impressions served (Meta API)",
     "description": "How many times the ad was shown in total.",
     "direction": "higher", "system": True},
    {"key": "reach", "name": "Reach", "short": "Reach",
     "category": "Reach",
     "formula": "Unique users who saw the ad (Meta API)",
     "description": "Distinct people who saw the ad at least once.",
     "direction": "higher", "system": True},
    {"key": "frequency", "name": "Frequency", "short": "Freq.",
     "category": "Reach",
     "formula": "Impressions / Reach",
     "description": "Average number of times each person saw the ad.",
     "direction": "neutral", "system": True},

    # ─── Clicks & CTR ────────────────────────────────────────────────────────
    {"key": "clicks", "name": "Clicks", "short": "Clicks",
     "category": "Clicks & CTR",
     "formula": "Total link clicks (Meta API)",
     "description": "Total clicks on the ad link.",
     "direction": "higher", "system": True},
    {"key": "unique_clicks", "name": "Unique Clicks", "short": "Uniq. Clicks",
     "category": "Clicks & CTR",
     "formula": "Unique users who clicked (Meta API)",
     "description": "Distinct people who clicked at least once.",
     "direction": "higher", "system": True},
    {"key": "ctr", "name": "CTR", "short": "CTR",
     "category": "Clicks & CTR",
     "formula": "(Clicks / Impressions) × 100",
     "description": "% of impressions that resulted in a click.",
     "direction": "higher", "system": True},
    {"key": "unique_ctr", "name": "Unique CTR", "short": "Uniq. CTR",
     "category": "Clicks & CTR",
     "formula": "(Unique Clicks / Reach) × 100",
     "description": "CTR based on unique users rather than total impressions.",
     "direction": "higher", "system": True},

    # ─── Landing Page ────────────────────────────────────────────────────────
    {"key": "landing_page_views", "name": "Landing Page Views", "short": "LP Views",
     "category": "Landing Page",
     "formula": "Count of page_view events from tracking pixel",
     "description": "Users who actually loaded the landing page — our first-party data.",
     "direction": "higher", "system": True},
    {"key": "lp_ctr", "name": "LP CTR", "short": "LP CTR",
     "category": "Landing Page",
     "formula": "(Landing Page Views / Clicks) × 100",
     "description": "% of ad clicks that resulted in a real page load. Low LP CTR = broken redirect or slow page.",
     "direction": "higher", "system": True},
    {"key": "page_views", "name": "Page Views", "short": "Page Views",
     "category": "Landing Page",
     "formula": "Total page_view events (includes repeat visits)",
     "description": "All page loads including multiple views by the same user.",
     "direction": "higher", "system": True},
    {"key": "unique_sessions", "name": "Unique Sessions", "short": "Sessions",
     "category": "Landing Page",
     "formula": "Sessions with distinct session IDs",
     "description": "Individual browsing sessions — one user can have multiple sessions.",
     "direction": "higher", "system": True},
    {"key": "new_visitors", "name": "New Visitors", "short": "New Visitors",
     "category": "Landing Page",
     "formula": "Tracking IDs seen for first time in the period",
     "description": "Users with no prior history in our system.",
     "direction": "higher", "system": True},
    {"key": "returning_visitors", "name": "Returning Visitors", "short": "Returning",
     "category": "Landing Page",
     "formula": "Tracking IDs seen in a prior period",
     "description": "Users who have visited before.",
     "direction": "higher", "system": True},
    {"key": "bounce_rate", "name": "Bounce Rate", "short": "Bounce",
     "category": "Landing Page",
     "formula": "(Sessions with 1 page view / Total Sessions) × 100",
     "description": "% of sessions that left without any further interaction.",
     "direction": "lower", "system": True},
    {"key": "avg_session_duration", "name": "Avg. Session Duration", "short": "Avg. Dur.",
     "category": "Landing Page",
     "formula": "Total time on site / Total Sessions",
     "description": "Average time a user spends per session.",
     "direction": "higher", "system": True},

    # ─── Conversions ─────────────────────────────────────────────────────────
    {"key": "conversions", "name": "Conversions", "short": "Sales",
     "category": "Conversions",
     "formula": "Count of payment webhook events fired",
     "description": "Purchases confirmed by server-to-server webhook.",
     "direction": "higher", "system": True},
    {"key": "conversion_rate", "name": "Conversion Rate", "short": "Conv. Rate",
     "category": "Conversions",
     "formula": "(Conversions / Landing Page Views) × 100",
     "description": "% of landing page visitors who converted.",
     "direction": "higher", "system": True},
    {"key": "click_to_conv_rate", "name": "Click-to-Conv. Rate", "short": "Click→Conv",
     "category": "Conversions",
     "formula": "(Conversions / Clicks) × 100",
     "description": "% of ad clicks that ended in a purchase.",
     "direction": "higher", "system": True},
    {"key": "checkout_start_rate", "name": "Checkout Start Rate", "short": "Checkout Rate",
     "category": "Conversions",
     "formula": "(Checkout Start Events / Landing Page Views) × 100",
     "description": "% of visitors who initiated checkout.",
     "direction": "higher", "system": True},
    {"key": "purchase_completion_rate", "name": "Purchase Completion Rate", "short": "Completion",
     "category": "Conversions",
     "formula": "(Conversions / Checkout Start Events) × 100",
     "description": "% of users who started checkout and completed it.",
     "direction": "higher", "system": True},

    # ─── Video ───────────────────────────────────────────────────────────────
    {"key": "video_views_3s", "name": "Video Views (3s)", "short": "VV (3s)",
     "category": "Video",
     "formula": "Count of video plays ≥ 3 seconds",
     "description": "Standard Meta video view — the baseline for all video metrics.",
     "direction": "higher", "system": True},
    {"key": "hook_rate", "name": "Hook Rate", "short": "Hook",
     "category": "Video",
     "formula": "(3-Second Video Views / Impressions) × 100",
     "description": "% of people who watched at least 3 seconds. Measures how well the opening grabs attention.",
     "direction": "higher", "system": True},
    {"key": "view_25", "name": "25% View Rate", "short": "25%",
     "category": "Video",
     "formula": "(25% Completions / Impressions) × 100",
     "description": "% of impressions that watched the first quarter of the video.",
     "direction": "higher", "system": True},
    {"key": "view_50", "name": "50% View Rate", "short": "50%",
     "category": "Video",
     "formula": "(50% Completions / Impressions) × 100",
     "description": "% of impressions that watched half the video.",
     "direction": "higher", "system": True},
    {"key": "view_75", "name": "75% View Rate", "short": "75%",
     "category": "Video",
     "formula": "(75% Completions / Impressions) × 100",
     "description": "% of impressions that watched three-quarters of the video.",
     "direction": "higher", "system": True},
    {"key": "hold_rate", "name": "Hold Rate", "short": "Hold",
     "category": "Video",
     "formula": "(Full Video Completions / 3-Second Views) × 100",
     "description": "Of people who started watching, % who finished. Measures content quality.",
     "direction": "higher", "system": True},
    {"key": "completion_rate", "name": "Completion Rate", "short": "Completion",
     "category": "Video",
     "formula": "(Full Video Completions / Impressions) × 100",
     "description": "% of total impressions that watched the entire video from start to finish.",
     "direction": "higher", "system": True},
]

CATEGORIES = ["Cost & Spend", "Revenue & Return", "Reach", "Clicks & CTR",
              "Landing Page", "Conversions", "Video"]


def get_metrics_by_category() -> dict[str, list[MetricDef]]:
    """Group metrics by category, in canonical order."""
    out: dict[str, list[MetricDef]] = {c: [] for c in CATEGORIES}
    for m in SYSTEM_METRICS:
        out.setdefault(m["category"], []).append(m)
    return out


def get_metric(key: str) -> MetricDef | None:
    for m in SYSTEM_METRICS:
        if m["key"] == key:
            return m
    return None
