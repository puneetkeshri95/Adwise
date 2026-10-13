import { Heart, MessageCircle, Share2, Eye } from 'lucide-react'
import PlatformIcon from './PlatformIcon.jsx'
import { compact, shortDate } from '../lib/format.js'
import { getPlatform } from '../lib/platforms.js'

export default function TopPostsPanel({ posts, limit = 6 }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between px-6 py-5 border-b border-default">
        <div>
          <div className="kicker mb-1.5">TOP PERFORMING POSTS</div>
          <div className="display text-[22px] text-primary leading-none tracking-[-0.02em]">Best of the period</div>
          <div className="text-muted text-[12px] mt-1.5">Ranked by views across selected platforms</div>
        </div>
        <span className="chip">{posts.length} posts</span>
      </div>

      <div className="divide-y divide-[color:var(--border-default)]">
        {posts.slice(0, limit).map((post, i) => (
          <PostRow key={post.id} post={post} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}

function PostRow({ post, rank }) {
  const platform = getPlatform(post.platform)
  return (
    <div className="flex items-center gap-4 px-6 py-4 group hover:subtle-bg transition">
      <div className="text-muted text-[11px] font-mono w-5 text-right tabular-nums">{String(rank).padStart(2, '0')}</div>

      {/* Thumbnail */}
      <div
        className="w-14 h-14 rounded-xl flex-shrink-0 relative overflow-hidden shadow-card"
        style={{
          background: `linear-gradient(135deg, ${post.thumbnailColor}CC, ${platform.color}66)`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <PlatformIcon id={post.platform} size={22} radius={7} className="opacity-90" />
        </div>
        <span className="absolute bottom-1 right-1 px-1 py-[1px] rounded bg-black/60 text-white text-[8px] font-mono uppercase tracking-wider">
          {post.type}
        </span>
      </div>

      {/* Text + meta */}
      <div className="flex-1 min-w-0">
        <div className="text-primary text-[13.5px] font-medium truncate" style={{ letterSpacing: '-0.005em' }}>{post.caption}</div>
        <div className="text-muted text-[11.5px] mt-0.5">{platform.name} <span className="mx-1 opacity-50">·</span> {shortDate(post.publishedAt)}</div>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-4 text-[12px]">
        <Stat icon={Eye} value={compact(post.views)} />
        <Stat icon={Heart} value={compact(post.likes)} />
        <Stat icon={MessageCircle} value={compact(post.comments)} />
        <Stat icon={Share2} value={compact(post.shares)} />
      </div>

      {/* Engagement rate */}
      <div className="w-[72px] text-right">
        <div className="display text-[20px] text-primary leading-none tabular-nums">
          {post.engagementRate.toFixed(1)}<span className="text-muted text-[14px]">%</span>
        </div>
        <div className="kicker mt-1" style={{ fontSize: 9 }}>ENG.</div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-1 text-secondary tabular-nums">
      <Icon size={12} strokeWidth={1.6} className="text-muted" />
      <span className="font-medium">{value}</span>
    </div>
  )
}
