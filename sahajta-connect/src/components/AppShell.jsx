import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Plug, Sparkles, Presentation, Settings as SettingsIcon, Zap, ArrowUpRight } from 'lucide-react'
import Topbar from './Topbar.jsx'
import { useApp } from '../contexts/AppContext.jsx'

const NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/connectors', icon: Plug, label: 'Connectors' },
  { to: '/app/mcp', icon: Sparkles, label: 'MCP Integration' },
  { to: '/app/presentations', icon: Presentation, label: 'Presentations' },
  { to: '/app/settings', icon: SettingsIcon, label: 'Settings' },
]

export default function AppShell() {
  const { connectedPlatforms } = useApp()
  const location = useLocation()

  return (
    <div className="min-h-screen flex app-bg text-primary">
      <Sidebar connectedCount={connectedPlatforms.length} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div key={location.pathname} className="animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function Sidebar({ connectedCount }) {
  return (
    <aside className="w-[248px] flex-shrink-0 border-r border-default panel-bg flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center relative overflow-hidden" style={{ background: '#111' }}>
          <div className="absolute inset-0 opacity-90" style={{ background: 'linear-gradient(135deg, #4A99FF 0%, #8B5CF6 100%)' }} />
          <Zap size={13} strokeWidth={2.5} className="relative text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-primary font-medium text-[14.5px]" style={{ letterSpacing: '-0.02em' }}>
            Sahajta<span className="opacity-40 mx-1">/</span>Connect
          </span>
          <span className="kicker" style={{ fontSize: 9, letterSpacing: '0.18em' }}>v1.0 · demo</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        <div className="px-2 mb-2 kicker" style={{ fontSize: 10 }}>Workspace</div>
        {NAV.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all ${
                  isActive
                    ? 'subtle-bg text-primary font-medium'
                    : 'text-secondary hover:subtle-bg hover:text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} strokeWidth={isActive ? 2 : 1.6} className={isActive ? 'text-brand-500 dark:text-brand-400' : ''} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <span className="w-1 h-1 rounded-full bg-brand-500 dark:bg-brand-400" />}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Status footer */}
      <div className="p-3 space-y-2.5">
        <div className="p-3 rounded-xl subtle-bg border border-default">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connectedCount > 0 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-amber-500'} animate-pulse`} />
            <span className="kicker" style={{ fontSize: 9.5 }}>
              {connectedCount > 0 ? 'Live sync' : 'No platforms'}
            </span>
          </div>
          <div className="display text-[22px] text-primary leading-none mb-2">
            {connectedCount}<span className="text-muted"> / 4</span>
          </div>
          <div className="h-[3px] subtle-bg rounded-full overflow-hidden" style={{ background: 'var(--bg-inset)' }}>
            <div
              className="h-full transition-all"
              style={{
                width: `${(connectedCount / 4) * 100}%`,
                background: 'linear-gradient(90deg, #378ADD 0%, #8B5CF6 100%)',
              }}
            />
          </div>
          <div className="text-muted text-[10.5px] mt-2">Platforms connected</div>
        </div>
        <div className="px-2 text-[10.5px] text-muted flex items-center justify-between">
          <span>© Sahajta</span>
          <a href="/" className="text-secondary hover:text-primary inline-flex items-center gap-0.5 transition">
            About <ArrowUpRight size={9} />
          </a>
        </div>
      </div>
    </aside>
  )
}
