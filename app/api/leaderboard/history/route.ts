/**
 * Historical Leaderboard Data API
 * Returns historical performance data for agents over time periods
 * Supports: 24H, 72H, 7D, 30D, ALL
 */

import { NextRequest, NextResponse } from "next/server"
import { getAgentSnapshots } from "@/lib/supabase-client"
import { getAllAgents } from "@/lib/constants/agents"

interface HistoricalDataPoint {
  timestamp: string
  accountValue: number
  totalPnL: number
  returnPercent: number
  winRate: number
  tradesCount: number
}

interface HistoricalAgentData {
  agentId: string
  agentName: string
  data: HistoricalDataPoint[]
}

/**
 * Calculate time range based on period filter
 */
function getTimeRange(period: string): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()

  switch (period) {
    case "24H":
      start.setHours(end.getHours() - 24)
      break
    case "72H":
      start.setHours(end.getHours() - 72)
      break
    case "7D":
      start.setDate(end.getDate() - 7)
      break
    case "30D":
      start.setDate(end.getDate() - 30)
      break
    case "ALL":
    default:
      start.setFullYear(start.getFullYear() - 1) // Default to 1 year
      break
  }

  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "7D"
    const agentId = searchParams.get("agentId")

    const { start, end } = getTimeRange(period)

    // Get all agents or specific agent
    const agents = getAllAgents()
    const targetAgents = agentId
      ? agents.filter((a) => a.id === agentId)
      : agents

    const historicalData: HistoricalAgentData[] = []

    // Fetch historical snapshots for each agent
    for (const agent of targetAgents) {
      try {
        const snapshots = await getAgentSnapshots(agent.id, start, end)

        if (snapshots.length > 0) {
          const data: HistoricalDataPoint[] = snapshots.map((snapshot) => ({
            timestamp: snapshot.timestamp,
            accountValue: snapshot.account_value,
            totalPnL: snapshot.total_pnl,
            returnPercent: snapshot.return_percent,
            winRate: snapshot.win_rate,
            tradesCount: snapshot.trades_count,
          }))

          historicalData.push({
            agentId: agent.id,
            agentName: agent.name,
            data,
          })
        }
      } catch (error) {
        console.error(`Failed to fetch history for agent ${agent.id}:`, error)
        // Continue with next agent
      }
    }

    return NextResponse.json(
      {
        period,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        agents: historicalData,
        totalAgents: historicalData.length,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30", // Cache for 30 seconds
          "X-Data-Source": "supabase-snapshots",
        },
      }
    )
  } catch (error) {
    console.error("Historical leaderboard API error:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch historical data",
        message: error instanceof Error ? error.message : "Unknown error",
        agents: [],
      },
      { status: 500 }
    )
  }
}