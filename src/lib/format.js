// Indian-format helpers and timezone-aware date formatting for the AdWise UI.

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const INR2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat('en-IN');

/** ₹4,19,659  (Indian comma grouping). */
export function inr(n, { decimals = 0 } = {}) {
  if (n == null || isNaN(n)) return '—';
  return decimals === 0 ? INR.format(n) : INR2.format(n);
}

/** 4,19,659  (no currency symbol). */
export function indianNum(n) {
  if (n == null || isNaN(n)) return '—';
  return NUM.format(n);
}

/** 4.19L / 1.2Cr / 12.5K — short scale for charts and large counts. */
export function compact(n, { withRupee = false } = {}) {
  if (n == null || isNaN(n)) return '—';
  const prefix = withRupee ? '₹' : '';
  const a = Math.abs(n);
  if (a >= 1e7) return `${prefix}${(n / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${prefix}${(n / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `${prefix}${(n / 1e3).toFixed(1)} K`;
  return `${prefix}${Math.round(n)}`;
}

export function pct(n, { decimals = 2, signed = false } = {}) {
  if (n == null || isNaN(n)) return '—';
  const sign = signed && n > 0 ? '+' : '';
  return `${sign}${Number(n).toFixed(decimals)}%`;
}

export function decimal(n, { decimals = 2 } = {}) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toFixed(decimals);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1 Jun 2026, 5:15 AM" — IST (Asia/Kolkata) by default. */
export function dateTime(iso, { tz = 'Asia/Kolkata' } = {}) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    // Convert to target tz via toLocaleString trick
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(d);
    const get = (t) => parts.find(p => p.type === t)?.value || '';
    return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} ${get('dayPeriod') || ''}`.trim();
  } catch {
    return '—';
  }
}

export function dateOnly(iso, { tz = 'Asia/Kolkata' } = {}) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).formatToParts(d);
    const get = (t) => parts.find(p => p.type === t)?.value || '';
    return `${get('day')} ${get('month')} ${get('year')}`;
  } catch {
    return '—';
  }
}

export function timeOnly(iso, { tz = 'Asia/Kolkata' } = {}) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(d);
  } catch { return '—'; }
}

export function relativeFromNow(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} days ago`;
  return dateOnly(iso);
}

/** "17 minutes" / "2 days 54 minutes" / "3 minutes". */
export function humanDuration(seconds) {
  if (!seconds || seconds < 0) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (mins || (!days && !hours)) parts.push(`${mins} minute${mins !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

/** Returns "+0 min" / "+4 min" / "+2 days 0 min" between two ISO timestamps. */
export function deltaSince(firstIso, currIso) {
  if (!firstIso || !currIso) return '+0 min';
  const seconds = Math.max(0, (new Date(currIso).getTime() - new Date(firstIso).getTime()) / 1000);
  return `+${humanDuration(seconds)}`;
}

/** Color-by-direction helper for delta badges. */
export function deltaColor(deltaPct, direction) {
  if (deltaPct == null) return 'text-slate-500 bg-slate-100';
  if (deltaPct === 0) return 'text-slate-500 bg-slate-100';
  // For metrics where lower is better, invert the sign for color logic
  const effective = direction === 'lower' ? -deltaPct : deltaPct;
  if (effective > 0) return 'text-emerald-700 bg-emerald-50';
  return 'text-rose-700 bg-rose-50';
}

export function deltaArrow(deltaPct) {
  if (deltaPct == null || deltaPct === 0) return '—';
  return deltaPct > 0 ? '▲' : '▼';
}
