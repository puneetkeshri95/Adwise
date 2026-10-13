import { useMemo, useState } from 'react'
import { Sparkles, Eye, Users2, Heart, FileText, Download } from 'lucide-react'
import { useApp } from '../contexts/AppContext.jsx'
import { aggregateData } from '../lib/mockData.js'
import { PLATFORMS, getPlatform } from '../lib/platforms.js'
import KPICard from '../components/KPICard.jsx'
import TimeSeriesChart from '../components/TimeSeriesChart.jsx'
import PlatformBarChart from '../components/PlatformBarChart.jsx'
import AudienceDonut from '../components/AudienceDonut.jsx'
import TopPostsPanel from '../components/TopPostsPanel.jsx'
import CommentsPanel from '../components/CommentsPanel.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PresentationModal from '../components/PresentationModal.jsx'
import PlatformIcon from '../components/PlatformIcon.jsx'

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 }

export default function Dashboard() {
  const { connectedPlatforms, connections, dateRange, setDateRange, activePlatformFilter, setActivePlatformFilter } = useApp()
  const [presentOpen, setPresentOpen] = useState(false)

  const connectedList = useMemo(
    () => connectedPlatforms.map(id => ({ platformId: id, data: connections[id].data, account: connections[id].account })).filter(x => x.data),
    [connectedPlatforms, connections]
  )

  // Filter by active platform
  const filteredList = useMemo(() => {
    if (activePlatformFilter === 'all') return connectedList
    return connectedList.filter(x => x.platformId === activePlatformFilter)
  }, [connectedList, activePlatformFilter])

  const aggregate = useMemo(() => {
    if (!filteredList.length) return null
    const days = RANGE_DAYS[dateRange] || 30
    const trimmed = filteredList.map(({ platformId, data, account }) => ({
      platformId, account,
      data: {
        ...data,
        timeSeries: data.timeSeries.slice(-days),
      },
    }))
    return aggregateData(trimmed.map(t => t.data))
  }, [filteredList, dateRange])

  const platformComparison = useMemo(() => {
    return connectedList.map(({ platformId, data }) => ({
      name: getPlatform(platformId).name,
      platformId,
      reach: data.summary.reach,
      engagement: data.summary.engagement,
      views: data.summary.views,
    }))
  }, [connectedList])

  const audienceMix = useMemo(() => {
    return connectedList.map(({ platformId, account }) => ({
      name: getPlatform(platformId).name,
      platformId,
      value: account.followers,
    }))
  }, [connectedList])

  if (!connectedPlatforms.length) {
    return (
      <EmptyState
        title="Connect your first channel"
        description="Sahajta Connect stitches together Instagram, Facebook, X and YouTube into a single, live dashboard — with an MCP connector that lets Claude query the data directly. Start by connecting one platform (or all four)."
        actionLabel="Go to Connectors"
        actionTo="/app/connectors"
      />
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-6">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <PlatformFilter
          active={activePlatformFilter}
          onChange={setActivePlatformFilter}
          connectedIds={connectedPlatforms}
        />

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 p-1 rounded-lg border border-default subtle-bg">
          {['7d', '30d', '90d'].map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition ${
                dateRange === r
                  ? 'panel-bg text-primary shadow-card'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Last {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPresentOpen(true)}
          className="btn btn-primary"
        >
          <Sparkles size={14} /> Generate presentation
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total views" value={aggregate.summary.views} delta={aggregate.deltas.views} tone="default" />
        <KPICard label="Total reach" value={aggregate.summary.reach} delta={aggregate.deltas.reach} tone="violet" />
        <KPICard label="Engagement" value={aggregate.summary.engagement} delta={aggregate.deltas.engagement} tone="emerald" hint={`${aggregate.summary.engagementRate?.toFixed(2) || '—'}% avg rate`} />
        <KPICard label="Posts published" value={aggregate.summary.posts} delta={aggregate.deltas.posts} tone="pink" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="kicker mb-1.5">TREND</div>
              <div className="display text-[22px] text-primary leading-none tracking-[-0.02em]">Views & reach over time</div>
              <div className="text-muted text-[12px] mt-1.5">Daily performance for the selected period</div>
            </div>
            <div className="flex items-center gap-3 text-[11.5px] text-secondary">
              <LegendDot color="#4A99FF" label="Views" />
              <LegendDot color="#8B5CF6" label="Reach" />
            </div>
          </div>
          <TimeSeriesChart data={aggregate.timeSeries} />
        </div>

        <div className="card p-6">
          <div className="mb-5">
            <div className="kicker mb-1.5">COMPARE</div>
            <div className="display text-[22px] text-primary leading-none tracking-[-0.02em]">Platform reach</div>
            <div className="text-muted text-[12px] mt-1.5">Reach across connected channels</div>
          </div>
          <PlatformBarChart data={platformComparison} dataKey="reach" />
        </div>
      </div>

      {/* Secondary charts + audience */}
      {connectedList.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-6 lg:col-span-2">
            <div className="mb-5">
              <div className="kicker mb-1.5">ENGAGEMENT</div>
              <div className="display text-[22px] text-primary leading-none tracking-[-0.02em]">By platform</div>
              <div className="text-muted text-[12px] mt-1.5">Likes, comments and shares combined</div>
            </div>
            <PlatformBarChart data={platformComparison} dataKey="engagement" />
          </div>
          <div className="card p-6">
            <div className="mb-5">
              <div className="kicker mb-1.5">AUDIENCE</div>
              <div className="display text-[22px] text-primary leading-none tracking-[-0.02em]">Follower mix</div>
              <div className="text-muted text-[12px] mt-1.5">Share across platforms</div>
            </div>
            <AudienceDonut data={audienceMix} />
          </div>
        </div>
      )}

      {/* Top posts + comments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TopPostsPanel posts={aggregate.posts} />
        </div>
        <CommentsPanel comments={aggregate.comments} />
      </div>

      {presentOpen && <PresentationModal onClose={() => setPresentOpen(false)} />}
    </div>
  )
}

function PlatformFilter({ active, onChange, connectedIds }) {
  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg border border-default subtle-bg">
      <button
        onClick={() => onChange('all')}
        className={`px-3 py-1 rounded-md text-[12px] font-medium transition ${
          active === 'all' ? 'panel-bg text-primary shadow-card' : 'text-secondary hover:text-primary'
        }`}
      >
        All platforms
      </button>
      {PLATFORMS.filter(p => connectedIds.includes(p.id)).map(p => {
        const isActive = active === p.id
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`px-2 py-1 rounded-md text-[12px] font-medium transition inline-flex items-center gap-1.5 ${
              isActive ? 'panel-bg text-primary shadow-card' : 'text-secondary hover:text-primary'
            }`}
          >
            <PlatformIcon id={p.id} size={16} radius={4} />
            {p.name.split(' ')[0]}
          </button>
        )
      })}
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
