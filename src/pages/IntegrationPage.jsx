// Integration — Meta connection, Pixel install, Payment webhooks, Coming Soon platforms.
import { useEffect, useState } from 'react'
import {
  Link2, Code, Webhook, Copy, Check, ExternalLink, RefreshCw, Trash2,
  ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, Plus, CreditCard,
} from 'lucide-react'
import {
  getMetaConnection, getPixelSnippet, disconnectMeta, getMetaOAuthUrl,
  getDashboardOverview, syncMeta,
} from '../api'
import { dateTime, relativeFromNow } from '../lib/format'
import { useDateRange } from '../contexts/DateRangeContext'

const HEALTH_PILL = {
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  red: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  unknown: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
}

function HealthBadge({ status, label }) {
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded border inline-flex items-center gap-1.5 ${HEALTH_PILL[status] || HEALTH_PILL.unknown}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'green' ? 'bg-emerald-400' :
        status === 'amber' ? 'bg-amber-400' : status === 'red' ? 'bg-rose-400' : 'bg-slate-400'
      }`} />
      {label}
    </span>
  )
}

export default function IntegrationPage() {
  const { isoStart, isoEnd } = useDateRange()
  const [conn, setConn] = useState(null)
  const [snippet, setSnippet] = useState('')
  const [pixelId, setPixelId] = useState('')
  const [health, setHealth] = useState({ pixel: { status: 'unknown' }, webhook: { status: 'unknown' } })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [tab, setTab] = useState('html')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    Promise.all([
      getMetaConnection().catch(() => ({ connected: false })),
      getPixelSnippet().catch(() => ({})),
      getDashboardOverview({ dateFrom: isoStart, dateTo: isoEnd, compare: false }).catch(() => null),
    ]).then(([c, p, ov]) => {
      setConn(c)
      setSnippet(p?.snippet || p?.pixel_code || '')
      setPixelId(p?.pixel_id || '')
      if (ov?.health) setHealth(ov.health)
      setLoading(false)
    })
  }, [isoStart, isoEnd])

  async function copyText(t) {
    await navigator.clipboard.writeText(t)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect your Meta Ads account? You can reconnect anytime.')) return
    setBusy('disconnect')
    try {
      await disconnectMeta()
      setConn({ connected: false })
    } catch (e) { alert(e.message) }
    setBusy('')
  }

  async function handleSync() {
    setBusy('sync')
    try {
      await syncMeta()
      const c = await getMetaConnection()
      setConn(c)
    } catch (e) { alert(e.message) }
    setBusy('')
  }

  async function handleConnect() {
    setBusy('connect')
    try {
      const { url } = await getMetaOAuthUrl()
      window.location.href = url
    } catch (e) { alert(e.message); setBusy('') }
  }

  if (loading) return <div className="text-gray-400 animate-pulse p-4">Loading…</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-semibold text-white">Integration</h2>
        <p className="text-sm text-gray-400">Connect your ad platforms, payment webhooks, and tracking pixel.</p>
      </div>

      {/* Meta Ads */}
      <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <Link2 size={20} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium">Meta Ads</h3>
              {conn?.connected ? (
                <HealthBadge status="green" label="Connected" />
              ) : (
                <HealthBadge status="red" label="Not connected" />
              )}
            </div>
            <p className="text-gray-500 text-xs mt-1">Facebook + Instagram + Threads — pulls campaigns, ad sets, ads and daily insights.</p>
          </div>
        </div>

        {conn?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 bg-navy-900/40 border border-navy-700/40 rounded-lg">
              <div>
                <div className="text-white text-sm font-medium">AdWise Test Account</div>
                <div className="text-gray-500 text-[11px] font-mono mt-0.5">{conn.ad_account_id}</div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${(conn.ad_account_id || '').replace('act_', '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs inline-flex items-center gap-1"
                >
                  Open in Ads Manager <ExternalLink size={11} />
                </a>
                <button
                  onClick={handleSync} disabled={busy === 'sync'}
                  className="p-1.5 text-gray-400 hover:text-white" title="Sync now"
                >
                  <RefreshCw size={13} className={busy === 'sync' ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={handleDisconnect} disabled={busy === 'disconnect'}
                  className="p-1.5 text-gray-400 hover:text-rose-300" title="Disconnect"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-400">
                Token expires: <span className="text-white">{conn.expires_at ? dateTime(conn.expires_at) : '—'}</span>
              </div>
              <div className="text-gray-400">
                Last synced: <span className="text-white">{conn.last_synced_at ? relativeFromNow(conn.last_synced_at) : 'Never'}</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={handleConnect} disabled={busy === 'connect'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
          >
            {busy === 'connect' ? 'Redirecting…' : 'Connect with Facebook'}
          </button>
        )}
      </div>

      {/* Tracking Pixel */}
      <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
            <Code size={20} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium">AdWise Tracking Pixel</h3>
              <HealthBadge status={health.pixel.status} label={
                health.pixel.status === 'green' ? 'Active' :
                health.pixel.status === 'amber' ? 'Stale' :
                health.pixel.status === 'red' ? 'Inactive' : 'Unknown'
              } />
            </div>
            <p className="text-gray-500 text-xs mt-1">{health.pixel.label || 'Install this snippet on your landing pages to track visitors and conversions.'}</p>
          </div>
        </div>

        {pixelId && (
          <div className="text-[11px] text-gray-400 mb-3">
            Pixel ID: <span className="font-mono text-gray-200">{pixelId}</span>
          </div>
        )}

        {snippet ? (
          <>
            <div className="relative">
              <pre className="bg-navy-900 rounded-lg p-3 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-44 border border-navy-700/40">
                {snippet}
              </pre>
              <button
                onClick={() => copyText(snippet)}
                className="absolute top-2 right-2 p-1.5 bg-navy-700 rounded hover:bg-navy-600 text-gray-400 hover:text-white"
                title="Copy snippet"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>

            <button
              onClick={() => setInstallOpen(v => !v)}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
            >
              {installOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {installOpen ? 'Hide install guide' : 'Show install guide'}
            </button>

            {installOpen && (
              <div className="mt-3 bg-navy-900/40 border border-navy-700/40 rounded-lg p-4">
                <div className="flex gap-1 mb-3 border-b border-navy-700/40">
                  {[
                    { id: 'html', label: 'Custom HTML' },
                    { id: 'wp', label: 'WordPress' },
                    { id: 'shopify', label: 'Shopify' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`px-3 py-2 text-xs border-b-2 transition ${
                        tab === t.id ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-300 leading-relaxed space-y-2">
                  {tab === 'html' && (
                    <>
                      <p>1. Open your site's main HTML template (or layout file).</p>
                      <p>2. Paste the snippet above just before <code className="bg-navy-800 px-1.5 py-0.5 rounded text-emerald-300">&lt;/head&gt;</code>.</p>
                      <p>3. Deploy your site, visit a page, and click <span className="text-white">Verify Installation</span>.</p>
                    </>
                  )}
                  {tab === 'wp' && (
                    <>
                      <p>1. In WordPress, install the <em>Insert Headers and Footers</em> plugin (or use a theme that supports custom headers).</p>
                      <p>2. Paste the snippet into the <span className="text-white">&lt;head&gt;</span> section.</p>
                      <p>3. Save and visit your site, then verify below.</p>
                    </>
                  )}
                  {tab === 'shopify' && (
                    <>
                      <p>1. Shopify Admin → Online Store → Themes → Edit Code.</p>
                      <p>2. Open <code className="bg-navy-800 px-1.5 py-0.5 rounded text-emerald-300">layout/theme.liquid</code> and paste before <code className="bg-navy-800 px-1.5 py-0.5 rounded text-emerald-300">&lt;/head&gt;</code>.</p>
                      <p>3. Save, then visit your storefront.</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-500 text-xs">Pixel snippet unavailable. Reconnect Meta to regenerate.</div>
        )}
      </div>

      {/* Payment Webhooks */}
      <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
            <Webhook size={20} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-medium">Payment Webhooks</h3>
              <HealthBadge status={health.webhook.status} label={
                health.webhook.status === 'green' ? 'Receiving events' :
                health.webhook.status === 'amber' ? 'Stale' :
                health.webhook.status === 'red' ? 'Inactive' : 'Unknown'
              } />
            </div>
            <p className="text-gray-500 text-xs mt-1">{health.webhook.label || 'AdWise auto-attributes every payment to its originating ad click.'}</p>
          </div>
        </div>
        <div className="space-y-2">
          <ProviderRow
            name="Razorpay" status="connected"
            endpoint="POST /api/webhooks/razorpay"
            events="payment.captured, subscription.charged, subscription.cancelled"
            onCopy={(v) => copyText(v)}
          />
          <ProviderRow
            name="Stripe" status="available"
            endpoint="POST /api/webhooks/stripe"
            events="checkout.session.completed, charge.refunded"
            onCopy={(v) => copyText(v)}
          />
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2">Coming soon</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { name: 'Google Ads', icon: '🅖' },
            { name: 'TikTok Ads', icon: '🎵' },
            { name: 'LinkedIn Ads', icon: '💼' },
            { name: 'Shopify', icon: '🛍️' },
            { name: 'WooCommerce', icon: '🛒' },
            { name: 'Slack alerts', icon: '💬' },
          ].map(p => (
            <div key={p.name} className="bg-navy-800 border border-navy-600/30 rounded-lg p-3 flex items-center gap-3 opacity-60">
              <div className="w-8 h-8 bg-navy-700 rounded flex items-center justify-center text-base">{p.icon}</div>
              <div className="text-white text-sm">{p.name}</div>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-slate-500/15 text-slate-300 border border-slate-500/30 rounded">Coming soon</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProviderRow({ name, status, endpoint, events, onCopy }) {
  const isConnected = status === 'connected'
  return (
    <div className="p-3 bg-navy-900/40 border border-navy-700/40 rounded-lg flex items-center gap-3 flex-wrap">
      <div className="w-8 h-8 bg-navy-700 rounded flex items-center justify-center text-amber-300">
        <CreditCard size={14} />
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{name}</span>
          {isConnected ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded inline-flex items-center gap-1">
              <ShieldCheck size={9} /> Connected
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-500/15 text-slate-300 border border-slate-500/30 rounded inline-flex items-center gap-1">
              <ShieldAlert size={9} /> Available
            </span>
          )}
        </div>
        <div className="text-gray-400 text-[11px] mt-0.5">
          <code className="text-blue-300 font-mono">{endpoint}</code>
        </div>
        <div className="text-gray-500 text-[11px]">{events}</div>
      </div>
      <button
        onClick={() => onCopy(endpoint.replace('POST ', ''))}
        className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1"
      >
        <Copy size={11} /> Copy URL
      </button>
    </div>
  )
}
