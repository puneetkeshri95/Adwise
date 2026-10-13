// Reporting — campaign / adset / ad rollup with user-configurable columns.
// The "Columns" button opens the same shared MetricPickerPanel used on the
// Dashboard. System metrics that map cleanly to row aggregates are read
// directly; custom metrics are evaluated client-side from the row's numeric
// context using the safe formula evaluator in src/lib/metrics.js.
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Info, RefreshCw, Columns3, X } from 'lucide-react'
import {
  getReportingCampaigns, getReportingTotals, syncMeta, syncMetaInsights, getMetricsLibrary,
} from '../api'
import { useDateRange } from '../contexts/DateRangeContext'
import { inr, indianNum, pct, decimal, dateTime, relativeFromNow } from '../lib/format'
import { resolveMetricValue, inferFormat, formatMetricValue } from '../lib/metrics'
import SalesModal from '../components/SalesModal'
import MetricPickerPanel from '../components/MetricPickerPanel'

const COLS_STORAGE = 'adwise_reporting_columns_v1'

// Map metric_key → backend row column name (most are identical).
const ROW_FIELD_FOR_KEY = {
  total_spend: 'spend',
  total_revenue: 'revenue',
  impressions: 'impressions',
  clicks: 'clicks',
  cpm: 'cpm',
  cpc: 'cpc',
  ctr: 'ctr',
  unique_ctr: 'unique_ctr',
  landing_page_views: 'lp_views',
  lp_ctr: 'lp_view_rate',
  page_views: 'lp_views',
  unique_sessions: 'sessions',
  conversions: 'results',
  conversion_rate: 'conv_rate',
  click_to_conv_rate: 'conv_rate',
  roas: 'roas',
  cpa: 'cost_per_result',
  cost_per_result: 'cost_per_result',
  aov: 'aov',
  profit: 'profit',
}

// Column definitions for system metrics. Each is keyed by the metric library key.
const BASE_COLUMNS = {
  name:            { key: 'name', label: 'Campaign Name', sticky: true, kind: 'name' },
  daily_budget:    { key: 'daily_budget', label: 'Budget', tooltip: 'Daily budget set in Meta', format: (v) => v ? inr(v) + '/day' : '—' },
  total_spend:     { key: 'total_spend', label: 'Amount Spent', tooltip: 'Total spend in window', format: inr },
  impressions:     { key: 'impressions', label: 'Impressions', tooltip: 'Times the ad was shown', format: indianNum },
  cpm:             { key: 'cpm', label: 'CPM', tooltip: 'Cost per 1,000 impressions', format: (v) => inr(v, { decimals: 2 }) },
  clicks:          { key: 'clicks', label: 'Clicks', format: indianNum },
  ctr:             { key: 'ctr', label: 'CTR', tooltip: '(Clicks / Impressions) × 100', format: (v) => pct(v) },
  unique_ctr:      { key: 'unique_ctr', label: 'Unique CTR', tooltip: '(Unique Clicks / Reach) × 100', format: (v) => pct(v) },
  cpc:             { key: 'cpc', label: 'CPC', tooltip: 'Cost per click', format: (v) => inr(v, { decimals: 2 }) },
  landing_page_views: { key: 'landing_page_views', label: 'LP Views', tooltip: 'Page-view events on the landing page', format: indianNum },
  lp_ctr:          { key: 'lp_ctr', label: 'LP View Rate', tooltip: '(LP Views / Clicks) × 100', format: (v) => pct(v) },
  unique_sessions: { key: 'unique_sessions', label: 'Sessions', format: indianNum },
  conversion_rate: { key: 'conversion_rate', label: 'Conv. Rate', tooltip: '(Sales / LP Views) × 100', format: (v) => pct(v) },
  roas:            { key: 'roas', label: 'ROAS', tooltip: 'Revenue / Spend', format: (v) => decimal(v) + 'x' },
  cost_per_result: { key: 'cost_per_result', label: 'Cost / Result', tooltip: 'Spend / Sales', format: (v) => inr(v, { decimals: 2 }) },
  cpa:             { key: 'cpa', label: 'CPA', tooltip: 'Cost per acquisition', format: (v) => inr(v, { decimals: 2 }) },
  conversions:     { key: 'conversions', label: 'Results', tooltip: 'Confirmed sales (clickable)', format: indianNum, clickable: true },
  total_revenue:   { key: 'total_revenue', label: 'Revenue', tooltip: 'Confirmed revenue', format: inr },
}

