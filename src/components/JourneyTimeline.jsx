import { useState } from 'react'
import { getJourney } from '../api'

const evIcon = {
  page_view: '👁',
  view_product: '🛍',
  add_to_cart: '🛒',
  checkout: '💳',
  purchase: '✅',
  identify: '👤',
}

export default function JourneyTimeline() {
  const [visitorId, setVisitorId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    if (!visitorId.trim()) return
    setLoading(true); setErr(''); setData(null)
    try {
      const d = await getJourney(visitorId.trim())
      setData(d)
    } catch (e) {
      setErr(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex gap-2">
        <input
          value={visitorId}
          onChange={e => setVisitorId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Enter visitor_uid (e.g. vis_abcdef123456)"
          className="flex-1 px-3 py-2 bg-navy-900 border border-navy-600/40 rounded text-sm text-white"
        />
        <button onClick={load} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded">
          {loading ? 'Loading…' : 'Load journey'}
        </button>
      </div>

      {err && <div className="text-red-400 text-xs">{err}</div>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Sessions" value={data.sessions?.length || 0} />
            <Stat label="Events" value={data.events?.length || 0} />
            <Stat label="Visitor" value={data.visitor?.email || data.visitor?.visitor_uid?.slice(0, 16) || '—'} />
          </div>

          <div className="bg-navy-900 border border-navy-600/30 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Sessions</div>
            <div className="space-y-2">
              {(data.sessions || []).map(s => (
                <div key={s.session_uid} className="flex items-center gap-3 text-xs bg-navy-800 rounded px-3 py-2">
                  <span className="text-gray-400 font-mono">{s.session_uid?.slice(0, 12)}</span>
                  <span className="text-blue-300">{s.utm_source || 'direct'}</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-purple-300">{s.utm_campaign || '—'}</span>
                  {s.fbclid && <span className="text-pink-300">fbclid</span>}
                  <span className="text-gray-500 ml-auto">{s.started_at?.slice(0, 16).replace('T', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vertical timeline of events */}
          <div className="bg-navy-900 border border-navy-600/30 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Event timeline</div>
            <div className="relative pl-6 border-l-2 border-navy-600/40 space-y-3">
              {(data.events || []).map(ev => (
                <div key={ev.event_id} className="relative">
                  <div className="absolute -left-[29px] top-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs">
                    {evIcon[ev.event_name] || '•'}
                  </div>
                  <div className="text-white text-sm">{ev.event_name}</div>
                  <div className="text-gray-400 text-xs">
                    {ev.event_time?.slice(0, 19).replace('T', ' ')} · {ev.page_url || '—'}
                  </div>
                  {(ev.utm_source || ev.fbclid) && (
                    <div className="text-[11px] text-blue-300 font-mono mt-0.5">
                      {ev.utm_source && `utm_source=${ev.utm_source}`}
                      {ev.utm_campaign && ` · utm_campaign=${ev.utm_campaign}`}
                      {ev.fbclid && ` · fbclid=${ev.fbclid?.slice(0, 12)}…`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-navy-900 border border-navy-600/30 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-white text-base font-semibold mt-1 truncate">{value}</div>
    </div>
  )
}
