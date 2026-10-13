import { useEffect, useState } from 'react'
import { getMetaCampaigns, getMetaInsights, getAdPerformance, getMetaConnection, getMetaOAuthUrl, disconnectMeta, getMetaAdAccounts, selectMetaAdAccount, syncMeta, syncMetaInsights } from '../api'

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
const money = (n) => '₹' + fmt(n)

export default function MetaExplorer() {
  const [conn, setConn] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [selCampaign, setSelCampaign] = useState('')
  const [selAdSet, setSelAdSet] = useState('')
  const [selAd, setSelAd] = useState('')
  const [insights, setInsights] = useState([])
  const [adPerf, setAdPerf] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [pendingAccounts, setPendingAccounts] = useState([])

  useEffect(() => {
    (async () => {
      try {
        // Check if we just got redirected back with account selection needed
        const params = new URLSearchParams(window.location.search)
        if (params.get('meta_select_account')) {
          window.history.replaceState({}, '', window.location.pathname)
          const { accounts } = await getMetaAdAccounts()
          if (accounts?.length) {
            setPendingAccounts(accounts)
            return
          }
        }

        const c = await getMetaConnection()
        setConn(c)
        if (c.connected) {
          await refresh()
        }
      } catch (e) {
        setMsg(e.message)
      }
    })()
  }, [])

  async function refresh() {
    const [tree, perf] = await Promise.all([
      getMetaCampaigns().catch(() => []),
      getAdPerformance().catch(() => []),
    ])
    setCampaigns(tree || [])
    setAdPerf(perf || [])
  }

  async function loadInsights() {
    let level = 'campaign'
    let objId = selCampaign
    if (selAd) { level = 'ad'; objId = selAd }
    else if (selAdSet) { level = 'adset'; objId = selAdSet }
    if (!objId) {
      setInsights([])
      return
    }
    try {
      const data = await getMetaInsights({ level, objectId: objId })
      setInsights(data)
    } catch (e) {
      setMsg(e.message)
    }
  }

  useEffect(() => { loadInsights() }, [selCampaign, selAdSet, selAd])

  async function connectMeta() {
    try {
      const { url } = await getMetaOAuthUrl()
      window.location.href = url
    } catch (e) {
      setMsg(e.message)
    }
  }

  async function reconnectMeta() {
    setBusy(true); setMsg('')
    try {
      await disconnectMeta()
      const { url } = await getMetaOAuthUrl()
      window.location.href = url
    } catch (e) {
      setMsg('Reconnect failed: ' + e.message)
      setBusy(false)
    }
  }

  async function runSync(kind) {
    setBusy(true); setMsg('')
    try {
      const r = kind === 'hierarchy' ? await syncMeta() : await syncMetaInsights('last_30d')
      setMsg(`Synced ${kind}: ${JSON.stringify(r)}`)
      await refresh()
    } catch (e) {
      setMsg('Sync failed: ' + e.message)
    } finally { setBusy(false) }
  }

  // Account selection UI (shown when multiple ad accounts found)
  if (pendingAccounts.length > 0) {
    return (
      <div className="p-8">
        <h3 className="text-white text-lg mb-2">Select an Ad Account</h3>
        <p className="text-gray-400 text-sm mb-5">Multiple ad accounts found. Choose which one to connect:</p>
        <div className="space-y-3 max-w-md">
          {pendingAccounts.map(acc => (
            <button
              key={acc.id}
              onClick={async () => {
                setBusy(true)
                try {
                  await selectMetaAdAccount(acc.id)
                  const c = await getMetaConnection()
                  setConn(c)
                  setPendingAccounts([])
                  if (c.connected) await refresh()
                } catch (e) {
                  setMsg(e.message)
                } finally { setBusy(false) }
              }}
              disabled={busy}
              className="w-full text-left p-4 bg-navy-800 border border-navy-600/40 rounded-lg hover:border-blue-500/60 transition"
            >
              <div className="text-white font-medium">{acc.name || acc.id}</div>
              <div className="text-gray-400 text-xs mt-1">
                ID: {acc.account_id || acc.id} · {acc.currency} · {acc.timezone_name}
              </div>
            </button>
          ))}
        </div>
        {msg && <p className="text-red-400 text-xs mt-3">{msg}</p>}
      </div>
    )
  }

  if (!conn) {
    return <div className="p-6 text-gray-400">Loading Meta connection…</div>
  }

  if (!conn.connected) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-white text-lg mb-2">Connect your Meta Ads account</h3>
        <p className="text-gray-400 text-sm mb-4">Authorize via Facebook Login to start syncing campaigns, ad sets, ads, and insights.</p>
        <button onClick={connectMeta} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium">
          Connect Meta Ads
        </button>
        {msg && <p className="text-red-400 text-xs mt-3">{msg}</p>}
      </div>
    )
  }

  const selCampObj = campaigns.find(c => c.meta_campaign_id === selCampaign)
  const adsets = selCampObj?.adsets || []
  const selAdSetObj = adsets.find(a => a.meta_adset_id === selAdSet)
  const ads = selAdSetObj?.ads || []

  // KPIs from insights
  const totals = insights.reduce((acc, r) => {
    acc.spend += r.spend; acc.impressions += r.impressions; acc.clicks += r.clicks; acc.conversions += r.conversions
    return acc
  }, { spend: 0, impressions: 0, clicks: 0, conversions: 0 })

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-gray-300 text-xs">
          Connected: <span className="text-white font-mono">{conn.ad_account_id}</span> · expires {conn.expires_at?.slice(0,10)}
        </div>
        <div className="flex gap-2">
          <button onClick={() => runSync('hierarchy')} disabled={busy} className="px-3 py-1.5 text-xs bg-navy-700 hover:bg-navy-600 text-white rounded">
            {busy ? 'Syncing…' : 'Sync hierarchy'}
          </button>
          <button onClick={() => runSync('insights')} disabled={busy} className="px-3 py-1.5 text-xs bg-navy-700 hover:bg-navy-600 text-white rounded">
            {busy ? 'Syncing…' : 'Sync insights (30d)'}
          </button>
          <button onClick={reconnectMeta} disabled={busy} className="px-3 py-1.5 text-xs bg-red-700/60 hover:bg-red-600 text-white rounded">
            Reconnect
          </button>
        </div>
      </div>
      {msg && <div className="text-xs text-blue-300">{msg}</div>}

      {/* Cascading dropdowns */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] uppercase text-gray-500 tracking-wider">Campaign</label>
          <select value={selCampaign} onChange={e => { setSelCampaign(e.target.value); setSelAdSet(''); setSelAd('') }}
            className="w-full mt-1 px-3 py-2 bg-navy-900 border border-navy-600/40 rounded text-sm text-white">
            <option value="">— All campaigns —</option>
            {campaigns.map(c => <option key={c.id} value={c.meta_campaign_id}>{c.name} · {money(c.spend)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase text-gray-500 tracking-wider">Ad Set</label>
          <select value={selAdSet} onChange={e => { setSelAdSet(e.target.value); setSelAd('') }} disabled={!selCampaign}
            className="w-full mt-1 px-3 py-2 bg-navy-900 border border-navy-600/40 rounded text-sm text-white disabled:opacity-40">
            <option value="">— All ad sets —</option>
            {adsets.map(a => <option key={a.id} value={a.meta_adset_id}>{a.name} · {money(a.spend)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase text-gray-500 tracking-wider">Ad</label>
          <select value={selAd} onChange={e => setSelAd(e.target.value)} disabled={!selAdSet}
            className="w-full mt-1 px-3 py-2 bg-navy-900 border border-navy-600/40 rounded text-sm text-white disabled:opacity-40">
            <option value="">— All ads —</option>
            {ads.map(ad => <option key={ad.id} value={ad.meta_ad_id}>{ad.name} · {money(ad.spend)}</option>)}
          </select>
        </div>
      </div>

      {/* KPI cards from insights */}
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Spend" value={money(totals.spend)} />
        <Stat label="Impressions" value={fmt(totals.impressions)} />
        <Stat label="Clicks" value={fmt(totals.clicks)} />
        <Stat label="Conversions" value={fmt(totals.conversions)} />
      </div>

      {/* Insights daily table */}
      <div className="bg-navy-900 border border-navy-600/30 rounded-lg overflow-hidden">
        <div className="px-3 py-2 text-xs uppercase tracking-wider text-gray-400 border-b border-navy-600/30">
          Daily insights {selAd ? '· Ad' : selAdSet ? '· Ad set' : selCampaign ? '· Campaign' : '· Select an object'}
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-navy-800 text-gray-400 sticky top-0">
              <tr><th className="px-3 py-2 text-left">Date</th><th className="text-right px-3">Spend</th><th className="text-right px-3">Imp.</th><th className="text-right px-3">Clicks</th><th className="text-right px-3">CTR</th><th className="text-right px-3">CPC</th><th className="text-right px-3">Conv.</th></tr>
            </thead>
            <tbody>
              {insights.length === 0 && <tr><td colSpan="7" className="text-center text-gray-500 py-6">No insights yet — click "Sync insights"</td></tr>}
              {insights.map((r, i) => (
                <tr key={i} className="border-t border-navy-600/20 text-white">
                  <td className="px-3 py-1.5">{r.date}</td>
                  <td className="text-right px-3">{money(r.spend)}</td>
                  <td className="text-right px-3">{fmt(r.impressions)}</td>
                  <td className="text-right px-3">{fmt(r.clicks)}</td>
                  <td className="text-right px-3">{r.ctr?.toFixed(2)}%</td>
                  <td className="text-right px-3">{r.cpc?.toFixed(2)}</td>
                  <td className="text-right px-3">{r.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ad performance join */}
      <div className="bg-navy-900 border border-navy-600/30 rounded-lg overflow-hidden">
        <div className="px-3 py-2 text-xs uppercase tracking-wider text-gray-400 border-b border-navy-600/30">
          Per-ad performance (Meta + site)
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-navy-800 text-gray-400 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2">Ad</th>
                <th className="text-right px-3">Spend</th>
                <th className="text-right px-3">Clicks</th>
                <th className="text-right px-3">Sessions</th>
                <th className="text-right px-3">Orders</th>
                <th className="text-right px-3">Revenue</th>
                <th className="text-right px-3">ROAS</th>
                <th className="text-right px-3">CPA</th>
              </tr>
            </thead>
            <tbody>
              {adPerf.length === 0 && <tr><td colSpan="8" className="text-center text-gray-500 py-6">No data — sync hierarchy + insights, set utm_content={'{{ad.id}}'} on Meta URLs</td></tr>}
              {adPerf.map((r) => (
                <tr key={r.ad_id} className="border-t border-navy-600/20 text-white">
                  <td className="px-3 py-1.5 truncate max-w-[180px]">{r.ad_name || r.ad_id}</td>
                  <td className="text-right px-3">{money(r.spend)}</td>
                  <td className="text-right px-3">{fmt(r.clicks)}</td>
                  <td className="text-right px-3">{fmt(r.sessions)}</td>
                  <td className="text-right px-3">{fmt(r.orders)}</td>
                  <td className="text-right px-3">{money(r.revenue)}</td>
                  <td className={`text-right px-3 ${r.roas >= 1 ? 'text-green-400' : 'text-red-400'}`}>{r.roas}x</td>
                  <td className="text-right px-3">{money(r.cpa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-navy-900 border border-navy-600/30 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-white text-lg font-semibold mt-1">{value}</div>
    </div>
  )
}