// Default columns shown on first visit (spec).
const DEFAULT_COLUMN_KEYS = [
  'name', 'daily_budget', 'total_spend', 'impressions', 'cpm', 'unique_ctr',
  'cpc', 'lp_ctr', 'conversion_rate', 'roas', 'cost_per_result', 'conversions',
]

const STATUS_BADGE = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  PAUSED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ARCHIVED: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
}

/** Build a numeric context for a row that the formula evaluator can use. */
function buildRowContext(row) {
  const ctx = {}
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'number') ctx[k] = v
  }
  for (const [libKey, field] of Object.entries(ROW_FIELD_FOR_KEY)) {
    if (ctx[libKey] == null && typeof row[field] === 'number') ctx[libKey] = row[field]
  }
  if (ctx.total_spend == null && typeof row.spend === 'number') ctx.total_spend = row.spend
  if (ctx.total_revenue == null && typeof row.revenue === 'number') ctx.total_revenue = row.revenue
  if (ctx.conversions == null && typeof row.results === 'number') ctx.conversions = row.results
  if (ctx.profit == null) ctx.profit = (row.revenue || 0) - (row.spend || 0)
  if (ctx.aov == null && row.results > 0) ctx.aov = (row.revenue || 0) / row.results
  return ctx
}

function HeaderCell({ col, onRemove }) {
  return (
    <th className={`text-left text-[11px] uppercase tracking-wider text-gray-400 px-3 py-2 whitespace-nowrap ${col.sticky ? 'sticky left-0 bg-navy-800 z-10' : ''}`}>
      <div className="flex items-center gap-1.5 group">
        <span>{col.label}</span>
        {col.tooltip && (
          <span title={col.tooltip} className="text-gray-600">
            <Info size={10} />
          </span>
        )}
        {col.custom && (
          <span className="text-[8px] px-1 py-0.5 bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded">CUSTOM</span>
        )}
        {col.missing && (
          <span className="text-[8px] px-1 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded">UNAVAILABLE</span>
        )}
        {onRemove && !col.sticky && (
          <button
            onClick={onRemove}
            className="ml-1 text-gray-600 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition"
            title="Remove column"
          >
            <X size={10} />
          </button>
        )}
      </div>
    </th>
  )
}

function resolveCellValue(col, row, libraryByKey) {
  if (col.kind === 'name') return row.name
  if (col.missing) return null
  if (col.metric?.custom) {
    return resolveMetricValue(col.metric, buildRowContext(row))
  }
  const meta = libraryByKey?.[col.key]
  if (meta?.custom) {
    return resolveMetricValue(meta, buildRowContext(row))
  }
  if (col.key in row && typeof row[col.key] !== 'object') return row[col.key]
  const aliased = ROW_FIELD_FOR_KEY[col.key]
  if (aliased && aliased in row) return row[aliased]
  return null
}

function formatCell(col, value, libraryByKey) {
  if (col.missing) return '—'
  if (col.format) return col.format(value)
  const meta = libraryByKey?.[col.key]
  if (meta) return formatMetricValue(value, inferFormat(meta))
  return value ?? '—'
}

