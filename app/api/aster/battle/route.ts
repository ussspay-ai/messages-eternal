/**
 * POST /api/aster/battle
 * Simulate a 1v1 agent battle with market scenario
 */

import { NextRequest, NextResponse } from "next/server"
import { simulateAgentBattle, BattleScenario } from "@/lib/agent-battle"
import { getAllAgents } from "@/lib/constants/agents"
import { MarketContext } from "@/lib/chat-engine"

export const maxDuration = 60 // Allow 60 seconds for battle

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agent1Id, agent2Id, scenario } = body

    // Validate inputs
    if (!agent1Id || !agent2Id || !scenario) {
      return NextResponse.json(
        { error: "Missing agent1Id, agent2Id, or scenario" },
        { status: 400 }
      )
    }

    if (agent1Id === agent2Id) {
      return NextResponse.json(
        { error: "Cannot battle agent against itself" },
        { status: 400 }
      )
    }

    // Get agents
    const agents = getAllAgents()
    const agent1 = agents.find((a) => a.id === agent1Id)
    const agent2 = agents.find((a) => a.id === agent2Id)

    if (!agent1 || !agent2) {
      return NextResponse.json(
        { error: "One or both agents not found" },
        { status: 404 }
      )
    }

    // Get current market prices for context
    try {
      const pricesRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/market/prices`,
        { cache: "no-store" }
      )

      if (!pricesRes.ok) throw new Error("Failed to fetch market prices")

      const marketContext: MarketContext = await pricesRes.json()

      // Simulate battle
      console.log(
        `[Battle] Starting ${agent1.name} vs ${agent2.name} - Scenario: ${scenario}`
      )

      const result = await simulateAgentBattle(
        {
          id: agent1.id,
          name: agent1.name,
          model: agent1.model,
          pnl: 0,
          roi: 0,
          recentTrades: 0,
        },
        {
          id: agent2.id,
          name: agent2.name,
          model: agent2.model,
          pnl: 0,
          roi: 0,
          recentTrades: 0,
        },
        marketContext,
        scenario as BattleScenario
      )

      console.log(`[Battle] ✅ Complete: ${result.winnerName} wins`)

      return NextResponse.json(result)
    } catch (error) {
      console.error("[Battle] Market fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch market prices for battle context" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[Battle] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Battle simulation failed" },
      { status: 500 }
    )
  }
}