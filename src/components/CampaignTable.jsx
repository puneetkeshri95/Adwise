import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { campaignData as sampleData } from '../data/sampleData'

function fmt(n) {
  if (n === '-' || n === undefined || n === null) return '–'
  if (typeof n === 'string') return n
  return Math.round(n).toLocaleString('en-IN')
}

function roasColor(r) {
  if (!r || r === 0 || r === '-' || r === '0.00' || r === '0') return 'text-red-400'
  const val = parseFloat(r)
  if (val >= 5) return 'text-green-400 font-medium'
  if (val >= 3) return 'text-amber-400'
  return 'text-red-400'
}

function computeMetrics(item) {
  const spend = item.spend || 0
  const impressions = item.impressions || 0
  const clicks = item.clicks || 0
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
  const ctr = impressions > 0 ? ((clicks / impressions) * 100) : 0
  return { cpm: Math.round(cpm), ctr: ctr.toFixed(1) }
}

function transformApiData(apiData, conversions = [], attrModel = 'linear') {
  if (!apiData || !apiData.length) return sampleData

  // 1. Compile ad metrics from conversions
  const adMetrics = {}
  if (conversions && conversions.length) {
    conversions.forEach((order) => {
      // The key is attribution_first_click, attribution_last_click, etc.
      const modelKey = `attribution_${attrModel}`
      const shares = order[modelKey] || {}
      const keys = Object.keys(shares)
      
      keys.forEach((key) => {
        const share = parseFloat(shares[key] || 0)
        if (share > 0) {
          if (!adMetrics[key]) {
            adMetrics[key] = { conversions: 0, revenue: 0, assisted: 0 }
          }
          adMetrics[key].conversions += share
          adMetrics[key].revenue += share * (order.amount || 0)
          
          // Assisted count: if there was more than 1 ad touchpoint in the conversion journey
          if (keys.length > 1) {
            adMetrics[key].assisted += 1
          }
        }
      })
    })
  }

  // 2. Map and aggregate campaign hierarchy
  return apiData.map((c) => {
    const cMetrics = computeMetrics(c)
    
    let cRevenue = 0
    let cConv = 0
    let cAssisted = 0

    const adSets = (c.ad_sets || []).map((as) => {
      const asMetrics = computeMetrics(as)
      
      let asRevenue = 0
      let asConv = 0
      let asAssisted = 0

      const ads = (as.ads || []).map((ad) => {
        const adMetricsData = adMetrics[ad.meta_ad_id] || { conversions: 0, revenue: 0, assisted: 0 }
        const adMetricsComputed = computeMetrics(ad)
        
        const adRevenue = adMetricsData.revenue
        const adConv = adMetricsData.conversions
        const adAssisted = adMetricsData.assisted
        const adSpend = ad.spend || 0
        const adRoas = adSpend > 0 ? (adRevenue / adSpend) : 0
        const adCpa = adConv > 0 ? (adSpend / adConv) : 0
        const adEpm = ad.impressions > 0 ? (adRevenue / ad.impressions) * 1000 : 0

        // Accumulate to adset
        asRevenue += adRevenue
        asConv += adConv
        asAssisted += adAssisted

        // Find first/last touch attribution counts
        let firstCount = 0
        let lastCount = 0
        let totalTouchPoints = 0
        let sumPosition = 0
        
        conversions.forEach(order => {
          const firstShares = order.attribution_first_click || {}
          const lastShares = order.attribution_last_click || {}
          
          if (firstShares[ad.meta_ad_id] > 0) firstCount++
          if (lastShares[ad.meta_ad_id] > 0) lastCount++
          
          const touchpoints = order.touchpoint_session_ids || []
          if (order.utm_content === ad.meta_ad_id) {
            totalTouchPoints++
            sumPosition += 1
          }
        })

        return {
          id: `ad-${ad.id}`,
          type: 'ad',
          meta_ad_id: ad.meta_ad_id,
          name: ad.name,
          status: ad.status === 'ACTIVE' ? 'on' : 'off',
          spend: ad.spend,
          revenue: adRevenue,
          roas: adRoas > 0 ? adRoas.toFixed(2) : '0.00',
          cpa: adCpa,
          conv: parseFloat(adConv.toFixed(2)),
          assisted: adAssisted,
          cpm: adMetricsComputed.cpm,
          ctr: adMetricsComputed.ctr,
          epm: Math.round(adEpm),
          first: firstCount > 0 ? `${firstCount} orders` : '–',
          last: lastCount > 0 ? `${lastCount} orders` : '–',
          avgPosition: totalTouchPoints > 0 ? (sumPosition / totalTouchPoints).toFixed(1) : '–',
        }
      })

      const asSpend = as.spend || 0
      const asRoas = asSpend > 0 ? (asRevenue / asSpend) : 0
      const asCpa = asConv > 0 ? (asSpend / asConv) : 0
      const asEpm = as.impressions > 0 ? (asRevenue / as.impressions) * 1000 : 0

      // Accumulate to campaign
      cRevenue += asRevenue
      cConv += asConv
      cAssisted += asAssisted

      return {
        id: `as-${as.id}`,
        type: 'adset',
        name: as.name,
        status: as.status === 'ACTIVE' ? 'on' : 'off',
        spend: as.spend,
        revenue: asRevenue,
        roas: asRoas > 0 ? asRoas.toFixed(2) : '0.00',
        cpa: asCpa,
        conv: parseFloat(asConv.toFixed(2)),
        assisted: asAssisted,
        cpm: asMetrics.cpm,
        ctr: asMetrics.ctr,
        epm: Math.round(asEpm),
        children: ads,
      }
    })

    const cSpend = c.spend || 0
    const cRoas = cSpend > 0 ? (cRevenue / cSpend) : 0
    const cCpa = cConv > 0 ? (cSpend / cConv) : 0
    const cEpm = c.impressions > 0 ? (cRevenue / c.impressions) * 1000 : 0

    return {
      id: `c-${c.id}`,
      type: 'campaign',
      name: c.name,
      status: c.status === 'ACTIVE' ? 'on' : 'off',
      spend: c.spend,
      revenue: cRevenue,
      roas: cRoas > 0 ? cRoas.toFixed(2) : '0.00',
      cpa: cCpa,
      conv: parseFloat(cConv.toFixed(2)),
      assisted: cAssisted,
      cpm: cMetrics.cpm,
      ctr: cMetrics.ctr,
      epm: Math.round(cEpm),
      budgetUsed: c.daily_budget > 0 ? Math.min(Math.round((c.spend / (c.daily_budget * 30)) * 100), 100) : 0,
      children: adSets,
    }
  })
}

