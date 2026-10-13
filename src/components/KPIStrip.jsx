import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { kpiData as sampleKpis } from '../data/sampleData'

function formatINR(n) {
  if (typeof n !== 'number') return '–'
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function buildKpiCards(live) {
  if (!live) return sampleKpis
  return [
    { label: 'Revenue', value: formatINR(live.revenue), delta: live.revenue_change ? `${live.revenue_change > 0 ? '↑' : '↓'} ${Math.abs(live.revenue_change)}%` : '–', deltaLabel: 'vs last period', up: live.revenue_change >= 0, sparkline: sampleKpis[0].sparkline },
    { label: 'Ad Spend', value: formatINR(live.ad_spend), delta: live.spend_change ? `${live.spend_change > 0 ? '↑' : '↓'} ${Math.abs(live.spend_change)}%` : '–', deltaLabel: 'vs last period', up: live.spend_change <= 0, sparkline: sampleKpis[1].sparkline },
    { label: 'ROAS', value: live.roas + 'x', delta: live.roas_change ? `${live.roas_change > 0 ? '↑' : '↓'} ${Math.abs(live.roas_change)}x` : '–', deltaLabel: 'vs last period', up: live.roas_change >= 0, sparkline: sampleKpis[2].sparkline },
    { label: 'CPA', value: formatINR(live.cpa), delta: live.cpa_change ? `${live.cpa_change > 0 ? '↑' : '↓'} ${Math.abs(live.cpa_change)}%` : '–', deltaLabel: 'vs last period', up: live.cpa_change <= 0, sparkline: sampleKpis[3].sparkline },
    { label: 'Conversions', value: String(live.conversions), delta: live.conversions_change ? `${live.conversions_change > 0 ? '↑' : '↓'} ${Math.abs(live.conversions_change)}` : '–', deltaLabel: 'vs last period', up: live.conversions_change >= 0, sparkline: sampleKpis[4].sparkline },
    { label: 'Unique Visitors', value: live.visitors.toLocaleString('en-IN'), delta: live.visitors_change ? `${live.visitors_change > 0 ? '↑' : '↓'} ${Math.abs(live.visitors_change)}%` : '–', deltaLabel: 'vs last period', up: live.visitors_change >= 0, sparkline: sampleKpis[5].sparkline },
  ]
}

export default function KPIStrip({ data }) {
  const kpiCards = buildKpiCards(data)
  return (
    <div className="grid grid-cols-6 gap-3 mb-4">
      {kpiCards.map((kpi) => {
        const chartData = kpi.sparkline.map((v, i) => ({ v, i }))
        return (
          <div
            key={kpi.label}
            className="bg-navy-800 border border-navy-600/40 rounded-xl p-3.5 hover:border-navy-500/60 transition"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">
                {kpi.label}
              </span>
              <div className="w-10 h-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`grad-${kpi.label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={kpi.up ? '#4ADE80' : '#F87171'} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={kpi.up ? '#4ADE80' : '#F87171'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={kpi.up ? '#4ADE80' : '#F87171'}
                      strokeWidth={1.5}
                      fill={`url(#grad-${kpi.label})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={`text-xl font-semibold ${kpi.label === 'ROAS' ? 'text-accent-green' : 'text-white'}`}>
              {kpi.value}
            </div>
            <div className={`text-[11px] mt-1 ${kpi.up ? 'text-green-400' : 'text-red-400'}`}>
              {kpi.delta} <span className="text-gray-500">{kpi.deltaLabel}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
