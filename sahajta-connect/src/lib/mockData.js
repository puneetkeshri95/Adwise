// Deterministic-ish mock data utility. Uses a seeded PRNG so numbers feel consistent
// per session per platform but vary meaningfully on refresh (drift).

function mulberry32(seed) {
  let t = seed >>> 0
  return function () {
    t = (t + 0x6D2B79F5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const HANDLES = {
  instagram: ['@ridhima.studio', '@aakash.builds', '@moksha.creative', '@indus.wellness', '@paperkite.co'],
  facebook: ['Sahajta Coffee Co.', 'Verdant Living', 'Mint Studio', 'Northlight Homes', 'Kavya Fashion'],
  x: ['@aakash_x', '@productbyriya', '@northlight_hq', '@paperkite', '@kavya_co'],
  youtube: ['Sahajta Studio', 'Aakash Builds', 'Verdant Kitchen', 'Northlight Homes', 'Kavya Style Diaries'],
}

const AVATAR_COLORS = ['#F58529', '#1877F2', '#0F1419', '#FF0000', '#8B5CF6', '#10B981', '#EC4899']

const CAPTIONS = {
  instagram: [
    'Weekend recap 🌿 — behind the scenes of our new drop',
    'POV: your first cup on a Sunday morning ☕',
    'Reel: how we shot the campaign in one take',
    '5 things we wish we knew before launching',
    'New collection — quietly obsessed',
    'A tour of our studio, finally finished',
    'One year in — thank you for showing up',
  ],
  facebook: [
    'We\'re open on Sunday! Here\'s what we\'re serving.',
    'Q&A: Everything you asked about the new collection',
    'Meet the team behind the launch — a short story',
    'Big announcement inside 👇',
    'Photos from yesterday\'s community event',
    'Behind the scenes of our biggest campaign yet',
    'Case study: how we grew 3x in 90 days',
  ],
  x: [
    'shipping quietly is underrated',
    'a small update on what we\'ve been building →',
    'okay this one hit different. thread ↓',
    'you don\'t need a bigger team, you need a clearer week.',
    'the small stuff compounds. build it anyway.',
    'week in review — 3 wins, 1 loss, 1 lesson',
    'new drop is live. link in bio.',
  ],
  youtube: [
    'How we built our brand from ₹0 to ₹1 Cr — no ads',
    'Studio tour 2026 — everything you asked about',
    'A day in the life of a founder in Bangalore',
    'Redesigning our packaging — the full process',
    'Launch week vlog: what actually happened',
    'The truth about running a product company',
    'Full campaign shoot — start to finish',
  ],
}

const COMMENT_TEMPLATES = [
  { text: 'This is honestly so beautiful. Ordered instantly ✨', sentiment: 'positive' },
  { text: 'Love the packaging redesign — feels premium now.', sentiment: 'positive' },
  { text: 'Waited ages for this. Worth every rupee.', sentiment: 'positive' },
  { text: 'The color story on this is chef\'s kiss.', sentiment: 'positive' },
  { text: 'When are you restocking? Been checking daily.', sentiment: 'neutral' },
  { text: 'Great work but shipping to Chennai took forever.', sentiment: 'negative' },
  { text: 'How much did the whole setup cost you?', sentiment: 'neutral' },
  { text: 'Not a fan of the new logo tbh.', sentiment: 'negative' },
  { text: 'You should try a collab with @moksha.creative', sentiment: 'neutral' },
  { text: 'This is exactly what I needed today. Thank you.', sentiment: 'positive' },
  { text: 'Content quality is next level.', sentiment: 'positive' },
  { text: 'Site keeps crashing on checkout :(', sentiment: 'negative' },
]

const CONTENT_TYPES = {
  instagram: ['Reel', 'Post', 'Carousel', 'Story'],
  facebook: ['Post', 'Video', 'Photo', 'Link'],
  x: ['Tweet', 'Thread', 'Media', 'Reply'],
  youtube: ['Video', 'Short', 'Live', 'Premiere'],
}

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)] }
function between(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min }

function seedFor(platformId, extra = 0) {
  const base = { instagram: 101, facebook: 202, x: 303, youtube: 404 }[platformId] || 500
  return base + extra
}

