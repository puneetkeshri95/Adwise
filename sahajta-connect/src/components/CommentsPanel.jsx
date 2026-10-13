import { Heart } from 'lucide-react'
import PlatformIcon from './PlatformIcon.jsx'
import { compact } from '../lib/format.js'

const SENTIMENT = {
  positive: { label: 'Positive', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  negative: { label: 'Negative', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25' },
  neutral: { label: 'Neutral', color: 'text-muted', bg: 'subtle-bg', border: 'border-default' },
}

export default function CommentsPanel({ comments, limit = 6 }) {
  return (
    <div className="card">
      <div className="px-6 py-5 border-b border-default">
        <div className="kicker mb-1.5">VOICE OF AUDIENCE</div>
        <div className="display text-[22px] text-primary leading-none tracking-[-0.02em]">Live comments</div>
        <div className="text-muted text-[12px] mt-1.5">Recent feedback, tagged by sentiment</div>
      </div>

      <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
        {comments.slice(0, limit).map(c => {
          const sent = SENTIMENT[c.sentiment] || SENTIMENT.neutral
          return (
            <div key={c.id} className="p-3.5 rounded-xl subtle-bg border border-default hover:border-strong transition">
              <div className="flex items-center gap-2.5 mb-2">
                <PlatformIcon id={c.platform} size={24} radius={8} />
                <div className="flex-1 min-w-0">
                  <div className="text-primary text-[12.5px] font-medium truncate">{c.author}</div>
                  <div className="text-muted text-[10.5px] truncate">on "{c.postCaption}"</div>
                </div>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${sent.color} ${sent.bg} ${sent.border} uppercase tracking-widest`}>
                  {sent.label}
                </span>
              </div>
              <p className="display text-[15px] text-primary italic leading-snug pl-9">
                "{c.text}"
              </p>
              <div className="flex items-center gap-3 mt-2 pl-9 text-muted text-[10.5px] tabular-nums">
                <span className="inline-flex items-center gap-1"><Heart size={10} /> {compact(c.likes)}</span>
                <span className="opacity-50">·</span>
                <span>{c.hoursAgo}h ago</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
