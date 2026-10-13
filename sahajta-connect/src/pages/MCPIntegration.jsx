import { useEffect, useMemo, useState } from 'react'
import {
  Check, Copy, ChevronRight, ChevronDown, RotateCw, Eye, EyeOff,
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Loader2,
} from 'lucide-react'
import { useApp } from '../contexts/AppContext.jsx'

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────

const WORKSPACE = {
  id: 'sc_ws_9k4z2mb1',
  name: 'Sahajta Studio',
  region: 'ap-south-1',
  endpoint: 'https://mcp.sahajta.co/v1/sc_ws_9k4z2mb1',
  apiKey: 'sc_live_9k42_ZmN0OtQpXaHvB3rc',
}

const CLIENTS = [
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    configPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
    configPathAlt: '%APPDATA%\\Claude\\claude_desktop_config.json (Windows)',
    steps: [
      'Quit Claude Desktop if it is running.',
      'Open the config file below in a text editor.',
      'Add the following block to the top-level "mcpServers" object.',
      'Save the file and relaunch Claude Desktop.',
    ],
    snippet: (endpoint, key) => `{
  "mcpServers": {
    "sahajta-connect": {
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer ${key}"
      }
    }
  }
}`,
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    configPath: '~/.claude/mcp.json',
    steps: [
      'Open a terminal in your project directory.',
      'Run the command below (Claude Code will validate the connection).',
      'Restart your Claude Code session.',
    ],
    snippet: (endpoint, key) => `claude mcp add sahajta-connect \\
  --url "${endpoint}" \\
  --header "Authorization: Bearer ${key}"`,
    isShell: true,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    configPath: '~/.cursor/mcp.json',
    steps: [
      'Open Cursor Settings → Model Context Protocol.',
      'Click "Add server" and paste the configuration below.',
      'Enable the "sahajta-connect" server.',
    ],
    snippet: (endpoint, key) => `{
  "sahajta-connect": {
    "url": "${endpoint}",
    "headers": {
      "Authorization": "Bearer ${key}"
    }
  }
}`,
  },
]

const TOOLS = [
  {
    name: 'get_top_posts',
    desc: 'Top-performing posts by views across one or all connected platforms.',
    signature: 'get_top_posts(platform?: string, limit?: number)',
    example: 'get_top_posts(platform="instagram", limit=10)',
    returns: 'Array<Post>',
    permission: 'Read insights',
    source: 'All platforms',
    sample: `[
  {
    "platform": "instagram",
    "caption": "Weekend recap 🌿 — behind the scenes...",
    "views": 184230,
    "likes": 12040,
    "comments": 340,
    "engagement_rate": 6.72
  }
]`,
  },
  {
    name: 'get_engagement_summary',
    desc: 'Aggregated engagement across all connected channels for a given window.',
    signature: 'get_engagement_summary(date_range: string)',
    example: 'get_engagement_summary(date_range="last_30d")',
    returns: 'EngagementSummary',
    permission: 'Read insights',
    source: 'All platforms',
    sample: `{
  "date_range": "last_30d",
  "views": 4834122,
  "reach": 2891304,
  "engagement": 254021,
  "engagement_rate": 5.25,
  "delta_pct": { "views": 12.4, "engagement": 8.9 }
}`,
  },
  {
    name: 'get_platform_comparison',
    desc: 'Side-by-side reach, engagement rate and follower share across platforms.',
    signature: 'get_platform_comparison()',
    example: 'get_platform_comparison()',
    returns: 'PlatformComparison',
    permission: 'Read insights',
    source: 'All platforms',
    sample: `[
  { "platform": "instagram", "reach": 890340, "engagement_rate": 6.1 },
  { "platform": "youtube",   "reach": 1240210, "engagement_rate": 3.4 },
  { "platform": "facebook",  "reach": 420110,  "engagement_rate": 2.8 },
  { "platform": "x",         "reach": 340020,  "engagement_rate": 1.9 }
]`,
  },
  {
    name: 'get_audience_insights',
    desc: 'Audience size, growth trend and top demographics for a specific platform.',
    signature: 'get_audience_insights(platform: string)',
    example: 'get_audience_insights(platform="youtube")',
    returns: 'AudienceInsights',
    permission: 'Read audience',
    source: 'Per platform',
    sample: `{
  "platform": "youtube",
  "followers": 342100,
  "growth_30d_pct": 4.2,
  "top_geos": ["IN", "US", "GB"],
  "age_split": { "18-24": 0.31, "25-34": 0.42 }
}`,
  },
  {
    name: 'get_recent_comments',
    desc: 'Recent comments filtered by sentiment. Useful for community workflows.',
    signature: 'get_recent_comments(sentiment?: string, limit?: number)',
    example: 'get_recent_comments(sentiment="negative", limit=5)',
    returns: 'Array<Comment>',
    permission: 'Read comments',
    source: 'All platforms',
    sample: `[
  {
    "platform": "instagram",
    "author": "@moksha_",
    "text": "Site keeps crashing on checkout :(",
    "sentiment": "negative",
    "hours_ago": 4
  }
]`,
  },
  {
    name: 'generate_presentation',
    desc: 'Server-side generation of a downloadable .pptx report from live analytics.',
    signature: 'generate_presentation(data_scope: string, sections?: string[])',
    example: 'generate_presentation(data_scope="all")',
    returns: '{ download_url }',
    permission: 'Read insights',
    source: 'All platforms',
    sample: `{
  "download_url": "https://mcp.sahajta.co/reports/rep_9821.pptx",
  "slides": 7,
  "generated_at": "2026-07-09T10:14:22Z"
}`,
  },
]

