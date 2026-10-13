import { useState, useEffect } from 'react'
import { Search, ShoppingCart, ArrowRight, Clock } from 'lucide-react'
import { getConversions, getConversionDetail, getJourney } from '../api'

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function ConversionsPage() {
  const [conversions, setConversions] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadConversions()
  }, [])

  async function loadConversions() {
    setLoading(true)
    try {
      const data = await getConversions(100)
      setConversions(data?.conversions || data || [])
    } catch { setConversions([]) }
    setLoading(false)
  }

  async function viewDetail(order) {
    setDetailLoading(true)
    try {
      const d = await getConversionDetail(order.id)
      setDetail(d)
    } catch {
      setDetail(null)
    }
    setDetailLoading(false)
  }

  const filtered = conversions.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (c.order_id || '').toLowerCase().includes(q) ||
      (c.utm_source || '').toLowerCase().includes(q) ||
      (c.utm_campaign || '').toLowerCase().includes(q) ||
      (c.utm_content || '').toLowerCase().includes(q) ||
      (c.fbclid || '').toLowerCase().includes(q)
    )
  })

  if (loading) return <div className="text-gray-400 animate-pulse">Loading conversions…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Conversions</h1>
        <p className="text-sm text-gray-400 mt-1">Every purchase tracked, attributed to the ad that drove it. Search by order, campaign, or ad ID.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-3 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order ID, campaign, utm_content, fbclid…"
          className="w-full pl-9 pr-4 py-2.5 bg-navy-800 border border-navy-600/40 rounded-lg text-sm text-white placeholder-gray-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Conversion list */}
        <div className="lg:col-span-2">
          {filtered.length === 0 ? (
            <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-6 text-center text-gray-500 text-sm">
              No conversions yet. Purchases will appear here once webhook events arrive or visitors complete purchases tracked by the pixel.
            </div>
          ) : (
            <div className="bg-navy-800 border border-navy-600/30 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-navy-600/30 uppercase">
                      <th className="text-left px-4 py-3 font-medium">Order</th>
                      <th className="text-right px-4 py-3 font-medium">Amount</th>
                      <th className="text-left px-4 py-3 font-medium">Source</th>
                      <th className="text-left px-4 py-3 font-medium">Ad (utm_content)</th>
                      <th className="text-left px-4 py-3 font-medium">Time</th>
                      <th className="text-center px-4 py-3 font-medium">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={i} className="border-b border-navy-600/20 hover:bg-navy-700/30">
                        <td className="px-4 py-3 text-white font-mono">{c.order_id || `#${c.id}`}</td>
                        <td className="px-4 py-3 text-right text-green-400">₹{fmt(c.amount)}</td>
                        <td className="px-4 py-3 text-gray-300">{c.utm_source || 'direct'}/{c.utm_medium || '–'}</td>
                        <td className="px-4 py-3 text-blue-400 font-mono">{c.utm_content || '–'}</td>
                        <td className="px-4 py-3 text-gray-500">{c.converted_at ? new Date(c.converted_at).toLocaleString() : '–'}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => viewDetail(c)} className="text-blue-400 hover:text-blue-300">
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Conversion detail */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Conversion Detail</h2>
          {detailLoading && <div className="text-gray-400 text-xs animate-pulse">Loading…</div>}
          {!detailLoading && !detail && (
            <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-4 text-gray-500 text-xs text-center">
              Click a conversion to see the full journey
            </div>
          )}
          {detail && (
            <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-4 space-y-4">
              {/* Order info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart size={14} className="text-green-400" />
                  <span className="text-white text-sm font-medium">₹{fmt(detail.amount)}</span>
                  <span className="text-gray-500 text-xs">{detail.currency}</span>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Order: <span className="text-white font-mono">{detail.order_id}</span></div>
                  {detail.visitor_email && <div>Customer: <span className="text-white">{detail.visitor_email}</span></div>}
                  {detail.visitor_name && <div>Name: <span className="text-white">{detail.visitor_name}</span></div>}
                </div>
              </div>

              {/* Attribution */}
              <div className="border-t border-navy-600/30 pt-3">
                <div className="text-xs text-gray-400 font-medium mb-2">Attribution</div>
                <div className="space-y-1 text-xs">
                  {detail.utm_source && <div>Source: <span className="text-gray-300">{detail.utm_source}/{detail.utm_medium}</span></div>}
                  {detail.utm_campaign && <div>Campaign: <span className="text-gray-300">{detail.utm_campaign}</span></div>}
                  {detail.utm_content && <div>Ad: <span className="text-blue-400 font-mono">{detail.utm_content}</span></div>}
                  {detail.fbclid && <div>fbclid: <span className="text-gray-400 font-mono text-[10px]">{detail.fbclid}</span></div>}
                </div>
              </div>

              {/* Touchpoint sessions (journey to purchase) */}
              {detail.touchpoint_sessions?.length > 0 && (
                <div className="border-t border-navy-600/30 pt-3">
                  <div className="text-xs text-gray-400 font-medium mb-2">Journey to Purchase</div>
                  <div className="space-y-2">
                    {detail.touchpoint_sessions.map((tp, ti) => (
                      <div key={ti} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-navy-700 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
                          {ti + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-white">
                            {tp.utm_source ? `${tp.utm_source}/${tp.utm_medium}` : 'Direct'}
                            {tp.utm_content && <span className="text-blue-400 ml-1">({tp.utm_content})</span>}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {tp.landing_page && <span className="mr-2">{tp.landing_page}</span>}
                            {tp.started_at && new Date(tp.started_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
