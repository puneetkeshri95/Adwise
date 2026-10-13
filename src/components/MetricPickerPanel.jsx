// Shared "+ Add Metric" / "Columns" picker — used by Dashboard and Reporting.
// Pulls the live Metrics Library (system + per-tenant custom metrics) and
// lets the user check which ones to display. Selection state lives in the
// parent component and is persisted to localStorage per surface.
import { useEffect, useMemo, useState } from 'react'
import { X, Search, Plus, Sparkles, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { getMetricsLibrary } from '../api'

const DIR_ICON = { higher: ArrowUpRight, lower: ArrowDownRight, neutral: Minus }
const DIR_COLOR = {
  higher: 'text-emerald-300',
  lower: 'text-blue-300',
  neutral: 'text-slate-400',
}

export default function MetricPickerPanel({
  open,
  onClose,
  selected = [],
  onChange,
  title = 'Add metrics',
  subtitle = 'Pick from the Metrics Library — system + your custom metrics.',
  onCreateCustom,
  excludeKeys = [],   // keys already shown as default (greyed out)
}) {
  const [library, setLibrary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getMetricsLibrary()
      .then(setLibrary)
      .catch(() => setLibrary(null))
      .finally(() => setLoading(false))
  }, [open])

  const cats = useMemo(() => {
    if (!library) return ['All']
    const set = new Set(['All', ...library.categories])
    library.metrics.forEach(m => set.add(m.category))
    return Array.from(set)
  }, [library])

  const filtered = useMemo(() => {
    if (!library) return []
    const q = search.trim().toLowerCase()
    return library.metrics.filter(m => {
      if (cat !== 'All' && m.category !== cat) return false
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        (m.short || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      )
    })
  }, [library, search, cat])

  const grouped = useMemo(() => {
    const out = {}
    for (const m of filtered) {
      if (!out[m.category]) out[m.category] = []
      out[m.category].push(m)
    }
    return out
  }, [filtered])

  function toggle(key) {
    if (selected.includes(key)) onChange(selected.filter(k => k !== key))
    else onChange([...selected, key])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Slide-in panel */}
      <aside className="absolute top-0 right-0 h-full w-full max-w-md bg-navy-800 border-l border-navy-700/40 shadow-2xl flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-navy-700/40">
          <div>
            <h3 className="text-white text-sm font-semibold">{title}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5">
            <X size={16} />
          </button>
        </header>

        <div className="px-5 py-3 border-b border-navy-700/40 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search metrics…"
              className="w-full pl-7 pr-3 py-1.5 bg-navy-900 border border-navy-700/40 rounded-lg text-sm text-white placeholder-gray-500"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {cats.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-2 py-0.5 rounded-full text-[11px] border ${
                  cat === c ? 'bg-blue-500/20 text-blue-200 border-blue-500/40'
                            : 'bg-navy-900 text-gray-400 border-navy-700/40 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {onCreateCustom && (
            <button
              onClick={onCreateCustom}
              className="w-full text-xs px-3 py-2 bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 rounded-lg inline-flex items-center gap-1.5 justify-center"
            >
              <Plus size={11} /> Create custom metric
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && <div className="text-gray-400 text-sm animate-pulse">Loading library…</div>}
          {!loading && !library && <div className="text-rose-300 text-sm">Could not load metrics library.</div>}
          {!loading && library && Object.keys(grouped).length === 0 && (
            <div className="text-gray-500 text-sm">No metrics match this search.</div>
          )}
          {!loading && library && Object.entries(grouped).map(([catName, list]) => (
            <section key={catName} className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">{catName}</div>
              <ul className="space-y-1">
                {list.map(m => {
                  const Icon = DIR_ICON[m.direction] || Minus
                  const checked = selected.includes(m.key)
                  const excluded = excludeKeys.includes(m.key)
                  return (
                    <li key={m.key}>
                      <label className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition ${
                        excluded ? 'opacity-50 cursor-not-allowed' : checked ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-navy-900/60'
                      }`}>
                        <input
                          type="checkbox"
                          disabled={excluded}
                          checked={checked || excluded}
                          onChange={() => !excluded && toggle(m.key)}
                          className="mt-0.5 accent-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white text-sm truncate">{m.name}</span>
                            <Icon size={11} className={DIR_COLOR[m.direction] || 'text-slate-400'} />
                            {m.custom && (
                              <span className="text-[9px] px-1 py-0.5 bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded inline-flex items-center gap-0.5">
                                <Sparkles size={7} /> CUSTOM
                              </span>
                            )}
                            {excluded && (
                              <span className="text-[9px] text-gray-500 ml-auto">Already shown</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">{m.description || m.formula}</div>
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>

        <footer className="px-5 py-3 border-t border-navy-700/40 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">{selected.length} selected</span>
          <button onClick={onClose} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">Done</button>
        </footer>
      </aside>
    </div>
  )
}
