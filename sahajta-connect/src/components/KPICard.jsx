import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { compact } from '../lib/format.js'

export default function KPICard({ label, value, delta, prefix = '', suffix = '', tone = 'default', hint }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (typeof value !== 'number') { setDisplay(value); return }
    const from = 0
    const to = value
    const duration = 900
    const start = performance.now()
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  const isUp = (delta ?? 0) >= 0
  const deltaColor = delta == null ? 'text-muted' : isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="kicker">{label}</div>
        {delta != null && (
          <div className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${deltaColor}`}>
            {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            <span>{Math.abs(delta).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="display text-[44px] text-primary leading-[0.95] tracking-[-0.03em] tabular-nums">
        {prefix}{typeof display === 'number' ? compact(display) : display}{suffix}
      </div>
      {hint && (
        <div className="mt-2 text-muted text-[11.5px]">{hint}</div>
      )}
    </div>
  )
}
