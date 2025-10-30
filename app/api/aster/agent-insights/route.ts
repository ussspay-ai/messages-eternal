/**
 * GET /api/aster/agent-insights
 * Fetch comprehensive agent insights including trades, signals, thinking, and status
 */

import { getAgentTrades, getAgentSignals, getAgentThinking, getAllAgentStatuses } from "@/lib/supabase-client"
import { getAllAgents } from "@/lib/constants/agents"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const agents = getAllAgents()
    const insights: Record<string, any> = {}

    for (const agent of agents) {
      try {
        // Fetch all data for this agent in parallel
        const [trades, signals, thinking, statuses] = await Promise.all([
          getAgentTrades(agent.id, 20),
          getAgentSignals(agent.id, 20),
          getAgentThinking(agent.id, 20),
          getAllAgentStatuses(),
        ])

        const agentStatus = statuses.find((s) => s.agent_id === agent.id)

        insights[agent.id] = {
          agentInfo: {
            id: agent.id,
            name: agent.name,
            model: agent.model,
            strategy: agent.strategy,
          },
          status: agentStatus || { agent_id: agent.id, name: agent.name, status: 'unknown' },
          recentTrades: trades,
          recentSignals: signals,
          recentThinking: thinking,
          timestamps: {
            lastTrade: trades[0]?.trade_timestamp || null,
            lastSignal: signals[0]?.signal_timestamp || null,
            lastThinking: thinking[0]?.thinking_timestamp || null,
            lastHeartbeat: agentStatus?.last_heartbeat || null,
          },
        }
      } catch (error) {
        console.error(`Error fetching insights for agent ${agent.id}:`, error)
        insights[agent.id] = {
          agentInfo: agent,
          status: { agent_id: agent.id, name: agent.name, status: 'error' },
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    return NextResponse.json({
      insights,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching agent insights:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agent insights" },
      { status: 500 }
    )
  }
}