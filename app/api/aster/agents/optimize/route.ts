/**
 * POST /api/aster/agents/optimize
 * Run self-learning optimization for all agents
 * Analyzes recent trades and adjusts parameters
 */

import { NextRequest, NextResponse } from "next/server"
import { AsterClient } from "@/lib/aster-client"
import { getAgentCredentials, getAllAgents } from "@/lib/constants/agents"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"
import {
  analyzePerformance,
  generateLearningUpdate,
  DEFAULT_PARAMETERS,
  calculateOptimizationScore,
  convertAsterTradesToTrades,
} from "@/lib/learning-engine"
import { LearningUpdate, AgentParameters } from "@/lib/types/learning"
import { Trade } from "@/lib/types/trading"

interface OptimizationResult {
  agent_id: string
  status: "optimized" | "skipped" | "error"
  reason: string
  update?: LearningUpdate
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { agentId, tradesLimit = 100, forceOptimize = false } = await request.json().catch(() => ({
      agentId: null,
      tradesLimit: 100,
      forceOptimize: false,
    }))

    const agents = agentId ? [agentId] : getAllAgents().map((a) => a.id)
    const results: OptimizationResult[] = []

    for (const id of agents) {
      try {
        const agent = getAllAgents().find((a) => a.id === id)
        if (!agent) {
          results.push({
            agent_id: id,
            status: "skipped",
            reason: "Agent not found",
          })
          continue
        }

        const credentials = getAgentCredentials(id)
        if (!credentials) {
          results.push({
            agent_id: id,
            status: "error",
            reason: "No credentials found",
            error: "Missing agent credentials",
          })
          continue
        }

        // Fetch recent trades
        const client = new AsterClient({
          agentId: id,
          signer: credentials.signer, // Use agent's wallet address, not API key
          apiSecret: undefined, // Don't use agent private key for REST API
          userAddress: credentials.signer, // Agent's wallet for REST API calls
          userApiKey: credentials.userApiKey,
          userApiSecret: credentials.userApiSecret,
        })

        const tradesData = await client.getTrades("BTCUSDT", tradesLimit).catch(() => ({ trades: [] }))
        const asterTrades = tradesData.trades || []
        const trades: Trade[] = convertAsterTradesToTrades(asterTrades, id)

        if (trades.length < 5 && !forceOptimize) {
          results.push({
            agent_id: id,
            status: "skipped",
            reason: "Insufficient trade history (< 5 trades)",
          })
          continue
        }

        // Get current parameters from cache
        const cacheKey = `agent_params:${id}`
        const currentParamsData = await getCache(cacheKey)
        const currentParams: AgentParameters = 
          (currentParamsData as AgentParameters) || 
          DEFAULT_PARAMETERS[id] || 
          DEFAULT_PARAMETERS.claude_arbitrage

        // Analyze performance
        const metrics = analyzePerformance(id, trades)

        // Generate learning update
        const update = generateLearningUpdate(id, currentParams, metrics, agent.model)

        // Only apply update if there are meaningful changes
        const hasSignificantChange =
          Math.abs(update.new_parameters.leverage - update.old_parameters.leverage) > 0.1 ||
          Math.abs(update.new_parameters.stop_loss_percent - update.old_parameters.stop_loss_percent) > 0.05 ||
          Math.abs(update.new_parameters.take_profit_percent - update.old_parameters.take_profit_percent) > 0.05

        if (hasSignificantChange || forceOptimize) {
          // Save updated parameters to cache (24-hour TTL)
          await setCache(cacheKey, update.new_parameters, { ttl: 86400 })

          results.push({
            agent_id: id,
            status: "optimized",
            reason: `${update.performance_reason} (confidence: ${update.confidence})`,
            update,
          })
        } else {
          results.push({
            agent_id: id,
            status: "skipped",
            reason: "No significant parameter changes needed",
          })
        }
      } catch (error) {
        results.push({
          agent_id: id,
          status: "error",
          reason: "Optimization failed",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Cache optimization results
    const resultsCacheKey = CACHE_KEYS.agentOptimization()
    await setCache(resultsCacheKey, results, { ttl: 300 }) // 5-minute cache

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        optimized: results.filter((r) => r.status === "optimized").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        errors: results.filter((r) => r.status === "error").length,
      },
    })
  } catch (error) {
    console.error("Optimization error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Optimization failed",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/aster/agents/optimize
 * Get last optimization results
 */
export async function GET() {
  try {
    const cacheKey = CACHE_KEYS.agentOptimization()
    const results = await getCache(cacheKey)

    if (!results) {
      return NextResponse.json({
        success: true,
        message: "No optimization results found. Run POST to optimize agents.",
        results: [],
      })
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("Error fetching optimization results:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch results",
      },
      { status: 500 }
    )
  }
}