function StatusBadge({ status }) {
  if (status === 'on') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-700/30">On</span>
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-700/30">Off</span>
}

function BudgetBar({ pct }) {
  if (!pct && pct !== 0) return null
  return (
    <div className="w-8 h-1.5 bg-navy-600 rounded-full overflow-hidden ml-1.5" title={`${pct}% budget used`}>
      <div
        className={`h-full rounded-full ${pct > 80 ? 'bg-amber-400' : 'bg-accent-blue'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function TableRow({ item, depth = 0, expanded, onToggle, onAdClick, highlightId }) {
  const hasChildren = item.children && item.children.length > 0
  const isOpen = expanded[item.id]
  const isHighlighted = highlightId === item.id

  const rowBg = item.type === 'adset'
    ? 'bg-navy-800/50'
    : item.type === 'ad'
    ? 'bg-navy-900/30'
    : ''

  return (
    <>
      <div
        className={`grid grid-cols-[280px_repeat(9,1fr)] items-center px-3 py-2 border-b border-navy-600/20 text-xs cursor-pointer hover:bg-navy-700/40 transition-colors ${rowBg} ${
          isHighlighted ? 'ring-1 ring-amber-500/50 bg-amber-900/10' : ''
        }`}
        onClick={() => {
          if (item.type === 'ad') {
            onAdClick(item)
          } else {
            onToggle(item.id)
          }
        }}
      >
        {/* Name */}
        <div className="flex items-center gap-1.5 overflow-hidden" style={{ paddingLeft: depth * 20 }}>
          {hasChildren ? (
            <ChevronRight
              size={12}
              className={`flex-shrink-0 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="w-3 flex-shrink-0" />
          )}
          <span className={`truncate max-w-[180px] ${item.type === 'campaign' ? 'font-medium text-white' : item.type === 'ad' ? 'text-gray-400 text-[11px]' : 'text-gray-300'}`}>
            {item.name}
          </span>
          <StatusBadge status={item.status} />
          {item.type === 'campaign' && <BudgetBar pct={item.budgetUsed} />}
        </div>
        <div className="text-right text-gray-300">₹{fmt(item.spend)}</div>
        <div className="text-right text-gray-300">₹{fmt(item.revenue)}</div>
        <div className={`text-right ${roasColor(item.roas)}`}>{item.roas && item.roas !== '0.00' ? item.roas + 'x' : '–'}</div>
        <div className="text-right text-gray-300">₹{fmt(item.cpa)}</div>
        <div className="text-right text-white font-medium">{item.conv > 0 ? item.conv : '–'}</div>
        <div className="text-right text-gray-500">{item.assisted > 0 ? item.assisted : '–'}</div>
        <div className="text-right text-gray-400">₹{fmt(item.cpm)}</div>
        <div className="text-right text-gray-400">{item.ctr}%</div>
        <div className="text-right text-gray-400">₹{fmt(item.epm)}</div>
      </div>

      {/* Ad-level extra row showing attribution */}
      {item.type === 'ad' && (
        <div
          className="grid grid-cols-[280px_repeat(9,1fr)] items-center px-3 py-1 border-b border-navy-600/10 text-[10px] bg-navy-900/20"
          style={{ paddingLeft: depth * 20 + 16 }}
        >
          <div className="text-gray-500 flex items-center gap-3" style={{ paddingLeft: depth * 20 }}>
            <span>First Touch Share: <span className="text-accent-blue font-medium">{item.first}</span></span>
            <span>Last Touch Share: <span className="text-green-400 font-medium">{item.last}</span></span>
            {item.avgPosition !== '–' && <span>Avg Click Position: <span className="text-gray-300">{item.avgPosition}</span></span>}
          </div>
        </div>
      )}

      {/* children */}
      {isOpen && hasChildren && item.children.map((child) => (
        <TableRow
          key={child.id}
          item={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onAdClick={onAdClick}
          highlightId={highlightId}
        />
      ))}
    </>
  )
}

export default function CampaignTable({ onAdClick, highlightId, data, conversions, attrModel }) {
  const [expanded, setExpanded] = useState({})
  const tableData = transformApiData(data, conversions, attrModel)

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[280px_repeat(9,1fr)] items-center px-3 py-2 bg-navy-700/50 border-b border-navy-600/30 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
        <div>Name</div>
        <div className="text-right">Spend</div>
        <div className="text-right">Revenue</div>
        <div className="text-right">ROAS</div>
        <div className="text-right">CPA</div>
        <div className="text-right">Conv.</div>
        <div className="text-right">Assisted</div>
        <div className="text-right">CPM</div>
        <div className="text-right">CTR</div>
        <div className="text-right">EPM</div>
      </div>

      {/* Rows */}
      {tableData.map((campaign) => (
        <TableRow
          key={campaign.id}
          item={campaign}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          onAdClick={onAdClick}
          highlightId={highlightId}
        />
      ))}
    </div>
  )
}
