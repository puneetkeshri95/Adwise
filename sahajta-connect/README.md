# Sahajta Connect

A **frontend-only, high-fidelity product demo** of a unified social media analytics dashboard with a conceptual **MCP (Model Context Protocol) connector** for Claude.

Built to sit alongside the existing Trackr / AdWise attribution dashboard in this workspace — shares the same design DNA (dark navy palette, `#378ADD` brand blue, Inter type, glass panels) while introducing platform-brand accents for Instagram, Facebook, X and YouTube.

---

## What it does

1. **Simulated multi-platform connectors** — Instagram, Facebook, X (Twitter), YouTube. Click *Connect*, walk through a realistic OAuth-style modal, and land in a live dashboard populated with plausible mock data.
2. **Unified analytics dashboard** — animated KPI counters, area/bar/donut charts (Recharts), top-post ranking, sentiment-tagged comments, filter by platform, 7 / 30 / 90 day range.
3. **MCP Integration page** — interactive tool explorer for 6 exposed MCP tools, sample Claude prompts, drop-in `claude_desktop_config.json` snippet, and a full architecture diagram (Sources → Data layer → MCP server → Claude).
4. **Real .pptx generation** — powered by `pptxgenjs`, entirely in-browser. Pick scope + sections, watch a 4-step progress animation, and get a real downloadable PowerPoint file.
5. **Landing marketing page**, light/dark mode toggle, toast notifications, animated empty states, responsive layout, and localStorage-based persistence for connection state.

No backend, no real credentials, no real API calls.

---

## Running

```powershell
cd sahajta-connect
npm install
npm run dev
```

Then open http://localhost:5174

### Build for production

```powershell
npm run build
npm run preview
```

---

## Tech stack

- **Vite + React 18** — same as the parent workspace
- **Tailwind CSS 3** with a `dark` class strategy for light/dark
- **React Router 6** for routing
- **Recharts** for line/bar/donut charts
- **Lucide React** for icons
- **pptxgenjs** for real client-side PowerPoint generation

---

## Project structure

```
sahajta-connect/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx          # Entry, mounts BrowserRouter + providers
    ├── App.jsx           # Routes: Landing, AppShell (Dashboard/Connectors/MCP/Presentations/Settings)
    ├── index.css         # Design system: theme variables, cards, buttons, animations
    ├── contexts/
    │   ├── AppContext.jsx     # Connection state, sync flow, toast manager
    │   └── ThemeContext.jsx   # dark/light mode
    ├── lib/
    │   ├── platforms.js       # Platform metadata + brand colors
    │   ├── mockData.js        # Deterministic-ish mock generator (accounts, time series, posts, comments)
    │   ├── format.js          # compact(), num(), pct(), relativeTime()...
    │   └── pptGenerator.js    # pptxgenjs slide builders + generatePresentation()
    ├── components/
    │   ├── AppShell.jsx       # Sidebar + Topbar layout
    │   ├── Topbar.jsx
    │   ├── Toasts.jsx
    │   ├── ConnectorCard.jsx  # Per-platform card w/ status states
    │   ├── ConnectModal.jsx   # Simulated OAuth modal
    │   ├── PlatformIcon.jsx
    │   ├── KPICard.jsx        # Animated counter KPI
    │   ├── TimeSeriesChart.jsx
    │   ├── PlatformBarChart.jsx
    │   ├── AudienceDonut.jsx
    │   ├── TopPostsPanel.jsx
    │   ├── CommentsPanel.jsx
    │   ├── PresentationModal.jsx # Scope/sections picker → generates .pptx
    │   └── EmptyState.jsx
    └── pages/
        ├── Landing.jsx
        ├── Dashboard.jsx
        ├── Connectors.jsx
        ├── MCPIntegration.jsx
        ├── Presentations.jsx
        └── Settings.jsx
```

---

## Design notes

- **Palette** aligned with the parent workspace: dark base `#0B1120`, brand `#378ADD` (with `#4A99FF` for gradient stops), plus platform-brand accents used sparingly (rings, icons, thin top-stripe on cards).
- **Type**: Inter for UI, JetBrains Mono for code/mono labels.
- **Motion**: fade-in-up on route change, animated number counters on KPIs, shimmer skeletons, subtle pulse on live indicators, hover lift on cards.
- **Empty states** are first-class — the dashboard prompts for connections instead of showing zeros.
