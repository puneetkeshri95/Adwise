import { useState } from 'react'
import { Info, Zap, Users, TrendingUp } from 'lucide-react'
import { PLATFORMS } from '../lib/platforms.js'
import { useApp } from '../contexts/AppContext.jsx'
import ConnectorCard from '../components/ConnectorCard.jsx'
import ConnectModal from '../components/ConnectModal.jsx'
import { compact } from '../lib/format.js'

export default function Connectors() {
  const [connectingId, setConnectingId] = useState(null)
  const { connectedPlatforms, connections } = useApp()

  const totalFollowers = Object.values(connections)
    .filter(c => c.account)
    .reduce((s, c) => s + (c.account.followers || 0), 0)

  const totalPosts = Object.values(connections)
    .filter(c => c.data)
    .reduce((s, c) => s + (c.data.summary.posts || 0), 0)

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      {/* Header stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Zap} label="Platforms connected" value={`${connectedPlatforms.length}`} suffix={` / ${PLATFORMS.length}`} />
        <StatCard icon={Users} label="Combined audience" value={compact(totalFollowers) || '0'} />
        <StatCard icon={TrendingUp} label="Posts indexed" value={compact(totalPosts) || '0'} />
      </div>

      {/* Info banner */}
      <div className="mb-8 flex items-start gap-3 p-4 rounded-xl border border-default subtle-bg">
        <Info size={16} className="text-brand-500 dark:text-brand-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-[13px] text-secondary leading-relaxed">
          <span className="text-primary font-medium">Demo mode.</span> No real accounts or credentials are used. Every connect simulates an OAuth handshake and populates the dashboard with realistic mock data so you can experience the full product flow.
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLATFORMS.map(p => (
          <ConnectorCard
            key={p.id}
            platformId={p.id}
            onConnect={(id) => setConnectingId(id)}
          />
        ))}
      </div>

      {connectingId && <ConnectModal platformId={connectingId} onClose={() => setConnectingId(null)} />}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, suffix }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className="kicker">{label}</div>
        <Icon size={15} strokeWidth={1.6} className="text-muted" />
      </div>
      <div className="display text-[40px] text-primary leading-none tabular-nums tracking-[-0.03em]">
        {value}{suffix && <span className="text-muted text-[26px]">{suffix}</span>}
      </div>
    </div>
  )
}
