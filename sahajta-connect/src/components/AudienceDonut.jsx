import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { getPlatform } from '../lib/platforms.js'

export default function AudienceDonut({ data, height = 240 }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d, i) => {
              const p = getPlatform(d.platformId)
              return <Cell key={i} fill={p?.color || '#378ADD'} />
            })}
          </Pie>
          <Tooltip formatter={(v) => v.toLocaleString('en-IN')} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
