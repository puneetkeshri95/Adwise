import { useState } from 'react'
import { Sparkles, Download, Presentation, Layers, BarChart3, Users, FileText, ArrowRight } from 'lucide-react'
import { useApp } from '../contexts/AppContext.jsx'
import PresentationModal from '../components/PresentationModal.jsx'
import EmptyState from '../components/EmptyState.jsx'

const TEMPLATES = [
  {
    id: 'exec',
    name: 'Executive summary',
    description: 'A tight 4-slide overview: KPIs, trend, top posts and one insight.',
    slides: 4,
    icon: FileText,
  },
  {
    id: 'monthly',
    name: 'Monthly deep dive',
    description: 'Full breakdown across all channels — perfect for client reviews.',
    slides: 8,
    icon: BarChart3,
    recommended: true,
  },
  {
    id: 'audience',
    name: 'Audience & community',
    description: 'Focused on comments, sentiment and audience mix insights.',
    slides: 6,
    icon: Users,
  },
  {
    id: 'campaign',
    name: 'Campaign recap',
    description: 'Top posts, engagement peaks and platform winners in one deck.',
    slides: 5,
    icon: Layers,
  },
]

const RECENT = [
  { name: 'Sahajta_Connect_Report_2026-07-01.pptx', at: '8 days ago', slides: 7, scope: 'All platforms' },
  { name: 'Sahajta_Connect_Report_2026-06-22.pptx', at: '2 weeks ago', slides: 5, scope: 'Instagram only' },
  { name: 'Sahajta_Connect_Report_2026-06-15.pptx', at: '3 weeks ago', slides: 8, scope: 'All platforms' },
]

export default function Presentations() {
  const { connectedPlatforms } = useApp()
  const [open, setOpen] = useState(false)

  if (!connectedPlatforms.length) {
    return (
      <EmptyState
        title="Connect a channel to start generating"
        description="Presentations pull live data from your dashboard. Add at least one platform to unlock report generation."
        actionLabel="Go to Connectors"
        actionTo="/app/connectors"
      />
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-14">
      {/* Hero */}
      <div className="relative card overflow-hidden p-10">
        <div className="absolute inset-0 radial-brand opacity-70 pointer-events-none" />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <div>
            <div className="kicker kicker-accent mb-3">INSTANT .PPTX</div>
            <h2 className="display text-[38px] sm:text-[52px] text-primary leading-[1.02] tracking-[-0.03em]">
              Turn a month of data into a
              <em className="text-secondary"> board-ready deck.</em>
            </h2>
            <p className="text-secondary text-[14px] mt-4 max-w-lg leading-relaxed">
              Choose a template, pick your scope, and download a real PowerPoint file — generated 100% in your browser from the same numbers on your dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => setOpen(true)} className="btn btn-primary">
                <Sparkles size={14} /> Generate presentation
              </button>
              <a href="#templates" className="btn btn-ghost">Browse templates</a>
            </div>
          </div>

          {/* Slide preview stack */}
          <div className="relative hidden lg:flex justify-end h-[220px]">
            <SlidePreview offset={0} />
            <SlidePreview offset={-1} rotate={-3} />
            <SlidePreview offset={-2} rotate={3} />
          </div>
        </div>
      </div>

      {/* Templates */}
      <section id="templates">
        <div className="mb-6">
          <div className="kicker kicker-accent mb-2">TEMPLATES</div>
          <h3 className="display text-[32px] text-primary leading-none tracking-[-0.025em]">Start from a template</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {TEMPLATES.map(t => (
            <TemplateCard key={t.id} template={t} onUse={() => setOpen(true)} />
          ))}
        </div>
      </section>

      {/* Recent */}
      <section>
        <div className="mb-6">
          <div className="kicker kicker-accent mb-2">HISTORY</div>
          <h3 className="display text-[32px] text-primary leading-none tracking-[-0.025em]">Recent presentations</h3>
        </div>

        <div className="card divide-y divide-[color:var(--border-default)]">
          {RECENT.map(r => (
            <div key={r.name} className="flex items-center gap-4 px-5 py-4 hover:subtle-bg transition">
              <div className="w-10 h-10 rounded-xl subtle-bg border border-default flex items-center justify-center text-secondary">
                <Presentation size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-primary text-[13.5px] font-medium truncate">{r.name}</div>
                <div className="text-muted text-[11.5px]">{r.scope} <span className="opacity-50 mx-1">·</span> {r.slides} slides <span className="opacity-50 mx-1">·</span> {r.at}</div>
              </div>
              <button className="btn btn-ghost text-[11.5px] py-1.5" title="Download (demo)">
                <Download size={12} /> Download
              </button>
            </div>
          ))}
        </div>
      </section>

      {open && <PresentationModal onClose={() => setOpen(false)} />}
    </div>
  )
}

function TemplateCard({ template, onUse }) {
  const Icon = template.icon
  return (
    <div className="card card-hover p-5 relative">
      {template.recommended && (
        <div className="absolute top-4 right-4 chip chip-accent"><Sparkles size={9} /> Recommended</div>
      )}
      <div className="w-10 h-10 rounded-xl subtle-bg border border-default flex items-center justify-center text-secondary mb-4">
        <Icon size={18} strokeWidth={1.6} />
      </div>
      <div className="display text-[22px] text-primary leading-tight tracking-[-0.02em] mb-1.5">{template.name}</div>
      <p className="text-secondary text-[12.5px] leading-relaxed min-h-[40px]">{template.description}</p>
      <div className="mt-5 flex items-center justify-between pt-4 border-t border-default">
        <span className="kicker">{template.slides} slides</span>
        <button onClick={onUse} className="btn btn-ghost text-[11.5px] py-1.5">
          Use <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}

function SlidePreview({ offset = 0, rotate = 0 }) {
  return (
    <div
      className="absolute w-[380px] max-w-[85%] rounded-xl border border-strong shadow-lifted overflow-hidden elevated-bg"
      style={{
        transform: `translate(${offset * 24}px, ${Math.abs(offset) * 12}px) rotate(${rotate}deg)`,
        zIndex: 10 - Math.abs(offset),
        opacity: offset === 0 ? 1 : 0.7 - Math.abs(offset) * 0.15,
      }}
    >
      <div className="h-1" style={{ background: 'linear-gradient(90deg, #378ADD 0%, #8B5CF6 100%)' }} />
      <div className="p-5">
        <div className="kicker kicker-accent mb-2" style={{ fontSize: 9 }}>SAHAJTA · REPORT</div>
        <div className="display text-[20px] text-primary tracking-[-0.02em] mb-3 leading-tight">
          Cross-platform performance
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-1.5 rounded subtle-bg border border-default">
              <div className="kicker" style={{ fontSize: 7 }}>KPI {i}</div>
              <div className="display text-[14px] text-primary mt-0.5 leading-none">2.4M</div>
              <div className="text-[7px] text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">↑ 12.4%</div>
            </div>
          ))}
        </div>
        <div className="mt-3 h-14 rounded subtle-bg border border-default relative">
          <svg viewBox="0 0 120 40" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <path d="M0 30 L20 22 L40 25 L60 15 L80 18 L100 8 L120 12" stroke="#4A99FF" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  )
}
