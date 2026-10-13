// Human-friendly formatting utilities.

export function compact(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1) + 'B'
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + 'M'
  if (abs >= 1_000) return (n / 1_000).toFixed(abs >= 10_000 ? 0 : 1) + 'K'
  return String(Math.round(n))
}

export function pct(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '—'
  return `${n >= 0 ? '' : ''}${n.toFixed(digits)}%`
}

export function num(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('en-IN')
}

export function relativeTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  return d.toLocaleDateString()
}

export function shortDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function deltaColor(delta, higherIsBetter = true) {
  if (delta == null) return 'text-muted'
  const positive = delta >= 0
  const good = higherIsBetter ? positive : !positive
  return good ? 'text-emerald-500' : 'text-red-400'
}
