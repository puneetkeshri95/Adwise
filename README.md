# Namyah — Meta Ads Attribution Dashboard

Production-ready Meta Ads + website journey attribution dashboard.

- **Backend:** FastAPI + SQLAlchemy 2.0 (async) + Alembic + APScheduler + SlowAPI
- **DB:** SQLite (dev) / PostgreSQL (prod, asyncpg) — schema is multi-tenant ready (`tenant_id` on every table)
- **Frontend:** React 18 + Vite + Tailwind + Recharts
- **Tracking:** Custom JS pixel SDK with UTM/fbclid capture, append-only events, idempotent orders, multi-touch attribution (first/last/linear/time-decay)

## Quick start

### 1. Backend
```powershell
# Create venv + install
py -3.11 -m venv .venv
.\.venv\Scripts\pip install -r backend\requirements.txt

# Configure env (or use defaults — SQLite is auto-created)
copy .env.example .env  # then fill META_APP_ID/SECRET/ENCRYPTION_KEY

# Seed dev data
.\.venv\Scripts\python backend\seed.py

# Run
.\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

API docs: http://localhost:8000/docs
Login (seeded): `demo@namyah.com` / `password123`

### 2. Frontend
```powershell
npm install
npm run dev
```
Open http://localhost:5173

### 3. Tests
```powershell
cd backend; ..\.venv\Scripts\python -m pytest tests/ -v
```

## Configuration (`.env`)

```env
SECRET_KEY=change-me
ENCRYPTION_KEY=             # 32-byte urlsafe-base64 key for Fernet (auto if blank)
DATABASE_URL=sqlite+aiosqlite:///C:/meta/backend/namyah.db
# or: postgresql+asyncpg://user:pass@localhost:5432/namyah

META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:8000/api/meta/oauth/callback
META_GRAPH_VERSION=v21.0

TRACK_RATE_LIMIT=60/minute
META_HIERARCHY_SYNC_HOURS=6
META_INSIGHTS_SYNC_HOUR=3
```

Generate an `ENCRYPTION_KEY`:
```powershell
.\.venv\Scripts\python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Architecture

### Data model
- **users** — tenant container (each user is one tenant)
- **campaigns / ad_sets / ads** — Meta hierarchy mirror (tenant_id scoped, unique on `(tenant_id, meta_*_id)`)
- **meta_connections** — encrypted long-lived OAuth tokens (Fernet)
- **meta_insights** — daily normalized insight rows per object (account/campaign/adset/ad)
- **raw_api_responses** — raw JSON from Meta for replay/audit
- **visitors** — unique visitors (cookie → fingerprint → IP fallback)
- **sessions** — visit sessions (30-min inactivity stitching, UTM/fbclid captured at start)
- **events** — append-only event stream (page_view, view_product, add_to_cart, checkout, purchase, identify)
- **orders** — purchases, idempotent on `(tenant_id, order_id)`, with attribution JSON

### Endpoints (all under `/api`)
- `POST /track` — pixel event ingest (rate-limited)
- `GET /journeys?visitor_id=` — full visitor journey (sessions + events)
- `GET /analytics/funnel` — page_view → view_product → add_to_cart → checkout → purchase
- `GET /analytics/by-ad` — group purchases/sessions by UTM + fbclid
- `GET /pixel/namyah.js` — JS SDK download
- `GET /meta/oauth/url` + `/meta/oauth/callback` — OAuth flow
- `GET /meta/connection` — connection status
- `GET /meta/campaigns` — nested tree for cascading dropdowns
- `GET /meta/insights` — daily insights (filterable by level/object/date)
- `GET /meta/summary` — aggregated totals
- `POST /meta/sync/hierarchy` + `/meta/sync/insights` — manual sync
- `GET /reporting/ad-performance` — Meta + site join (spend × revenue per ad)
- `POST /sync/attribution` — recompute all attribution

### Scheduled jobs (in-process via APScheduler)
- Hierarchy sync — every `META_HIERARCHY_SYNC_HOURS` hours
- Insights sync — daily at `META_INSIGHTS_SYNC_HOUR`:00 (last_7d window)

### Pixel snippet
After connecting Meta and seeding, embed on your site:
```html
<script>
  window.NAMYAH_TENANT_ID = 1;
  window.NAMYAH_API = 'http://your-api.com/api';
</script>
<script async src="http://your-api.com/api/pixel/namyah.js"></script>
```
Call events from your site:
```js
namyah('view_product', { product_id: 'sku123', value: 1499 })
namyah('purchase',    { order_id: 'ord_001', value: 4999, currency: 'INR' })
namyah('identify',    { email: 'user@example.com', name: 'Jane' })
```
Tag your Meta ad URLs with `?utm_source=facebook&utm_campaign={{campaign.id}}&utm_content={{ad.id}}` so the join layer can match orders back to ads.

## Migrations
We use Alembic. Initial migration is at `backend/alembic/versions/`. To regenerate after model changes:
```powershell
cd backend; ..\.venv\Scripts\alembic revision --autogenerate -m "your message"
..\.venv\Scripts\alembic upgrade head
```
For dev convenience, `init_db()` runs `Base.metadata.create_all` on startup.

## Security
- Bcrypt password hashing
- JWT auth (HS256)
- Fernet token encryption at rest for Meta access tokens
- SlowAPI rate limit on `/track`
- Multi-tenant isolation: every query scopes by `tenant_id`

## Project layout
```
backend/
  app/
    api/routes/  auth, dashboard, tracking, sync, meta, reporting
    core/        config, database, security
    models/      user, campaign, tracking, meta
    services/
      meta/     oauth, client, sync, capi
      tracking/ session, identity, attribution
      scheduler.py
  alembic/      migrations
  tests/        pytest suites
  seed.py
src/
  components/  CampaignTable, ConversionDrawer, JourneyVisualizer,
               MetaExplorer, JourneyTimeline, FunnelView, PixelSettings, ...
  pages/       Dashboard, Login, Landing
  api.js
```
