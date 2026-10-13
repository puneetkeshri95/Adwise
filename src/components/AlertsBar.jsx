import { AlertTriangle } from 'lucide-react'
import { alerts as sampleAlerts } from '../data/sampleData'

function generateAlerts(campaigns) {
  if (!campaigns || !campaigns.length) return sampleAlerts
  const alerts = []
  // Scan all ads for zero-conversion high-spend
  campaigns.forEach((c) => {
    (c.ad_sets || []).forEach((as) => {
      (as.ads || []).forEach((ad) => {
        if (ad.spend > 2000 && ad.clicks > 0 && (!ad.conversions || ad.conversions === 0)) {
          alerts.push({
            id: `alert-ad-${ad.id}`,
            text: `Ad "${ad.name}" has spent ₹${Math.round(ad.spend).toLocaleString('en-IN')} with 0 conversions`,
            severity: 'high',
            adId: ad.id,
          })
        }
      })
    })
  })
  return alerts.length > 0 ? alerts : sampleAlerts
}

export default function AlertsBar({ onAlertClick, campaigns }) {
  const alerts = generateAlerts(campaigns)
  if (!alerts.length) return null
  return (
    <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-2.5 mb-4 flex items-start gap-2.5 text-amber-200 text-xs">
      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-400" />
      <div className="flex flex-wrap gap-x-1">
        {alerts.map((alert, i) => (
          <span key={alert.id}>
            <button
              onClick={() => onAlertClick(alert)}
              className="hover:underline hover:text-amber-100 transition"
            >
              <strong>{alert.text.split(' has ')[0].split(' ROAS')[0]}</strong>
              {' '}{alert.text.includes('has') ? 'has ' + alert.text.split('has ')[1] : 'ROAS' + alert.text.split('ROAS')[1]}
            </button>
            {i < alerts.length - 1 && <span className="text-amber-600 mx-1">·</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
