// SalesModal — list of conversions for a campaign, with click-through to JourneyView.
// Spec layout: Name | Email/Phone | Amount (green) | Received At | View Journey link.
import { useEffect, useState } from 'react'
import { X, ArrowLeft, Mail, Phone } from 'lucide-react'
import { getSales } from '../api'
import { inr, dateTime } from '../lib/format'
import JourneyView from './JourneyView'

export default function SalesModal({ campaignName, dateFrom, dateTo, onClose }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeJourney, setActiveJourney] = useState(null) // { id, name }

  useEffect(() => {
    let alive = true
    getSales({ dateFrom, dateTo, campaign: campaignName })
      .then(d => { if (alive) { setSales(d); setLoading(false) } })
      .catch(e => { if (alive) { setError(e.message); setLoading(false) } })
    return () => { alive = false }
  }, [campaignName, dateFrom, dateTo])

  function close() { setActiveJourney(null); onClose() }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={close}>
      <div
        className="w-full md:max-w-3xl bg-navy-800 border border-navy-600/40 md:rounded-xl rounded-t-xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-navy-600/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeJourney && (
              <button onClick={() => setActiveJourney(null)} className="text-gray-400 hover:text-white">
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h3 className="text-white font-semibold">
                {activeJourney ? `Journey — ${activeJourney.name}` : 'Sales'}
              </h3>
              {!activeJourney && (
                <p className="text-gray-500 text-xs mt-0.5">
                  {campaignName} · {sales.length} conversions
                </p>
              )}
            </div>
          </div>
          <button onClick={close} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {activeJourney ? (
            <JourneyView orderPk={activeJourney.id} />
          ) : (
            <div>
              {loading && <div className="p-8 text-center text-gray-500 text-sm">Loading sales…</div>}
              {error && <div className="m-5 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded text-xs">{error}</div>}
              {!loading && sales.length === 0 && (
                <div className="p-10 text-center text-gray-500 text-sm">No conversions in this window for {campaignName}.</div>
              )}
              {!loading && sales.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy-900/50 border-b border-navy-600/30">
                      <th className="text-left text-[11px] uppercase tracking-wider text-gray-400 px-4 py-2">Name</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-gray-400 px-4 py-2">Email / Phone</th>
                      <th className="text-right text-[11px] uppercase tracking-wider text-gray-400 px-4 py-2">Amount</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-gray-400 px-4 py-2">Received At</th>
                      <th className="text-right text-[11px] uppercase tracking-wider text-gray-400 px-4 py-2">Journey</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(s => (
                      <tr key={s.id} className="border-t border-navy-700/40 hover:bg-navy-700/40">
                        <td className="px-4 py-2.5 text-white">{s.name || <span className="text-gray-500">Anonymous</span>}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-0.5 text-xs">
                            {s.email && <span className="text-gray-300 inline-flex items-center gap-1.5"><Mail size={10} />{s.email}</span>}
                            {s.phone && <span className="text-gray-400 inline-flex items-center gap-1.5"><Phone size={10} />{s.phone}</span>}
                            {!s.email && !s.phone && <span className="text-gray-600">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-300 font-medium">{inr(s.amount)}</td>
                        <td className="px-4 py-2.5 text-gray-300 text-xs">{dateTime(s.received_at)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => setActiveJourney({ id: s.id, name: s.name || 'Anonymous' })}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            View Journey →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
