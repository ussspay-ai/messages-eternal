/**
 * GET /api/aster/exit-plans?agentId=<id>
 * Fetch agent active exit plans (TP/SL levels) from Supabase
 */

import { getActiveExitPlans, getLatestExitPlan } from "@/lib/supabase-client"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId")
    const symbol = request.nextUrl.searchParams.get("symbol")
    const side = request.nextUrl.searchParams.get("side")

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 })
    }

    // Try cache first (2 second TTL for real-time updates)
    const cacheKey = symbol && side 
      ? `exit_plan:${agentId}:${symbol}:${side}`
      : `exit_plans:${agentId}`
    
    const cached = await getCache(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    let result
    if (symbol && side) {
      // Get latest exit plan for specific symbol/side
      const plan = await getLatestExitPlan(agentId, symbol, side)
      result = plan ? [plan] : []
    } else {
      // Get all active exit plans for agent
      result = await getActiveExitPlans(agentId)
    }

    // Cache for 2 seconds
    await setCache(cacheKey, result, { ttl: 2 })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching exit plans:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch exit plans" },
      { status: 500 }
    )
  }
}