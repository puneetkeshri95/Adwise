// Client-side PowerPoint generation using pptxgenjs.
// Builds a real, downloadable .pptx from current mock data.

import PptxGenJS from 'pptxgenjs'
import { PLATFORM_MAP } from './platforms'
import { compact, num } from './format'

// Brand palette used for slides
const COLORS = {
  navy: '0B1120',
  panel: '111827',
  text: 'F3F4F6',
  textMuted: '9CA3AF',
  brand: '378ADD',
  brand2: '4A99FF',
  violet: '8B5CF6',
  green: '10B981',
  red: 'F87171',
  border: '1F2D3D',
  divider: '2A3A4E',
  cardBg: '1A2332',
}

function drawBg(slide) {
  slide.background = { color: COLORS.navy }
}

function drawFooter(slide, pptx, pageNum, totalPages) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 5.15, w: 13.333, h: 0.35, fill: { color: COLORS.panel }, line: { color: COLORS.panel },
  })
  slide.addText('Sahajta Connect · Generated report', {
    x: 0.4, y: 5.18, w: 6, h: 0.3, fontSize: 9, color: COLORS.textMuted, fontFace: 'Inter',
  })
  slide.addText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), {
    x: 6, y: 5.18, w: 4, h: 0.3, fontSize: 9, color: COLORS.textMuted, align: 'center', fontFace: 'Inter',
  })
  slide.addText(`${pageNum} / ${totalPages}`, {
    x: 12.4, y: 5.18, w: 0.6, h: 0.3, fontSize: 9, color: COLORS.textMuted, align: 'right', fontFace: 'Inter',
  })
}

function drawSectionTag(slide, label) {
  slide.addText(label, {
    x: 0.5, y: 0.4, w: 4, h: 0.3,
    fontSize: 9, color: COLORS.brand2, bold: true, fontFace: 'JetBrains Mono',
    charSpacing: 3,
  })
}

function drawTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.5, y: 0.7, w: 12.3, h: 0.6,
    fontSize: 28, color: COLORS.text, bold: true, fontFace: 'Inter',
  })
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 1.3, w: 12.3, h: 0.4,
      fontSize: 13, color: COLORS.textMuted, fontFace: 'Inter',
    })
  }
}

function drawKpiCard(slide, x, y, w, h, label, value, delta) {
  slide.addShape('rect', { x, y, w, h, fill: { color: COLORS.cardBg }, line: { color: COLORS.border, width: 0.5 }, rectRadius: 0.08 })
  slide.addText(label.toUpperCase(), { x: x + 0.15, y: y + 0.1, w: w - 0.3, h: 0.25, fontSize: 9, color: COLORS.textMuted, bold: true, fontFace: 'Inter', charSpacing: 2 })
  slide.addText(String(value), { x: x + 0.15, y: y + 0.38, w: w - 0.3, h: 0.55, fontSize: 24, color: COLORS.text, bold: true, fontFace: 'Inter' })
  if (delta != null) {
    const isUp = delta >= 0
    slide.addText(`${isUp ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%`, {
      x: x + 0.15, y: y + h - 0.35, w: w - 0.3, h: 0.25,
      fontSize: 10, color: isUp ? COLORS.green : COLORS.red, bold: true, fontFace: 'Inter',
    })
  }
}

// ------- Slide builders -------

function addTitleSlide(pptx, opts) {
  const slide = pptx.addSlide()
  drawBg(slide)
  // decorative gradient bar
  slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 0.1, fill: { color: COLORS.brand2 }, line: { color: COLORS.brand2 } })

  slide.addText('SAHAJTA CONNECT · ANALYTICS REPORT', {
    x: 0.6, y: 1.4, w: 12, h: 0.4,
    fontSize: 11, color: COLORS.brand2, bold: true, fontFace: 'JetBrains Mono', charSpacing: 4,
  })
  slide.addText(opts.title || 'Cross-platform performance summary', {
    x: 0.6, y: 1.8, w: 12, h: 1.4,
    fontSize: 40, color: COLORS.text, bold: true, fontFace: 'Inter',
  })
  slide.addText(opts.subtitle || 'A snapshot of engagement across your connected social channels.', {
    x: 0.6, y: 3.2, w: 11, h: 0.6,
    fontSize: 14, color: COLORS.textMuted, fontFace: 'Inter',
  })
  slide.addText([
    { text: 'Report scope:  ', options: { color: COLORS.textMuted, fontSize: 12 } },
    { text: opts.scopeLabel || 'All connected platforms', options: { color: COLORS.text, fontSize: 12, bold: true } },
  ], { x: 0.6, y: 4.2, w: 11, h: 0.4, fontFace: 'Inter' })
  slide.addText([
    { text: 'Generated:  ', options: { color: COLORS.textMuted, fontSize: 12 } },
    { text: new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }), options: { color: COLORS.text, fontSize: 12, bold: true } },
  ], { x: 0.6, y: 4.55, w: 11, h: 0.4, fontFace: 'Inter' })
  slide.addText('via MCP · Claude ready', {
    x: 10.5, y: 4.9, w: 2.4, h: 0.4,
    fontSize: 10, color: COLORS.brand2, align: 'right', italic: true, fontFace: 'Inter',
  })
}

