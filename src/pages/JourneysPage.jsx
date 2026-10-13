import { useState, useEffect } from 'react'
import { Search, ExternalLink, Clock, Globe, MousePointer, ShoppingCart, User } from 'lucide-react'
import { getVisitors, getJourney, getByAd } from '../api'

const fmt = (n) => Number(n || 0).toLocaleString('en-IN')

export default function JourneysPage() {
  const [visitors, setVisitors] = useState([])
  const [search, setSearch] = useState('')
  const [selectedVisitor, setSelectedVisitor] = useState(null)
  const [journey, setJourney] = useState(null)
  const [byAd, setByAd] = useState([])
  const [loading, setLoading] = useState(true)
  const [journeyLoading, setJourneyLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [v, ad] = await Promise.all([
      getVisitors(100).catch(() => ({ visitors: [] })),
      getByAd().catch(() => []),
    ])
    setVisitors(v?.visitors || v || [])
    setByAd(ad || [])
    setLoading(false)
  }

  async function viewJourney(visitorUid) {
    setJourneyLoading(true)
    setSelectedVisitor(visitorUid)
    try {
      const j = await getJourney(visitorUid)
      setJourney(j)
    } catch (e) {
      setJourney(null)
    }
    setJourneyLoading(false)
  }

  const filtered = visitors.filter(v => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (v.visitor_uid || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q) ||
      (v.name || '').toLowerCase().includes(q)
    )
  })

  const eventIcon = (name) => {
    switch (name) {
      case 'page_view': return <Globe size={12} className="text-blue-400" />
      case 'purchase': return <ShoppingCart size={12} className="text-green-400" />
      case 'identify': return <User size={12} className="text-purple-400" />
      default: return <MousePointer size={12} className="text-gray-400" />
    }
  }

  if (loading) return <div className="text-gray-400 animate-pulse">Loading journeys…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Visitor Journeys</h1>
        <p className="text-sm text-gray-400 mt-1">Track every visitor from ad click to conversion. See which ads drive real engagement.</p>
      </div>

      {/* By-Ad summary */}
      {byAd.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Traffic by Ad (UTM Attribution)</h2>
          <div className="bg-navy-800 border border-navy-600/30 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-navy-600/30 uppercase">
                    <th className="text-left px-4 py-2.5 font-medium">Source</th>
                    <th className="text-left px-4 py-2.5 font-medium">Campaign</th>
                    <th className="text-left px-4 py-2.5 font-medium">Ad (utm_content)</th>
                    <th className="text-right px-4 py-2.5 font-medium">Sessions</th>
                    <th className="text-right px-4 py-2.5 font-medium">Visitors</th>
                    <th className="text-right px-4 py-2.5 font-medium">Purchases</th>
                    <th className="text-right px-4 py-2.5 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {byAd.map((row, i) => (
                    <tr key={i} className="border-b border-navy-600/20 hover:bg-navy-700/30">
                      <td className="px-4 py-2.5 text-gray-300">{row.utm_source || 'direct'}/{row.utm_medium || '–'}</td>
                      <td className="px-4 py-2.5 text-gray-300">{row.utm_campaign || '–'}</td>
                      <td className="px-4 py-2.5 text-blue-400 font-mono">{row.utm_content || '–'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-300">{fmt(row.sessions)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-300">{fmt(row.visitors)}</td>
                      <td className="px-4 py-2.5 text-right text-green-400">{fmt(row.purchases)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-400">₹{fmt(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Visitor list + Journey detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Visitor list */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-white">All Visitors</h2>
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by email, name, or ID…"
                className="w-full pl-8 pr-3 py-2 bg-navy-900 border border-navy-600/40 rounded text-xs text-white placeholder-gray-500"
              />
            </div>
          </div>
          <div className="bg-navy-800 border border-navy-600/30 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-gray-500 text-xs text-center">No visitors found</div>
            ) : (
              filtered.map((v, i) => (
                <button
                  key={i}
                  onClick={() => viewJourney(v.visitor_uid)}
                  className={`w-full text-left px-4 py-3 border-b border-navy-600/20 hover:bg-navy-700/40 transition ${
                    selectedVisitor === v.visitor_uid ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white text-xs font-medium">
                        {v.name || v.email || v.visitor_uid?.slice(0, 12) + '…'}
                      </span>
                      {v.identified && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded">identified</span>}
                    </div>
                    <span className="text-gray-500 text-[10px]">{v.total_visits} visits</span>
                  </div>
                  {v.email && <div className="text-gray-500 text-[11px] mt-0.5">{v.email}</div>}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Journey timeline */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">
            {selectedVisitor ? 'Journey Timeline' : 'Select a visitor'}
          </h2>
          {journeyLoading && <div className="text-gray-400 text-xs animate-pulse">Loading journey…</div>}
          {!journeyLoading && !journey && selectedVisitor && (
            <div className="text-gray-500 text-xs">No journey data found.</div>
          )}
          {journey && (
            <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-4 max-h-[500px] overflow-y-auto">
              {/* Visitor info */}
              <div className="mb-4 pb-3 border-b border-navy-600/30">
                <div className="text-white text-sm font-medium">{journey.visitor_name || journey.visitor_uid}</div>
                {journey.visitor_email && <div className="text-gray-400 text-xs">{journey.visitor_email}</div>}
                <div className="text-gray-500 text-[11px] mt-1">First seen: {journey.first_seen ? new Date(journey.first_seen).toLocaleDateString() : '–'}</div>
              </div>

              {/* Sessions */}
              {journey.sessions?.map((s, si) => (
                <div key={si} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-white font-medium">
                      Session {si + 1}
                      {s.utm_source && <span className="text-blue-400 ml-2">via {s.utm_source}/{s.utm_medium}</span>}
                    </span>
                    {s.has_conversion && <span className="text-[10px] px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded">converted</span>}
                  </div>
                  <div className="text-[11px] text-gray-500 pl-4 space-y-0.5">
                    {s.utm_campaign && <div>Campaign: <span className="text-gray-300">{s.utm_campaign}</span></div>}
                    {s.utm_content && <div>Ad: <span className="text-blue-400 font-mono">{s.utm_content}</span></div>}
                    {s.fbclid && <div>fbclid: <span className="text-gray-400 font-mono">{s.fbclid.slice(0, 20)}…</span></div>}
                    {s.landing_page && <div>Landing: <span className="text-gray-300">{s.landing_page}</span></div>}
                    <div>{s.device} · {s.started_at ? new Date(s.started_at).toLocaleString() : ''}</div>
                  </div>
                </div>
              ))}

              {/* Event timeline */}
              <div className="border-t border-navy-600/30 pt-3 mt-3">
                <div className="text-xs text-gray-400 mb-2 font-medium">Events ({journey.events?.length})</div>
                <div className="space-y-2">
                  {journey.events?.map((e, ei) => (
                    <div key={ei} className="flex items-start gap-2 pl-2">
                      <div className="mt-0.5">{eventIcon(e.event_name)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white font-medium">{e.event_name}</span>
                          <span className="text-[10px] text-gray-500">
                            {e.event_time ? new Date(e.event_time).toLocaleTimeString() : ''}
                          </span>
                        </div>
                        {e.page_url && <div className="text-[11px] text-gray-500 truncate">{e.page_url}</div>}
                        {e.utm_content && <div className="text-[10px] text-blue-400">ad: {e.utm_content}</div>}
                        {Object.keys(e.properties || {}).length > 0 && (
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {JSON.stringify(e.properties).slice(0, 80)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
