import { useState, useEffect } from 'react'
import { Copy, Check, Code, Activity, Users, Eye, ShoppingCart, Globe, Fingerprint, Plus, X, ExternalLink } from 'lucide-react'
import { getPixelStats, getPixelSnippet } from '../api'

const WEBSITES_KEY = 'namyah_websites'

function loadWebsites() {
  try { return JSON.parse(localStorage.getItem(WEBSITES_KEY) || '[]') } catch { return [] }
}
function saveWebsites(arr) {
  localStorage.setItem(WEBSITES_KEY, JSON.stringify(arr))
}

function CopyBlock({ label, code }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-accent-blue hover:text-blue-300 transition">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="bg-navy-900 border border-navy-600/40 rounded-lg p-3 text-[12px] text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
        {code}
      </pre>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = 'text-accent-blue' }) {
  return (
    <div className="bg-navy-800 border border-navy-600/40 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  )
}

export default function PixelSettings() {
  const [stats, setStats] = useState(null)
  const [pixel, setPixel] = useState(null)   // { pixel_id, snippet, js_url, gif_url }
  const [loading, setLoading] = useState(true)
  const [websites, setWebsites] = useState(loadWebsites())
  const [newUrl, setNewUrl] = useState('')
  const [newName, setNewName] = useState('')

  useEffect(() => {
    Promise.all([
      getPixelStats().catch(() => null),
      getPixelSnippet().catch(() => null),
    ]).then(([s, p]) => {
      setStats(s); setPixel(p); setLoading(false)
    })
  }, [])

  function addWebsite(e) {
    e.preventDefault()
    if (!newUrl) return
    let url = newUrl.trim()
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    const next = [...websites, { id: Date.now(), name: newName || new URL(url).hostname, url }]
    setWebsites(next); saveWebsites(next); setNewUrl(''); setNewName('')
  }
  function removeWebsite(id) {
    const next = websites.filter(w => w.id !== id)
    setWebsites(next); saveWebsites(next)
  }

  if (loading) return <div className="text-gray-500 text-sm animate-pulse">Loading pixel…</div>

  const pid = pixel?.pixel_id || '(not set)'
  const snippet = pixel?.snippet || ''
  const conversionSnippet = `// Track a purchase (call after order confirmation)
namyah('track', 'purchase', {
  order_id: 'ORDER_123',
  value: 2499.00,
  currency: 'INR'
});`
  const eventSnippet = `// Product view
namyah('track', 'view_product', { product_id: 'SKU_001', value: 1299 });

// Add to cart
namyah('track', 'add_to_cart',  { product_id: 'SKU_001', value: 1299 });

// Checkout
namyah('track', 'checkout',     { value: 3798, items: 2 });`
  const identifySnippet = `// Link a visitor to a real identity (after login or form fill)
namyah('identify', { email: 'customer@example.com', name: 'Priya Sharma' });`
  const noscriptSnippet = pixel ? `<noscript>
  <img src="${pixel.gif_url}" width="1" height="1" style="display:none" alt="">
</noscript>` : ''

  return (
    <div className="space-y-6 p-1">
      {/* ── Your unique pixel ID ── */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-blue-300 mb-1">Your Pixel ID</div>
            <div className="font-mono text-lg text-white">{pid}</div>
            <div className="text-xs text-gray-400 mt-1">Unique to your account. Anyone with this ID can send events on your behalf — keep it private.</div>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(pid) }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded flex items-center gap-1"
          >
            <Copy size={12} /> Copy ID
          </button>
        </div>
      </div>

      {/* ── Pixel activity stats ── */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Activity size={14} className="text-accent-blue" /> Pixel Activity
        </h3>
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={Users} label="Visitors" value={stats.total_visitors} />
            <StatCard icon={Fingerprint} label="Identified" value={stats.identified_visitors} color="text-green-400" />
            <StatCard icon={Globe} label="Sessions" value={stats.total_sessions} />
            <StatCard icon={Eye} label="Page Views" value={stats.page_views} color="text-purple-400" />
            <StatCard icon={ShoppingCart} label="Conversions" value={stats.conversions} color="text-amber-400" />
            <StatCard icon={Activity} label="24h Events" value={stats.events_24h} color="text-pink-400" />
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No pixel data yet. Add the snippet below to start tracking.</div>
        )}
      </div>

      {/* ── Connected websites ── */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Globe size={14} className="text-accent-blue" /> Connected Websites
        </h3>
        <p className="text-xs text-gray-400 mb-3">Add the sites where you've installed the pixel — for quick reference and one-click open.</p>

        <form onSubmit={addWebsite} className="flex gap-2 mb-3">
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Name (optional)"
            className="px-3 py-2 bg-navy-900 border border-navy-600/40 rounded text-sm text-white w-40"
          />
          <input
            value={newUrl} onChange={e => setNewUrl(e.target.value)}
            placeholder="example.com"
            className="flex-1 px-3 py-2 bg-navy-900 border border-navy-600/40 rounded text-sm text-white"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded flex items-center gap-1">
            <Plus size={14} /> Add
          </button>
        </form>

        {websites.length === 0 ? (
          <div className="text-gray-500 text-xs italic">No websites added yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {websites.map(w => (
              <div key={w.id} className="bg-navy-800 border border-navy-600/40 rounded-lg p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center text-blue-400">
                  <Globe size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{w.name}</div>
                  <div className="text-gray-400 text-[11px] truncate">{w.url}</div>
                </div>
                <a href={w.url} target="_blank" rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white" title="Open">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => removeWebsite(w.id)} className="text-gray-400 hover:text-red-400" title="Remove">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent sessions ── */}
      {stats?.recent_sessions?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Recent Sessions</h3>
          <div className="bg-navy-800 border border-navy-600/40 rounded-xl overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-gray-500 border-b border-navy-600/30">
                  <th className="text-left px-3 py-2 font-medium">Visitor</th>
                  <th className="text-left px-3 py-2 font-medium">Source</th>
                  <th className="text-left px-3 py-2 font-medium">Landing Page</th>
                  <th className="text-left px-3 py-2 font-medium">Device</th>
                  <th className="text-left px-3 py-2 font-medium">Pages</th>
                  <th className="text-left px-3 py-2 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_sessions.map((s, i) => (
                  <tr key={i} className="border-b border-navy-600/20 hover:bg-navy-700/30">
                    <td className="px-3 py-2 text-gray-300">
                      <span className="font-mono text-[11px]">{s.visitor_uid?.substring(0, 8)}…</span>
                      {s.visitor_name && <span className="ml-1 text-green-400">({s.visitor_name})</span>}
                    </td>
                    <td className="px-3 py-2">
                      {s.utm_source ? (
                        <span className="px-1.5 py-0.5 bg-accent-blue/20 text-accent-blue rounded text-[11px]">
                          {s.utm_source}/{s.utm_medium}
                        </span>
                      ) : (
                        <span className="text-gray-500">direct</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400 max-w-[200px] truncate">{s.landing_page || '—'}</td>
                    <td className="px-3 py-2 text-gray-400">{s.device || '—'}</td>
                    <td className="px-3 py-2 text-gray-300">{s.page_count}</td>
                    <td className="px-3 py-2 text-gray-500">{s.started_at ? new Date(s.started_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Embed instructions ── */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Code size={14} className="text-accent-blue" /> Install Pixel
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Paste this snippet into the <code className="text-accent-blue">&lt;head&gt;</code> of every page on your website.
          It loads async and won't slow down your site.
        </p>

        <CopyBlock label="Base Pixel Code (required)" code={snippet} />
        <CopyBlock label="Track Conversions / Purchases" code={conversionSnippet} />
        <CopyBlock label="Track Events (view_product, add_to_cart, checkout)" code={eventSnippet} />
        <CopyBlock label="Identify Users" code={identifySnippet} />
        {noscriptSnippet && <CopyBlock label="No-JavaScript Fallback" code={noscriptSnippet} />}
      </div>

      {/* ── Test link ── */}
      {pixel && (
        <div className="bg-navy-800 border border-navy-600/40 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Test Your Pixel</h3>
          <p className="text-xs text-gray-400 mb-3">
            Open the test page to verify events are flowing into your account:
          </p>
          <a
            href={`http://localhost:8000/test-pixel?pixel_id=${pid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg text-sm hover:bg-accent-blue/30 transition"
          >
            <Globe size={14} /> Open Pixel Test Page
          </a>
        </div>
      )}
    </div>
  )
}
