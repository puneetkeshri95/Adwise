// Reusable KPI card with current value, delta badge, and optional sparkline.
import { useState } from 'react'
import { TrendingUp, TrendingDown, Info } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

import { inr, indianNum, pct, decimal, deltaColor, deltaArrow } from '../lib/format'

function formatValue(value, format) {
  if (value == null) return '—'
  switch (format) {
    case 'inr': return inr(value)
    case 'inr2': return inr(value, { decimals: 2 })
    case 'number': return indianNum(value)
    case 'pct': return pct(value)
    case 'decimal': return decimal(value)
    case 'roas': return decimal(value) + 'x'
    default: return String(value)
  }
}

/**
 * Variants:
 *  - "hero"      → biggest, used for ROAS / Revenue / Spend
 *  - "secondary" → 4-up KPI cards
 *  - "behaviour" → bottom row Organic vs Paid / sessions / etc.
 */
export default function KPICard({
  label,
  value,
  format = 'number',
  delta,           // percent change vs previous (number or null)
  direction = 'higher', // "higher" | "lower" | "neutral"
  sparkline = [],  // array of numeric values
  variant = 'secondary',
  formula,
  description,
  warning = false, // true → red border (e.g., negative profit)
  highlight = false, // primary brand styling for hero ROAS
}) {
  const [showTip, setShowTip] = useState(false)
  const colorCls = deltaColor(delta, direction)
  const arrow = deltaArrow(delta)

  const sizeCls = variant === 'hero'
    ? 'p-5'
    : variant === 'behaviour'
      ? 'p-4'
      : 'p-4'

  const valueSizeCls = variant === 'hero'
    ? 'text-3xl'
    : 'text-2xl'

  const borderCls = warning
    ? 'border-rose-500/60'
    : highlight
      ? 'border-blue-500/40'
      : 'border-navy-600/30'

  const valueColorCls = warning ? 'text-rose-300' : 'text-white'

  return (
    <div
      className={`relative bg-navy-800 rounded-xl border ${borderCls} ${sizeCls} flex flex-col gap-2 group`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider">
          <span>{label}</span>
          {(formula || description) && (
            <button
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              className="text-gray-500 hover:text-gray-300"
              type="button"
            >
              <Info size={11} />
            </button>
          )}
        </div>
        {delta != null && (
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${colorCls}`}>
            <span className="text-[10px]">{arrow}</span>
            {pct(Math.abs(delta), { decimals: 1 })}
          </span>
        )}
      </div>

      <div className={`${valueSizeCls} ${valueColorCls} font-semibold leading-tight`}>
        {formatValue(value, format)}
      </div>

      {sparkline?.length > 0 && (
        <div className="h-10 -mx-1 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline.map((v, i) => ({ i, v }))}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={warning ? '#fb7185' : highlight ? '#3b82f6' : '#64748b'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {showTip && (formula || description) && (
        <div className="absolute z-50 left-0 top-full mt-1 w-64 p-3 bg-navy-900 border border-navy-600/40 rounded-lg shadow-2xl">
          {formula && (
            <div className="text-[11px] text-gray-300 font-mono mb-1">{formula}</div>
          )}
          {description && (
            <div className="text-[11px] text-gray-500 leading-snug">{description}</div>
          )}
        </div>
      )}
    </div>
  )
}
