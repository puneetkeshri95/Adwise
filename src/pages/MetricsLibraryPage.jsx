// Metrics Library — system + custom metrics, search, category filter, CRUD.
import { useEffect, useMemo, useState } from 'react'
import {
  Search, ArrowUpRight, ArrowDownRight, Minus, Plus, Pencil, Trash2, X, Sparkles,
} from 'lucide-react'
import {
  getMetricsLibrary, createCustomMetric, updateCustomMetric, deleteCustomMetric,
} from '../api'

const DIR_BADGE = {
  higher: { Icon: ArrowUpRight, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'Higher is better' },
  lower:  { Icon: ArrowDownRight, cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30', label: 'Lower is better' },
  neutral:{ Icon: Minus, cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30', label: 'Reference' },
}

export default function MetricsLibraryPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('All')
  const [editor, setEditor] = useState(null)   // null | {} | metricObj
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    getMetricsLibrary()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const categories = useMemo(() => {
    if (!data) return ['All']
    const seen = new Set(['All', ...data.categories])
    data.metrics.forEach(m => seen.add(m.category))
    return Array.from(seen)
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.metrics.filter(m => {
      if (activeCat !== 'All' && m.category !== activeCat) return false
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.formula || '').toLowerCase().includes(q)
      )
    })
  }, [data, search, activeCat])

  const grouped = useMemo(() => {
    const out = {}
    for (const m of filtered) {
      if (!out[m.category]) out[m.category] = []
      out[m.category].push(m)
    }
    return out
  }, [filtered])

  async function handleSave(payload) {
    setError('')
    try {
      if (editor?.id) await updateCustomMetric(editor.id, payload)
      else await createCustomMetric(payload)
      setEditor(null)
      load()
    } catch (e) {
      setError(e.message || 'Save failed')
    }
  }

  async function handleDelete(metric) {
    if (!confirm(`Delete custom metric "${metric.name}"?`)) return
    try {
      await deleteCustomMetric(metric.id)
      load()
    } catch (e) {
      alert(e.message || 'Delete failed')
    }
  }

  if (loading) return <div className="text-gray-400 p-4 animate-pulse">Loading metrics…</div>
  if (!data) return <div className="text-gray-400 p-4">Could not load metrics library.</div>

  return (
    <div className="space-y-5">
      {/* Header + search + new */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Metrics Library</h2>
          <p className="text-sm text-gray-400">
            {data.system_count} system metrics
            {data.custom_count > 0 && <> · <span className="text-violet-300">{data.custom_count} custom</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search metrics…"
              className="pl-7 pr-3 py-1.5 bg-navy-800 border border-navy-600/40 rounded-lg text-sm text-white placeholder-gray-500 w-64"
            />
          </div>
          <button
            onClick={() => setEditor({})}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg inline-flex items-center gap-1.5"
          >
            <Plus size={13} /> Create Custom Metric
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className={`px-2.5 py-1 rounded-full text-xs border ${
              activeCat === c ? 'bg-blue-500/20 text-blue-200 border-blue-500/40'
                              : 'bg-navy-800 text-gray-400 border-navy-600/40 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grouped sections */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-gray-500 text-sm">No metrics match this search.</div>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <section key={cat}>
            <div className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-2">{cat}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map(m => {
                const dir = DIR_BADGE[m.direction] || DIR_BADGE.neutral
                const Icon = dir.Icon
                return (
                  <div key={m.key} className="bg-navy-800 border border-navy-600/30 rounded-lg p-4 hover:border-blue-500/30 transition">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-white text-sm font-semibold truncate">{m.name}</h4>
                          {m.custom && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded inline-flex items-center gap-1">
                              <Sparkles size={8} /> CUSTOM
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">{m.short || m.key}</div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${dir.cls} shrink-0`} title={dir.label}>
                        <Icon size={9} />
                      </span>
                    </div>
                    <div className="bg-navy-900/40 border border-navy-700/40 rounded p-2 text-[11px] font-mono text-emerald-300 mb-2 break-words">
                      {m.formula || '—'}
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{m.description}</p>
                    {m.custom && (
                      <div className="flex items-center justify-end gap-1 mt-3">
                        <button
                          onClick={() => setEditor(m)}
                          className="p-1.5 text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="p-1.5 text-gray-400 hover:text-rose-300"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      {editor && (
        <MetricEditor
          metric={editor}
          allMetrics={data.metrics.filter(m => !editor.id || m.key !== editor.key)}
          error={error}
          onCancel={() => { setEditor(null); setError('') }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function MetricEditor({ metric, allMetrics, error, onCancel, onSave }) {
  const [name, setName] = useState(metric.name || '')
  const [formula, setFormula] = useState(metric.formula || '')
  const [description, setDescription] = useState(metric.description || '')
  const [direction, setDirection] = useState(metric.direction || 'higher')
  const [short, setShort] = useState(metric.short || '')

  function insertToken(tok) {
    setFormula(prev => (prev ? prev + ' ' + tok : tok))
  }

  function submit() {
    onSave({
      name: name.trim(),
      formula: formula.trim(),
      description: description.trim(),
      direction,
      short: (short || name).trim().slice(0, 40),
    })
  }

  const isEdit = !!metric.id

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-navy-800 border border-navy-600/40 rounded-xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-navy-700/40">
          <h3 className="text-white font-semibold">
            {isEdit ? `Edit custom metric — ${metric.name}` : 'Create custom metric'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Blended ROAS"
              className="w-full bg-navy-900 border border-navy-700/40 rounded px-3 py-2 text-sm text-white"
            />
          </Field>

          <Field label="Short label (for column headers)">
            <input
              value={short}
              onChange={(e) => setShort(e.target.value)}
              placeholder="Optional — defaults to name"
              className="w-full bg-navy-900 border border-navy-700/40 rounded px-3 py-2 text-sm text-white"
            />
          </Field>

          <Field label="Formula">
            <textarea
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="( total_revenue + 0 ) / total_spend"
              rows={3}
              className="w-full bg-navy-900 border border-navy-700/40 rounded px-3 py-2 text-sm text-emerald-300 font-mono"
            />
            <div className="flex gap-1 mt-2 flex-wrap">
              {['+', '-', '*', '/', '(', ')'].map(t => (
                <button key={t} type="button" onClick={() => insertToken(t)} className="px-2 py-1 text-xs bg-navy-700 hover:bg-navy-600 text-gray-300 rounded">
                  {t}
                </button>
              ))}
            </div>
            <details className="mt-2">
              <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">Insert from existing metrics ({allMetrics.length})</summary>
              <div className="mt-2 max-h-44 overflow-y-auto bg-navy-900/40 border border-navy-700/40 rounded p-2 grid grid-cols-2 gap-1">
                {allMetrics.map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => insertToken(m.key)}
                    className="text-left px-2 py-1 text-[11px] hover:bg-navy-700 rounded"
                    title={m.formula}
                  >
                    <span className="text-emerald-300 font-mono">{m.key}</span>
                    <span className="text-gray-500"> — {m.name}</span>
                  </button>
                ))}
              </div>
            </details>
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short explanation of what this measures."
              rows={2}
              className="w-full bg-navy-900 border border-navy-700/40 rounded px-3 py-2 text-sm text-white"
            />
          </Field>

          <Field label="Direction">
            <div className="flex gap-2">
              {[
                { v: 'higher', label: 'Higher is better' },
                { v: 'lower', label: 'Lower is better' },
                { v: 'neutral', label: 'Reference (no goal)' },
              ].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setDirection(opt.v)}
                  className={`flex-1 px-3 py-2 text-xs rounded border ${
                    direction === opt.v ? 'bg-blue-500/20 text-blue-200 border-blue-500/40'
                                        : 'bg-navy-900 text-gray-400 border-navy-700/40 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded p-2">{error}</div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-navy-700/40">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-300 hover:text-white">Cancel</button>
          <button
            onClick={submit}
            disabled={!name.trim() || !formula.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg"
          >
            {isEdit ? 'Save changes' : 'Create metric'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">{label}</div>
      {children}
    </div>
  )
}
