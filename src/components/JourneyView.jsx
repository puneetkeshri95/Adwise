// JourneyView — visitor info bar + first/last touch attribution + vertical timeline.
import { useEffect, useState } from 'react'
import {
  MousePointerClick, Monitor, Smartphone, Eye, ScrollText, Hand,
  ShoppingCart, CreditCard, Mail, Phone, Copy, Loader,
} from 'lucide-react'
import { getJourneyForOrder } from '../api'
import { inr, dateTime, humanDuration, deltaSince } from '../lib/format'

const NODE_STYLE = {
  ad_click: { icon: MousePointerClick, color: 'bg-blue-500/15 text-blue-300 border-blue-500/40', label: 'Ad Click' },
  page_view: { icon: Eye, color: 'bg-purple-500/15 text-purple-300 border-purple-500/40', label: 'Landing Page View' },
  scroll_depth: { icon: ScrollText, color: 'bg-slate-500/15 text-slate-300 border-slate-500/40', label: 'Page Engagement' },
  cta_click: { icon: Hand, color: 'bg-slate-500/15 text-slate-300 border-slate-500/40', label: 'CTA Click' },
  bounce: { icon: ScrollText, color: 'bg-rose-500/15 text-rose-300 border-rose-500/40', label: 'Bounce' },
  checkout_started: { icon: ShoppingCart, color: 'bg-amber-500/15 text-amber-300 border-amber-500/40', label: 'Checkout Started' },
  purchase: { icon: CreditCard, color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', label: 'Payment Completed' },
}

function nodeFor(kind) {
  return NODE_STYLE[kind] || NODE_STYLE.page_view
}

export default function JourneyView({ orderPk }) {
  const [journey, setJourney] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    getJourneyForOrder(orderPk)
      .then(d => { if (alive) { setJourney(d); setLoading(false) } })
      .catch(e => { if (alive) { setError(e.message); setLoading(false) } })
    return () => { alive = false }
  }, [orderPk])

  function copyLink() {
    navigator.clipboard?.writeText(`${window.location.origin}/app/journeys/${orderPk}`)
  }

  if (loading) return <div className="p-8 text-center text-gray-500 text-sm flex items-center justify-center gap-2"><Loader size={14} className="animate-spin" /> Loading journey…</div>
  if (error) return <div className="m-5 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded text-xs">{error}</div>
  if (!journey) return null

  const v = journey.visitor || {}
  const firstTime = journey.timeline?.[0]?.time
  const ft = journey.first_touch
  const lt = journey.last_touch

  return (
    <div className="p-5 space-y-5">
      {/* Visitor info bar */}
      <div className="bg-navy-900/60 border border-navy-600/30 rounded-xl p-4 flex flex-wrap gap-4">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Name</div>
          <div className="text-white font-medium">{v.name || 'Anonymous'}</div>
        </div>
        {v.email && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Email</div>
            <div className="text-gray-300 text-sm inline-flex items-center gap-1.5"><Mail size={11} />{v.email}</div>
          </div>
        )}
        {v.phone && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Phone</div>
            <div className="text-gray-300 text-sm inline-flex items-center gap-1.5"><Phone size={11} />{v.phone}</div>
          </div>
        )}
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Order</div>
          <div className="text-gray-300 text-sm font-mono">{journey.order_id}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Amount</div>
          <div className="text-emerald-300 font-medium">{inr(journey.amount)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Converted in</div>
          <div className="text-white text-sm">{humanDuration(journey.total_seconds)}</div>
        </div>
        <button onClick={copyLink} className="ml-auto self-start text-gray-400 hover:text-white text-xs inline-flex items-center gap-1.5">
          <Copy size={11} /> Copy link
        </button>
      </div>

      {/* Attribution cards */}
      {(ft || lt) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ft && (
            <div className="bg-navy-900/60 border border-blue-500/20 rounded-xl p-4">
              <div className="text-[10px] text-blue-300 uppercase tracking-wider mb-1">First Touch</div>
              <div className="text-white text-sm font-medium">{ft.utm_campaign || 'Direct'}</div>
              <div className="text-gray-400 text-xs mt-0.5">{ft.utm_source || 'Direct'} · {ft.utm_content || '—'}</div>
              <div className="text-gray-500 text-[11px] mt-1">{dateTime(ft.time)}</div>
            </div>
          )}
          {lt && (
            <div className="bg-navy-900/60 border border-emerald-500/20 rounded-xl p-4">
              <div className="text-[10px] text-emerald-300 uppercase tracking-wider mb-1">Last Touch</div>
              <div className="text-white text-sm font-medium">{lt.utm_campaign || 'Direct'}</div>
              <div className="text-gray-400 text-xs mt-0.5">{lt.utm_source || 'Direct'} · {lt.utm_content || '—'}</div>
              <div className="text-gray-500 text-[11px] mt-1">{dateTime(lt.time)}</div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500 mb-3 font-medium">Timeline</div>
        <ol className="relative border-l border-navy-600/40 ml-3 space-y-4">
          {journey.timeline.map((t, i) => {
            const isNewSession = i > 0 && t.session_id && journey.timeline[i - 1]?.session_id && t.session_id !== journey.timeline[i - 1].session_id
            const node = nodeFor(t.kind)
            const Icon = node.icon
            return (
              <li key={i}>
                {isNewSession && (
                  <div className="ml-4 mb-3 -mt-1 px-3 py-1.5 bg-navy-700/40 border border-navy-600/40 rounded text-[11px] text-amber-300">
                    New Session — retargeting picked up the visitor
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span className={`-ml-[19px] w-7 h-7 rounded-full ${node.color} border flex items-center justify-center bg-navy-900`}>
                    <Icon size={12} />
                  </span>
                  <div className="flex-1 bg-navy-900/40 border border-navy-700/40 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-white font-medium">{node.label}</div>
                      <div className="text-[11px] text-gray-500">{firstTime && t.time ? deltaSince(firstTime, t.time) : ''}</div>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{dateTime(t.time)}</div>
                    <RowDetails t={t} />
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

function RowDetails({ t }) {
  const props = t.properties || {}
  const lines = []
  if (t.kind === 'ad_click') {
    if (t.utm_source) lines.push(`utm_source=${t.utm_source}`)
    if (t.utm_campaign) lines.push(`utm_campaign=${t.utm_campaign}`)
    if (t.utm_content) lines.push(`utm_content=${t.utm_content}`)
    if (t.device || t.browser) lines.push(`${t.device || ''}${t.browser ? ' · ' + t.browser : ''}`)
  } else if (t.kind === 'page_view' && (t.page_url || t.utm_source)) {
    if (t.page_url) lines.push(t.page_url.replace(/^https?:\/\//, ''))
  } else if (t.kind === 'scroll_depth') {
    if (props.depth_pct) lines.push(`Scroll depth: ${props.depth_pct}%`)
    if (props.duration_sec) lines.push(`Time on page: ${Math.round(props.duration_sec / 60)} min`)
  } else if (t.kind === 'cta_click') {
    if (props.label) lines.push(`Label: ${props.label}`)
  } else if (t.kind === 'checkout_started') {
    if (props.provider) lines.push(`Provider: ${props.provider}`)
  } else if (t.kind === 'purchase') {
    if (props.order_id) lines.push(`Order ID: ${props.order_id}`)
    if (props.amount) lines.push(`Amount: ${inr(props.amount)}`)
    if (props.payment_method) lines.push(`Payment: ${props.payment_method}`)
  } else if (t.kind === 'bounce') {
    if (props.depth_pct) lines.push(`Left at ${props.depth_pct}% scroll`)
    lines.push('Session ended')
  }
  if (!lines.length) return null
  return (
    <div className="mt-1.5 text-[11px] text-gray-500 font-mono space-y-0.5">
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  )
}
