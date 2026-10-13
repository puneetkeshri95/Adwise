"""Meta OAuth — token exchange and long-lived token generation."""
import httpx
from app.core.config import get_settings

settings = get_settings()

META_OAUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth"
META_TOKEN_URL = f"https://graph.facebook.com/{settings.META_GRAPH_VERSION}/oauth/access_token"
META_DEBUG_URL = f"https://graph.facebook.com/{settings.META_GRAPH_VERSION}/debug_token"

REQUIRED_SCOPES = "ads_read,business_management"


def get_oauth_url(state: str = "") -> str:
    """Build the Meta OAuth authorization URL."""
    params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": settings.META_REDIRECT_URI,
        "scope": REQUIRED_SCOPES,
        "response_type": "code",
        "state": state,
    }
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{META_OAUTH_URL}?{qs}"


async def exchange_code(code: str) -> dict:
    """Exchange auth code for short-lived token, then extend to long-lived."""
    async with httpx.AsyncClient(timeout=30) as client:
        # Short-lived token
        resp = await client.get(META_TOKEN_URL, params={
            "client_id": settings.META_APP_ID,
            "client_secret": settings.META_APP_SECRET,
            "redirect_uri": settings.META_REDIRECT_URI,
            "code": code,
        })
        resp.raise_for_status()
        short_data = resp.json()
        short_token = short_data["access_token"]

        # Exchange for long-lived token (60 days)
        resp2 = await client.get(META_TOKEN_URL, params={
            "grant_type": "fb_exchange_token",
            "client_id": settings.META_APP_ID,
            "client_secret": settings.META_APP_SECRET,
            "fb_exchange_token": short_token,
        })
        resp2.raise_for_status()
        long_data = resp2.json()

        return {
            "access_token": long_data["access_token"],
            "token_type": long_data.get("token_type", "bearer"),
            "expires_in": long_data.get("expires_in", 5184000),  # ~60 days
        }


async def get_ad_accounts(access_token: str) -> list[dict]:
    """Fetch ad accounts the user has access to."""
    url = f"https://graph.facebook.com/{settings.META_GRAPH_VERSION}/me/adaccounts"
    import hashlib, hmac
    proof = hmac.new(
        settings.META_APP_SECRET.encode("utf-8"),
        access_token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params={
            "access_token": access_token,
            "appsecret_proof": proof,
            "fields": "id,name,account_id,currency,timezone_name,account_status",
            "limit": 50,
        })
        if resp.status_code >= 400:
            raise RuntimeError(f"Meta /me/adaccounts {resp.status_code}: {resp.text}")
        return resp.json().get("data", [])
