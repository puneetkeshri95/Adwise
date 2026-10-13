"""Meta Ads routes — OAuth flow, campaigns hierarchy, insights, summary, manual sync."""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
import secrets
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, encrypt_token, decrypt_token
from app.models.user import User
from app.models.meta import MetaConnection, MetaInsight
from app.models.campaign import Campaign, AdSet, Ad
from app.services.meta import oauth as meta_oauth
from app.services.meta.client import MetaGraphClient
from app.services.meta.sync import sync_hierarchy, sync_insights

router = APIRouter(prefix="/meta", tags=["meta"])

# In-memory state store (single-process). For prod use Redis.
_oauth_states: dict[str, int] = {}
# Temporary store for pending account selection (state → {user_id, token, expires_at, accounts})
_pending_account_select: dict[int, dict] = {}


@router.get("/oauth/url")
async def oauth_url(current_user: User = Depends(get_current_user)):
    """Return Meta OAuth dialog URL for the user to authorize."""
    state = secrets.token_urlsafe(24)
    _oauth_states[state] = current_user.id
    url = meta_oauth.get_oauth_url(state)
    return {"url": url, "state": state}


@router.get("/oauth/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """OAuth redirect target — exchange code, encrypt token, save MetaConnection."""
    import logging
    log = logging.getLogger(__name__)

    user_id = _oauth_states.pop(state, None)
    if not user_id:
        log.warning(f"[meta-oauth] invalid/expired state: {state}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/app/dashboard?meta_error=invalid_state",
            status_code=302,
        )

    try:
        token_data = await meta_oauth.exchange_code(code)
    except Exception as e:
        log.exception(f"[meta-oauth] token exchange failed")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/app/dashboard?meta_error=token_exchange_failed&detail={str(e)[:120]}",
            status_code=302,
        )

    access_token = token_data["access_token"]
    expires_in = token_data.get("expires_in", 60 * 24 * 60 * 60)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    try:
        accounts = await meta_oauth.get_ad_accounts(access_token)
    except Exception as e:
        log.exception("[meta-oauth] ad accounts fetch failed")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/app/dashboard?meta_error=accounts_fetch_failed&detail={str(e)[:120]}", status_code=302)

    if not accounts:
        log.warning("[meta-oauth] no ad accounts for user")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/app/dashboard?meta_error=no_ad_accounts", status_code=302)

    # If multiple accounts, let the user pick on the frontend
    if len(accounts) > 1:
        _pending_account_select[user_id] = {
            "access_token": access_token,
            "expires_at": expires_at,
            "accounts": accounts,
        }
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/app/dashboard?meta_select_account=1", status_code=302)

    # Single account — auto-connect
    ad_account = accounts[0]
    ad_account_id = ad_account["id"]
    log.info(f"[meta-oauth] connected tenant {user_id} → ad_account {ad_account_id}")

    # Upsert MetaConnection
    r = await db.execute(
        select(MetaConnection).where(
            MetaConnection.tenant_id == user_id,
            MetaConnection.ad_account_id == ad_account_id,
        )
    )
    conn = r.scalar_one_or_none()
    if conn:
        conn.access_token_encrypted = encrypt_token(access_token)
        conn.token_expires_at = expires_at
        conn.is_active = True
    else:
        conn = MetaConnection(
            tenant_id=user_id,
            ad_account_id=ad_account_id,
            access_token_encrypted=encrypt_token(access_token),
            token_expires_at=expires_at,
            scopes=meta_oauth.REQUIRED_SCOPES,
            is_active=True,
        )
        db.add(conn)
    await db.commit()

    # Redirect back to frontend
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/app/dashboard?meta_connected=1")


@router.get("/ad-accounts")
async def list_pending_ad_accounts(current_user: User = Depends(get_current_user)):
    """Return the list of ad accounts waiting to be selected after OAuth."""
    pending = _pending_account_select.get(current_user.id)
    if not pending:
        return {"accounts": []}
    return {"accounts": pending["accounts"]}


@router.post("/select-account")
async def select_ad_account(
    ad_account_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Finalize connection with the chosen ad account."""
    import logging
    log = logging.getLogger(__name__)

    pending = _pending_account_select.pop(current_user.id, None)
    if not pending:
        raise HTTPException(status_code=400, detail="No pending account selection. Re-run OAuth.")

    # Validate account ID is in the list
    valid_ids = [a["id"] for a in pending["accounts"]]
    if ad_account_id not in valid_ids:
        raise HTTPException(status_code=400, detail=f"Invalid ad_account_id. Available: {valid_ids}")

    access_token = pending["access_token"]
    expires_at = pending["expires_at"]

    log.info(f"[meta-oauth] user selected account: tenant {current_user.id} → {ad_account_id}")

    # Deactivate old connections
    r = await db.execute(
        select(MetaConnection).where(MetaConnection.tenant_id == current_user.id)
    )
    for old in r.scalars().all():
        old.is_active = False

    # Create new connection
    conn = MetaConnection(
        tenant_id=current_user.id,
        ad_account_id=ad_account_id,
        access_token_encrypted=encrypt_token(access_token),
        token_expires_at=expires_at,
        scopes=meta_oauth.REQUIRED_SCOPES,
        is_active=True,
    )
    db.add(conn)
    await db.commit()
    return {"ok": True, "ad_account_id": ad_account_id}


@router.get("/connection")
async def get_connection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return current Meta connection status (no token leakage)."""
    r = await db.execute(
        select(MetaConnection).where(
            MetaConnection.tenant_id == current_user.id,
            MetaConnection.is_active == True,
        )
    )
    conn = r.scalar_one_or_none()
    if not conn:
        return {"connected": False}
    return {
        "connected": True,
        "ad_account_id": conn.ad_account_id,
        "expires_at": conn.token_expires_at.isoformat() if conn.token_expires_at else None,
        "scopes": conn.scopes,
    }


@router.delete("/connection")
async def disconnect_meta(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove existing Meta connection (stale token) so user can reconnect."""
    r = await db.execute(
        select(MetaConnection).where(MetaConnection.tenant_id == current_user.id)
    )
    conns = r.scalars().all()
    for c in conns:
        await db.delete(c)
    await db.commit()
    return {"disconnected": True}


async def _get_client(tenant_id: int, db: AsyncSession) -> MetaGraphClient:
    r = await db.execute(
        select(MetaConnection).where(
            MetaConnection.tenant_id == tenant_id,
            MetaConnection.is_active == True,
        )
    )
    conn = r.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=400, detail="No active Meta connection. Please connect first.")
    token = decrypt_token(conn.access_token_encrypted)
    return MetaGraphClient(access_token=token, ad_account_id=conn.ad_account_id)


