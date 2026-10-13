import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts'
import { compact } from '../lib/format.js'
import { getPlatform } from '../lib/platforms.js'

export default function PlatformBarChart({ data, dataKey = 'reach', height = 240 }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} />
          <YAxis tickFormatter={compact} axisLine={false} tickLine={false} width={44} />
          <Tooltip formatter={(v) => compact(v)} cursor={{ fill: 'rgba(55,138,221,0.06)' }} />
          <Bar dataKey={dataKey} radius={[8, 8, 0, 0]}>
            {data.map((d, i) => {
              const p = getPlatform(d.platformId)
              return <Cell key={i} fill={p?.color || '#378ADD'} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
