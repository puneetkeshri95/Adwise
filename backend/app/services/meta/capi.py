"""Meta Conversions API forwarder — server-side event forwarding for iOS14+ resilience."""
import hashlib
import time
import httpx
from typing import Optional
from app.core.config import settings


def _sha256(value: str) -> str:
    return hashlib.sha256(value.strip().lower().encode()).hexdigest() if value else ""


async def forward_event(
    pixel_id: str,
    access_token: str,
    event_name: str,
    event_id: str,
    event_time: Optional[int] = None,
    email: str = "",
    phone: str = "",
    fbc: str = "",
    fbp: str = "",
    client_ip: str = "",
    client_ua: str = "",
    event_source_url: str = "",
    value: float = 0,
    currency: str = "INR",
    custom_data: Optional[dict] = None,
) -> dict:
    """POST a single event to Meta CAPI. event_id is the dedup key shared with browser pixel."""
    url = f"https://graph.facebook.com/v{settings.META_GRAPH_VERSION}/{pixel_id}/events"

    user_data = {}
    if email:
        user_data["em"] = [_sha256(email)]
    if phone:
        user_data["ph"] = [_sha256(phone)]
    if fbc:
        user_data["fbc"] = fbc
    if fbp:
        user_data["fbp"] = fbp
    if client_ip:
        user_data["client_ip_address"] = client_ip
    if client_ua:
        user_data["client_user_agent"] = client_ua

    event = {
        "event_name": event_name,
        "event_time": event_time or int(time.time()),
        "event_id": event_id,  # dedup key
        "action_source": "website",
        "event_source_url": event_source_url,
        "user_data": user_data,
        "custom_data": custom_data or ({"value": value, "currency": currency} if value else {}),
    }

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, json={"data": [event], "access_token": access_token})
        r.raise_for_status()
        return r.json()