@router.get("/campaigns")
async def get_campaigns_tree(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return nested campaign → adset → ad tree (for cascading dropdowns)."""
    r = await db.execute(select(Campaign).where(Campaign.tenant_id == current_user.id))
    campaigns = r.scalars().all()
    out = []
    for c in campaigns:
        rs = await db.execute(select(AdSet).where(AdSet.campaign_id == c.id))
        adsets = rs.scalars().all()
        adset_list = []
        for a in adsets:
            ra = await db.execute(select(Ad).where(Ad.ad_set_id == a.id))
            ads = ra.scalars().all()
            adset_list.append({
                "id": a.id, "meta_adset_id": a.meta_adset_id, "name": a.name, "status": a.status,
                "spend": a.spend, "impressions": a.impressions, "clicks": a.clicks,
                "ads": [
                    {"id": ad.id, "meta_ad_id": ad.meta_ad_id, "name": ad.name, "status": ad.status,
                     "spend": ad.spend, "impressions": ad.impressions, "clicks": ad.clicks}
                    for ad in ads
                ],
            })
        out.append({
            "id": c.id, "meta_campaign_id": c.meta_campaign_id, "name": c.name,
            "status": c.status, "objective": c.objective,
            "spend": c.spend, "impressions": c.impressions, "clicks": c.clicks,
            "adsets": adset_list,
        })
    return out


@router.get("/insights")
async def get_insights(
    level: str = Query("campaign", regex="^(account|campaign|adset|ad)$"),
    object_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return daily insight rows for a given level / object."""
    q = select(MetaInsight).where(
        MetaInsight.tenant_id == current_user.id, MetaInsight.level == level
    )
    if object_id:
        q = q.where(MetaInsight.object_id == object_id)
    if date_from:
        q = q.where(MetaInsight.date >= date_from)
    if date_to:
        q = q.where(MetaInsight.date <= date_to)
    q = q.order_by(MetaInsight.date)
    r = await db.execute(q)
    rows = r.scalars().all()
    return [
        {
            "date": x.date, "level": x.level, "object_id": x.object_id, "object_name": x.object_name,
            "impressions": x.impressions, "clicks": x.clicks, "spend": x.spend,
            "reach": x.reach, "cpm": x.cpm, "cpc": x.cpc, "ctr": x.ctr, "frequency": x.frequency,
            "conversions": x.conversions, "actions": x.actions,
        }
        for x in rows
    ]


@router.get("/summary")
async def get_summary(
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """High-level totals across the account."""
    q = select(
        func.coalesce(func.sum(MetaInsight.spend), 0),
        func.coalesce(func.sum(MetaInsight.impressions), 0),
        func.coalesce(func.sum(MetaInsight.clicks), 0),
        func.coalesce(func.sum(MetaInsight.conversions), 0),
        func.coalesce(func.sum(MetaInsight.reach), 0),
    ).where(MetaInsight.tenant_id == current_user.id, MetaInsight.level == "account")
    if date_from:
        q = q.where(MetaInsight.date >= date_from)
    if date_to:
        q = q.where(MetaInsight.date <= date_to)
    row = (await db.execute(q)).one()
    spend, impressions, clicks, conversions, reach = row
    return {
        "spend": float(spend), "impressions": int(impressions), "clicks": int(clicks),
        "conversions": int(conversions), "reach": int(reach),
        "ctr": (float(clicks) / float(impressions) * 100) if impressions else 0,
        "cpc": (float(spend) / float(clicks)) if clicks else 0,
        "cpm": (float(spend) / float(impressions) * 1000) if impressions else 0,
    }


@router.post("/sync/hierarchy")
async def trigger_hierarchy_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = await _get_client(current_user.id, db)
    stats = await sync_hierarchy(current_user.id, db, client)
    await db.commit()
    return {"ok": True, **stats}


@router.post("/sync/insights")
async def trigger_insights_sync(
    date_preset: str = "last_30d",
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync insights from Meta. Use date_from/date_to for custom range, or date_preset for shortcuts."""
    client = await _get_client(current_user.id, db)
    time_range = None
    if date_from and date_to:
        time_range = {"since": date_from, "until": date_to}
    stats = await sync_insights(current_user.id, db, client, date_preset=date_preset, time_range=time_range)
    await db.commit()
    return {"ok": True, **stats}
