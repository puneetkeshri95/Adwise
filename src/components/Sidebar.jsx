import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Megaphone, Route, CheckCircle, Settings, LogOut, Code } from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Megaphone, label: 'Campaigns', id: 'campaigns' },
  { icon: Route, label: 'Journeys', id: 'journeys' },
  { icon: CheckCircle, label: 'Conversions', id: 'conversions' },
  { icon: Code, label: 'Pixel', id: 'pixel' },
  { icon: Settings, label: 'Settings', id: 'settings' },
]

export default function Sidebar({ activeNav, onNavChange, onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    if (onLogout) onLogout()
    else navigate('/')
  }

  return (
    <div className="w-[200px] flex-shrink-0 bg-navy-800 border-r border-navy-600/40 flex flex-col">
      <div className="px-4 py-4 border-b border-navy-600/40 mb-2">
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="text-accent-blue text-lg">◈</span>
          <span className="text-white">Trackr</span>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeNav === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                isActive
                  ? 'bg-navy-700 text-white font-medium'
                  : 'text-gray-400 hover:bg-navy-700/50 hover:text-gray-200'
              }`}
            >
              <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-2 pb-3 space-y-1 border-t border-navy-600/40 pt-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-gray-500 hover:bg-navy-700/50 hover:text-gray-300 transition-colors"
        >
          <LogOut size={15} strokeWidth={1.5} />
          Log out
        </button>
        <div className="px-3 text-[11px] text-gray-600">
          Namyah · Workspace
        </div>
      </div>
    </div>
  )
}
