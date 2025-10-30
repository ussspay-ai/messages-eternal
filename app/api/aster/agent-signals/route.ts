/**
 * GET /api/aster/agent-signals
 * Fetch trading signals history for agents
 * Query params: agentId (optional), limit (optional, default 50)
 */

import { getAgentSignals } from "@/lib/supabase-client"
import { getAllAgents } from "@/lib/constants/agents"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get("agentId")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500)

    if (agentId) {
      // Fetch signals for specific agent
      const signals = await getAgentSignals(agentId, limit)
      return NextResponse.json({
        agentId,
        signals,
        count: signals.length,
        buySingals: signals.filter((s) => s.action === "BUY").length,
        sellSignals: signals.filter((s) => s.action === "SELL").length,
        holdSignals: signals.filter((s) => s.action === "HOLD").length,
        timestamp: new Date().toISOString(),
      })
    } else {
      // Fetch signals for all agents
      const agents = getAllAgents()
      const allSignals: Record<string, any[]> = {}

      for (const agent of agents) {
        allSignals[agent.id] = await getAgentSignals(agent.id, limit)
      }

      return NextResponse.json({
        signals: allSignals,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Error fetching agent signals:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agent signals" },
      { status: 500 }
    )
  }
}