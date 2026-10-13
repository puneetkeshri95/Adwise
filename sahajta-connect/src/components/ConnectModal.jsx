import { useEffect, useState } from 'react'
import { X, Loader2, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react'
import { getPlatform } from '../lib/platforms.js'
import PlatformIcon from './PlatformIcon.jsx'
import ModalPortal from './ModalPortal.jsx'
import { useApp } from '../contexts/AppContext.jsx'

/**
 * Simulated OAuth flow modal.
 * States: idle -> credentials -> authorizing -> success -> closed
 * No real credentials required — any input accepted, empty fine too.
 */
export default function ConnectModal({ platformId, onClose }) {
  const platform = getPlatform(platformId)
  const { startConnect, completeConnect } = useApp()
  const [stage, setStage] = useState('idle') // idle | authorizing | success
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && stage !== 'authorizing') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, stage])

  if (!platform) return null

  const handleContinue = async (e) => {
    e?.preventDefault?.()
    startConnect(platformId)
    setStage('authorizing')
    // Simulated 3-step authorization
    const steps = [900, 800, 700]
    for (const t of steps) await new Promise(r => setTimeout(r, t))
    setStage('success')
    await new Promise(r => setTimeout(r, 700))
    completeConnect(platformId)
    onClose()
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => stage !== 'authorizing' && onClose()} />

      <div className="relative w-full max-w-md elevated-bg border border-strong rounded-2xl shadow-lifted overflow-hidden animate-fade-in-up">
        {/* Branded header strip */}
        <div className="h-[3px]" style={{ background: platform.gradient || platform.color }} />

        <div className="p-7">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <PlatformIcon id={platformId} size={44} radius={12} />
              <div>
                <div className="display text-[22px] text-primary leading-none tracking-[-0.02em]">Sign in to {platform.name}</div>
                <div className="kicker mt-1.5" style={{ fontSize: 10 }}>SIMULATED OAUTH · SAHAJTA</div>
              </div>
            </div>
            <button
              onClick={() => stage !== 'authorizing' && onClose()}
              disabled={stage === 'authorizing'}
              className="text-muted hover:text-primary transition disabled:opacity-30"
            >
              <X size={18} />
            </button>
          </div>

          {stage === 'idle' && (
            <>
              <div className="mb-5 p-3.5 rounded-xl subtle-bg border border-default flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-brand-500 dark:text-brand-400 mt-0.5 flex-shrink-0" />
                <p className="text-secondary text-[12.5px] leading-relaxed">{platform.fakeAuthCopy}</p>
              </div>

              <form onSubmit={handleContinue} className="space-y-3">
                <div>
                  <label className="block kicker mb-1.5" style={{ fontSize: 10 }}>Username or email</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="anything@works.com"
                    className="w-full px-3 py-2.5 rounded-lg subtle-bg border border-default text-primary text-[13px] placeholder:text-muted focus:outline-none focus:border-strong transition"
                  />
                </div>
                <div>
                  <label className="block kicker mb-1.5" style={{ fontSize: 10 }}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nothing checked — simulated demo"
                    className="w-full px-3 py-2.5 rounded-lg subtle-bg border border-default text-primary text-[13px] placeholder:text-muted focus:outline-none focus:border-strong transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg font-medium text-[13px] text-white transition hover:brightness-110 flex items-center justify-center gap-2 shadow-lg"
                  style={{ background: platform.gradient || platform.color }}
                >
                  Continue with {platform.name} <ArrowRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full py-2 text-[12px] text-muted hover:text-primary transition"
                >
                  Skip and simulate login →
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-default">
                <div className="kicker mb-2" style={{ fontSize: 10 }}>Permissions requested</div>
                <div className="flex flex-wrap gap-1.5">
                  {platform.permissions.map(p => (
                    <span key={p} className="text-[10.5px] px-2 py-0.5 rounded-full subtle-bg border border-default text-secondary font-mono">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {stage === 'authorizing' && (
            <div className="py-10 text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full" style={{ background: platform.gradient || platform.color, opacity: 0.15 }} />
                <div className="absolute inset-0 rounded-full animate-ping-slow" style={{ background: platform.color, opacity: 0.2 }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={22} className="animate-spin" style={{ color: platform.color }} />
                </div>
              </div>
              <div className="display text-[20px] text-primary tracking-[-0.02em]">Authorizing with {platform.name}…</div>
              <div className="text-muted text-[12.5px] mt-1.5">Exchanging tokens, fetching account metadata</div>
              <div className="mt-6 max-w-[240px] mx-auto space-y-1.5 text-left">
                <AuthStep label="Redirected to provider" done />
                <AuthStep label="Access token exchanged" done />
                <AuthStep label="Fetching account details" loading />
              </div>
            </div>
          )}

          {stage === 'success' && (
            <div className="py-10 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 size={30} className="text-emerald-500 dark:text-emerald-400" strokeWidth={2.2} />
              </div>
              <div className="display text-[22px] text-primary tracking-[-0.02em]">{platform.name} connected</div>
              <div className="text-muted text-[12.5px] mt-1.5">Syncing your latest posts and insights…</div>
            </div>
          )}
        </div>
      </div>
      </div>
    </ModalPortal>
  )
}

function AuthStep({ label, done, loading }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {done && <CheckCircle2 size={12} className="text-emerald-400" />}
      {loading && <Loader2 size={12} className="animate-spin text-brand-400" />}
      {!done && !loading && <span className="w-3 h-3 rounded-full border border-default" />}
      <span className={done ? 'text-secondary line-through decoration-emerald-500/40' : loading ? 'text-primary' : 'text-muted'}>
        {label}
      </span>
    </div>
  )
}
