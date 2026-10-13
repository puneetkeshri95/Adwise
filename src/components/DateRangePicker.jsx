import { useState, useRef, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar, X } from 'lucide-react'

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'This Week (Sun-Today)', days: 'this_week' },
  { label: 'Last Week (Sun-Sat)', days: 'last_week' },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 28 days', days: 28 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 120 days', days: 120 },
]

function getPresetRange(preset) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (preset.days === 0) return { start: new Date(now), end: new Date(now) }
  if (preset.days === 1) {
    const y = new Date(now); y.setDate(y.getDate() - 1)
    return { start: y, end: y }
  }
  if (preset.days === 'this_week') {
    const start = new Date(now)
    start.setDate(start.getDate() - start.getDay())
    return { start, end: new Date(now) }
  }
  if (preset.days === 'last_week') {
    const end = new Date(now)
    end.setDate(end.getDate() - end.getDay() - 1)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    return { start, end }
  }
  const start = new Date(now)
  start.setDate(start.getDate() - preset.days)
  return { start, end: new Date(now) }
}

function fmtShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false)
  const [tempStart, setTempStart] = useState(startDate)
  const [tempEnd, setTempEnd] = useState(endDate)
  const [activePreset, setActivePreset] = useState('Last 30 days')
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function applyPreset(preset) {
    const { start, end } = getPresetRange(preset)
    setTempStart(start)
    setTempEnd(end)
    setActivePreset(preset.label)
  }

  function handleApply() {
    onChange(tempStart, tempEnd)
    setOpen(false)
  }

  function handleCancel() {
    setTempStart(startDate)
    setTempEnd(endDate)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-navy-800 border border-navy-600/30 rounded-lg px-4 py-2 hover:border-blue-500/40 transition"
      >
        <Calendar size={14} className="text-gray-400" />
        <span className="text-white text-xs font-medium">
          {fmtShort(startDate)} - {fmtShort(endDate)}
        </span>
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-navy-800 border border-navy-600/30 rounded-xl shadow-2xl flex overflow-hidden min-w-[680px]">
          {/* Presets Sidebar */}
          <div className="w-44 border-r border-navy-600/30 py-3">
            <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-gray-500 font-medium">Quick Select</div>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`w-full text-left px-4 py-2 text-xs transition ${
                  activePreset === p.label
                    ? 'bg-blue-600/20 text-white font-medium'
                    : 'text-gray-400 hover:bg-navy-700/50 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar Area */}
          <div className="flex-1 p-4">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">Start Date</div>
                  <div className="text-xs text-white bg-navy-700 px-3 py-1.5 rounded border border-navy-600/30">
                    {fmtShort(tempStart)}
                  </div>
                </div>
                <span className="text-gray-500 mt-4">—</span>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">End Date</div>
                  <div className="text-xs text-white bg-navy-700 px-3 py-1.5 rounded border border-navy-600/30">
                    {fmtShort(tempEnd)}
                  </div>
                </div>
              </div>
              <button onClick={handleCancel} className="text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Dual Calendars */}
            <div className="flex gap-4">
              <DatePicker
                selected={tempStart}
                onChange={(date) => { setTempStart(date); setActivePreset('Custom') }}
                selectsStart
                startDate={tempStart}
                endDate={tempEnd}
                maxDate={tempEnd}
                inline
                calendarClassName="dark-calendar-inline"
              />
              <DatePicker
                selected={tempEnd}
                onChange={(date) => { setTempEnd(date); setActivePreset('Custom') }}
                selectsEnd
                startDate={tempStart}
                endDate={tempEnd}
                minDate={tempStart}
                maxDate={new Date()}
                inline
                calendarClassName="dark-calendar-inline"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-navy-600/30">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
