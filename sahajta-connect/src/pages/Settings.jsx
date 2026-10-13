import { useState } from 'react'
import { Sun, Moon, Monitor, User, Building, Save, KeyRound, Bell, Shield } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext.jsx'
import { useApp } from '../contexts/AppContext.jsx'
import PlatformIcon from '../components/PlatformIcon.jsx'
import { PLATFORMS, getPlatform } from '../lib/platforms.js'
import { compact } from '../lib/format.js'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { connections, pushToast } = useApp()

  const [workspace, setWorkspace] = useState('Sahajta Studio')
  const [email, setEmail] = useState('demo@sahajta.co')

  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
      {/* Profile */}
      <Section title="Workspace" desc="Basic profile shown across your dashboard.">
        <div className="card p-5 space-y-4">
          <Field label="Workspace name" icon={Building}>
            <input value={workspace} onChange={e => setWorkspace(e.target.value)} className="input" />
          </Field>
          <Field label="Owner email" icon={User}>
            <input value={email} onChange={e => setEmail(e.target.value)} className="input" />
          </Field>
          <div className="flex justify-end">
            <button
              onClick={() => pushToast({ kind: 'success', title: 'Profile saved' })}
              className="btn btn-primary"
            >
              <Save size={13} /> Save changes
            </button>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" desc="Switch between light and dark mode.">
        <div className="card p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ThemeCard active={theme === 'dark'} onClick={() => setTheme('dark')} icon={Moon} label="Dark" desc="High-contrast for dashboards" />
            <ThemeCard active={theme === 'light'} onClick={() => setTheme('light')} icon={Sun} label="Light" desc="Bright and reader-friendly" />
            <ThemeCard active={false} onClick={() => pushToast({ kind: 'info', title: 'Coming soon' })} icon={Monitor} label="System" desc="Match your OS setting" />
          </div>
        </div>
      </Section>

      {/* API usage */}
      <Section title="API rate limits" desc="Live usage per connected platform. Sync activity counts against these limits.">
        <div className="card divide-y divide-white/[0.04]">
          {PLATFORMS.map(p => {
            const conn = connections[p.id]
            const isConnected = conn.status === 'connected' || conn.status === 'syncing'
            const used = isConnected ? Math.floor(Math.random() * 620) + 40 : 0
            const limit = 1000
            const pct = Math.min(100, (used / limit) * 100)
            return (
              <div key={p.id} className="px-5 py-4 flex items-center gap-4">
                <PlatformIcon id={p.id} size={32} radius={9} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary text-[13px] font-medium">{p.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'subtle-bg text-muted border border-default'
                    }`}>
                      {isConnected ? 'Active' : 'Idle'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full inset-bg overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: p.color }}
                    />
                  </div>
                </div>
                <div className="text-right w-24">
                  <div className="text-primary text-[13px] font-semibold tabular-nums">{compact(used)} / {compact(limit)}</div>
                  <div className="text-muted text-[10px]">requests this hour</div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* MCP Key */}
      <Section title="MCP connector" desc="Rotate the API key Claude uses to talk to your Sahajta workspace.">
        <div className="card p-5">
          <Field label="Workspace API key" icon={KeyRound}>
            <div className="flex items-center gap-2">
              <input readOnly value="sc_live_9k42••••••••••••" className="input font-mono flex-1" />
              <button onClick={() => pushToast({ kind: 'success', title: 'API key rotated', message: 'New key copied to clipboard' })} className="btn btn-ghost text-[12px]">Rotate</button>
            </div>
          </Field>
          <p className="text-muted text-[11px] mt-3">Keep this key private. Rotating invalidates the previous key immediately.</p>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" desc="Choose when to hear from Sahajta.">
        <div className="card p-5 space-y-3">
          <Toggle label="Alert me when a top post crosses a threshold" desc="Sends an in-app notification and email." defaultOn />
          <Toggle label="Weekly report digest" desc="Every Monday, a summary of the last 7 days." defaultOn />
          <Toggle label="Sentiment alerts" desc="Ping me for negative comment surges." />
        </div>
      </Section>

      <style>{`
        .input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .input:focus { border-color: rgba(55, 138, 221, 0.6); }
      `}</style>
    </div>
  )
}

function Section({ title, desc, children }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-primary text-lg font-semibold tracking-tight">{title}</h2>
        {desc && <p className="text-muted text-[12px] mt-0.5">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted font-semibold mb-1.5">
        {Icon && <Icon size={11} />}
        {label}
      </div>
      {children}
    </label>
  )
}

function ThemeCard({ active, onClick, icon: Icon, label, desc }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition ${
        active ? 'border-brand-500/60 bg-brand-500/[0.06] shadow-inner-highlight' : 'border-default hover:subtle-bg'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${active ? 'bg-brand-500/15 text-brand-400' : 'subtle-bg text-secondary'}`}>
        <Icon size={16} />
      </div>
      <div className="text-primary text-[13px] font-semibold">{label}</div>
      <div className="text-muted text-[11px] mt-0.5">{desc}</div>
    </button>
  )
}

function Toggle({ label, desc, defaultOn }) {
  const [on, setOn] = useState(!!defaultOn)
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1 min-w-0">
        <div className="text-primary text-[13px] font-medium">{label}</div>
        <div className="text-muted text-[11px] mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => setOn(v => !v)}
        className={`relative w-9 h-5 rounded-full transition ${on ? 'bg-brand-500' : 'bg-white/[0.1]'}`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${on ? 'translate-x-4' : ''}`}
        />
      </button>
    </div>
  )
}
