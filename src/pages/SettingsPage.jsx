// Settings — Profile, Ad Platforms, Preferences, Notifications (shell), Team (shell), Session.
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  User as UserIcon, LogOut, Link2, Plus, Trash2, RefreshCw, Bell, Users,
  Globe, Clock, BookOpen, ChevronRight, Pencil, Check,
} from 'lucide-react'
import { getMetaConnection, getMetaOAuthUrl, disconnectMeta, getMe, logout } from '../api'
import { dateTime } from '../lib/format'

const STORAGE_PREFS = 'adwise_user_prefs_v1'

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFS) || '{}') } catch { return {} }
}
function savePrefs(p) {
  try { localStorage.setItem(STORAGE_PREFS, JSON.stringify(p)) } catch { /* ignore */ }
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [conn, setConn] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [prefs, setPrefs] = useState(() => ({
    currency: 'INR', timezone: 'Asia/Kolkata',
    notifications: { weeklySummary: true, anomaly: true, lowRoas: false },
    ...loadPrefs(),
  }))
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  useEffect(() => {
    Promise.all([
      getMe().catch(() => null),
      getMetaConnection().catch(() => null),
    ]).then(([u, c]) => {
      setUser(u); setConn(c); if (u?.name) setNameDraft(u.name)
    })
  }, [])

  function setPref(path, val) {
    const next = { ...prefs }
    const segs = path.split('.')
    let cur = next
    for (let i = 0; i < segs.length - 1; i++) {
      cur[segs[i]] = { ...(cur[segs[i]] || {}) }
      cur = cur[segs[i]]
    }
    cur[segs[segs.length - 1]] = val
    setPrefs(next)
    savePrefs(next)
  }

  async function handleConnectMeta() {
    setBusy(true)
    try {
      const { url } = await getMetaOAuthUrl()
      window.location.href = url
    } catch (e) { setMsg(e.message); setBusy(false) }
  }

  async function handleDisconnectMeta() {
    if (!confirm('Disconnect this Meta ad account?')) return
    setBusy(true)
    try {
      await disconnectMeta()
      setConn({ connected: false })
      setMsg('Disconnected.')
    } catch (e) { setMsg(e.message) }
    setBusy(false)
  }

  function handleLogout() { logout(); navigate('/login') }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-white">Settings</h2>
        <p className="text-sm text-gray-400 mt-1">Manage your profile, connections, and preferences.</p>
      </div>

      {/* Profile */}
      <Section icon={UserIcon} title="Profile">
        {user ? (
          <div className="space-y-3 text-sm">
            <Field label="Email" value={user.email} readOnly />
            <Field
              label="Name"
              value={user.name || '—'}
              editing={editingName}
              draft={nameDraft}
              onDraftChange={setNameDraft}
              onEdit={() => setEditingName(true)}
              onSave={() => { setEditingName(false); /* TODO: persist via API when endpoint exists */ }}
            />
            <Field label="Company" value={user.company || '—'} readOnly />
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Loading…</div>
        )}
      </Section>

      {/* Ad Platforms */}
      <Section icon={Link2} title="Ad Platforms">
        {conn?.connected ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-navy-900/40 border border-navy-700/40 rounded-lg">
              <div>
                <div className="text-white text-sm font-medium">AdWise Test Account</div>
                <div className="text-gray-500 text-[11px] font-mono mt-0.5">{conn.ad_account_id}</div>
                <div className="text-gray-400 text-[11px] mt-1">
                  Token expires: <span className={`${tokenExpiryClass(conn.expires_at)}`}>{conn.expires_at ? dateTime(conn.expires_at) : 'Unknown'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleConnectMeta} className="p-2 text-gray-400 hover:text-white" title="Reconnect"><RefreshCw size={13} /></button>
                <button onClick={handleDisconnectMeta} className="p-2 text-gray-400 hover:text-rose-300" title="Disconnect"><Trash2 size={13} /></button>
              </div>
            </div>
            <button onClick={handleConnectMeta} className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
              <Plus size={11} /> Add another ad account
            </button>
          </div>
        ) : (
          <button onClick={handleConnectMeta} disabled={busy} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">
            Connect Meta Ads
          </button>
        )}
        {msg && <p className="text-xs text-blue-300 mt-2">{msg}</p>}
      </Section>

      {/* Preferences */}
      <Section icon={Globe} title="Preferences">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <PrefRow label="Currency">
            <select
              value={prefs.currency}
              onChange={(e) => setPref('currency', e.target.value)}
              className="bg-navy-900 border border-navy-700/40 rounded-lg px-3 py-1.5 text-sm text-white"
            >
              <option value="INR">INR — ₹</option>
              <option value="USD" disabled>USD (coming soon)</option>
              <option value="EUR" disabled>EUR (coming soon)</option>
            </select>
          </PrefRow>
          <PrefRow label="Timezone">
            <select
              value={prefs.timezone}
              onChange={(e) => setPref('timezone', e.target.value)}
              className="bg-navy-900 border border-navy-700/40 rounded-lg px-3 py-1.5 text-sm text-white"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New York</option>
            </select>
          </PrefRow>
        </div>
      </Section>

      {/* Notifications shell */}
      <Section icon={Bell} title="Notifications">
        <div className="space-y-2 text-sm">
          <ToggleRow
            label="Weekly summary email"
            description="Sent every Monday with a roll-up of last week."
            checked={prefs.notifications.weeklySummary}
            onChange={(v) => setPref('notifications.weeklySummary', v)}
          />
          <ToggleRow
            label="Anomaly alerts"
            description="Email when CPA, ROAS, or spend deviates significantly."
            checked={prefs.notifications.anomaly}
            onChange={(v) => setPref('notifications.anomaly', v)}
          />
          <ToggleRow
            label="Low ROAS warning"
            description="Notify when an active campaign drops below 1.0 ROAS for 3 consecutive days."
            checked={prefs.notifications.lowRoas}
            onChange={(v) => setPref('notifications.lowRoas', v)}
          />
        </div>
      </Section>

      {/* Team shell */}
      <Section icon={Users} title="Team">
        <div className="text-gray-400 text-sm">
          Multi-user workspaces are coming soon. You're currently the only member of this workspace.
        </div>
      </Section>

      {/* Metrics Library link */}
      <Link to="/app/metrics" className="block bg-navy-800 border border-navy-600/30 rounded-xl p-4 hover:border-blue-500/40 transition">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <BookOpen size={16} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium">Metrics Library</div>
            <div className="text-gray-500 text-xs">Reference guide for every metric AdWise tracks.</div>
          </div>
          <ChevronRight size={16} className="text-gray-500" />
        </div>
      </Link>

      {/* Session */}
      <Section icon={Clock} title="Session">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-sm"
        >
          <LogOut size={14} /> Log out
        </button>
      </Section>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-gray-400" />
        <h3 className="text-white text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, readOnly, editing, draft, onDraftChange, onEdit, onSave }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-400 w-24">{label}</span>
      {editing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            className="flex-1 bg-navy-900 border border-navy-700/40 rounded px-2 py-1 text-sm text-white"
          />
          <button onClick={onSave} className="text-emerald-300 hover:text-emerald-200"><Check size={14} /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-white">{value}</span>
          {!readOnly && onEdit && (
            <button onClick={onEdit} className="text-gray-500 hover:text-white"><Pencil size={11} /></button>
          )}
        </div>
      )}
    </div>
  )
}

function PrefRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-400">{label}</span>
      {children}
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 p-2 hover:bg-navy-900/40 rounded-lg text-left"
    >
      <div className={`mt-0.5 w-9 h-5 rounded-full transition relative ${checked ? 'bg-blue-600' : 'bg-navy-700'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </div>
      <div className="flex-1">
        <div className="text-white text-sm">{label}</div>
        <div className="text-gray-500 text-xs">{description}</div>
      </div>
    </button>
  )
}

function tokenExpiryClass(iso) {
  if (!iso) return 'text-gray-300'
  const days = (new Date(iso).getTime() - Date.now()) / 86400000
  if (days < 7) return 'text-rose-300'
  if (days < 30) return 'text-amber-300'
  return 'text-emerald-300'
}