const RECENT_ACTIVITY = [
  { at: '2 min ago', tool: 'get_engagement_summary', status: 200, latency: 342, tokens: 128 },
  { at: '17 min ago', tool: 'get_top_posts', status: 200, latency: 512, tokens: 640 },
  { at: '48 min ago', tool: 'get_platform_comparison', status: 200, latency: 214, tokens: 96 },
  { at: '1 hr ago', tool: 'Connection test', status: 200, latency: 89, tokens: 0 },
  { at: '3 hr ago', tool: 'get_recent_comments', status: 200, latency: 431, tokens: 220 },
  { at: '5 hr ago', tool: 'get_audience_insights', status: 200, latency: 305, tokens: 84 },
]

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function MCPIntegration() {
  const { connectedPlatforms, pushToast } = useApp()

  const [testState, setTestState] = useState('idle') // idle | testing | ok | failed
  const [lastTested, setLastTested] = useState('2 min ago')
  const [activeClientId, setActiveClientId] = useState(CLIENTS[0].id)
  const [expandedTool, setExpandedTool] = useState(null)
  const [showKey, setShowKey] = useState(false)

  // Overall connection status derived from workspace state
  const connectionHealthy = testState !== 'failed'
  const hasPlatforms = connectedPlatforms.length > 0

  const activeClient = useMemo(
    () => CLIENTS.find(c => c.id === activeClientId),
    [activeClientId]
  )

  async function runTest() {
    setTestState('testing')
    await new Promise(r => setTimeout(r, 900 + Math.random() * 500))
    setTestState('ok')
    setLastTested('just now')
    pushToast({ kind: 'success', title: 'Endpoint reachable', message: `Round-trip 342 ms · ${WORKSPACE.region}` })
  }

  return (
    <div className="mx-auto max-w-[1080px] px-8 py-8">
      <PageHeader
        connectionHealthy={connectionHealthy}
        hasPlatforms={hasPlatforms}
        onTest={runTest}
        testState={testState}
      />

      <SectionRule />

      <ConnectionSection
        showKey={showKey}
        onToggleKey={() => setShowKey(k => !k)}
        onRotate={() => pushToast({ kind: 'info', title: 'Rotated API key', message: 'The previous key is no longer valid.' })}
        testState={testState}
        lastTested={lastTested}
      />

      <SectionRule />

      <SetupSection
        client={activeClient}
        activeClientId={activeClientId}
        onChangeClient={setActiveClientId}
      />

      <SectionRule />

      <ToolsSection
        expanded={expandedTool}
        onToggle={(name) => setExpandedTool(prev => prev === name ? null : name)}
      />

      <SectionRule />

      <DataAccessSection hasPlatforms={hasPlatforms} connectedCount={connectedPlatforms.length} />

      <SectionRule />

      <ActivitySection />

      <SectionRule />

      <SecuritySection
        onRevoke={() => pushToast({ kind: 'info', title: 'Access revoked (demo)', message: 'All connected clients will need to re-authenticate.' })}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────────────────────────

function PageHeader({ connectionHealthy, hasPlatforms, onTest, testState }) {
  const [copied, setCopied] = useState(false)

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(WORKSPACE.endpoint)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted mb-4">
        <span>Workspace</span>
        <ChevronRight size={11} className="opacity-50" />
        <span>Integrations</span>
        <ChevronRight size={11} className="opacity-50" />
        <span className="text-secondary">MCP</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div className="flex items-center gap-3 min-w-0">
          <ConnectionPill healthy={connectionHealthy} hasPlatforms={hasPlatforms} />
          <span className="text-muted text-[12.5px] hidden sm:inline">
            Workspace <span className="text-secondary">{WORKSPACE.name}</span> · region {WORKSPACE.region}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onTest}
            disabled={testState === 'testing'}
            className="btn btn-ghost text-[12.5px]"
          >
            {testState === 'testing' ? (
              <><Loader2 size={12} className="animate-spin" /> Testing…</>
            ) : (
              <>Test connection</>
            )}
          </button>
          <button onClick={copyEndpoint} className="btn btn-primary text-[12.5px]">
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy endpoint</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConnectionSection({ showKey, onToggleKey, onRotate, testState, lastTested }) {
  return (
    <Section label="Connection">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-y-4 md:gap-y-5">
        <FieldRow label="Endpoint">
          <CopyableMono value={WORKSPACE.endpoint} />
        </FieldRow>

        <FieldRow label="Workspace ID">
          <CopyableMono value={WORKSPACE.id} muted />
        </FieldRow>

        <FieldRow label="API key">
          <div className="flex items-center gap-2 flex-wrap">
            <CopyableMono
              value={showKey ? WORKSPACE.apiKey : maskKey(WORKSPACE.apiKey)}
              copyValue={WORKSPACE.apiKey}
              muted
            />
            <button
              onClick={onToggleKey}
              className="text-muted hover:text-primary transition inline-flex items-center gap-1 text-[11.5px]"
              type="button"
            >
              {showKey ? <><EyeOff size={11} /> Hide</> : <><Eye size={11} /> Reveal</>}
            </button>
            <button
              onClick={onRotate}
              className="text-muted hover:text-primary transition inline-flex items-center gap-1 text-[11.5px]"
              type="button"
            >
              <RotateCw size={11} /> Rotate
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Region">
          <span className="text-primary text-[13px] font-mono">{WORKSPACE.region}</span>
        </FieldRow>

        <FieldRow label="Last verified">
          <div className="flex items-center gap-2">
            {testState === 'testing' ? (
              <>
                <Loader2 size={12} className="animate-spin text-brand-500 dark:text-brand-400" />
                <span className="text-secondary text-[13px]">Testing endpoint…</span>
              </>
            ) : testState === 'failed' ? (
              <>
                <XCircle size={13} className="text-red-500" />
                <span className="text-secondary text-[13px]">
                  Failed <span className="text-muted">· {lastTested}</span>
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-secondary text-[13px]">
                  Reachable <span className="text-muted">· {lastTested} · 342 ms</span>
                </span>
              </>
            )}
          </div>
        </FieldRow>

        <FieldRow label="Connected clients">
          <div className="text-secondary text-[13px]">
            <span className="text-primary font-medium tabular-nums">1</span>
            <span className="text-muted mx-1.5">·</span>
            Claude Desktop (macOS)
          </div>
        </FieldRow>
      </div>
    </Section>
  )
}

function SetupSection({ client, activeClientId, onChangeClient }) {
  const snippet = client.snippet(WORKSPACE.endpoint, WORKSPACE.apiKey)
  const [copied, setCopied] = useState(false)

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  return (
    <Section label="Setup" title="Connect a client">
      <Segmented
        options={CLIENTS.map(c => ({ id: c.id, label: c.name }))}
        active={activeClientId}
        onChange={onChangeClient}
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <div className="text-[13px] leading-relaxed">
          <div className="kicker mb-2">Config path</div>
          <div className="text-primary font-mono text-[12px] break-all">{client.configPath}</div>
          {client.configPathAlt && (
            <div className="text-muted font-mono text-[11.5px] mt-1 break-all">{client.configPathAlt}</div>
          )}
        </div>

        <ol className="text-secondary text-[13.5px] space-y-2.5 leading-relaxed">
          {client.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-muted font-mono text-[12px] mt-[2px] flex-shrink-0 tabular-nums w-4">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-secondary">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 rounded-[10px] border border-default overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2 subtle-bg border-b border-default">
          <div className="text-muted text-[11px] font-mono">
            {client.isShell ? 'terminal' : client.configPath.split('/').pop()}
          </div>
          <button onClick={copySnippet} className="btn btn-ghost text-[11.5px] py-1 px-2">
            {copied ? <><Check size={11} className="text-emerald-600 dark:text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>
        <pre className="p-4 text-[12.5px] font-mono leading-relaxed text-primary overflow-x-auto whitespace-pre">
<code>{snippet}</code>
        </pre>
      </div>
    </Section>
  )
}

function ToolsSection({ expanded, onToggle }) {
  return (
    <Section
      label="Available tools"
      title="Tools exposed to the client"
      hint={`${TOOLS.length} tools`}
    >
      <div className="rounded-[10px] border border-default overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_28px] items-center gap-4 px-4 py-2.5 subtle-bg border-b border-default">
          <div className="kicker">Tool</div>
          <div className="kicker">Description</div>
          <div className="kicker">Returns</div>
          <div className="kicker">Permission</div>
          <div />
        </div>

        {TOOLS.map((tool, i) => {
          const isOpen = expanded === tool.name
          return (
            <div key={tool.name} className={i === TOOLS.length - 1 ? '' : 'border-b border-default'}>
              <button
                onClick={() => onToggle(tool.name)}
                className="w-full grid grid-cols-[minmax(0,1.6fr)_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_28px] items-center gap-4 px-4 py-3 text-left hover:subtle-bg transition group"
                aria-expanded={isOpen}
              >
                <code className="text-primary text-[12.5px] font-mono font-medium truncate">{tool.name}</code>
                <div className="text-secondary text-[13px] leading-snug truncate">{tool.desc}</div>
                <code className="text-secondary text-[11.5px] font-mono truncate">{tool.returns}</code>
                <div className="text-muted text-[11.5px] truncate">{tool.permission}</div>
                <ChevronDown
                  size={14}
                  className={`text-muted transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-5 pt-1 border-t border-default subtle-bg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4">
                    <DetailRow label="Signature">
                      <code className="text-primary text-[12.5px] font-mono break-all">{tool.signature}</code>
                    </DetailRow>
                    <DetailRow label="Example call">
                      <code className="text-primary text-[12.5px] font-mono break-all">{tool.example}</code>
                    </DetailRow>
                    <DetailRow label="Data source">
                      <span className="text-secondary text-[12.5px]">{tool.source}</span>
                    </DetailRow>
                    <DetailRow label="Permission scope">
                      <span className="text-secondary text-[12.5px]">{tool.permission}</span>
                    </DetailRow>
                  </div>

                  <div className="mt-5">
                    <div className="kicker mb-2">Sample response</div>
                    <pre className="rounded-[8px] border border-default panel-bg p-3.5 text-[12px] font-mono leading-relaxed text-secondary overflow-x-auto whitespace-pre">
<code>{tool.sample}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function DataAccessSection({ hasPlatforms, connectedCount }) {
  const items = [
    { label: 'Posts and captions', detail: 'Across all connected platforms' },
    { label: 'Engagement, reach and view counts', detail: 'Daily granularity, 90-day window' },
    { label: 'Comments and sentiment tags', detail: 'Up to 500 most recent per platform' },
    { label: 'Audience size and growth', detail: 'Followers, geo and age split' },
  ]
  const denied = [
    'Send posts, replies, DMs or comments',
    'Modify or delete content',
    'Access private DMs or inboxes',
    'Read payment or billing information',
  ]

  return (
    <Section label="Data access" title="What Claude can read">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <div>
          <div className="text-primary text-[13px] font-medium mb-3">Allowed · read-only</div>
          <ul className="space-y-2.5">
            {items.map(item => (
              <li key={item.label} className="flex items-start gap-2.5">
                <Check size={13} className="text-emerald-600 dark:text-emerald-400 mt-[3px] flex-shrink-0" strokeWidth={2.2} />
                <div className="flex-1">
                  <div className="text-primary text-[13px] leading-snug">{item.label}</div>
                  <div className="text-muted text-[11.5px] mt-0.5">{item.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-primary text-[13px] font-medium mb-3">Not permitted</div>
          <ul className="space-y-2.5">
            {denied.map(d => (
              <li key={d} className="flex items-start gap-2.5">
                <XCircle size={13} className="text-muted mt-[3px] flex-shrink-0" strokeWidth={1.6} />
                <div className="text-secondary text-[13px] leading-snug">{d}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!hasPlatforms && (
        <div className="mt-6 flex items-start gap-2.5 rounded-[10px] border border-default subtle-bg px-4 py-3">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 mt-[2px] flex-shrink-0" />
          <div className="text-secondary text-[12.5px] leading-relaxed">
            No social platforms are connected yet. The connector is reachable, but calls to data tools will return empty results until you connect at least one platform.
          </div>
        </div>
      )}
      {hasPlatforms && (
        <div className="mt-6 text-muted text-[12px]">
          Reading from <span className="text-secondary">{connectedCount} connected platform{connectedCount === 1 ? '' : 's'}</span>.
        </div>
      )}
    </Section>
  )
}

function ActivitySection() {
  return (
    <Section
      label="Activity"
      title="Recent tool calls"
      hint="Last 24 hours"
    >
      <div className="rounded-[10px] border border-default overflow-hidden">
        <div className="grid grid-cols-[minmax(0,120px)_minmax(0,1.8fr)_minmax(0,90px)_minmax(0,90px)_minmax(0,60px)] gap-4 px-4 py-2.5 subtle-bg border-b border-default">
          <div className="kicker">When</div>
          <div className="kicker">Tool</div>
          <div className="kicker text-right">Tokens</div>
          <div className="kicker text-right">Latency</div>
          <div className="kicker text-right">Status</div>
        </div>
        {RECENT_ACTIVITY.map((row, i) => (
          <div
            key={i}
            className={`grid grid-cols-[minmax(0,120px)_minmax(0,1.8fr)_minmax(0,90px)_minmax(0,90px)_minmax(0,60px)] gap-4 px-4 py-2.5 items-center text-[13px] tabular-nums ${
              i === RECENT_ACTIVITY.length - 1 ? '' : 'border-b border-default'
            } hover:subtle-bg transition`}
          >
            <div className="text-muted">{row.at}</div>
            <code className="text-primary text-[12.5px] font-mono truncate">{row.tool}</code>
            <div className="text-secondary text-right">{row.tokens ? row.tokens.toLocaleString() : '—'}</div>
            <div className="text-secondary text-right">{row.latency} ms</div>
            <div className="text-right">
              <StatusDot code={row.status} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-muted text-[11.5px]">
        Showing latest 6. Older activity is retained for 30 days.
      </div>
    </Section>
  )
}

function SecuritySection({ onRevoke }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <Section label="Security">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <div className="text-[13px] leading-relaxed">
          <div className="text-primary font-medium mb-1 flex items-center gap-2">
            <ShieldCheck size={14} strokeWidth={1.8} className="text-secondary" /> Access model
          </div>
          <p className="text-muted text-[12.5px]">Read-only, scoped to this workspace.</p>
        </div>
        <div className="text-secondary text-[13.5px] leading-relaxed space-y-3">
          <p>
            Requests from Claude are authenticated with the workspace API key. Sahajta cannot see your Claude conversations — only the tool calls Claude makes on your behalf, which appear under <span className="text-primary">Activity</span> above.
          </p>
          <p>
            Rotating the key invalidates any previously configured client. You will need to update the config in each Claude installation.
          </p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-default flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-md">
          <div className="text-primary text-[13px] font-medium">Revoke access</div>
          <div className="text-muted text-[12px] mt-0.5">
            Disconnects every configured client immediately. This cannot be undone.
          </div>
        </div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="btn btn-danger text-[12.5px]">
            Revoke access
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setConfirming(false)} className="btn btn-ghost text-[12.5px]">
              Cancel
            </button>
            <button
              onClick={() => { setConfirming(false); onRevoke() }}
              className="btn btn-danger text-[12.5px]"
              style={{ background: 'rgba(201,74,74,0.10)' }}
            >
              Confirm revoke
            </button>
          </div>
        )}
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────

function Section({ label, title, hint, children }) {
  return (
    <section className="py-8">
      <div className="flex items-baseline justify-between mb-5 gap-4">
        <div className="min-w-0">
          <div className="kicker mb-1.5">{label}</div>
          {title && (
            <h2 className="text-primary text-[17px] font-semibold tracking-[-0.01em]">
              {title}
            </h2>
          )}
        </div>
        {hint && <div className="text-muted text-[11.5px] flex-shrink-0">{hint}</div>}
      </div>
      {children}
    </section>
  )
}

function SectionRule() {
  return <div className="border-t border-default" />
}

function FieldRow({ label, children }) {
  return (
    <>
      <div className="text-muted text-[12.5px] pt-0.5">{label}</div>
      <div className="min-w-0">{children}</div>
    </>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="kicker mb-1.5">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function CopyableMono({ value, copyValue, muted = false }) {
  const [copied, setCopied] = useState(false)
  async function doCopy() {
    try {
      await navigator.clipboard.writeText(copyValue ?? value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {}
  }
  return (
    <div className="inline-flex items-center gap-2 max-w-full">
      <code className={`font-mono text-[12.5px] truncate ${muted ? 'text-secondary' : 'text-primary'}`}>
        {value}
      </code>
      <button
        onClick={doCopy}
        className="text-muted hover:text-primary transition flex-shrink-0"
        title="Copy"
        aria-label={`Copy ${value}`}
      >
        {copied ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={11.5} />}
      </button>
    </div>
  )
}

function Segmented({ options, active, onChange }) {
  return (
    <div className="inline-flex p-1 rounded-[10px] border border-default subtle-bg" role="tablist">
      {options.map(opt => {
        const isActive = opt.id === active
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium transition ${
              isActive
                ? 'panel-bg text-primary shadow-card'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function ConnectionPill({ healthy, hasPlatforms }) {
  const state = !hasPlatforms
    ? { label: 'Ready · no data yet', color: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' }
    : healthy
      ? { label: 'Connected', color: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' }
      : { label: 'Needs attention', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-default subtle-bg">
      <span className={`w-1.5 h-1.5 rounded-full ${state.dot}`} />
      <span className={`text-[11px] font-medium ${state.color}`}>{state.label}</span>
    </span>
  )
}

function StatusDot({ code }) {
  const ok = code >= 200 && code < 300
  return (
    <span className={`inline-flex items-center gap-1 text-[11.5px] font-mono ${
      ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {code}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────

function maskKey(key) {
  if (!key) return ''
  const parts = key.split('_')
  const prefix = parts.slice(0, 2).join('_')
  return `${prefix}_${'•'.repeat(16)}`
}
