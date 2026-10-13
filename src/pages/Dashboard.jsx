// Dashboard — spec-aligned: 3 hero KPIs + 4 secondary + perf chart + 4 behaviour KPIs.
import { useEffect, useMemo, useState } from 'react'
import { Filter, Layers, Plus, X } from 'lucide-react'
import KPICard from '../components/KPICard'
import PerformanceChart from '../components/PerformanceChart'
import MetricPickerPanel from '../components/MetricPickerPanel'
import { getDashboardOverview, getMetricsLibrary } from '../api'
import { useDateRange } from '../contexts/DateRangeContext'
import { resolveMetricValue, inferFormat } from '../lib/metrics'

const DASH_DEFAULT_KEYS = [
  'roas', 'total_revenue', 'total_spend', 'profit',
  'cpa', 'conversions', 'ctr', 'cpc',
  'page_views', 'unique_sessions', 'new_visitors',
]
const DASH_STORAGE = 'adwise_dashboard_metrics_v1'

function pickSparkline(daily, key) {
  if (!daily) return []
  return daily.map(d => Number(d[key] || 0))
}

export default function Dashboard() {
  const { isoStart, isoEnd, compare } = useDateRange()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [extraKeys, setExtraKeys] = useState(() => {
    try {
      const raw = localStorage.getItem(DASH_STORAGE)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [library, setLibrary] = useState(null)

  useEffect(() => {
    try { localStorage.setItem(DASH_STORAGE, JSON.stringify(extraKeys)) } catch { /* ignore */ }
  }, [extraKeys])

  useEffect(() => {
    getMetricsLibrary().then(setLibrary).catch(() => setLibrary(null))
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    getDashboardOverview({ dateFrom: isoStart, dateTo: isoEnd, compare })
      .then(d => { if (alive) { setData(d); setLoading(false); setErr('') } })
      .catch(e => { if (alive) { setErr(e.message); setLoading(false) } })
    return () => { alive = false }
  }, [isoStart, isoEnd, compare])

  const sparklines = useMemo(() => {
    if (!data?.daily) return {}
    return {
      revenue: pickSparkline(data.daily, 'revenue'),
      spend: pickSparkline(data.daily, 'spend'),
      sales: pickSparkline(data.daily, 'sales'),
      sessions: pickSparkline(data.daily, 'sessions'),
      roas: pickSparkline(data.daily, 'roas'),
    }
  }, [data])

  const k = data?.kpis || {}
  const traffic = data?.traffic_split || {}
  const profitNeg = (k.profit?.value || 0) < 0

  // Build a flat {metric_key: number} context for evaluating custom-metric formulas.
  const metricContext = useMemo(() => {
    const ctx = {}
    for (const [key, obj] of Object.entries(k)) ctx[key] = Number(obj?.value || 0)
    return ctx
  }, [k])

  const libraryByKey = useMemo(() => {
    if (!library?.metrics) return {}
    return Object.fromEntries(library.metrics.map(m => [m.key, m]))
  }, [library])

  const extraCards = useMemo(() => {
    return extraKeys.map(key => {
      const meta = libraryByKey[key]
      if (!meta) return { key, missing: true }
      const value = resolveMetricValue(meta, metricContext)
      return { key, meta, value, format: inferFormat(meta) }
    })
  }, [extraKeys, libraryByKey, metricContext])

  function removeExtra(key) {
    setExtraKeys(prev => prev.filter(k => k !== key))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-36 rounded-xl bg-navy-800 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-navy-800 animate-pulse" />)}
        </div>
        <div className="h-80 rounded-xl bg-navy-800 animate-pulse" />
      </div>
    )
  }

  if (err) {
    return <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-lg text-sm">{err}</div>
  }

  return (
    <div className="space-y-6">
      {/* Source filter + Add metric */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Source:</span>
          <button className="px-3 py-1.5 text-xs bg-blue-600/20 text-blue-300 border border-blue-500/40 rounded-lg flex items-center gap-1.5">
            <Layers size={12} />
            Meta (Facebook + Instagram + Threads)
          </button>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="px-3 py-1.5 text-xs bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/40 rounded-lg inline-flex items-center gap-1.5"
        >
          <Plus size={12} /> Add metric
        </button>
      </div>

      {/* Row 1 — 3 hero KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          variant="hero" highlight
          label="ROAS" value={k.roas?.value} format="roas"
          delta={k.roas?.delta} direction="higher"
          sparkline={sparklines.roas}
          formula="Total Revenue / Total Spend"
          description="Return on ad spend in this period."
        />
        <KPICard
          variant="hero"
          label="Total Revenue" value={k.total_revenue?.value} format="inr"
          delta={k.total_revenue?.delta} direction="higher"
          sparkline={sparklines.revenue}
          formula="Sum of all confirmed payment events"
          description="Server-tracked revenue from your webhook."
        />
        <KPICard
          variant="hero"
          label="Total Spend" value={k.total_spend?.value} format="inr"
          delta={k.total_spend?.delta} direction="lower"
          sparkline={sparklines.spend}
          formula="Sum of all ad spend (Meta API)"
          description="Total amount spent across all campaigns."
        />
      </div>

      {/* Profit row (full-width emphasis if loss) */}
      {k.profit && (
        <KPICard
          variant="hero"
          warning={profitNeg}
          label={profitNeg ? 'Loss' : 'Profit'}
          value={k.profit.value} format="inr"
          delta={k.profit.delta} direction="higher"
          formula="Total Revenue − Total Spend"
          description={profitNeg ? 'You are spending more than you earn from ads.' : 'Net positive profit from ads.'}
        />
      )}

      {/* Row 2 — 4 secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="CPA" value={k.cpa?.value} format="inr" delta={k.cpa?.delta} direction="lower"
          formula="Spend / Conversions" description="Cost per conversion." />
        <KPICard label="Conversions" value={k.conversions?.value} format="number" delta={k.conversions?.delta} direction="higher"
          sparkline={sparklines.sales} formula="Count of confirmed payment events" description="Total sales in this period." />
        <KPICard label="CTR" value={k.ctr?.value} format="pct" delta={k.ctr?.delta} direction="higher"
          formula="(Clicks / Impressions) × 100" description="Click-through rate." />
        <KPICard label="CPC" value={k.cpc?.value} format="inr2" delta={k.cpc?.delta} direction="lower"
          formula="Spend / Clicks" description="Cost per click." />
      </div>

      {/* Row 3 — full-width performance chart */}
      <PerformanceChart daily={data?.daily || []} />

      {/* Row 4 — Behaviour KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-navy-800 rounded-xl border border-navy-600/30 p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Organic vs Paid</div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl text-white font-semibold">{traffic.paid_pct ?? 0}%</span>
            <span className="text-sm text-blue-300">Paid</span>
          </div>
          <div className="w-full h-2 bg-navy-700 rounded overflow-hidden flex">
            <div className="bg-blue-500" style={{ width: `${traffic.paid_pct ?? 0}%` }} />
            <div className="bg-slate-500" style={{ width: `${traffic.organic_pct ?? 0}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-gray-500">
            <span>Paid {(traffic.paid_sessions ?? 0).toLocaleString('en-IN')}</span>
            <span>Organic {(traffic.organic_sessions ?? 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
        <KPICard variant="behaviour" label="Page Views" value={k.page_views?.value} format="number"
          delta={k.page_views?.delta} direction="higher"
          formula="All page_view events from tracking pixel"
          description="Total page loads incl. repeat visits." />
        <KPICard variant="behaviour" label="Unique Sessions" value={k.unique_sessions?.value} format="number"
          delta={k.unique_sessions?.delta} direction="higher"
          sparkline={sparklines.sessions}
          formula="Sessions with distinct session IDs"
          description="Individual browsing sessions." />
        <KPICard variant="behaviour" label="New Visitors" value={k.new_visitors?.value} format="number"
          delta={k.new_visitors?.delta} direction="higher"
          formula="Tracking IDs first seen in this window"
          description="Users with no prior history in our system." />
      </div>

      {/* Custom / added metric cards */}
      {extraCards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs uppercase tracking-wider text-gray-500">Your added metrics</h3>
            <button
              onClick={() => setPickerOpen(true)}
              className="text-[11px] text-violet-300 hover:text-violet-200 inline-flex items-center gap-1"
            >
              <Plus size={11} /> Manage
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {extraCards.map(c => (
              <div key={c.key} className="relative group">
                {c.missing ? (
                  <div className="bg-navy-800 border border-dashed border-rose-500/30 rounded-xl p-4 h-full">
                    <div className="text-xs uppercase tracking-wider text-rose-400/80 mb-2">Metric unavailable</div>
                    <div className="text-sm text-gray-400">"{c.key}" was removed.</div>
                  </div>
                ) : (
                  <KPICard
                    label={c.meta.name}
                    value={c.value}
                    format={c.format}
                    formula={c.meta.formula}
                    description={c.meta.description}
                    direction={c.meta.direction}
                  />
                )}
                <button
                  onClick={() => removeExtra(c.key)}
                  className="absolute top-2 right-2 p-1 rounded text-gray-500 hover:text-white hover:bg-navy-700/70 opacity-0 group-hover:opacity-100 transition"
                  title="Remove from dashboard"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <MetricPickerPanel
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={extraKeys}
        onChange={setExtraKeys}
        title="+ Add metric to Dashboard"
        subtitle="Picks become extra KPI cards. Custom metrics are evaluated against this period's totals."
        excludeKeys={DASH_DEFAULT_KEYS}
      />
    </div>
  )
}
