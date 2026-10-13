import { useState, useEffect } from 'react'
import { X, Smartphone, Monitor, Tablet } from 'lucide-react'
import { conversionDetails as sampleDetails } from '../data/sampleData'
import { getConversionDetail } from '../api'

function DeviceIcon({ device }) {
  if (!device) return null
  const d = device.toLowerCase()
  if (d.includes('ipad') || d.includes('tablet')) return <Tablet size={10} className="text-gray-500" />
  if (d.includes('laptop') || d.includes('mac') || d.includes('windows')) return <Monitor size={10} className="text-gray-500" />
  return <Smartphone size={10} className="text-gray-500" />
}

function JourneyDot({ type, index }) {
  const colors = {
    first: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
    middle: 'bg-navy-700 text-gray-400 border-navy-600',
    last: 'bg-green-900/30 text-green-400 border-green-700/30',
  }
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium border flex-shrink-0 ${colors[type]}`}>
      {index + 1}
    </div>
  )
}

export default function ConversionDrawer({ ad, onClose }) {
  if (!ad) return null

  const conversions = sampleDetails[ad.id] || []

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-[380px] h-full bg-navy-800 border-l border-navy-600/40 overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-navy-800 border-b border-navy-600/40 px-5 py-4 flex items-center justify-between z-10">
          <span className="text-sm font-medium text-white">Conversion Detail</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Ad info */}
          <div className="mb-5">
            <div className="text-[11px] text-gray-400 mb-1">Ad name</div>
            <div className="text-sm font-medium text-white">{ad.name}</div>
          </div>

          {/* Attribution cards */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            <div className="bg-navy-700/50 border border-navy-600/30 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">First Touch</div>
              <div className="text-lg font-semibold text-accent-blue mt-0.5">{ad.first}</div>
            </div>
            <div className="bg-navy-700/50 border border-navy-600/30 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Last Touch</div>
              <div className="text-lg font-semibold text-green-400 mt-0.5">{ad.last}</div>
            </div>
            <div className="bg-navy-700/50 border border-navy-600/30 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Assisted</div>
              <div className="text-lg font-semibold text-white mt-0.5">{ad.assisted}</div>
            </div>
            <div className="bg-navy-700/50 border border-navy-600/30 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">ROAS</div>
              <div className={`text-lg font-semibold mt-0.5 ${ad.roas >= 5 ? 'text-green-400' : ad.roas >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                {ad.roas ? ad.roas + 'x' : '–'}
              </div>
            </div>
          </div>

          {/* Avg position */}
          {ad.avgPosition && ad.avgPosition !== '-' && (
            <div className="mb-6 px-3 py-2 bg-navy-700/30 rounded-lg border border-navy-600/20 text-xs text-gray-400">
              Avg position in journey: <span className="text-white font-medium">{ad.avgPosition}</span>
            </div>
          )}

          {/* Recent conversions */}
          <div className="text-xs font-medium text-white mb-4 pb-2 border-b border-navy-600/30">
            Recent Conversions {conversions.length > 0 && <span className="text-gray-500">({conversions.length})</span>}
          </div>

          {conversions.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-6">No conversions recorded for this ad.</div>
          ) : (
            <div className="space-y-4">
              {conversions.map((cv, idx) => (
                <div key={idx} className="pb-4 border-b border-navy-600/20 last:border-0">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-[13px] font-medium text-white">{cv.name}</div>
                      <div className="text-[11px] text-gray-500">{cv.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-medium text-green-400">{cv.amount}</div>
                    </div>
                  </div>

                  {/* Order + time */}
                  <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-500">
                    <span>{cv.orderId}</span>
                    <span>·</span>
                    <span>{cv.time}</span>
                    <span>·</span>
                    <DeviceIcon device={cv.device} />
                    <span>{cv.device}</span>
                  </div>

                  {/* Journey */}
                  <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide font-medium">Journey</div>
                  <div className="space-y-2">
                    {cv.journey.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="flex flex-col items-center">
                          <JourneyDot type={step.type} index={i} />
                          {i < cv.journey.length - 1 && (
                            <div className="w-px h-4 bg-navy-600 mt-0.5" />
                          )}
                        </div>
                        <div className="pt-0.5">
                          <div className="text-[11px] text-gray-300">{step.ad}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                            <span>{step.date}</span>
                            <span>·</span>
                            <DeviceIcon device={step.device} />
                            <span>{step.device}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