function addSummarySlide(pptx, aggregate) {
  const slide = pptx.addSlide()
  drawBg(slide)
  drawSectionTag(slide, 'SECTION · 01')
  drawTitle(slide, 'Summary at a glance', 'Aggregate performance across all connected platforms.')

  const kpis = [
    { label: 'Total Views', value: compact(aggregate.summary.views), delta: aggregate.deltas.views },
    { label: 'Total Reach', value: compact(aggregate.summary.reach), delta: aggregate.deltas.reach },
    { label: 'Engagement', value: compact(aggregate.summary.engagement), delta: aggregate.deltas.engagement },
    { label: 'Posts', value: num(aggregate.summary.posts), delta: aggregate.deltas.posts },
  ]
  const startX = 0.5, y = 1.9, w = 3.05, h = 1.4, gap = 0.15
  kpis.forEach((kpi, i) => {
    drawKpiCard(slide, startX + i * (w + gap), y, w, h, kpi.label, kpi.value, kpi.delta)
  })

  // A textual narrative
  slide.addShape('rect', { x: 0.5, y: 3.55, w: 12.3, h: 1.4, fill: { color: COLORS.cardBg }, line: { color: COLORS.border, width: 0.5 }, rectRadius: 0.08 })
  slide.addText('Key observations', {
    x: 0.7, y: 3.65, w: 12, h: 0.35, fontSize: 12, color: COLORS.brand2, bold: true, fontFace: 'Inter',
  })
  const topPost = aggregate.posts[0]
  const bullets = [
    { text: `Views trended ${aggregate.deltas.views >= 0 ? 'up' : 'down'} ${Math.abs(aggregate.deltas.views).toFixed(1)}% vs the previous period.`, options: { bullet: true } },
    { text: `Engagement rate averaged ${aggregate.summary.engagementRate?.toFixed(2) || '—'}% across ${aggregate.summary.posts} posts.`, options: { bullet: true } },
    topPost && { text: `Top performing post: "${topPost.caption.slice(0, 80)}" on ${PLATFORM_MAP[topPost.platform]?.name} with ${compact(topPost.views)} views.`, options: { bullet: true } },
  ].filter(Boolean)
  slide.addText(bullets, {
    x: 0.7, y: 4.0, w: 12, h: 0.9, fontSize: 11, color: COLORS.text, fontFace: 'Inter', lineSpacing: 18,
  })
}

function addPlatformComparisonSlide(pptx, dataList) {
  const slide = pptx.addSlide()
  drawBg(slide)
  drawSectionTag(slide, 'SECTION · 02')
  drawTitle(slide, 'Platform comparison', 'Reach and engagement by connected channel.')

  const chartData = [
    { name: 'Reach', labels: dataList.map(d => PLATFORM_MAP[d.platformId].name), values: dataList.map(d => d.data.summary.reach) },
    { name: 'Views', labels: dataList.map(d => PLATFORM_MAP[d.platformId].name), values: dataList.map(d => d.data.summary.views) },
  ]

  slide.addChart(pptx.ChartType.bar, chartData, {
    x: 0.5, y: 1.7, w: 8.5, h: 3.2,
    chartColors: [COLORS.brand2, COLORS.violet],
    barDir: 'col',
    catAxisLabelColor: COLORS.textMuted, catAxisLabelFontSize: 10, catAxisLabelFontFace: 'Inter',
    valAxisLabelColor: COLORS.textMuted, valAxisLabelFontSize: 10, valAxisLabelFontFace: 'Inter',
    catGridLine: { style: 'none' },
    valGridLine: { style: 'solid', color: COLORS.divider, size: 0.5 },
    showLegend: true, legendPos: 't', legendColor: COLORS.text, legendFontFace: 'Inter', legendFontSize: 10,
    plotArea: { fill: { color: COLORS.navy } },
  })

  // Legend cards
  const startY = 1.7
  dataList.forEach((d, i) => {
    const platform = PLATFORM_MAP[d.platformId]
    const y = startY + i * 0.75
    slide.addShape('rect', { x: 9.3, y, w: 3.5, h: 0.65, fill: { color: COLORS.cardBg }, line: { color: COLORS.border, width: 0.5 }, rectRadius: 0.06 })
    slide.addShape('ellipse', { x: 9.42, y: y + 0.17, w: 0.32, h: 0.32, fill: { color: platform.color.replace('#', '') }, line: { color: platform.color.replace('#', '') } })
    slide.addText(platform.name, { x: 9.85, y: y + 0.05, w: 2.4, h: 0.28, fontSize: 11, color: COLORS.text, bold: true, fontFace: 'Inter' })
    slide.addText(`${compact(d.data.summary.followers)} followers`, { x: 9.85, y: y + 0.32, w: 2.4, h: 0.25, fontSize: 9, color: COLORS.textMuted, fontFace: 'Inter' })
  })
}