function Row({ row, depth = 0, expanded, toggleRow, onSalesClick, columns, libraryByKey }) {
  const indent = depth * 18
  const isCampaign = depth === 0
  const isAdset = depth === 1
  const hasChildren = (row.ad_sets?.length || row.ads?.length) > 0
  const isOpen = !!expanded[row._key]

  function rowClick(e) {
    if (hasChildren && !e.target.closest('[data-clickable]')) toggleRow(row._key)
  }

  return (
    <>
      <tr
        onClick={rowClick}
        className={`border-t border-navy-700/40 ${
          isCampaign ? 'bg-navy-800 hover:bg-navy-700/60' :
          isAdset ? 'bg-navy-800/60 hover:bg-navy-700/40' :
          'bg-navy-800/30 hover:bg-navy-700/30'
        } cursor-pointer transition`}
      >
        {columns.map((col) => {
          if (col.kind === 'name') {
            return (
              <td key={col.key} className="sticky left-0 bg-inherit px-3 py-2.5 text-sm text-white whitespace-nowrap z-10" style={{ paddingLeft: 12 + indent }}>
                <div className="flex items-center gap-2">
                  {hasChildren ? (
                    <span className="text-gray-500">
                      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                  ) : <span className="w-3" />}
                  <span className={isCampaign ? 'font-medium' : isAdset ? 'text-gray-200' : 'text-gray-400 text-xs'}>
                    {row.name}
                  </span>
                  {row.status && isCampaign && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_BADGE[row.status] || STATUS_BADGE.ARCHIVED}`}>
                      {row.status}
                    </span>
                  )}
                </div>
              </td>
            )
          }
          if ((col.key === 'conversions' || col.key === 'results') && col.clickable && (row.results || 0) > 0) {
            return (
              <td key={col.key} className="px-3 py-2.5 text-sm text-right whitespace-nowrap" data-clickable>
                <button
                  onClick={(e) => { e.stopPropagation(); onSalesClick(row) }}
                  className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
                >
                  {indianNum(row.results)}
                </button>
              </td>
            )
          }
          const v = resolveCellValue(col, row, libraryByKey)
          return (
            <td key={col.key} className="px-3 py-2.5 text-sm text-gray-200 text-right whitespace-nowrap">
              {formatCell(col, v, libraryByKey)}
            </td>
          )
        })}
      </tr>
      {isOpen && row.ad_sets?.map(asset => (
        <Row key={asset._key} row={asset} depth={1} expanded={expanded} toggleRow={toggleRow} onSalesClick={onSalesClick} columns={columns} libraryByKey={libraryByKey} />
      ))}
      {isOpen && row.ads?.map(ad => (
        <Row key={ad._key} row={ad} depth={2} expanded={expanded} toggleRow={toggleRow} onSalesClick={onSalesClick} columns={columns} libraryByKey={libraryByKey} />
      ))}
    </>
  )
}

export default function ReportingPage() {
  const { isoStart, isoEnd } = useDateRange()
  const [data, setData] = useState(null)
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [salesModal, setSalesModal] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [library, setLibrary] = useState(null)

  const [columnKeys, setColumnKeys] = useState(() => {
    try {
      const raw = localStorage.getItem(COLS_STORAGE)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          return arr[0] === 'name' ? arr : ['name', ...arr.filter(k => k !== 'name')]
        }
      }
    } catch { /* ignore */ }
    return DEFAULT_COLUMN_KEYS
  })

  useEffect(() => {
    try { localStorage.setItem(COLS_STORAGE, JSON.stringify(columnKeys)) } catch { /* ignore */ }
  }, [columnKeys])

  useEffect(() => { getMetricsLibrary().then(setLibrary).catch(() => setLibrary(null)) }, [])

  const libraryByKey = useMemo(() => {
    if (!library?.metrics) return {}
    return Object.fromEntries(library.metrics.map(m => [m.key, m]))
  }, [library])

  const columns = useMemo(() => {
    return columnKeys.map(key => {
      if (BASE_COLUMNS[key]) return BASE_COLUMNS[key]
      const meta = libraryByKey[key]
      if (!meta) return { key, label: key, missing: true, format: () => '—' }
      return {
        key: meta.key,
        label: meta.short || meta.name,
        tooltip: meta.formula,
        custom: !!meta.custom,
        metric: meta,
        format: (v) => formatMetricValue(v, inferFormat(meta)),
      }
    })
  }, [columnKeys, libraryByKey])

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      getReportingCampaigns({ dateFrom: isoStart, dateTo: isoEnd }).catch(e => { setError(e.message); return null }),
      getReportingTotals({ dateFrom: isoStart, dateTo: isoEnd }).catch(() => null),
    ]).then(([camp, tot]) => {
      if (!alive) return
      if (camp?.campaigns) {
        camp.campaigns.forEach(c => {
          c._key = `c_${c.id}`
          c.ad_sets?.forEach(a => {
            a._key = `as_${a.id}`
            a.ads?.forEach(ad => { ad._key = `ad_${ad.id}` })
          })
        })
      }
      setData(camp)
      setTotals(tot)
      setLoading(false)
    })
    return () => { alive = false }
  }, [isoStart, isoEnd])

  function toggleRow(key) { setExpanded(p => ({ ...p, [key]: !p[key] })) }

  async function handleSync() {
    setSyncing(true)
    try {
      await syncMeta()
      await syncMetaInsights('last_30d', { dateFrom: isoStart, dateTo: isoEnd })
      const fresh = await getReportingCampaigns({ dateFrom: isoStart, dateTo: isoEnd })
      fresh.campaigns?.forEach(c => {
        c._key = `c_${c.id}`
        c.ad_sets?.forEach(a => { a._key = `as_${a.id}`; a.ads?.forEach(ad => { ad._key = `ad_${ad.id}` }) })
      })
      setData(fresh)
    } catch (e) { setError(e.message) }
    setSyncing(false)
  }

  function openSalesModal(row) {
    setSalesModal({ campaign: row.name, dateFrom: isoStart, dateTo: isoEnd })
  }

  function removeColumn(key) {
    if (key === 'name') return
    setColumnKeys(prev => prev.filter(k => k !== key))
  }

  const pickerSelected = columnKeys.filter(k => k !== 'name')
  function onPickerChange(next) { setColumnKeys(['name', ...next]) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white text-xl font-semibold">Reporting</h2>
          <p className="text-gray-500 text-xs mt-1">
            {data?.last_synced_at
              ? <>Last synced from Meta: <span className="text-gray-300">{relativeFromNow(data.last_synced_at)}</span> ({dateTime(data.last_synced_at)})</>
              : 'Not synced yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/40 text-violet-300 text-xs rounded-lg flex items-center gap-1.5 hover:bg-violet-500/20"
          >
            <Columns3 size={12} /> Columns ({columnKeys.length})
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/40 text-blue-200 text-xs rounded-lg flex items-center gap-1.5 hover:bg-blue-600/30 disabled:opacity-50"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync from Meta'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-lg text-xs">{error}</div>
      )}

      <div className="bg-navy-800 border border-navy-600/30 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-900/50">
                {columns.map(c => (
                  <HeaderCell key={c.key} col={c} onRemove={() => removeColumn(c.key)} />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500 text-xs">Loading…</td></tr>
              )}
              {!loading && totals && (
                <tr className="bg-navy-700/40 border-t border-navy-600/30 sticky top-0 font-medium">
                  {columns.map((col, i) => {
                    if (i === 0) {
                      return <td key={col.key} className="sticky left-0 bg-navy-700/95 px-3 py-2.5 text-sm text-white whitespace-nowrap z-10">All Campaigns (Total)</td>
                    }
                    const v = resolveCellValue(col, totals, libraryByKey)
                    return (
                      <td key={col.key} className="px-3 py-2.5 text-sm text-white text-right whitespace-nowrap">
                        {formatCell(col, v, libraryByKey)}
                      </td>
                    )
                  })}
                </tr>
              )}
              {!loading && (data?.campaigns || []).map(c => (
                <Row key={c._key} row={c} depth={0} expanded={expanded} toggleRow={toggleRow}
                     onSalesClick={openSalesModal} columns={columns} libraryByKey={libraryByKey} />
              ))}
              {!loading && (!data?.campaigns?.length) && (
                <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500 text-xs">No campaigns in this window</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {salesModal && (
        <SalesModal
          campaignName={salesModal.campaign}
          dateFrom={salesModal.dateFrom}
          dateTo={salesModal.dateTo}
          onClose={() => setSalesModal(null)}
        />
      )}

      <MetricPickerPanel
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={pickerSelected}
        onChange={onPickerChange}
        title="Columns"
        subtitle="Pick which metrics to show as table columns. Custom metrics are evaluated per row."
      />
    </div>
  )
}
