import { RefreshCw, Trash2, CheckCircle2, Loader2, Users, TrendingUp } from 'lucide-react'
import PlatformIcon from './PlatformIcon.jsx'
import { getPlatform } from '../lib/platforms.js'
import { compact, relativeTime } from '../lib/format.js'
import { useApp } from '../contexts/AppContext.jsx'

export default function ConnectorCard({ platformId, onConnect }) {
  const { connections, syncPlatform, disconnect } = useApp()
  const platform = getPlatform(platformId)
  const conn = connections[platformId]
  const isConnected = conn.status === 'connected' || conn.status === 'syncing'
  const isSyncing = conn.status === 'syncing'
  const isConnecting = conn.status === 'connecting'

  return (
    <div className="card card-hover relative overflow-hidden group">
      {/* Brand accent strip — subtle */}
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: platform.color, opacity: 0.6 }} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <PlatformIcon id={platformId} size={40} radius={12} />
            <div className="min-w-0 flex-1">
              <div className="text-primary text-[15px] font-medium leading-tight truncate" style={{ letterSpacing: '-0.015em' }}>
                {platform.name}
              </div>
              <div className="text-muted text-[11px] mt-0.5 truncate">{platform.accountKind}</div>
            </div>
          </div>
          <StatusBadge status={conn.status} />
        </div>

        {!isConnected && !isConnecting && (
          <>
            <p className="text-secondary text-[12.5px] mb-5 leading-relaxed min-h-[40px]">
              Connect your {platform.name} account to pull posts, engagement, reach and audience insights into your unified dashboard.
            </p>
            <button
              onClick={() => onConnect(platformId)}
              className="w-full btn btn-primary text-[12.5px] py-2"
            >
              Connect {platform.name}
            </button>
          </>
        )}

        {isConnecting && (
          <div className="py-4">
            <div className="flex items-center gap-2 text-brand-500 dark:text-brand-400 text-[13px]">
              <Loader2 size={14} className="animate-spin" />
              Opening secure sign-in…
            </div>
          </div>
        )}

        {isConnected && (
          <>
            {/* Account block */}
            <div className="p-3.5 rounded-xl subtle-bg border border-default mb-3">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-medium flex-shrink-0"
                  style={{ background: conn.account?.avatarColor || platform.color }}
                >
                  {(conn.account?.handle || '').replace('@', '').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-primary text-[13px] font-medium truncate">{conn.account?.handle}</div>
                    {conn.account?.verified && <CheckCircle2 size={11} className="text-brand-500 dark:text-brand-400" />}
                  </div>
                  <div className="text-muted text-[10.5px]">Last synced {relativeTime(conn.lastSyncedAt)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-default">
                <Stat label="Followers" value={compact(conn.account?.followers)} icon={Users} />
                <Stat label="Eng. rate" value={conn.data?.summary?.engagementRate ? `${conn.data.summary.engagementRate.toFixed(1)}%` : '—'} icon={TrendingUp} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => syncPlatform(platformId)}
                disabled={isSyncing}
                className="flex-1 btn btn-ghost text-[12px] py-1.5"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                onClick={() => disconnect(platformId)}
                className="btn btn-danger text-[12px] py-1.5 px-3"
                title="Disconnect"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="flex flex-col">
      <div className="kicker" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="display text-[18px] text-primary mt-1 leading-none tabular-nums">{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    disconnected: { label: 'Not connected', color: 'text-muted', dot: 'bg-muted opacity-60', border: 'border-default' },
    connecting: { label: 'Connecting', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500 animate-pulse', border: 'border-amber-500/30' },
    connected: { label: 'Connected', color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-500/30' },
    syncing: { label: 'Syncing', color: 'text-brand-500 dark:text-brand-400', dot: 'bg-brand-500 animate-pulse', border: 'border-brand-500/30' },
  }
  const m = map[status] || map.disconnected
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${m.border} subtle-bg flex-shrink-0 whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot} flex-shrink-0`} />
      <span className={`text-[10px] font-medium ${m.color}`}>{m.label}</span>
    </div>
  )
}
