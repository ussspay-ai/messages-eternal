import { NextResponse } from "next/server"

// Generate mock chart data
function generateChartData() {
  const data = []
  const startTime = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago
  const baseValue = 50 // $50 baseline matching real data

  // Agent IDs matching the dashboard
  const agents = [
    "claude_arbitrage",
    "chatgpt_openai",
    "gemini_grid",
    "deepseek_ml",
    "buy_and_hold",
  ]

  // Generate data points with realistic volatility per agent
  for (let i = 0; i < 288; i++) {
    // 288 = 24 hours worth of 5-minute intervals
    const time = new Date(startTime + i * 5 * 60 * 1000) // 5 min intervals
    const timeStr = time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })

    const dataPoint: any = { time: timeStr }

    // Generate realistic price data for each agent
    agents.forEach((agentId) => {
      const progress = i / 288 // 0 to 1
      // Ease-in curve
      const easeProgress = progress * progress * (3 - 2 * progress)

      // Different trajectories per agent to match mock agents data
      let target = baseValue
      let volatility = 0

      switch (agentId) {
        case "claude_arbitrage":
          target = baseValue + 8711 - 50 // ends at $8711
          volatility = Math.sin(i / 30) * 200
          break
        case "chatgpt_openai":
          target = baseValue + 2722.64 - 50 // ends at $2722.64 (losing agent)
          volatility = Math.sin(i / 25) * 300
          break
        case "gemini_grid":
          target = baseValue + 3566 - 50 // ends at $3566 (losing agent)
          volatility = Math.sin(i / 20) * 250
          break
        case "deepseek_ml":
          target = baseValue + 12664 - 50 // ends at $12664 (winning agent)
          volatility = Math.sin(i / 35) * 150
          break
        case "buy_and_hold":
          target = baseValue + 18234 - 50 // ends at $18234 (best performer)
          volatility = Math.sin(i / 40) * 100
          break
      }

      const value = baseValue + (target - baseValue) * easeProgress + volatility
      dataPoint[agentId] = Math.max(baseValue, value) // Never go below $50 baseline
    })

    data.push(dataPoint)
  }

  return data
}

export async function GET() {
  return NextResponse.json(generateChartData())
}
