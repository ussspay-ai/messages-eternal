/**
 * GET /api/aster/agents/parameters?agentId=<id>
 * Get current parameters for an agent (learned or default)
 * 
 * POST /api/aster/agents/parameters
 * Update agent parameters manually
 */

import { NextRequest, NextResponse } from "next/server"
import { getAgentParameters, updateAgentParameters } from "@/lib/agent-learning"
import { getAllAgents } from "@/lib/constants/agents"
import { getCache, CACHE_KEYS } from "@/lib/redis-client"

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId")

    if (!agentId) {
      // Get all agent parameters
      const agents = getAllAgents()
      const allParams: Record<string, any> = {}

      for (const agent of agents) {
        allParams[agent.id] = await getAgentParameters(agent.id)
      }

      return NextResponse.json({
        success: true,
        parameters: allParams,
      })
    }

    // Get specific agent parameters
    const params = await getAgentParameters(agentId)

    return NextResponse.json({
      success: true,
      agent_id: agentId,
      parameters: params,
    })
  } catch (error) {
    console.error("Error fetching parameters:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch parameters",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { agentId, parameters } = await request.json()

    if (!agentId || !parameters) {
      return NextResponse.json(
        { success: false, error: "agentId and parameters required" },
        { status: 400 }
      )
    }

    // Validate agent exists
    const agents = getAllAgents()
    if (!agents.find((a) => a.id === agentId)) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      )
    }

    // Validate parameters
    const required = ["leverage", "stop_loss_percent", "take_profit_percent", "position_size"]
    for (const field of required) {
      if (!(field in parameters)) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate ranges
    if (parameters.leverage < 1 || parameters.leverage > 5) {
      return NextResponse.json(
        { success: false, error: "Leverage must be between 1 and 5" },
        { status: 400 }
      )
    }

    if (parameters.stop_loss_percent < 0.1 || parameters.stop_loss_percent > 10) {
      return NextResponse.json(
        { success: false, error: "Stop loss must be between 0.1% and 10%" },
        { status: 400 }
      )
    }

    if (parameters.take_profit_percent < 0.1 || parameters.take_profit_percent > 20) {
      return NextResponse.json(
        { success: false, error: "Take profit must be between 0.1% and 20%" },
        { status: 400 }
      )
    }

    if (parameters.position_size < 0.1 || parameters.position_size > 1) {
      return NextResponse.json(
        { success: false, error: "Position size must be between 0.1 and 1" },
        { status: 400 }
      )
    }

    // Update parameters
    const newParams = {
      ...parameters,
      last_updated: new Date().toISOString(),
    }

    await updateAgentParameters(agentId, newParams)

    return NextResponse.json({
      success: true,
      message: "Parameters updated successfully",
      agent_id: agentId,
      parameters: newParams,
    })
  } catch (error) {
    console.error("Error updating parameters:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update parameters",
      },
      { status: 500 }
    )
  }
}