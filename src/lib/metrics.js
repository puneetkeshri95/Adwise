// Safe formula evaluator + value formatter for the shared Metrics Library.
// Formulas reference metric keys (eg. "total_revenue / total_spend") with
// arithmetic operators + parens + numeric literals only — same grammar the
// backend validates. We tokenize, then convert to RPN (shunting yard), then
// evaluate against a context dict of {metric_key: number}.
//
// This never uses eval()/Function() so it is XSS-safe even with attacker-
// controlled formulas (which the server already rejects on save anyway).

import {
  inr, indianNum, compact, pct, decimal, humanDuration,
} from './format'

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 }

function tokenize(expr) {
  const out = []
  let i = 0
  while (i < expr.length) {
    const ch = expr[i]
    if (/\s/.test(ch)) { i++; continue }
    if (ch === '(' || ch === ')' || '+-*/'.includes(ch)) {
      out.push(ch); i++; continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j++
      out.push({ ident: expr.slice(i, j) })
      i = j
      continue
    }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++
      out.push({ num: parseFloat(expr.slice(i, j)) })
      i = j
      continue
    }
    throw new Error(`Unexpected '${ch}' in formula`)
  }
  return out
}

function toRPN(tokens) {
  const out = []
  const stack = []
  for (const t of tokens) {
    if (typeof t === 'object' && ('num' in t || 'ident' in t)) {
      out.push(t)
    } else if (t === '(') {
      stack.push(t)
    } else if (t === ')') {
      while (stack.length && stack[stack.length - 1] !== '(') out.push(stack.pop())
      if (!stack.length) throw new Error('Unbalanced )')
      stack.pop()
    } else if (t in PREC) {
      while (stack.length && stack[stack.length - 1] !== '(' && PREC[stack[stack.length - 1]] >= PREC[t]) {
        out.push(stack.pop())
      }
      stack.push(t)
    }
  }
  while (stack.length) {
    const top = stack.pop()
    if (top === '(' || top === ')') throw new Error('Unbalanced parens')
    out.push(top)
  }
  return out
}

function evalRPN(rpn, ctx) {
  const stack = []
  for (const t of rpn) {
    if (typeof t === 'object' && 'num' in t) stack.push(t.num)
    else if (typeof t === 'object' && 'ident' in t) {
      const v = ctx?.[t.ident]
      stack.push(typeof v === 'number' && Number.isFinite(v) ? v : 0)
    } else {
      const b = stack.pop(); const a = stack.pop()
      if (t === '+') stack.push(a + b)
      else if (t === '-') stack.push(a - b)
      else if (t === '*') stack.push(a * b)
      else if (t === '/') stack.push(b === 0 ? 0 : a / b)
    }
  }
  return stack.length ? stack[stack.length - 1] : 0
}

/** Evaluate a metric formula against {metric_key: number} context. Returns 0 on error. */
export function evaluateFormula(formula, context) {
  if (!formula) return 0
  try {
    const rpn = toRPN(tokenize(formula))
    const v = evalRPN(rpn, context)
    return Number.isFinite(v) ? v : 0
  } catch {
    return 0
  }
}

/**
 * Look up a metric value from a context dict. For system metrics it's a direct
 * lookup. For custom metrics, evaluate the formula against the same context.
 */
export function resolveMetricValue(metric, context) {
  if (!metric) return 0
  if (metric.custom) return evaluateFormula(metric.formula, context)
  const v = context?.[metric.key]
  return typeof v === 'number' ? v : 0
}

/**
 * Pick a sensible display format for any metric based on its key/category.
 * Returns one of: 'inr' | 'inr2' | 'pct' | 'roas' | 'decimal' | 'number' | 'duration'.
 */
export function inferFormat(metric) {
  if (!metric) return 'number'
  const k = (metric.key || '').toLowerCase()
  const cat = (metric.category || '').toLowerCase()
  if (k === 'roas') return 'roas'
  if (k === 'avg_session_duration') return 'duration'
  // Money-like
  if (['total_revenue', 'reported_revenue', 'attribution_gap', 'profit', 'total_spend'].includes(k)) return 'inr'
  if (['cpm', 'cpc', 'cpa', 'cpl', 'cpvc', 'aov', 'cost_per_result'].includes(k)) return 'inr2'
  // Percent-like
  if (k.endsWith('_rate') || k === 'ctr' || k === 'unique_ctr' || k === 'lp_ctr' || k === 'hook_rate' ||
      k === 'hold_rate' || k.startsWith('view_') || k === 'completion_rate' || k === 'bounce_rate') {
    return 'pct'
  }
  // Counts
  if (['impressions', 'reach', 'clicks', 'unique_clicks', 'page_views', 'landing_page_views',
       'unique_sessions', 'new_visitors', 'returning_visitors', 'conversions',
       'video_views_3s'].includes(k)) return 'number'
  if (cat.includes('cost')) return 'inr2'
  if (cat.includes('revenue')) return 'inr'
  return 'decimal'
}

/** Format a numeric value using the chosen format token. */
export function formatMetricValue(value, format, { compactNumbers = false } = {}) {
  if (value == null || Number.isNaN(value)) return '—'
  switch (format) {
    case 'inr':       return compactNumbers ? compact(value, { withRupee: true }) : inr(value)
    case 'inr2':      return inr(value, { decimals: 2 })
    case 'pct':       return pct(value / 100, { decimals: 2 })
    case 'roas':      return `${(+value).toFixed(2)}x`
    case 'decimal':   return decimal(value, { decimals: 2 })
    case 'number':    return compactNumbers ? compact(value) : indianNum(value)
    case 'duration':  return humanDuration(value)
    default:          return indianNum(value)
  }
}
