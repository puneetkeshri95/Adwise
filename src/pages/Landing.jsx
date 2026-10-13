import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Terminal, RefreshCw, Cpu, Layers, GitMerge } from 'lucide-react'

export default function Landing() {
  const [model, setModel] = useState('linear')
  const [simLogs, setSimLogs] = useState([])
  const [activeStep, setActiveStep] = useState(3)

  // Simulation steps representing a visitor's multi-day path
  const journey = [
    {
      day: 'Day 1',
      event: 'Ad Click',
      meta: 'utm_content=ugc_video_v1 · fbclid=fb_88291a',
      desc: 'User clicks Instagram Video Ad. AdWise writes a first-party cookie bypassing Safari/Chrome third-party blocks.',
      credit: { linear: 50, first_click: 100, last_click: 0 },
    },
    {
      day: 'Day 3',
      event: 'Returning Visit',
      meta: 'organic · google_search',
      desc: 'User returns organically to check sizing. Session is stitched to the original Visitor ID.',
      credit: { linear: 0, first_click: 0, last_click: 0 },
    },
    {
      day: 'Day 5',
      event: 'Ad Re-Click',
      meta: 'utm_content=retarget_discount · fbclid=fb_99302b',
      desc: 'User clicks retargeting ad displaying a coupon and adds item to cart.',
      credit: { linear: 50, first_click: 0, last_click: 100 },
    },
    {
      day: 'Day 7',
      event: 'Razorpay Webhook',
      meta: 'order_id=pay_9921 · amount=₹2,499',
      desc: 'Checkout completed. Razorpay triggers transaction callback matching the stitched Visitor ID.',
      credit: null,
    },
  ]

  useEffect(() => {
    const timestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false })
    const logs = [
      `[${timestamp()}] ledger/init: loaded payment payload order_id=pay_9921 amount=₹2,499`,
      `[${timestamp()}] stitching/reconstruct: visitor session history (3 distinct touchpoints found)`,
      `[${timestamp()}] model/recalc: applying [${model.toUpperCase()}] credit distribution...`,
    ]

    if (model === 'linear') {
      logs.push(`[${timestamp()}] credit/match: ad_id "ugc_video_v1" allocated 50% credit (₹1,249.50)`)
      logs.push(`[${timestamp()}] credit/match: ad_id "retarget_discount" allocated 50% credit (₹1,249.50)`)
      logs.push(`[${timestamp()}] ledger/commit: successfully attributed ₹2,499.00 to campaign metrics`)
    } else if (model === 'first_click') {
      logs.push(`[${timestamp()}] credit/match: ad_id "ugc_video_v1" allocated 100% credit (₹2,499.00)`)
      logs.push(`[${timestamp()}] credit/match: ad_id "retarget_discount" allocated 0% credit (₹0.00)`)
      logs.push(`[${timestamp()}] ledger/commit: successfully attributed ₹2,499.00 to campaign metrics`)
    } else if (model === 'last_click') {
      logs.push(`[${timestamp()}] credit/match: ad_id "ugc_video_v1" allocated 0% credit (₹0.00)`)
      logs.push(`[${timestamp()}] credit/match: ad_id "retarget_discount" allocated 100% credit (₹2,499.00)`)
      logs.push(`[${timestamp()}] ledger/commit: successfully attributed ₹2,499.00 to campaign metrics`)
    }

    setSimLogs(logs)
  }, [model])

  return (
    <div className="min-h-screen bg-[#06080F] text-gray-300 font-sans selection:bg-emerald-500/30 relative overflow-x-hidden">
      {/* Background Mesh Gradients */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293706_1px,transparent_1px),linear-gradient(to_bottom,#1f293706_1px,transparent_1px)] bg-[size:5rem_5rem] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[400px] right-1/4 w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Navigation */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/[0.04] relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-600 rounded flex items-center justify-center text-black font-extrabold text-xs">
            N
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">AdWise</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-white text-[#06080F] hover:bg-zinc-200 transition rounded text-xs font-bold tracking-tight flex items-center gap-1 shadow-md shadow-white/5"
          >
            Launch Dashboard <ArrowRight size={12} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.02] text-zinc-400 text-[10px] font-mono rounded border border-white/[0.05] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          SERVER-SIDE RECONCILIATION ACTIVE
        </div>
        <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-8 max-w-4xl mx-auto">
          Verify every marketing rupee.<br />
          <span className="text-zinc-500">No guesswork.</span>
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Stitch every visitor journey to a real purchase. Bypass Safari and Chrome third-party cookie restrictions. Recover 30% of lost conversion data with first-party logging.
        </p>

        <div className="flex justify-center mb-16">
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-white text-[#06080F] rounded hover:bg-zinc-200 transition font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-white/5"
          >
            Launch Live Dashboard <ArrowRight size={14} />
          </Link>
        </div>

        {/* Premium Dashboard Image Preview */}
        <div className="max-w-5xl mx-auto border border-white/[0.06] bg-zinc-950/80 rounded-2xl p-2 shadow-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.05] to-transparent blur-xl opacity-0 group-hover:opacity-100 transition duration-700 pointer-events-none" />
          <div className="overflow-hidden rounded-xl border border-white/[0.04] bg-[#0A0D15]">
            <img
              src="/dashboard_chart.png"
              alt="AdWise Attribution Dashboard Chart"
              className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition duration-300"
            />
          </div>
        </div>
      </header>

      {/* Stitched Journey Showcase Section */}
      <section className="max-w-6xl mx-auto px-6 py-28 border-t border-white/[0.04] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Identity Stitching</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Stitch journeys across devices and days.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              When a user clicks an ad, AdWise assigns an anonymous Visitor ID via a first-party cookie. Even if they return days later via search or direct traffic, their full journey remains stitched to the original ad click.
            </p>

            <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] overflow-hidden">
              <img
                src="/attribution_graph.png"
                alt="Multi-touch Attribution Graph"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          {/* Interactive Playground terminal */}
          <div className="lg:col-span-7">
            <div className="text-left border border-white/[0.05] bg-zinc-950/85 rounded-lg overflow-hidden shadow-2xl relative">
              <div className="px-4 py-3.5 border-b border-white/[0.05] bg-zinc-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-zinc-500" />
                  <span className="text-[10px] font-mono text-zinc-400 tracking-wider">attribution_ledger.sh</span>
                </div>
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12">
                {/* Steps Timeline */}
                <div className="sm:col-span-7 p-5 border-r border-white/[0.05] space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Stitched Timeline</span>
                    <span className="text-[9px] text-zinc-500 font-mono">ID: usr_a891</span>
                  </div>

                  <div className="space-y-2">
                    {journey.map((step, idx) => {
                      const isActive = idx === activeStep
                      const hasModelCredit = step.credit && step.credit[model] !== undefined

                      return (
                        <div
                          key={idx}
                          onClick={() => setActiveStep(idx)}
                          className={`p-3.5 rounded border transition-all duration-200 cursor-pointer ${
                            isActive
                              ? 'border-emerald-500/40 bg-emerald-500/[0.02]'
                              : 'border-white/[0.03] bg-white/[0.01] hover:border-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-mono text-zinc-500 uppercase">{step.day}</span>
                              <span className="text-[10px] font-bold text-white">{step.event}</span>
                            </div>
                            {hasModelCredit && (
                              <span className={`text-[9px] font-mono font-bold ${step.credit[model] > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                {step.credit[model]}% credit
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-zinc-500 mt-0.5 truncate">{step.meta}</div>
                          {isActive && (
                            <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed border-t border-white/[0.04] pt-2 animate-fade-in">
                              {step.desc}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Calculations */}
                <div className="sm:col-span-5 p-5 bg-zinc-950 flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-4">Attribution Config</div>

                    <div className="grid grid-cols-3 gap-1 mb-6">
                      {['linear', 'first_click', 'last_click'].map((m) => (
                        <button
                          key={m}
                          onClick={() => setModel(m)}
                          className={`py-1 rounded text-[9px] font-mono uppercase tracking-wider transition ${
                            model === m
                              ? 'bg-emerald-400 text-black font-bold'
                              : 'bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05]'
                          }`}
                        >
                          {m.replace('_', ' ')}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3 mb-6">
                      <span className="text-[8px] font-mono uppercase tracking-wider text-zinc-500">Calculated Revenue Credit</span>
                      <div className="p-3 bg-zinc-900/50 rounded border border-white/[0.03] space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-zinc-400">ugc_video_v1:</span>
                          <span className="text-white font-bold">
                            {model === 'linear' ? '₹1,249.50' : model === 'first_click' ? '₹2,499.00' : '₹0.00'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-zinc-400">retarget_discount:</span>
                          <span className="text-white font-bold">
                            {model === 'linear' ? '₹1,249.50' : model === 'last_click' ? '₹2,499.00' : '₹0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                      <RefreshCw size={10} className="animate-spin text-emerald-400" />
                      Live ledger calculations
                    </div>
                    <div className="p-2.5 bg-black rounded font-mono text-[8px] text-zinc-400 space-y-1 overflow-hidden border border-white/[0.02] max-h-32">
                      {simLogs.map((log, i) => (
                        <div key={i} className="truncate">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Telemetry Stack */}
      <section className="max-w-4xl mx-auto px-6 py-28 border-t border-white/[0.04] relative z-10">
        <div className="max-w-xl mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">Precision over estimates.</h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Meta Ads Manager attributes conversions using probability estimates. AdWise attributes conversions by matching actual server-side logs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="w-8 h-8 rounded bg-white/[0.02] border border-white/[0.05] text-white flex items-center justify-center">
              <Cpu size={14} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">First-Party Collector</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Loads directly from your primary domain. Cookies are treated as first-party elements, maintaining persistence across 90-day purchase journeys.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-8 h-8 rounded bg-white/[0.02] border border-white/[0.05] text-white flex items-center justify-center">
              <GitMerge size={14} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Session Stitcher</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Consolidates cross-device, referral, and campaign click IDs under a single Visitor signature when they return organically.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-8 h-8 rounded bg-white/[0.02] border border-white/[0.05] text-white flex items-center justify-center">
              <Layers size={14} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Ledger Verification</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Validates conversions against actual transaction callbacks (Razorpay/Stripe webhooks). Eliminates double-counting and inflated values.
            </p>
          </div>
        </div>
      </section>

      {/* Simple Transparent Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-24 border-t border-white/[0.04] text-center relative z-10">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Transparent rates.</h2>
          <p className="text-xs text-zinc-500 mb-8">Deploy once, verify forever.</p>

          <div className="p-8 bg-zinc-950 border border-white/[0.05] rounded-lg text-left max-w-sm mx-auto">
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Startup License</span>
            <div className="flex items-baseline gap-1 mt-2 mb-6">
              <span className="text-3xl font-black text-white font-mono">₹2,499</span>
              <span className="text-xs text-zinc-500">/ month</span>
            </div>
            <div className="space-y-3 text-xs text-zinc-400 mb-6">
              <div className="flex items-center gap-2">✓ Up to 50,000 monthly page views</div>
              <div className="flex items-center gap-2">✓ Dynamic attribution models</div>
              <div className="flex items-center gap-2">✓ Meta API OAuth integration</div>
              <div className="flex items-center gap-2">✓ Server-side transaction reconciliation</div>
            </div>
            <Link
              to="/dashboard"
              className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider rounded block text-center transition"
            >
              Launch Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-6 text-center text-xs text-zinc-600 relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono font-bold text-xs">◈</span>
            <span className="font-medium text-zinc-400">AdWise Attribution</span>
          </div>
          <div>© 2026 AdWise. All rights reserved. For direct advertisers.</div>
        </div>
      </footer>
    </div>
  )
}
