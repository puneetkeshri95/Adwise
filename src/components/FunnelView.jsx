import { useEffect, useState } from 'react'
import { getFunnel } from '../api'

export default function FunnelView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFunnel().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-gray-400">Loading funnel…</div>
  if (!data?.steps?.length) return <div className="p-6 text-gray-400">No funnel data yet.</div>

  const max = Math.max(...data.steps.map(s => s.count), 1)

  return (
    <div className="p-5">
      <div className="text-xs uppercase tracking-wider text-gray-400 mb-4">Conversion funnel (unique visitors)</div>
      <div className="space-y-2 max-w-2xl">
        {data.steps.map((s, i) => {
          const pct = (s.count / max) * 100
          const dropoff = i > 0 && data.steps[i - 1].count > 0
            ? Math.round((1 - s.count / data.steps[i - 1].count) * 100)
            : null
          return (
            <div key={s.step}>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-32 text-gray-300">{s.step}</span>
                <div className="flex-1 bg-navy-900 rounded h-7 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-end pr-2 text-white text-xs font-medium"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  >
                    {s.count}
                  </div>
                </div>
                {dropoff !== null && (
                  <span className={`text-xs w-16 text-right ${dropoff > 50 ? 'text-red-400' : 'text-gray-400'}`}>
                    -{dropoff}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
