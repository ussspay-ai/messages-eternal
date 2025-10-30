/**
 * GET /api/aster/agent-status
 * Fetch real-time agent status
 * Query params: agentId (optional)
 */

import { getAgentStatus, getAllAgentStatuses } from "@/lib/supabase-client"
import { getAllAgents } from "@/lib/constants/agents"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get("agentId")

    if (agentId) {
      // Fetch status for specific agent
      const status = await getAgentStatus(agentId)
      return NextResponse.json({
        agentId,
        status: status || { agent_id: agentId, status: "unknown" },
        timestamp: new Date().toISOString(),
      })
    } else {
      // Fetch status for all agents
      const statuses = await getAllAgentStatuses()

      // Create status map with all agents
      const agents = getAllAgents()
      const statusMap: Record<string, any> = {}

      for (const agent of agents) {
        const status = statuses.find((s) => s.agent_id === agent.id)
        statusMap[agent.id] = status || {
          agent_id: agent.id,
          name: agent.name,
          status: "unknown",
        }
      }

      return NextResponse.json({
        statuses: statusMap,
        activeAgents: Object.values(statusMap).filter((s) => s.status === "running").length,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Error fetching agent status:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agent status" },
      { status: 500 }
    )
  }
}