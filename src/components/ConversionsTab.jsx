import { visitorData as sampleVisitors } from '../data/sampleData'
import { CheckCircle, XCircle } from 'lucide-react'

function transformVisitors(apiVisitors) {
  if (!apiVisitors || !apiVisitors.length) return sampleVisitors
  return apiVisitors.map((v) => ({
    id: `v${v.id}`,
    name: v.name || `Visitor #${v.visitor_uid}`,
    email: v.email || '–',
    visits: v.total_visits,
    lastVisit: v.last_seen ? new Date(v.last_seen).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '–',
    converted: false, // determined from conversions
    totalSpent: '–',
    source: 'Meta Ads',
  }))
}

export default function ConversionsTab({ visitors, conversions }) {
  const visitorList = transformVisitors(visitors)

  // Mark converted visitors
  if (conversions && conversions.length) {
    const convertedIds = new Set(conversions.map((c) => c.visitor_id))
    visitorList.forEach((v) => {
      const vid = parseInt(v.id.slice(1))
      if (convertedIds.has(vid)) {
        v.converted = true
        const conv = conversions.find((c) => c.visitor_id === vid)
        if (conv) v.totalSpent = `₹${Math.round(conv.amount).toLocaleString('en-IN')}`
      }
    })
  }
  return (
    <div className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white mb-1">Conversion & Visitor Log</h3>
        <p className="text-[11px] text-gray-500">All tracked visitors with conversion status, visit frequency, and source attribution</p>
      </div>

      <div className="bg-navy-800/50 border border-navy-600/30 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_80px_100px_80px_80px_80px] items-center px-4 py-2.5 bg-navy-700/50 border-b border-navy-600/30 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
          <div>Visitor</div>
          <div>Email</div>
          <div className="text-center">Visits</div>
          <div>Last Visit</div>
          <div className="text-center">Converted</div>
          <div className="text-right">Spent</div>
          <div>Source</div>
        </div>

        {/* Rows */}
        {visitorList.map((v) => (
          <div
            key={v.id}
            className="grid grid-cols-[1fr_1fr_80px_100px_80px_80px_80px] items-center px-4 py-2.5 border-b border-navy-600/15 text-xs hover:bg-navy-700/30 transition cursor-pointer"
          >
            <div className="text-white font-medium">{v.name}</div>
            <div className="text-gray-500">{v.email}</div>
            <div className="text-center text-gray-300">{v.visits}</div>
            <div className="text-gray-400">{v.lastVisit}</div>
            <div className="flex justify-center">
              {v.converted ? (
                <CheckCircle size={14} className="text-green-400" />
              ) : (
                <XCircle size={14} className="text-gray-600" />
              )}
            </div>
            <div className={`text-right ${v.converted ? 'text-green-400 font-medium' : 'text-gray-600'}`}>{v.totalSpent}</div>
            <div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${v.source === 'Meta Ads' ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' : 'bg-navy-700 text-gray-400 border border-navy-600'}`}>
                {v.source}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        <div className="bg-navy-800/50 border border-navy-600/30 rounded-lg p-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Total Visitors</div>
          <div className="text-lg font-semibold text-white mt-0.5">{visitorList.length}</div>
        </div>
        <div className="bg-navy-800/50 border border-navy-600/30 rounded-lg p-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Converted</div>
          <div className="text-lg font-semibold text-green-400 mt-0.5">{visitorList.filter(v => v.converted).length}</div>
        </div>
        <div className="bg-navy-800/50 border border-navy-600/30 rounded-lg p-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Conversion Rate</div>
          <div className="text-lg font-semibold text-accent-blue mt-0.5">
            {visitorList.length > 0 ? Math.round((visitorList.filter(v => v.converted).length / visitorList.length) * 100) : 0}%
          </div>
        </div>
        <div className="bg-navy-800/50 border border-navy-600/30 rounded-lg p-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">From Meta Ads</div>
          <div className="text-lg font-semibold text-white mt-0.5">{visitorList.filter(v => v.source === 'Meta Ads').length}</div>
        </div>
      </div>
    </div>
  )
}
