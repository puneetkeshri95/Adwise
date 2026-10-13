import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PlatformIcon from './PlatformIcon.jsx'
import { PLATFORMS } from '../lib/platforms.js'

export default function EmptyState({ title, description, actionLabel, actionTo, showPlatforms = true }) {
  return (
    <div className="mx-auto max-w-2xl text-center py-24 px-6">
      {/* Editorial platform arrangement */}
      {showPlatforms && (
        <div className="flex items-center justify-center gap-3 mb-10">
          {PLATFORMS.map((p, i) => (
            <div
              key={p.id}
              className="transition"
              style={{
                animation: `fade-in-up 0.5s ${i * 120}ms both`,
              }}
            >
              <PlatformIcon id={p.id} size={44} radius={14} className="shadow-card" />
            </div>
          ))}
        </div>
      )}

      <div className="kicker kicker-accent mb-4">GET STARTED</div>

      <h2 className="display text-[44px] sm:text-[54px] text-primary leading-[1.02] tracking-[-0.03em] mb-4">
        {title}
      </h2>
      <p className="text-secondary text-[15px] leading-relaxed mb-8 max-w-lg mx-auto">
        {description}
      </p>

      {actionTo && (
        <Link to={actionTo} className="btn btn-primary text-[13px] px-5 py-2.5">
          {actionLabel}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}