// Realistic scales per platform
const PLATFORM_SCALES = {
  instagram: { followerMin: 8_000, followerMax: 320_000, viewsMult: 1.0, engMult: 1.6 },
  facebook: { followerMin: 12_000, followerMax: 450_000, viewsMult: 0.7, engMult: 0.6 },
  x: { followerMin: 3_000, followerMax: 180_000, viewsMult: 1.2, engMult: 0.8 },
  youtube: { followerMin: 5_000, followerMax: 800_000, viewsMult: 2.4, engMult: 0.9 },
}

export function generateMockAccount(platformId) {
  const seed = seedFor(platformId, Math.floor(Math.random() * 50))
  const rng = mulberry32(seed)
  const handle = pick(rng, HANDLES[platformId] || ['@brand'])
  const scale = PLATFORM_SCALES[platformId]
  const followers = between(rng, scale.followerMin, scale.followerMax)
  const following = between(rng, 200, 2400)
  const avatarColor = pick(rng, AVATAR_COLORS)
  return { seed, handle, followers, following, avatarColor, verified: rng() > 0.55 }
}

// Generate a time series (last N days) of daily views for a platform
function generateTimeSeries(rng, platformId, days = 90) {
  const scale = PLATFORM_SCALES[platformId]
  const base = between(rng, 4000, 25000) * scale.viewsMult
  const trend = 0.0006 + rng() * 0.002 // small upward trend
  const seasonality = 0.14 + rng() * 0.18
  const noise = 0.22

  const now = new Date()
  const series = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const t = days - i
    const dow = d.getDay()
    const weekendBoost = (dow === 0 || dow === 6) ? 1 + seasonality * 0.4 : 1
    const wobble = 1 + (rng() * 2 - 1) * noise
    const value = Math.max(0, base * (1 + trend * t) * weekendBoost * wobble)
    series.push({
      date: d.toISOString().slice(0, 10),
      views: Math.round(value),
      reach: Math.round(value * (0.62 + rng() * 0.18)),
      engagement: Math.round(value * scale.engMult * (0.04 + rng() * 0.05)),
    })
  }
  return series
}

function generatePosts(rng, platformId, account, count = 12) {
  const scale = PLATFORM_SCALES[platformId]
  const captions = CAPTIONS[platformId]
  const types = CONTENT_TYPES[platformId]
  const posts = []
  for (let i = 0; i < count; i++) {
    const views = between(rng, 2500, 180_000) * scale.viewsMult
    const reach = Math.round(views * (0.55 + rng() * 0.25))
    const likes = Math.round(views * (0.03 + rng() * 0.07))
    const comments = Math.round(views * (0.004 + rng() * 0.012))
    const shares = Math.round(views * (0.002 + rng() * 0.008))
    const engagementRate = ((likes + comments + shares) / Math.max(1, views)) * 100
    const daysAgo = between(rng, 0, 89)
    const publishedAt = new Date()
    publishedAt.setDate(publishedAt.getDate() - daysAgo)
    posts.push({
      id: `${platformId}-post-${i}-${account.seed}`,
      platform: platformId,
      caption: captions[i % captions.length],
      type: pick(rng, types),
      thumbnailColor: pick(rng, AVATAR_COLORS),
      views: Math.round(views),
      reach,
      likes,
      comments,
      shares,
      engagementRate: Number(engagementRate.toFixed(2)),
      publishedAt: publishedAt.toISOString(),
    })
  }
  return posts.sort((a, b) => b.views - a.views)
}

function generateComments(rng, platformId, posts, count = 8) {
  const out = []
  for (let i = 0; i < count; i++) {
    const tpl = COMMENT_TEMPLATES[Math.floor(rng() * COMMENT_TEMPLATES.length)]
    const post = posts[Math.floor(rng() * Math.min(6, posts.length))]
    const author = pick(rng, ['ridhima_k', 'aakash.b', 'moksha_', 'north_light', 'paperkite', 'kavya.co', 'the.new.era', 'saanvi_writes'])
    const hoursAgo = between(rng, 1, 96)
    out.push({
      id: `${platformId}-c-${i}`,
      platform: platformId,
      author: `@${author}`,
      text: tpl.text,
      sentiment: tpl.sentiment,
      likes: between(rng, 0, 240),
      postCaption: post?.caption?.slice(0, 60) || '—',
      hoursAgo,
    })
  }
  return out.sort((a, b) => a.hoursAgo - b.hoursAgo)
}

