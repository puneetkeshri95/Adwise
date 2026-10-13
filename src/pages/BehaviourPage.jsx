// Behaviour — funnel, page analytics, source split, session list.
import { useEffect, useState } from 'react'
import { Eye, MousePointerClick, ShoppingCart, CreditCard, Users, Activity, ExternalLink, Smartphone, Monitor } from 'lucide-react'
import { getBehaviour } from '../api'
import { useDateRange } from '../contexts/DateRangeContext'
import { compact, pct as fmtPct, indianNum, humanDuration, dateTime } from '../lib/format'

const FUNNEL_ICONS = [Users, Activity, MousePointerClick, ShoppingCart, CreditCard]
const FUNNEL_COLORS = [
  'from-blue-500/30 to-blue-500/10 border-blue-500/40 text-blue-300',
  'from-cyan-500/30 to-cyan-500/10 border-cyan-500/40 text-cyan-300',
  'from-purple-500/30 to-purple-500/10 border-purple-500/40 text-purple-300',
  'from-amber-500/30 to-amber-500/10 border-amber-500/40 text-amber-300',
  'from-emerald-500/30 to-emerald-500/10 border-emerald-500/40 text-emerald-300',
]

export default function BehaviourPage() {
  const { isoStart, isoEnd } = useDateRange()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getBehaviour({ dateFrom: isoStart, dateTo: isoEnd })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [isoStart, isoEnd])

  if (loading) return <BehaviourSkeleton />
  if (!data) return <div className="text-gray-400 p-4">No behaviour data.</div>

  const { summary, funnel, top_pages: topPages, sources, sessions } = data
  const totalSrcSessions = sources.reduce((s, x) => s + x.sessions, 0) || 1

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <SummaryTile label="Page Views" value={compact(summary.page_views)} />
        <SummaryTile label="Sessions" value={compact(summary.sessions)} />
        <SummaryTile label="Unique Visitors" value={compact(summary.unique_visitors)} />
        <SummaryTile label="Bounce Rate" value={fmtPct(summary.bounce_rate / 100)} />
        <SummaryTile label="Avg Session" value={humanDuration(summary.avg_session_duration)} small />
        <SummaryTile label="Conv. Rate" value={fmtPct(summary.conversion_rate / 100)} highlight />
        <SummaryTile
          label="Paid / Organic"
          value={`${compact(summary.paid_sessions)} / ${compact(summary.organic_sessions)}`}
          small
        />
      </div>

      {/* Funnel */}
      <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-sm font-semibold">Conversion funnel</h3>
          <div className="text-xs text-gray-500">{data.date_from} → {data.date_to}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {funnel.map((step, i) => {
            const Icon = FUNNEL_ICONS[i] || Activity
            const color = FUNNEL_COLORS[i] || FUNNEL_COLORS[0]
            const widthPct = Math.max(8, step.pct)
            return (
              <div key={step.label} className={`relative overflow-hidden bg-gradient-to-b ${color} border rounded-lg p-3 flex flex-col min-h-[110px]`}>
                <div className="flex items-center gap-2">
                  <Icon size={14} />
                  <span className="text-[11px] uppercase tracking-wider">{step.label}</span>
                </div>
                <div className="mt-auto">
                  <div className="text-2xl font-semibold text-white">{indianNum(step.value)}</div>
                  <div className="text-[11px] text-gray-300">{fmtPct(step.pct / 100, { decimals: 1 })}</div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                  <div className="h-full bg-white/40" style={{ width: `${widthPct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top pages */}
        <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-5">
          <h3 className="text-white text-sm font-semibold mb-4">Top landing pages</h3>
          {topPages.length === 0 ? (
            <div className="text-gray-500 text-sm">No page-view data in this window.</div>
          ) : (
            <div className="space-y-2">
              {topPages.map((p) => {
                const max = topPages[0].views || 1
                const widthPct = (p.views / max) * 100
                return (
                  <div key={p.url} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 truncate inline-flex items-center gap-1 flex-1 min-w-0">
                        <span className="truncate font-mono text-[12px]">{truncateUrl(p.url)}</span>
                        <ExternalLink size={10} className="shrink-0" />
                      </a>
                      <span className="text-white text-xs shrink-0">{indianNum(p.views)}</span>
                    </div>
                    <div className="h-1.5 bg-navy-900 rounded-full mt-1">
                      <div className="h-full bg-blue-500/70 rounded-full" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sources */}
        <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-5">
          <h3 className="text-white text-sm font-semibold mb-4">Traffic sources</h3>
          {sources.length === 0 ? (
            <div className="text-gray-500 text-sm">No session data.</div>
          ) : (
            <div className="space-y-2">
              {sources.map((s) => {
                const widthPct = (s.sessions / totalSrcSessions) * 100
                return (
                  <div key={s.source} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-white capitalize">
                        <span className={`w-1.5 h-1.5 rounded-full ${s.is_paid ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                        {s.source}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          s.is_paid ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                          'bg-slate-500/10 text-slate-300 border-slate-500/30'
                        }`}>
                          {s.is_paid ? 'Paid' : 'Organic'}
                        </span>
                      </span>
                      <span className="text-gray-300 text-xs">{indianNum(s.sessions)} ({fmtPct(s.pct / 100, { decimals: 1 })})</span>
                    </div>
                    <div className="h-1.5 bg-navy-900 rounded-full mt-1">
                      <div className={`h-full rounded-full ${s.is_paid ? 'bg-emerald-500/70' : 'bg-slate-400/60'}`} style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      <div className="bg-navy-800 border border-navy-600/30 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-navy-700/40 flex items-center justify-between">
          <h3 className="text-white text-sm font-semibold">Recent sessions</h3>
          <span className="text-[11px] text-gray-500">{sessions.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-navy-700/40 uppercase">
                <th className="text-left px-4 py-2 font-medium">When</th>
                <th className="text-left px-4 py-2 font-medium">Visitor</th>
                <th className="text-left px-4 py-2 font-medium">Source / Campaign</th>
                <th className="text-left px-4 py-2 font-medium">Device</th>
                <th className="text-right px-4 py-2 font-medium">Pages</th>
                <th className="text-right px-4 py-2 font-medium">Duration</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-gray-500">No sessions in this period.</td></tr>
              ) : sessions.map((s) => (
                <tr key={s.id} className="border-b border-navy-700/20 hover:bg-navy-900/40">
                  <td className="px-4 py-2 text-gray-300 whitespace-nowrap">{s.started_at ? dateTime(s.started_at) : '—'}</td>
                  <td className="px-4 py-2 text-white">{s.visitor}{s.email && <div className="text-[10px] text-gray-500">{s.email}</div>}</td>
                  <td className="px-4 py-2 text-gray-300">
                    <span className="capitalize">{s.source}</span>
                    {s.campaign && <span className="text-gray-500"> · {s.campaign}</span>}
                    {s.ad && <div className="text-[10px] font-mono text-blue-300">{s.ad}</div>}
                  </td>
                  <td className="px-4 py-2 text-gray-300">
                    <span className="inline-flex items-center gap-1">
                      {s.device === 'mobile' ? <Smartphone size={11} /> : <Monitor size={11} />}
                      <span className="capitalize">{s.device || '—'}</span>
                    </span>
                    {s.browser && <div className="text-[10px] text-gray-500">{s.browser}</div>}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-200">{s.page_count}</td>
                  <td className="px-4 py-2 text-right text-gray-200">{s.duration_seconds ? humanDuration(s.duration_seconds) : '—'}</td>
                  <td className="px-4 py-2">
                    {s.bounced ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded">Bounced</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded">Engaged</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryTile({ label, value, small, highlight }) {
  return (
    <div className={`bg-navy-800 border ${highlight ? 'border-emerald-500/40' : 'border-navy-600/30'} rounded-lg p-3`}>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`${small ? 'text-sm' : 'text-xl'} font-semibold text-white mt-1 truncate`}>{value}</div>
    </div>
  )
}

function BehaviourSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-16 bg-navy-800/60 rounded-lg" />)}
      </div>
      <div className="h-40 bg-navy-800/60 rounded-xl" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-navy-800/60 rounded-xl" />
        <div className="h-64 bg-navy-800/60 rounded-xl" />
      </div>
      <div className="h-64 bg-navy-800/60 rounded-xl" />
    </div>
  )
}

function truncateUrl(url, max = 60) {
  if (!url) return '—'
  if (url.length <= max) return url
  return url.slice(0, max) + '…'
}
