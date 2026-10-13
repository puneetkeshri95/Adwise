import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, isAuthenticated } from '../api'
import { ArrowRight, Lock, Mail, Shield } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/app/dashboard')
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/app/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex animate-fade-in relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-800/80 border-r border-navy-700/50 flex-col justify-between p-12 z-10 backdrop-blur-md">
        <div>
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white mb-20">
            <span className="text-accent-blue text-2xl">◈</span>
            <span>AdWise</span>
          </Link>
          <h2 className="text-3xl font-black text-white leading-tight mb-5">
            Stop guessing.<br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Start knowing your true ROAS.
            </span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-md">
            Connect your Meta Ads Manager account and install our first-party tracking pixel to monitor actual, completed purchases, bypassing iOS privacy limits.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-gray-400">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-accent-blue border border-blue-500/20 font-bold">✓</div>
            Multi-touch attribution
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-gray-400">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-accent-blue border border-blue-500/20 font-bold">✓</div>
            Server-side pixel matching
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-gray-400">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-accent-blue border border-blue-500/20 font-bold">✓</div>
            Attributed Customer journey timelines
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-sm glass-card p-8 rounded-2xl border border-navy-700/60 shadow-2xl">
          <Link to="/" className="lg:hidden flex items-center gap-2 text-xl font-bold text-white mb-8">
            <span className="text-accent-blue text-2xl">◈</span>
            <span>AdWise</span>
          </Link>

          <h1 className="text-2xl font-bold text-white mb-1.5">Welcome back</h1>
          <p className="text-xs text-gray-400 mb-6">Log in to check your active attribution logs</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2 bg-red-900/20 border border-red-700/30 rounded-lg text-xs text-red-400">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Mail size={14} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-accent-blue transition"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Lock size={14} /></span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-accent-blue transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-accent-blue text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-blue-600 transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-4 shadow-lg shadow-blue-500/10"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Sign In'} <ArrowRight size={12} />
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-navy-800"></div>
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest font-mono">or</span>
            <div className="flex-1 h-px bg-navy-800"></div>
          </div>

          <button className="w-full py-2 bg-navy-900 border border-navy-700 text-gray-300 rounded-lg text-xs font-semibold hover:border-gray-500 transition flex items-center justify-center gap-2">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-gray-400 mt-6">
            New to AdWise? 
            <Link to="/register" className="text-accent-blue hover:underline ml-1 font-semibold">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
