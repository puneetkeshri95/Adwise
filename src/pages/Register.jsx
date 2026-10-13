import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, login, isAuthenticated } from '../api'
import { ArrowRight, Lock, Mail, User, Building2 } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/app/dashboard')
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields')
      return
    }
    setError('')
    setLoading(true)
    try {
      // 1. Call register
      await register(email.trim(), password, name.trim(), company.trim())
      // 2. Automatically log them in
      await login(email.trim(), password)
      navigate('/app/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed. Email might be already in use.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex animate-fade-in relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-800/80 border-r border-navy-700/50 flex-col justify-between p-12 z-10 backdrop-blur-md">
        <div>
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white mb-20">
            <span className="text-accent-blue text-2xl">◈</span>
            <span>AdWise</span>
          </Link>
          <h2 className="text-3xl font-black text-white leading-tight mb-5">
            Audit your ad performance<br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              with server-side telemetry.
            </span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-md">
            Integrate your pixel to map user sessions, stitch timelines, and run side-by-side attribution models dynamically.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-gray-400">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-accent-blue border border-blue-500/20 font-bold">✓</div>
            Custom first-party JS pixel
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-gray-400">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-accent-blue border border-blue-500/20 font-bold">✓</div>
            FastAPI + SQLite async ledger
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-semibold text-gray-400">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-accent-blue border border-blue-500/20 font-bold">✓</div>
            Accurate ROAS recalculations
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

          <h1 className="text-2xl font-bold text-white mb-1.5">Create Account</h1>
          <p className="text-xs text-gray-400 mb-6">Start tracking your ad spend attribution</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2 bg-red-900/20 border border-red-700/30 rounded-lg text-xs text-red-400">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">Full Name *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><User size={14} /></span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-accent-blue transition"
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">Email Address *</label>
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
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">Password *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Lock size={14} /></span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-accent-blue transition"
                  placeholder="At least 6 characters"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">Company Name (Optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Building2 size={14} /></span>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-accent-blue transition"
                  placeholder="Your brand/company name"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-accent-blue text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-blue-600 transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-4 shadow-lg shadow-blue-500/10"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'} <ArrowRight size={12} />
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Already have an account? 
            <Link to="/login" className="text-accent-blue hover:underline ml-1 font-semibold">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