function summarize(timeSeries, posts, account) {
  const totals = timeSeries.reduce((acc, d) => ({
    views: acc.views + d.views,
    reach: acc.reach + d.reach,
    engagement: acc.engagement + d.engagement,
  }), { views: 0, reach: 0, engagement: 0 })
  return {
    posts: posts.length,
    views: totals.views,
    reach: totals.reach,
    engagement: totals.engagement,
    followers: account.followers,
    engagementRate: totals.views ? Number(((totals.engagement / totals.views) * 100).toFixed(2)) : 0,
  }
}

export function generateMockPlatformData(platformId, seed) {
  const rng = mulberry32(seed || seedFor(platformId))
  // Rehydrate account for consistency
  const scale = PLATFORM_SCALES[platformId]
  const account = {
    seed,
    handle: pick(rng, HANDLES[platformId] || ['@brand']),
    followers: between(rng, scale.followerMin, scale.followerMax),
  }
  const timeSeries = generateTimeSeries(rng, platformId, 90)
  const posts = generatePosts(rng, platformId, account, 14)
  const comments = generateComments(rng, platformId, posts, 8)
  const summary = summarize(timeSeries, posts, account)
  // Previous-period comparisons for deltas
  const half = Math.floor(timeSeries.length / 2)
  const currentHalf = timeSeries.slice(half)
  const prevHalf = timeSeries.slice(0, half)
  const sum = (arr, k) => arr.reduce((a, x) => a + x[k], 0)
  const deltas = {
    views: prevHalf.length ? ((sum(currentHalf, 'views') - sum(prevHalf, 'views')) / Math.max(1, sum(prevHalf, 'views'))) * 100 : 0,
    reach: prevHalf.length ? ((sum(currentHalf, 'reach') - sum(prevHalf, 'reach')) / Math.max(1, sum(prevHalf, 'reach'))) * 100 : 0,
    engagement: prevHalf.length ? ((sum(currentHalf, 'engagement') - sum(prevHalf, 'engagement')) / Math.max(1, sum(prevHalf, 'engagement'))) * 100 : 0,
    posts: (rng() * 20 - 6),
  }
  return { timeSeries, posts, comments, summary, deltas }
}

// Called on "Sync Now" — nudges numbers so it feels alive
export function refreshPlatformData(platformId, seed, previous) {
  const drift = seedFor(platformId, Math.floor(Math.random() * 999))
  const fresh = generateMockPlatformData(platformId, drift)
  if (!previous) return fresh
  // Preserve original scale to feel incremental, add subtle drift
  return {
    ...fresh,
    summary: {
      ...fresh.summary,
      followers: previous.summary.followers + Math.floor(Math.random() * 800 - 100),
    },
  }
}

// Aggregate across an array of platform data objects
export function aggregateData(dataList) {
  if (!dataList.length) return null
  const summary = dataList.reduce((acc, d) => ({
    views: acc.views + d.summary.views,
    reach: acc.reach + d.summary.reach,
    engagement: acc.engagement + d.summary.engagement,
    posts: acc.posts + d.summary.posts,
    followers: acc.followers + d.summary.followers,
  }), { views: 0, reach: 0, engagement: 0, posts: 0, followers: 0 })
  summary.engagementRate = summary.views ? Number(((summary.engagement / summary.views) * 100).toFixed(2)) : 0

  // Merge time series by date
  const map = new Map()
  for (const d of dataList) {
    for (const point of d.timeSeries) {
      const existing = map.get(point.date) || { date: point.date, views: 0, reach: 0, engagement: 0 }
      existing.views += point.views
      existing.reach += point.reach
      existing.engagement += point.engagement
      map.set(point.date, existing)
    }
  }
  const timeSeries = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Top posts across
  const posts = dataList.flatMap(d => d.posts).sort((a, b) => b.views - a.views).slice(0, 20)
  const comments = dataList.flatMap(d => d.comments).sort((a, b) => a.hoursAgo - b.hoursAgo).slice(0, 10)

  // Aggregate deltas — weighted by views
  const totalViews = dataList.reduce((a, d) => a + d.summary.views, 0) || 1
  const deltas = dataList.reduce((acc, d) => {
    const w = d.summary.views / totalViews
    return {
      views: acc.views + d.deltas.views * w,
      reach: acc.reach + d.deltas.reach * w,
      engagement: acc.engagement + d.deltas.engagement * w,
      posts: acc.posts + d.deltas.posts * w,
    }
  }, { views: 0, reach: 0, engagement: 0, posts: 0 })

  return { summary, timeSeries, posts, comments, deltas }
}
