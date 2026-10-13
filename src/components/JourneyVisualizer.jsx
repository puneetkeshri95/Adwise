import { journeyPaths as samplePaths } from '../data/sampleData'

const nodeColors = {
  'TOF – Testimonial': '#378ADD',
  'TOF – Hook Video': '#6366F1',
  'TOF – UGC': '#8B5CF6',
  'Retargeting – Objection': '#F59E0B',
  'Retargeting – Scarcity': '#EF4444',
  'Retargeting – Discount': '#EC4899',
  'Page Visit': '#64748B',
  'Checkout': '#06B6D4',
  'Purchase': '#4ADE80',
  'Drop-off': '#6B7280',
  'Direct': '#94A3B8',
  'Organic Search': '#A78BFA',
}

// Generate a color for unknown nodes
const fallbackColors = ['#378ADD', '#6366F1', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#A78BFA']
function getNodeColor(node, idx) {
  return nodeColors[node] || fallbackColors[idx % fallbackColors.length]
}

export default function JourneyVisualizer({ campaigns }) {
  const journeyPaths = samplePaths // keep sample for now; will derive from API later
  // Get all unique nodes and their totals
  const nodeSet = new Set()
  journeyPaths.forEach((p) => p.path.forEach((n) => nodeSet.add(n)))

  // Group by stage
  const stages = []
  const maxLen = Math.max(...journeyPaths.map((p) => p.path.length))
  for (let i = 0; i < maxLen; i++) {
    const stageNodes = new Set()
    journeyPaths.forEach((p) => {
      if (p.path[i]) stageNodes.add(p.path[i])
    })
    stages.push([...stageNodes])
  }

  // Calculate flow volumes per node
  const nodeVolumes = {}
  journeyPaths.forEach((p) => {
    p.path.forEach((node) => {
      nodeVolumes[node] = (nodeVolumes[node] || 0) + p.count
    })
  })

  const maxVolume = Math.max(...Object.values(nodeVolumes))

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white mb-1">Customer Journey Paths</h3>
          <p className="text-[11px] text-gray-500">Visualizing how users flow from ad touch → page visits → conversion or drop-off</p>
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-blue"></span> TOF</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Retargeting</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span> Purchase</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500"></span> Drop-off</span>
        </div>
      </div>

      {/* Sankey-style visualization (simplified) */}
      <div className="bg-navy-800/50 border border-navy-600/30 rounded-xl p-6">
        <div className="flex justify-between gap-4">
          {stages.map((stageNodes, stageIdx) => (
            <div key={stageIdx} className="flex-1 space-y-2">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider text-center mb-3 font-medium">
                {stageIdx === 0 ? 'Entry Point' : stageIdx === stages.length - 1 ? 'Outcome' : `Step ${stageIdx + 1}`}
              </div>
              {stageNodes.map((node) => {
                const vol = nodeVolumes[node] || 0
                const barHeight = Math.max(24, (vol / maxVolume) * 80)
                const color = nodeColors[node] || '#64748B'
                const isPurchase = node === 'Purchase'
                const isDropoff = node === 'Drop-off'

                return (
                  <div key={node} className="group relative">
                    <div
                      className="rounded-lg border transition-all hover:scale-[1.02] cursor-default"
                      style={{
                        backgroundColor: color + '15',
                        borderColor: color + '30',
                        padding: '8px 10px',
                        minHeight: barHeight,
                      }}
                    >
                      <div className="text-[11px] font-medium" style={{ color }}>
                        {node}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {vol} users
                        {isPurchase && <span className="text-green-400 ml-1">· ₹{journeyPaths.filter(p => p.path.includes('Purchase')).reduce((s, p) => s + p.value, 0).toLocaleString('en-IN')}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Flow paths list */}
        <div className="mt-6 pt-4 border-t border-navy-600/20">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-3 font-medium">Top Paths</div>
          <div className="space-y-1.5">
            {journeyPaths
              .sort((a, b) => b.count - a.count)
              .slice(0, 6)
              .map((path, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="text-gray-500 w-6 text-right">{path.count}</span>
                  <div className="flex-1 flex items-center gap-1.5">
                    {path.path.map((step, j) => (
                      <span key={j} className="flex items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: (nodeColors[step] || '#64748B') + '15',
                            color: nodeColors[step] || '#64748B',
                          }}
                        >
                          {step}
                        </span>
                        {j < path.path.length - 1 && <span className="text-gray-600">→</span>}
                      </span>
                    ))}
                  </div>
                  <span className={`text-right w-16 ${path.value > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                    {path.value > 0 ? `₹${path.value.toLocaleString('en-IN')}` : '–'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Placeholder for full Sankey */}
      <div className="mt-4 text-center text-[11px] text-gray-600 bg-navy-800/30 border border-navy-600/20 rounded-lg py-3">
        Full interactive Sankey diagram — coming with D3.js integration
      </div>
    </div>
  )
}
