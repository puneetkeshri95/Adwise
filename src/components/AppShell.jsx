import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BarChart3, Activity, Route as RouteIcon, Plug, Settings, LogOut, Link2, BookOpen } from 'lucide-react'
import { getMetaConnection, getMetaOAuthUrl, getMetaAdAccounts, selectMetaAdAccount, logout } from '../api'
import Topbar from './Topbar'

const NAV = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/reporting', icon: BarChart3, label: 'Reporting' },
  { to: '/app/behaviour', icon: Activity, label: 'Behaviour' },
  { to: '/app/journeys', icon: RouteIcon, label: 'User Journeys' },
  { to: '/app/integration', icon: Plug, label: 'Integration' },
  { to: '/app/metrics', icon: BookOpen, label: 'Metrics Library' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
]

export default function AppShell() {
  const navigate = useNavigate()
  const [metaConn, setMetaConn] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingAccounts, setPendingAccounts] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    setLoading(true)
    try {
      // Check if returning from OAuth with account selection
      const params = new URLSearchParams(window.location.search)
      if (params.get('meta_select_account')) {
        window.history.replaceState({}, '', window.location.pathname)
        const { accounts } = await getMetaAdAccounts()
        if (accounts?.length) {
          setPendingAccounts(accounts)
          setLoading(false)
          return
        }
      }
      if (params.get('meta_connected')) {
        window.history.replaceState({}, '', window.location.pathname)
      }

      const conn = await getMetaConnection()
      setMetaConn(conn)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function connectMeta() {
    setBusy(true)
    try {
      const { url } = await getMetaOAuthUrl()
      window.location.href = url
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  async function pickAccount(adAccountId) {
    setBusy(true)
    try {
      await selectMetaAdAccount(adAccountId)
      setPendingAccounts([])
      const conn = await getMetaConnection()
      setMetaConn(conn)
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading…</div>
      </div>
    )
  }

  // Account picker (multi-account selection after OAuth)
  if (pendingAccounts.length > 0) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <h2 className="text-white text-xl font-semibold mb-2">Select an Ad Account</h2>
          <p className="text-gray-400 text-sm mb-6">Multiple ad accounts found under your Facebook. Choose which one to connect:</p>
          <div className="space-y-3">
            {pendingAccounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => pickAccount(acc.id)}
                disabled={busy}
                className="w-full text-left p-4 bg-navy-800 border border-navy-600/40 rounded-lg hover:border-blue-500/60 transition"
              >
                <div className="text-white font-medium">{acc.name || acc.id}</div>
                <div className="text-gray-400 text-xs mt-1">
                  ID: {acc.account_id || acc.id} · {acc.currency || ''} · {acc.timezone_name || ''}
                </div>
              </button>
            ))}
          </div>
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        </div>
      </div>
    )
  }

  // Meta not connected — gate: show only the Connect button
  if (!metaConn?.connected) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-600/20 rounded-2xl flex items-center justify-center">
            <Link2 size={28} className="text-blue-400" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Connect your Meta Ads account</h2>
          <p className="text-gray-400 text-sm mb-6">
            To get started, connect your Facebook Ads account. This lets AdWise pull your campaign data and match it with website visitors.
          </p>
          <button
            onClick={connectMeta}
            disabled={busy}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {busy ? 'Redirecting…' : 'Connect with Facebook'}
          </button>
          {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
          <button onClick={handleLogout} className="mt-6 text-gray-500 text-xs hover:text-gray-300">
            Log out
          </button>
        </div>
      </div>
    )
  }

  // Connected — show app with sidebar
  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-navy-800 border-r border-navy-600/30 flex flex-col">
        <div className="p-4 border-b border-navy-600/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white font-bold text-xs">N</div>
            <span className="text-white font-semibold text-sm">AdWise</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-500 truncate">{metaConn.ad_account_id}</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive ? 'bg-blue-600/20 text-white font-medium' : 'text-gray-400 hover:bg-navy-700/50 hover:text-gray-200'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-navy-600/30">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-navy-700/50 hover:text-gray-200 w-full">
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar accountName="AdWise Test Account" accountId={metaConn.ad_account_id} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
