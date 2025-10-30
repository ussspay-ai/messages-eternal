/**
 * GET /api/aster/agent-trades
 * Fetch trade history for all agents or specific agent
 * Query params: agentId (optional), limit (optional, default 50)
 */

import { getAgentTrades } from "@/lib/supabase-client"
import { getAllAgents } from "@/lib/constants/agents"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get("agentId")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500)

    if (agentId) {
      // Fetch trades for specific agent
      const trades = await getAgentTrades(agentId, limit)
      return NextResponse.json({
        agentId,
        trades,
        count: trades.length,
        timestamp: new Date().toISOString(),
      })
    } else {
      // Fetch trades for all agents
      const agents = getAllAgents()
      const allTrades: Record<string, any[]> = {}

      for (const agent of agents) {
        allTrades[agent.id] = await getAgentTrades(agent.id, limit)
      }

      return NextResponse.json({
        trades: allTrades,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Error fetching agent trades:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agent trades" },
      { status: 500 }
    )
  }
}