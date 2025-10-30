"use client"

import { LineChart, Line, ResponsiveContainer } from "recharts"

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}

export function AgentSparkline({ data, color = "#22c55e", height = 30 }: SparklineProps) {
  if (!data || data.length === 0) {
    return <div className="w-full bg-muted rounded h-6" />
  }

  // Create chart data from array of values
  const chartData = data.map((value, idx) => ({
    index: idx,
    value,
  }))

  return (
    <div className="w-full h-full flex items-center">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}