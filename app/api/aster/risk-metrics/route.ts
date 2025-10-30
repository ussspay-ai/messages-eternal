/**
 * GET /api/aster/risk-metrics?agentId=<id>&period=<period>
 * Calculate real risk metrics for agent from historical data
 * Periods: 24H, 7D, 30D, ALL
 */

import { NextRequest, NextResponse } from "next/server"
import { getAgentSnapshots } from "@/lib/supabase-client"
import { getAllAgents } from "@/lib/constants/agents"
import { calculateAllRiskMetrics } from "@/lib/risk-metrics"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"

interface RiskMetricsResponse {
  agentId: string
  agentName: string
  period: string
  metrics: {
    maxDrawdown: number
    volatility: number
    sortinoRatio: number
    calmarRatio: number
    sharpeRatio: number
    returnPercent: number
  }
  dataPoints: number
  startTime: string
  endTime: string
  calculatedAt: string
}

function getTimeRange(period: string): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()

  switch (period) {
    case "24H":
      start.setHours(end.getHours() - 24)
      break
    case "7D":
      start.setDate(end.getDate() - 7)
      break
    case "30D":
      start.setDate(end.getDate() - 30)
      break
    case "ALL":
    default:
      start.setFullYear(start.getFullYear() - 1)
      break
  }

  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId")
    const period = request.nextUrl.searchParams.get("period") || "30D"

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 })
    }

    // Check cache first
    const cacheKey = CACHE_KEYS.riskMetrics(agentId, period)
    const cached = await getCache<RiskMetricsResponse>(cacheKey)
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, max-age=300",
          "X-Data-Source": "cache",
        },
      })
    }

    // Get agent info
    const allAgents = getAllAgents()
    const agent = allAgents.find((a) => a.id === agentId)

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const { start, end } = getTimeRange(period)

    // Fetch historical snapshots
    let snapshots: any[] = []
    try {
      snapshots = await getAgentSnapshots(agentId, start, end)
    } catch (error) {
      console.warn(`Failed to fetch snapshots for agent ${agentId}:`, error)
      // Continue with empty snapshots
    }

    // Calculate metrics
    const currentReturn = snapshots.length > 0 
      ? snapshots[snapshots.length - 1].return_percent 
      : 0

    const metrics = calculateAllRiskMetrics(snapshots, currentReturn)

    const response: RiskMetricsResponse = {
      agentId,
      agentName: agent.name,
      period,
      metrics: {
        maxDrawdown: parseFloat(metrics.maxDrawdown.toFixed(2)),
        volatility: parseFloat(metrics.volatility.toFixed(2)),
        sortinoRatio: parseFloat(metrics.sortinoRatio.toFixed(3)),
        calmarRatio: parseFloat(metrics.calmarRatio.toFixed(3)),
        sharpeRatio: parseFloat(metrics.sharpeRatio.toFixed(3)),
        returnPercent: parseFloat(metrics.returnPercent.toFixed(2)),
      },
      dataPoints: snapshots.length,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      calculatedAt: new Date().toISOString(),
    }

    // Cache for 5 minutes
    if (snapshots.length > 0) {
      await setCache(cacheKey, response, { ttl: 300 })
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "X-Data-Source": "calculated",
      },
    })
  } catch (error) {
    console.error("Error calculating risk metrics:", error)
    return NextResponse.json(
      {
        error: "Failed to calculate risk metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}