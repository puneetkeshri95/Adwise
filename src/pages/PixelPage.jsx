import { useState, useEffect } from 'react'
import { Copy, Check, Code, Globe, Webhook } from 'lucide-react'
import { getPixelSnippet, getWebhookConfig } from '../api'

function CopyBlock({ label, code, description }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      <pre className="bg-navy-900 border border-navy-600/40 rounded-lg p-3 text-[12px] text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
        {code}
      </pre>
    </div>
  )
}

export default function PixelPage() {
  const [pixel, setPixel] = useState(null)
  const [webhooks, setWebhooks] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getPixelSnippet().catch(() => null),
      getWebhookConfig().catch(() => null),
    ]).then(([p, w]) => {
      setPixel(p)
      setWebhooks(w)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-gray-400 animate-pulse">Loading pixel setup…</div>

  const pid = pixel?.pixel_id || ''
  const snippet = pixel?.snippet || ''

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Pixel & Webhooks</h1>
        <p className="text-sm text-gray-400 mt-1">Track page visits and match payments to visitors.</p>
      </div>

      {/* Pixel ID */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/20 rounded-xl p-5">
        <div className="text-[11px] uppercase tracking-wider text-blue-300 mb-1">Your Pixel ID</div>
        <div className="font-mono text-lg text-white">{pid}</div>
        <p className="text-xs text-gray-400 mt-2">This is unique to your account. Add the tracking snippet below to every page of your website.</p>
      </div>

      {/* Section 1: Page Visit Tracking */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Code size={14} className="text-blue-400" /> Page Visit Tracking
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Paste this snippet into the <code className="text-blue-400">&lt;head&gt;</code> of your website. It auto-captures page views, UTM parameters, and fbclid from every visitor.
        </p>
        <CopyBlock label="Base Pixel Code (required)" code={snippet} />
        <CopyBlock
          label="Identify a user (after login/signup)"
          code={`// Call this when you know who the visitor is\nnamyah('identify', { email: 'customer@example.com', name: 'Customer Name' });`}
        />
      </div>

      {/* Section 2: Payment Webhooks */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Webhook size={14} className="text-green-400" /> Payment Webhooks
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Add these webhook URLs to your payment gateway to automatically track purchases and match them to visitors who clicked your ads.
        </p>

        {webhooks ? (
          <>
            <CopyBlock
              label="Razorpay Webhook URL"
              code={webhooks.razorpay_url}
              description={webhooks.instructions?.razorpay}
            />
            <CopyBlock
              label="Stripe Webhook URL"
              code={webhooks.stripe_url}
              description={webhooks.instructions?.stripe}
            />

            <div className="bg-navy-800 border border-navy-600/30 rounded-xl p-4 mt-4">
              <h3 className="text-xs font-medium text-white mb-2">How it works</h3>
              <ol className="text-xs text-gray-400 space-y-1.5 list-decimal pl-4">
                <li>A visitor clicks your Meta ad → arrives on your site with <code className="text-blue-400">fbclid</code> + UTMs.</li>
                <li>The pixel captures their visit and creates a session with the ad attribution data.</li>
                <li>The visitor fills a form or logs in → you call <code className="text-blue-400">namyah('identify', ...)</code> with their email.</li>
                <li>When they pay, Razorpay/Stripe fires the webhook with the same email.</li>
                <li>AdWise matches the payment to the visitor → attributes the sale to the specific ad.</li>
              </ol>
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-sm">Could not load webhook config.</div>
        )}
      </div>

      {/* No-script fallback */}
      {pixel?.gif_url && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Globe size={14} className="text-gray-400" /> No-JavaScript Fallback
          </h2>
          <CopyBlock
            label="Image pixel (for emails, AMP pages)"
            code={`<noscript>\n  <img src="${pixel.gif_url}" width="1" height="1" style="display:none" alt="">\n</noscript>`}
          />
        </div>
      )}
    </div>
  )
}
