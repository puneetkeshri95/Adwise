import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { shortDate, compact } from '../lib/format.js'

export default function TimeSeriesChart({ data, height = 260, primaryKey = 'views', secondaryKey = 'reach' }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4A99FF" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#4A99FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gReach" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={compact}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(v) => compact(v)}
            labelFormatter={(l) => shortDate(l)}
            cursor={{ stroke: '#378ADD', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          {secondaryKey && (
            <Area
              type="monotone"
              dataKey={secondaryKey}
              stroke="#8B5CF6"
              strokeWidth={2}
              fill="url(#gReach)"
              activeDot={{ r: 4, fill: '#8B5CF6' }}
            />
          )}
          <Area
            type="monotone"
            dataKey={primaryKey}
            stroke="#4A99FF"
            strokeWidth={2}
            fill="url(#gViews)"
            activeDot={{ r: 4, fill: '#4A99FF' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
