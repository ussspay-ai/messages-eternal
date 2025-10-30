/**
 * GET /api/aster/agent-thinking
 * Fetch agent thinking/analysis logs
 * Query params: agentId (optional), limit (optional, default 50), type (optional: analysis, decision, error, recovery)
 */

import { getAgentThinking } from "@/lib/supabase-client"
import { getAllAgents } from "@/lib/constants/agents"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get("agentId")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500)
    const type = searchParams.get("type")

    if (agentId) {
      // Fetch thinking logs for specific agent
      let thinking = await getAgentThinking(agentId, limit)

      // Filter by type if specified
      if (type) {
        thinking = thinking.filter((t) => t.thinking_type === type)
      }

      return NextResponse.json({
        agentId,
        thinking,
        count: thinking.length,
        types: {
          analysis: thinking.filter((t) => t.thinking_type === "analysis").length,
          decision: thinking.filter((t) => t.thinking_type === "decision").length,
          error: thinking.filter((t) => t.thinking_type === "error").length,
          recovery: thinking.filter((t) => t.thinking_type === "recovery").length,
        },
        timestamp: new Date().toISOString(),
      })
    } else {
      // Fetch thinking for all agents
      const agents = getAllAgents()
      const allThinking: Record<string, any[]> = {}

      for (const agent of agents) {
        let thinking = await getAgentThinking(agent.id, limit)
        if (type) {
          thinking = thinking.filter((t) => t.thinking_type === type)
        }
        allThinking[agent.id] = thinking
      }

      return NextResponse.json({
        thinking: allThinking,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Error fetching agent thinking:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agent thinking" },
      { status: 500 }
    )
  }
}