import { getPlatform } from '../lib/platforms.js'
import { GLYPHS } from './BrandGlyphs.jsx'

/**
 * Platform badge with the real brand glyph on a brand-colored tile.
 * For X (Twitter) we use the actual X logo, not the old bird.
 * Instagram gets the multi-hue gradient.
 */
export default function PlatformIcon({ id, size = 32, radius = 8, className = '', style = {} }) {
  const platform = getPlatform(id)
  if (!platform) return null

  const Glyph = GLYPHS[id]
  const isInstagram = id === 'instagram'
  const bg = isInstagram
    ? { background: platform.gradient }
    : { background: platform.color }

  const glyphSize = Math.round(size * 0.55)

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 relative overflow-hidden ${className}`}
      style={{ width: size, height: size, borderRadius: radius, ...bg, ...style }}
    >
      {/* Subtle sheen for that "app icon" feel */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 55%)',
          borderRadius: radius,
        }}
      />
      {Glyph ? <Glyph size={glyphSize} color="white" /> : null}
    </div>
  )
}
