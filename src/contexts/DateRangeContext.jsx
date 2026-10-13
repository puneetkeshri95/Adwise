// Global date range context — every page reads from this.
// Persists to localStorage so refreshes / nav preserve the user's selection.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'adwise_date_range_v1';

const PRESETS = [
  'Today', 'Yesterday', 'This Week', 'Last Week',
  'Last 7 days', 'Last 14 days', 'Last 28 days', 'Last 30 days',
  'Last 90 days', 'Last 120 days',
  'This Month', 'Last Month',
  'Demo Window (May 2026)',
  'Custom',
];

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export function rangeForPreset(preset) {
  const today = startOfDay(new Date());
  switch (preset) {
    case 'Today': return [today, endOfDay(today)];
    case 'Yesterday': {
      const y = addDays(today, -1);
      return [y, endOfDay(y)];
    }
    case 'This Week': {
      const day = today.getDay();
      const monday = addDays(today, -((day + 6) % 7));
      return [monday, endOfDay(today)];
    }
    case 'Last Week': {
      const day = today.getDay();
      const thisMonday = addDays(today, -((day + 6) % 7));
      const lastMonday = addDays(thisMonday, -7);
      return [lastMonday, endOfDay(addDays(thisMonday, -1))];
    }
    case 'Last 7 days': return [addDays(today, -6), endOfDay(today)];
    case 'Last 14 days': return [addDays(today, -13), endOfDay(today)];
    case 'Last 28 days': return [addDays(today, -27), endOfDay(today)];
    case 'Last 30 days': return [addDays(today, -29), endOfDay(today)];
    case 'Last 90 days': return [addDays(today, -89), endOfDay(today)];
    case 'Last 120 days': return [addDays(today, -119), endOfDay(today)];
    case 'This Month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return [first, endOfDay(today)];
    }
    case 'Last Month': {
      const firstThis = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastPrev = endOfDay(addDays(firstThis, -1));
      const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
      return [firstPrev, lastPrev];
    }
    case 'Demo Window (May 2026)':
      return [new Date(2026, 4, 1), endOfDay(new Date(2026, 4, 30))];
    default:
      return [addDays(today, -29), endOfDay(today)];
  }
}

/** ISO date (YYYY-MM-DD) in local time — used for query string. */
export function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DateRangeContext = createContext(null);

export function DateRangeProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const j = JSON.parse(raw);
        return {
          preset: j.preset || 'Last 30 days',
          startDate: j.startDate ? new Date(j.startDate) : null,
          endDate: j.endDate ? new Date(j.endDate) : null,
          compare: !!j.compare,
        };
      }
    } catch { /* ignore */ }
    // Default for the demo: prefer the demo window if it has data
    return {
      preset: 'Demo Window (May 2026)',
      startDate: null,
      endDate: null,
      compare: true,
    };
  });

  // Resolve actual dates from preset
  const [start, end] = useMemo(() => {
    if (state.preset === 'Custom' && state.startDate && state.endDate) {
      return [state.startDate, state.endDate];
    }
    return rangeForPreset(state.preset);
  }, [state.preset, state.startDate, state.endDate]);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        preset: state.preset,
        startDate: state.startDate?.toISOString() || null,
        endDate: state.endDate?.toISOString() || null,
        compare: state.compare,
      }));
    } catch { /* ignore */ }
  }, [state]);

  const setPreset = useCallback((preset) => {
    setState((s) => ({ ...s, preset, startDate: null, endDate: null }));
  }, []);

  const setCustom = useCallback((s, e) => {
    setState((p) => ({ ...p, preset: 'Custom', startDate: s, endDate: e }));
  }, []);

  const setCompare = useCallback((compare) => {
    setState((s) => ({ ...s, compare }));
  }, []);

  const value = {
    ...state,
    start, end,
    isoStart: toIsoDate(start), isoEnd: toIsoDate(end),
    setPreset, setCustom, setCompare,
    presets: PRESETS,
  };

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error('useDateRange must be used within DateRangeProvider');
  return ctx;
}