function addTopPostsSlide(pptx, aggregate) {
  const slide = pptx.addSlide()
  drawBg(slide)
  drawSectionTag(slide, 'SECTION · 03')
  drawTitle(slide, 'Top performing posts', 'Ranked by views across all connected platforms.')

  const posts = aggregate.posts.slice(0, 6)
  const startY = 1.75
  const rowH = 0.55
  // Header
  slide.addShape('rect', { x: 0.5, y: startY, w: 12.3, h: 0.4, fill: { color: COLORS.panel }, line: { color: COLORS.border, width: 0.5 }, rectRadius: 0.05 })
  const headers = [
    { text: '#', x: 0.6, w: 0.4 },
    { text: 'PLATFORM', x: 1.0, w: 1.4 },
    { text: 'CAPTION', x: 2.4, w: 6.2 },
    { text: 'VIEWS', x: 8.6, w: 1.2 },
    { text: 'LIKES', x: 9.8, w: 1.2 },
    { text: 'ENG. %', x: 11.0, w: 1.6 },
  ]
  headers.forEach(h => {
    slide.addText(h.text, { x: h.x, y: startY + 0.08, w: h.w, h: 0.28, fontSize: 9, color: COLORS.brand2, bold: true, fontFace: 'Inter', charSpacing: 2 })
  })

  posts.forEach((post, i) => {
    const y = startY + 0.45 + i * rowH
    slide.addShape('rect', { x: 0.5, y, w: 12.3, h: rowH - 0.05, fill: { color: COLORS.cardBg }, line: { color: COLORS.border, width: 0.5 }, rectRadius: 0.05 })
    slide.addText(String(i + 1), { x: 0.6, y: y + 0.13, w: 0.4, h: 0.28, fontSize: 11, color: COLORS.textMuted, bold: true, fontFace: 'Inter' })
    const platform = PLATFORM_MAP[post.platform]
    slide.addText(platform.name, { x: 1.0, y: y + 0.13, w: 1.4, h: 0.28, fontSize: 10, color: platform.color.replace('#', ''), bold: true, fontFace: 'Inter' })
    slide.addText(post.caption.slice(0, 90), { x: 2.4, y: y + 0.13, w: 6.2, h: 0.28, fontSize: 10, color: COLORS.text, fontFace: 'Inter' })
    slide.addText(compact(post.views), { x: 8.6, y: y + 0.13, w: 1.2, h: 0.28, fontSize: 10, color: COLORS.text, bold: true, fontFace: 'Inter' })
    slide.addText(compact(post.likes), { x: 9.8, y: y + 0.13, w: 1.2, h: 0.28, fontSize: 10, color: COLORS.text, fontFace: 'Inter' })
    slide.addText(`${post.engagementRate.toFixed(2)}%`, { x: 11.0, y: y + 0.13, w: 1.6, h: 0.28, fontSize: 10, color: COLORS.green, bold: true, fontFace: 'Inter' })
  })
}

