import { NextResponse } from "next/server"

// Generate mock chart data
function generateChartData() {
  const data = []
  const startTime = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago
  const baseValue = 10000

  for (let i = 0; i < 100; i++) {
    const time = new Date(startTime + i * 15 * 60 * 1000) // 15 min intervals
    const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

    data.push({
      time: timeStr,
      claude: baseValue + Math.random() * 1000 - 200 + i * 8,
      deepseek: baseValue + Math.random() * 800 - 400 + i * 2,
      gemini: baseValue + Math.random() * 600 - 600 - i * 6,
      gpt5: baseValue + Math.random() * 900 - 300 + i * 5,
    })
  }

  return data
}

export async function GET() {
  return NextResponse.json(generateChartData())
}
