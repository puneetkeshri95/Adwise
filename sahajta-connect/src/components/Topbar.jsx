import { useLocation, useNavigate } from 'react-router-dom'
import { Moon, Sun, RefreshCw, Sparkles, Bell, Search } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext.jsx'
import { useApp } from '../contexts/AppContext.jsx'

const TITLES = {
  '/app/dashboard': { title: 'Dashboard', sub: 'Unified analytics across your connected social channels' },
  '/app/connectors': { title: 'Connectors', sub: 'Link Instagram, Facebook, X and YouTube to power your dashboard' },
  '/app/mcp': { title: 'MCP Integration', sub: 'Read-only access for Claude and other MCP-aware clients.' },
  '/app/presentations': { title: 'Presentations', sub: 'Generate a polished .pptx from your live data in seconds' },
  '/app/settings': { title: 'Settings', sub: 'Workspace preferences, appearance, and platform API usage' },
}

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { syncAll, connectedPlatforms } = useApp()

  const meta = TITLES[location.pathname] || { title: 'Sahajta Connect', sub: '' }

  return (
    <header className="sticky top-0 z-30 panel-bg border-b border-default">
      <div className="px-8 py-5 flex items-center gap-5">
        <div className="flex-1 min-w-0">
          <h1 className="display text-[28px] text-primary leading-none" style={{ letterSpacing: '-0.025em' }}>
            {meta.title}
          </h1>
          <p className="text-muted text-[12.5px] mt-1 truncate">{meta.sub}</p>
        </div>

        <button
          onClick={() => navigate('/app/mcp')}
          className="hidden md:inline-flex chip chip-accent hover:brightness-105 transition cursor-pointer"
          title="Learn about the MCP integration"
        >
          <Sparkles size={11} /> Ask Claude via MCP
        </button>

        <button
          onClick={() => syncAll()}
          disabled={connectedPlatforms.length === 0}
          className="btn btn-ghost text-[12px] py-1.5 px-3"
          title={connectedPlatforms.length === 0 ? 'Connect a platform first' : 'Sync all platforms'}
        >
          <RefreshCw size={12} /> Sync all
        </button>

        <button
          onClick={toggle}
          className="w-9 h-9 rounded-lg border border-default hover:subtle-bg transition flex items-center justify-center text-secondary"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div className="w-px h-6 border-l border-strong hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-[11px]" style={{ background: 'linear-gradient(135deg, #378ADD 0%, #8B5CF6 100%)' }}>
            SC
          </div>
          <div className="hidden lg:flex flex-col leading-tight">
            <span className="text-primary text-[12.5px] font-medium">Sahajta Studio</span>
            <span className="text-muted text-[10.5px]">demo@sahajta.co</span>
          </div>
        </div>
      </div>
    </header>
  )
}
