import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Zap, Presentation, Bot, ShieldCheck, CheckCircle2, Play, ArrowUpRight } from 'lucide-react'
import PlatformIcon from '../components/PlatformIcon.jsx'
import { PLATFORMS } from '../lib/platforms.js'

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-x-hidden app-bg text-primary">
      {/* Background layers — subtle, editorial */}
      <div className="absolute inset-0 grid-backdrop pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[720px] pointer-events-none">
        <div className="absolute top-[-260px] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full opacity-70"
             style={{ background: 'radial-gradient(circle, rgba(55,138,221,0.16) 0%, transparent 55%)' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-primary font-medium text-[15px]" style={{ letterSpacing: '-0.02em' }}>
            Sahajta<span className="opacity-40 mx-1.5">/</span>Connect
          </span>
        </div>
        <div className="flex items-center gap-5 text-[13px]">
          <a href="#features" className="text-secondary hover:text-primary transition hidden sm:inline">Features</a>
          <a href="#mcp" className="text-secondary hover:text-primary transition hidden sm:inline">MCP connector</a>
          <a href="#footer" className="text-secondary hover:text-primary transition hidden sm:inline">About</a>
          <Link to="/app/connectors" className="btn btn-primary text-[12px] px-3.5 py-1.5">
            Launch app <ArrowUpRight size={13} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 mb-8">
          <span className="chip chip-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            MCP connector · Claude ready
          </span>
        </div>

        <h1 className="display text-[54px] sm:text-[80px] md:text-[96px] text-primary leading-[0.98] max-w-4xl mx-auto mb-8" style={{ letterSpacing: '-0.03em' }}>
          Every social channel.
          <br />
          <em className="text-secondary">One quiet</em> dashboard.
        </h1>

        <p className="text-secondary text-[16px] sm:text-[17px] max-w-xl mx-auto mb-10 leading-relaxed">
          Connect Instagram, Facebook, X and YouTube. Get unified analytics, top posts and audience insight — then let Claude turn any question into a slide-ready answer through the Sahajta MCP connector.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <Link to="/app/connectors" className="btn btn-primary text-[13px] px-5 py-2.5">
            Launch demo dashboard <ArrowRight size={14} />
          </Link>
          <a href="#features" className="btn btn-ghost text-[13px] px-5 py-2.5">
            <Play size={13} /> See features
          </a>
        </div>

        {/* Platform ring */}
        <div className="flex items-center justify-center gap-4 mb-16">
          {PLATFORMS.map(p => (
            <div key={p.id} className="group relative">
              <PlatformIcon id={p.id} size={44} radius={14} className="shadow-card transition group-hover:-translate-y-0.5" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-0.5 rounded text-[10px] font-mono text-muted opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                {p.name}
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard mockup */}
        <div className="relative max-w-5xl mx-auto">
          <div className="absolute -inset-6 rounded-3xl opacity-60" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(55,138,221,0.20) 0%, transparent 70%)' }} />
          <div className="relative border border-strong rounded-2xl overflow-hidden shadow-lifted elevated-bg">
            <MockDashboardPreview />
          </div>
        </div>
      </header>

      {/* Trust bar */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-14 flex flex-col items-center gap-4">
        <div className="kicker">Built for advertising teams who ship</div>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
          {['Studio Kavya', 'Northlight Homes', 'Verdant Kitchen', 'Paper Kite Co.', 'Moksha Creative'].map(x => (
            <span key={x} className="display text-[22px] text-secondary italic">{x}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-24 border-t border-default">
        <div className="mb-14 max-w-3xl">
          <div className="kicker kicker-accent mb-3">FEATURES</div>
          <h2 className="display text-[44px] sm:text-[56px] text-primary leading-[1.02]" style={{ letterSpacing: '-0.03em' }}>
            Everything you need to
            <em className="text-secondary"> understand your reach.</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Feature n="01" icon={Zap} title="One-click connect" desc="Simulated OAuth for Instagram, Facebook, X and YouTube. Add all four in under a minute." />
          <Feature n="02" icon={Sparkles} title="Unified analytics" desc="Aggregated KPIs, trends, top posts, comments and audience mix — all in one dashboard." />
          <Feature n="03" icon={Presentation} title="Slides in a click" desc="Generate a real .pptx from your live data using pptxgenjs, right in the browser." />
          <Feature n="04" icon={Bot} title="Claude, connected" desc="Expose six typed tools to Claude via MCP. Ask questions, get grounded answers." />
          <Feature n="05" icon={ShieldCheck} title="Zero secrets in code" desc="Demo mode uses no real credentials. Perfect for stakeholder walk-throughs." />
          <Feature n="06" icon={CheckCircle2} title="Made for demos" desc="Realistic mock data, plausible numbers, smooth loading states — feels like a real product." />
        </div>
      </section>

      {/* MCP callout */}
      <section id="mcp" className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="card p-8 lg:p-14 relative overflow-hidden">
          <div className="absolute inset-0 radial-brand pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div>
              <div className="kicker kicker-accent mb-3">MCP · CLAUDE</div>
              <h3 className="display text-[36px] sm:text-[46px] text-primary leading-[1.02] mb-4" style={{ letterSpacing: '-0.03em' }}>
                Your analytics,<br />
                <em className="text-secondary">at Claude's fingertips.</em>
              </h3>
              <p className="text-secondary text-[15px] leading-relaxed mb-6 max-w-lg">
                The Sahajta Connect MCP server exposes a small library of typed tools — <span className="font-mono text-primary text-[13px]">get_top_posts</span>, <span className="font-mono text-primary text-[13px]">get_engagement_summary</span>, <span className="font-mono text-primary text-[13px]">generate_presentation</span> and more. Point Claude Desktop at it and start asking questions in plain English.
              </p>
              <div className="flex gap-2">
                <Link to="/app/mcp" className="btn btn-primary">See the diagram <ArrowRight size={13} /></Link>
                <Link to="/app/dashboard" className="btn btn-ghost">Open dashboard</Link>
              </div>
            </div>

            <div className="rounded-xl subtle-bg border border-default p-5 relative overflow-hidden">
              <div className="kicker mb-3">Claude · via MCP</div>
              <div className="space-y-2.5">
                <ChatBubble kind="user">Summarize my Instagram performance this month.</ChatBubble>
                <ChatBubble kind="assistant">
                  Calling <code className="font-mono text-[11.5px] text-brand-500 dark:text-brand-400">get_engagement_summary("last_30d")</code>… Views up <b className="text-emerald-600 dark:text-emerald-400">+12.4%</b> vs last month. Top post: <em>Weekend recap 🌿</em> at 184K views. Engagement rate <b className="text-primary">6.7%</b>.
                </ChatBubble>
                <ChatBubble kind="user">Make me a 6-slide deck of the highlights.</ChatBubble>
                <ChatBubble kind="assistant">
                  Generating via <code className="font-mono text-[11.5px] text-brand-500 dark:text-brand-400">generate_presentation()</code>… ready in 3s.
                </ChatBubble>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-28 text-center">
        <h2 className="display text-[52px] sm:text-[72px] text-primary leading-[1.0] mb-6" style={{ letterSpacing: '-0.03em' }}>
          Ready to see it live?
        </h2>
        <p className="text-secondary text-[16px] mb-10 max-w-md mx-auto">
          The whole demo runs in your browser. No signup, no API keys, no risk.
        </p>
        <Link to="/app/connectors" className="btn btn-primary text-[13px] px-6 py-3">
          Launch Sahajta Connect <ArrowRight size={14} />
        </Link>
      </section>

      <footer id="footer" className="relative z-10 border-t border-default py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-muted text-[12px]">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-secondary">© Sahajta Connect · Concept demo · 2026</span>
          </div>
          <div className="kicker">Made for advertising clients</div>
        </div>
      </footer>
    </div>
  )
}

function LogoMark() {
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center relative overflow-hidden" style={{ background: '#111' }}>
      <div className="absolute inset-0 opacity-90" style={{ background: 'linear-gradient(135deg, #4A99FF 0%, #8B5CF6 100%)' }} />
      <Zap size={13} strokeWidth={2.5} className="relative text-white" />
    </div>
  )
}

function Feature({ n, icon: Icon, title, desc }) {
  return (
    <div className="p-6 rounded-2xl border border-default subtle-bg card-hover group">
      <div className="flex items-center justify-between mb-6">
        <span className="kicker">{n}</span>
        <Icon size={17} strokeWidth={1.6} className="text-muted group-hover:text-brand-500 dark:group-hover:text-brand-400 transition" />
      </div>
      <div className="display text-[26px] text-primary leading-[1.05] mb-2">{title}</div>
      <div className="text-secondary text-[13.5px] leading-relaxed">{desc}</div>
    </div>
  )
}

function ChatBubble({ kind, children }) {
  const isUser = kind === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
          isUser ? 'rounded-tr-md' : 'elevated-bg border border-default rounded-tl-md text-secondary'
        }`}
        style={isUser ? { background: 'var(--text-primary)', color: 'var(--bg-panel)' } : {}}
      >
        {children}
      </div>
    </div>
  )
}

function MockDashboardPreview() {
  return (
    <div className="grid grid-cols-[180px_1fr]">
      {/* Sidebar */}
      <div className="p-3 border-r border-default subtle-bg space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-5 h-5 rounded" style={{ background: 'linear-gradient(135deg, #4A99FF 0%, #8B5CF6 100%)' }} />
          <div className="text-primary text-[11px] font-medium">Sahajta Connect</div>
        </div>
        {['Dashboard', 'Connectors', 'MCP Integration', 'Presentations', 'Settings'].map((l, i) => (
          <div key={l} className={`px-2 py-1.5 rounded text-[10.5px] ${i === 0 ? 'bg-brand-500/10 text-brand-500 dark:text-brand-400' : 'text-muted'}`}>
            {l}
          </div>
        ))}
      </div>
      {/* Main */}
      <div className="p-4 space-y-3 panel-bg">
        <div className="grid grid-cols-4 gap-2">
          {[['Views','2.4M','+12.4%'],['Reach','1.6M','+9.2%'],['Engagement','254K','+5.8%'],['Posts','128','+3.1%']].map(([label,val,delta]) => (
            <div key={label} className="p-2.5 rounded-lg subtle-bg border border-default">
              <div className="kicker" style={{ fontSize: 8.5, letterSpacing: '0.12em' }}>{label}</div>
              <div className="display text-[22px] text-primary mt-1 leading-none">{val}</div>
              <div className="text-emerald-600 dark:text-emerald-400 text-[9.5px] mt-1 tabular-nums">↑ {delta.replace('+','')}</div>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg subtle-bg border border-default h-24 relative">
          <svg viewBox="0 0 400 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lgArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#4A99FF" stopOpacity="0.45" />
                <stop offset="1" stopColor="#4A99FF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 80 L40 60 L80 65 L120 45 L160 50 L200 30 L240 45 L280 25 L320 35 L360 15 L400 22 L400 100 L0 100Z" fill="url(#lgArea)" />
            <path d="M0 80 L40 60 L80 65 L120 45 L160 50 L200 30 L240 45 L280 25 L320 35 L360 15 L400 22" stroke="#4A99FF" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="p-2 rounded-lg subtle-bg border border-default">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-3 h-3 rounded-sm" style={{ background: PLATFORMS[i-1].color }} />
                <div className="text-[9.5px] text-primary">{PLATFORMS[i-1].name}</div>
              </div>
              <div className="text-[11px] text-primary font-medium tabular-nums">{['1.2M','892K','520K'][i-1]}</div>
              <div className="text-[8.5px] text-muted">reach · 30d</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