function addChartsSlide(pptx, aggregate) {
  const slide = pptx.addSlide()
  drawBg(slide)
  drawSectionTag(slide, 'SECTION · 04')
  drawTitle(slide, 'Trend over time', 'Daily views and reach for the reporting period.')

  const labels = aggregate.timeSeries.map(t => t.date.slice(5))
  const chartData = [
    { name: 'Views', labels, values: aggregate.timeSeries.map(t => t.views) },
    { name: 'Reach', labels, values: aggregate.timeSeries.map(t => t.reach) },
  ]
  slide.addChart(pptx.ChartType.area, chartData, {
    x: 0.5, y: 1.7, w: 12.3, h: 3.2,
    chartColors: [COLORS.brand2, COLORS.violet],
    chartColorsOpacity: 45,
    lineSize: 2,
    catAxisLabelColor: COLORS.textMuted, catAxisLabelFontSize: 9, catAxisLabelFontFace: 'Inter',
    valAxisLabelColor: COLORS.textMuted, valAxisLabelFontSize: 9, valAxisLabelFontFace: 'Inter',
    catGridLine: { style: 'none' },
    valGridLine: { style: 'solid', color: COLORS.divider, size: 0.5 },
    showLegend: true, legendPos: 't', legendColor: COLORS.text, legendFontFace: 'Inter', legendFontSize: 10,
    plotArea: { fill: { color: COLORS.navy } },
  })
}

function addCommentsSlide(pptx, aggregate) {
  const slide = pptx.addSlide()
  drawBg(slide)
  drawSectionTag(slide, 'SECTION · 05')
  drawTitle(slide, 'Voice of the audience', 'Recent top comments across platforms, tagged by sentiment.')

  const comments = aggregate.comments.slice(0, 5)
  const startY = 1.8
  const rowH = 0.65
  comments.forEach((c, i) => {
    const y = startY + i * rowH
    slide.addShape('rect', { x: 0.5, y, w: 12.3, h: rowH - 0.1, fill: { color: COLORS.cardBg }, line: { color: COLORS.border, width: 0.5 }, rectRadius: 0.06 })
    const platform = PLATFORM_MAP[c.platform]
    slide.addShape('rect', { x: 0.5, y, w: 0.06, h: rowH - 0.1, fill: { color: platform.color.replace('#', '') }, line: { color: platform.color.replace('#', '') } })
    slide.addText(c.author, { x: 0.75, y: y + 0.08, w: 3, h: 0.24, fontSize: 10, color: COLORS.text, bold: true, fontFace: 'Inter' })
    const sentColor = c.sentiment === 'positive' ? COLORS.green : c.sentiment === 'negative' ? COLORS.red : COLORS.textMuted
    slide.addText(c.sentiment.toUpperCase(), { x: 10.8, y: y + 0.08, w: 1.8, h: 0.24, fontSize: 8, color: sentColor, bold: true, align: 'right', fontFace: 'Inter', charSpacing: 2 })
    slide.addText(`"${c.text}"`, { x: 0.75, y: y + 0.3, w: 11.5, h: 0.28, fontSize: 11, color: COLORS.text, italic: true, fontFace: 'Inter' })
  })
}

function addClosingSlide(pptx) {
  const slide = pptx.addSlide()
  drawBg(slide)
  slide.addText('Powered by Sahajta Connect', {
    x: 0.5, y: 2.0, w: 12.3, h: 0.5,
    fontSize: 14, color: COLORS.brand2, bold: true, align: 'center', fontFace: 'JetBrains Mono', charSpacing: 3,
  })
  slide.addText('Ask Claude anything about this data.', {
    x: 0.5, y: 2.5, w: 12.3, h: 0.8,
    fontSize: 34, color: COLORS.text, bold: true, align: 'center', fontFace: 'Inter',
  })
  slide.addText('This report was auto-generated via the Sahajta Connect MCP connector.\nConnect your channels once. Query anywhere. Ship faster.', {
    x: 1, y: 3.3, w: 11.3, h: 0.9,
    fontSize: 14, color: COLORS.textMuted, align: 'center', fontFace: 'Inter',
  })
}

export async function generatePresentation({ aggregate, dataList, sections, scopeLabel, title, subtitle }) {
  const pptx = new PptxGenJS()
  pptx.title = 'Sahajta Connect Analytics Report'
  pptx.company = 'Sahajta Connect'
  pptx.subject = 'Cross-platform social analytics'
  pptx.author = 'Sahajta Connect'
  pptx.layout = 'LAYOUT_WIDE' // 13.333 x 7.5

  addTitleSlide(pptx, { title, subtitle, scopeLabel })

  if (sections.summary) addSummarySlide(pptx, aggregate)
  if (sections.charts) addChartsSlide(pptx, aggregate)
  if (sections.comparison && dataList.length > 1) addPlatformComparisonSlide(pptx, dataList)
  if (sections.topPosts) addTopPostsSlide(pptx, aggregate)
  if (sections.comments) addCommentsSlide(pptx, aggregate)

  addClosingSlide(pptx)

  const filename = `Sahajta_Connect_Report_${new Date().toISOString().slice(0, 10)}.pptx`
  await pptx.writeFile({ fileName: filename })
  return filename
}
