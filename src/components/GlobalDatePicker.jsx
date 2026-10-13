// Global date range picker — context-aware. Drop into Topbar; every page reacts.
import { useEffect, useRef, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar, X, Check } from 'lucide-react'
import { useDateRange, rangeForPreset, toIsoDate } from '../contexts/DateRangeContext'
import { dateOnly } from '../lib/format'

export default function GlobalDatePicker() {
  const { preset, start, end, compare, setPreset, setCustom, setCompare, presets } = useDateRange()
  const [open, setOpen] = useState(false)
  const [tempStart, setTempStart] = useState(start)
  const [tempEnd, setTempEnd] = useState(end)
  const [tempPreset, setTempPreset] = useState(preset)
  const [tempCompare, setTempCompare] = useState(compare)
  const ref = useRef(null)

  useEffect(() => {
    if (open) {
      setTempStart(start); setTempEnd(end); setTempPreset(preset); setTempCompare(compare)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function pickPreset(p) {
    setTempPreset(p)
    if (p !== 'Custom') {
      const [s, e] = rangeForPreset(p)
      setTempStart(s); setTempEnd(e)
    }
  }

  function apply() {
    if (tempPreset === 'Custom') {
      setCustom(tempStart, tempEnd)
    } else {
      setPreset(tempPreset)
    }
    setCompare(tempCompare)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 bg-navy-800 border border-navy-600/30 rounded-lg px-3 py-2 hover:border-blue-500/40 transition"
      >
        <Calendar size={14} className="text-gray-400" />
        <span className="text-white text-xs font-medium">
          {dateOnly(start.toISOString())} – {dateOnly(end.toISOString())}
        </span>
        {compare && (
          <span className="ml-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-blue-600/20 text-blue-300 rounded">
            vs prev
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-navy-800 border border-navy-600/30 rounded-xl shadow-2xl flex overflow-hidden min-w-[700px]">
          <div className="w-52 border-r border-navy-600/30 py-3 max-h-[420px] overflow-y-auto">
            <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-gray-500 font-medium">Quick Select</div>
            {presets.map(p => (
              <button
                key={p}
                onClick={() => pickPreset(p)}
                className={`w-full text-left px-4 py-2 text-xs transition ${
                  tempPreset === p
                    ? 'bg-blue-600/20 text-white font-medium'
                    : 'text-gray-400 hover:bg-navy-700/50 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 text-xs">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">Start</div>
                  <div className="text-white bg-navy-700 px-3 py-1.5 rounded border border-navy-600/30">
                    {dateOnly(tempStart.toISOString())}
                  </div>
                </div>
                <span className="text-gray-500 mt-4">—</span>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">End</div>
                  <div className="text-white bg-navy-700 px-3 py-1.5 rounded border border-navy-600/30">
                    {dateOnly(tempEnd.toISOString())}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>

            <div className="flex gap-4">
              <DatePicker
                selected={tempStart}
                onChange={(d) => { setTempStart(d); setTempPreset('Custom') }}
                selectsStart startDate={tempStart} endDate={tempEnd} maxDate={tempEnd}
                inline calendarClassName="dark-calendar-inline"
              />
              <DatePicker
                selected={tempEnd}
                onChange={(d) => { setTempEnd(d); setTempPreset('Custom') }}
                selectsEnd startDate={tempStart} endDate={tempEnd} minDate={tempStart}
                inline calendarClassName="dark-calendar-inline"
              />
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy-600/30">
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <button
                  onClick={() => setTempCompare(v => !v)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                    tempCompare ? 'bg-blue-600 border-blue-600' : 'bg-navy-700 border-navy-600'
                  }`}
                >
                  {tempCompare && <Check size={10} className="text-white" />}
                </button>
                <span>Compare to previous period</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
                <button onClick={apply} className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
