// Platform metadata used throughout the app. Colors picked to feel branded but not garish.
// The actual brand glyphs live in src/components/BrandGlyphs.jsx and are wired via PlatformIcon.
export const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    gradient: 'linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)',
    tintClass: 'from-pink-500/15 to-orange-400/10',
    accountKind: 'Creator account',
    fakeAuthCopy: 'You are signing in to Sahajta Connect using Instagram Login. We only request read access to your posts and insights.',
    permissions: ['Read posts & insights', 'Read comments', 'Read audience metrics'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    gradient: 'linear-gradient(135deg, #4267B2 0%, #1877F2 100%)',
    tintClass: 'from-blue-600/15 to-blue-400/10',
    accountKind: 'Page',
    fakeAuthCopy: 'Sahajta Connect is requesting access to your Facebook Pages and their published content insights.',
    permissions: ['manage_pages', 'read_insights', 'pages_read_engagement'],
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    color: '#0F1419',
    lightColor: '#E7E9EA',
    gradient: 'linear-gradient(135deg, #1D1F23 0%, #0F1419 100%)',
    tintClass: 'from-slate-500/15 to-slate-700/10',
    accountKind: 'Profile',
    fakeAuthCopy: 'Sahajta Connect is requesting access to your public profile and tweet analytics.',
    permissions: ['tweet.read', 'users.read', 'offline.access'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    gradient: 'linear-gradient(135deg, #FF0000 0%, #C4302B 100%)',
    tintClass: 'from-red-500/15 to-red-700/10',
    accountKind: 'Channel',
    fakeAuthCopy: 'Sahajta Connect wants to access your YouTube channel analytics.',
    permissions: ['youtube.readonly', 'yt-analytics.readonly'],
  },
]

export const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]))

export function getPlatform(id) { return PLATFORM_MAP[id] }
