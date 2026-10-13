import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { generateMockAccount, generateMockPlatformData, refreshPlatformData } from '../lib/mockData'
import { PLATFORMS } from '../lib/platforms'

/**
 * AppContext holds:
 *  - connections: { [platformId]: { status, account, data, lastSyncedAt, error } }
 *  - toasts: [{ id, kind, title, message }]
 *  - dateRange: '7d' | '30d' | '90d'
 *  - activePlatformFilter: 'all' | platformId
 */

const AppContext = createContext(null)

const initialConnections = Object.fromEntries(
  PLATFORMS.map(p => [p.id, { status: 'disconnected', account: null, data: null, lastSyncedAt: null, error: null }])
)

// Very lightweight in-memory + localStorage persistence for connections status only
// (data is regenerated per session for freshness).
function loadPersisted() {
  try {
    const raw = window.localStorage.getItem('sc-app-state-v1')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed
  } catch { return null }
}

function persist(state) {
  try {
    window.localStorage.setItem('sc-app-state-v1', JSON.stringify({
      connections: Object.fromEntries(
        Object.entries(state.connections).map(([k, v]) => [k, {
          status: v.status,
          account: v.account,
          lastSyncedAt: v.lastSyncedAt,
        }])
      ),
      dateRange: state.dateRange,
    }))
  } catch {}
}

export function AppProvider({ children }) {
  const [connections, setConnections] = useState(() => {
    const persisted = loadPersisted()
    if (!persisted?.connections) return initialConnections
    // Rehydrate: for connected platforms, regenerate fresh data
    const next = { ...initialConnections }
    for (const p of PLATFORMS) {
      const pc = persisted.connections[p.id]
      if (pc?.status === 'connected' && pc.account) {
        next[p.id] = {
          status: 'connected',
          account: pc.account,
          data: generateMockPlatformData(p.id, pc.account.seed),
          lastSyncedAt: pc.lastSyncedAt || new Date().toISOString(),
          error: null,
        }
      }
    }
    return next
  })

  const [toasts, setToasts] = useState([])
  const [dateRange, setDateRange] = useState(() => loadPersisted()?.dateRange || '30d')
  const [activePlatformFilter, setActivePlatformFilter] = useState('all')

  useEffect(() => { persist({ connections, dateRange }) }, [connections, dateRange])

  const pushToast = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, kind: 'info', ...toast }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), toast.duration || 4200)
  }, [])

  const dismissToast = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), [])

  const startConnect = useCallback((platformId) => {
    setConnections(c => ({ ...c, [platformId]: { ...c[platformId], status: 'connecting', error: null } }))
  }, [])

  const completeConnect = useCallback((platformId) => {
    const account = generateMockAccount(platformId)
    const data = generateMockPlatformData(platformId, account.seed)
    setConnections(c => ({
      ...c,
      [platformId]: {
        status: 'connected',
        account,
        data,
        lastSyncedAt: new Date().toISOString(),
        error: null,
      },
    }))
    const platform = PLATFORMS.find(p => p.id === platformId)
    pushToast({
      kind: 'success',
      title: `${platform.name} connected`,
      message: `Signed in as ${account.handle}. Synced ${data.summary.posts} posts.`,
    })
  }, [pushToast])

  const disconnect = useCallback((platformId) => {
    setConnections(c => ({
      ...c,
      [platformId]: { status: 'disconnected', account: null, data: null, lastSyncedAt: null, error: null },
    }))
    const platform = PLATFORMS.find(p => p.id === platformId)
    pushToast({ kind: 'info', title: `${platform.name} disconnected` })
  }, [pushToast])

  const syncPlatform = useCallback(async (platformId) => {
    setConnections(c => ({ ...c, [platformId]: { ...c[platformId], status: 'syncing' } }))
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600))
    setConnections(c => {
      const existing = c[platformId]
      if (!existing.account) return c
      const data = refreshPlatformData(platformId, existing.account.seed, existing.data)
      return {
        ...c,
        [platformId]: {
          ...existing,
          status: 'connected',
          data,
          lastSyncedAt: new Date().toISOString(),
        },
      }
    })
    const platform = PLATFORMS.find(p => p.id === platformId)
    pushToast({ kind: 'success', title: `${platform.name} synced`, message: 'Fetched latest posts and metrics.' })
  }, [pushToast])

  const syncAll = useCallback(async () => {
    const connected = Object.entries(connections).filter(([, v]) => v.status === 'connected').map(([k]) => k)
    for (const p of connected) await syncPlatform(p)
    if (connected.length) pushToast({ kind: 'success', title: 'All platforms synced' })
  }, [connections, syncPlatform, pushToast])

  const connectedPlatforms = useMemo(
    () => Object.entries(connections).filter(([, v]) => v.status === 'connected').map(([id]) => id),
    [connections]
  )

  const value = useMemo(() => ({
    connections,
    connectedPlatforms,
    startConnect, completeConnect, disconnect, syncPlatform, syncAll,
    toasts, pushToast, dismissToast,
    dateRange, setDateRange,
    activePlatformFilter, setActivePlatformFilter,
  }), [connections, connectedPlatforms, startConnect, completeConnect, disconnect, syncPlatform, syncAll, toasts, pushToast, dismissToast, dateRange, activePlatformFilter])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
