const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('trackr_token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
    ...options,
  })

  if (res.status === 401) {
    localStorage.removeItem('trackr_token')
    localStorage.removeItem('trackr_user')
    throw new Error('Unauthorized')
  }

  if (res.status === 204) return null

  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

// ---- Auth ----
export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem('trackr_token', data.access_token)
  return data
}

export async function register(email, password, name, company = '') {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, company }),
  })
  return data
}

export async function getMe() {
  return request('/auth/me')
}

// ---- Dashboard ----
export async function getKPIs() {
  return request('/dashboard/kpis')
}

export async function getCampaigns() {
  return request('/dashboard/campaigns')
}

export async function getConversions(limit = 50, offset = 0) {
  return request(`/dashboard/conversions?limit=${limit}&offset=${offset}`)
}

export async function getConversionDetail(id) {
  return request(`/dashboard/conversions/${id}`)
}

export async function getVisitors(limit = 50, offset = 0) {
  return request(`/dashboard/visitors?limit=${limit}&offset=${offset}`)
}

// ---- Pixel ----
export async function getPixelStats() {
  return request('/dashboard/pixel-stats')
}

export async function getPixelSnippet() {
  return request('/auth/pixel-snippet')
}

// ---- Sync ----
export async function syncMeta() {
  return request('/meta/sync/hierarchy', { method: 'POST' })
}

export async function syncMetaInsights(datePreset = 'last_30d', { dateFrom, dateTo } = {}) {
  const params = new URLSearchParams({ date_preset: datePreset })
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  return request(`/meta/sync/insights?${params}`, { method: 'POST' })
}

export async function recomputeAttribution() {
  return request('/sync/attribution', { method: 'POST' })
}

// ---- Meta ----
export async function getMetaConnection() {
  return request('/meta/connection')
}

export async function disconnectMeta() {
  return request('/meta/connection', { method: 'DELETE' })
}

export async function getMetaAdAccounts() {
  return request('/meta/ad-accounts')
}

export async function selectMetaAdAccount(adAccountId) {
  return request(`/meta/select-account?ad_account_id=${encodeURIComponent(adAccountId)}`, { method: 'POST' })
}

export async function getMetaOAuthUrl() {
  return request('/meta/oauth/url')
}

export async function getMetaCampaigns() {
  return request('/meta/campaigns')
}

export async function getMetaInsights({ level = 'campaign', objectId, dateFrom, dateTo } = {}) {
  const params = new URLSearchParams({ level })
  if (objectId) params.append('object_id', objectId)
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  return request(`/meta/insights?${params}`)
}

export async function getMetaSummary({ dateFrom, dateTo } = {}) {
  const params = new URLSearchParams()
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  const qs = params.toString()
  return request(`/meta/summary${qs ? '?' + qs : ''}`)
}

// ---- Reporting ----
export async function getAdPerformance({ dateFrom, dateTo } = {}) {
  const params = new URLSearchParams()
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  const qs = params.toString()
  return request(`/reporting/ad-performance${qs ? '?' + qs : ''}`)
}

// ---- Analytics ----
export async function getFunnel({ dateFrom, dateTo } = {}) {
  const params = new URLSearchParams()
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  const qs = params.toString()
  return request(`/analytics/funnel${qs ? '?' + qs : ''}`)
}

export async function getByAd({ dateFrom, dateTo } = {}) {
  const params = new URLSearchParams()
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  const qs = params.toString()
  return request(`/analytics/by-ad${qs ? '?' + qs : ''}`)
}

export async function getJourney(visitorId) {
  return request(`/journeys?visitor_id=${visitorId}`)
}

// ---- Tracking ----
export async function trackEvent(payload) {
  return request('/track', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ---- Webhooks ----
export async function getWebhookConfig() {
  return request('/webhooks/config')
}

// ---- AI Chat ----
export async function sendChatMessage(message, history = []) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  })
}

// ---- Auth state ----
export function isAuthenticated() {
  return !!localStorage.getItem('trackr_token')
}

export function logout() {
  localStorage.removeItem('trackr_token')
  localStorage.removeItem('trackr_user')
}

// ---- Dashboard v2 (date-filtered, with deltas) ----
export async function getDashboardOverview({ dateFrom, dateTo, compare = false } = {}) {
  const params = new URLSearchParams()
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  if (compare) params.append('compare', 'true')
  return request(`/dashboard/overview?${params}`)
}

export async function getSales({ dateFrom, dateTo, campaign, limit = 200 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  if (campaign) params.append('campaign_name', campaign)
  return request(`/dashboard/sales?${params}`)
}

export async function getJourneyForOrder(orderPk) {
  return request(`/dashboard/journey/${orderPk}`)
}

// ---- Reporting v2 ----
export async function getReportingCampaigns({ dateFrom, dateTo } = {}) {
  const params = new URLSearchParams()
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  return request(`/reporting/campaigns?${params}`)
}

export async function getReportingTotals({ dateFrom, dateTo } = {}) {
  const params = new URLSearchParams()
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  return request(`/reporting/totals?${params}`)
}

// ---- Metrics Library ----
export async function getMetricsLibrary() {
  return request('/metrics/library')
}

export async function createCustomMetric(body) {
  return request('/metrics/custom', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateCustomMetric(id, body) {
  return request(`/metrics/custom/${id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export async function deleteCustomMetric(id) {
  return request(`/metrics/custom/${id}`, { method: 'DELETE' })
}

// ---- Behaviour ----
export async function getBehaviour({ dateFrom, dateTo } = {}) {
  const params = new URLSearchParams()
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  return request(`/dashboard/behaviour?${params}`)
}

