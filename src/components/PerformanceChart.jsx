// Dashboard performance chart — Revenue (left axis) vs Spend (right axis), 30-day line.
// Switcher: Revenue / ROAS / Conversions / Sessions, plus chart-type toggle (line/bar).
import { useState } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { compact, dateOnly, inr } from '../lib/format'

const SERIES_OPTIONS = [
  { key: 'revenue_spend', label: 'Revenue vs Spend' },
  { key: 'roas', label: 'ROAS' },
  { key: 'sales', label: 'Conversions' },
  { key: 'sessions', label: 'Sessions' },
]

function tickRupee(v) { return compact(v, { withRupee: true }) }
function tickNum(v) { return compact(v) }

function CustomTooltip({ active, payload, label, mode }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-navy-900 border border-navy-600/40 rounded-lg p-3 shadow-2xl text-xs">
      <div className="text-gray-400 mb-1.5">{dateOnly(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-white">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-400 capitalize">{p.dataKey}:</span>
          <span className="font-medium">
            {mode === 'revenue_spend'
              ? inr(p.value)
              : mode === 'roas'
                ? `${Number(p.value).toFixed(2)}x`
                : Number(p.value).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function PerformanceChart({ daily = [] }) {
  const [series, setSeries] = useState('revenue_spend')
  const [chartType, setChartType] = useState('line')

  const data = daily.map((d) => ({ ...d, label: d.date }))

  return (
    <div className="bg-navy-800 rounded-xl border border-navy-600/30 p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold">Performance</h3>
          <p className="text-gray-500 text-xs mt-0.5">Daily breakdown across the selected window</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-navy-900/50 border border-navy-600/30 rounded-lg p-0.5">
            {SERIES_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setSeries(o.key)}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  series === o.key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex bg-navy-900/50 border border-navy-600/30 rounded-lg p-0.5">
            {['line', 'bar'].map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`px-2.5 py-1 text-xs rounded-md transition ${
                  chartType === t ? 'bg-navy-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'line' ? 'Line' : 'Bar'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              tickFormatter={(v) => {
                const d = new Date(v)
                return `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' })}`
              }}
              tick={{ fontSize: 11, fill: '#64748b' }}
              stroke="#334155"
            />
            <YAxis
              yAxisId="left"
              tickFormatter={series === 'revenue_spend' ? tickRupee : tickNum}
              tick={{ fontSize: 11, fill: '#64748b' }}
              stroke="#334155"
            />
            {series === 'revenue_spend' && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={tickRupee}
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#334155"
              />
            )}
            <Tooltip content={<CustomTooltip mode={series} />} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              align="right"
              verticalAlign="top"
            />

            {series === 'revenue_spend' && (
              chartType === 'line' ? (
                <>
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Revenue" />
                  <Line yAxisId="right" type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2} dot={false} name="Spend" />
                </>
              ) : (
                <>
                  <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue" />
                  <Bar yAxisId="right" dataKey="spend" fill="#f59e0b" name="Spend" />
                </>
              )
            )}
            {series === 'roas' && (
              chartType === 'line' ? (
                <Line yAxisId="left" type="monotone" dataKey="roas" stroke="#10b981" strokeWidth={2} dot={false} name="ROAS" />
              ) : (
                <Bar yAxisId="left" dataKey="roas" fill="#10b981" name="ROAS" />
              )
            )}
            {series === 'sales' && (
              chartType === 'line' ? (
                <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Conversions" />
              ) : (
                <Bar yAxisId="left" dataKey="sales" fill="#8b5cf6" name="Conversions" />
              )
            )}
            {series === 'sessions' && (
              chartType === 'line' ? (
                <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#06b6d4" strokeWidth={2} dot={false} name="Sessions" />
              ) : (
                <Bar yAxisId="left" dataKey="sessions" fill="#06b6d4" name="Sessions" />
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
