// StatusBar — small pixel + webhook health indicators for the topbar.
// Reads /dashboard/overview health block. Click → Integration page.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleDot } from 'lucide-react'
import { getDashboardOverview } from '../api'
import { useDateRange } from '../contexts/DateRangeContext'

const COLOR_CLASS = {
  green: 'bg-emerald-400',
  amber: 'bg-amber-400',
  red: 'bg-rose-400',
  unknown: 'bg-slate-500',
}

function Dot({ status }) {
  return (
    <span className="relative inline-flex">
      <span className={`w-1.5 h-1.5 rounded-full ${COLOR_CLASS[status] || COLOR_CLASS.unknown}`} />
      {status === 'green' && (
        <span className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
      )}
    </span>
  )
}

export default function StatusBar() {
  const { isoStart, isoEnd } = useDateRange()
  const navigate = useNavigate()
  const [pixel, setPixel] = useState({ status: 'unknown', label: 'Loading…' })
  const [webhook, setWebhook] = useState({ status: 'unknown', label: 'Loading…' })

  useEffect(() => {
    let alive = true
    getDashboardOverview({ dateFrom: isoStart, dateTo: isoEnd, compare: false })
      .then(d => {
        if (!alive) return
        setPixel(d.health?.pixel || { status: 'unknown', label: 'No data' })
        setWebhook(d.health?.webhook || { status: 'unknown', label: 'No data' })
      })
      .catch(() => {
        if (!alive) return
        setPixel({ status: 'red', label: 'Error' })
        setWebhook({ status: 'red', label: 'Error' })
      })
    return () => { alive = false }
  }, [isoStart, isoEnd])

  return (
    <div className="flex items-center gap-4 text-xs">
      <button
        onClick={() => navigate('/app/integration')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition"
        title={`Pixel: ${pixel.label}`}
      >
        <Dot status={pixel.status} />
        <span>Pixel</span>
      </button>
      <button
        onClick={() => navigate('/app/integration')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition"
        title={`Webhook: ${webhook.label}`}
      >
        <Dot status={webhook.status} />
        <span>Webhook</span>
      </button>
    </div>
  )
}
