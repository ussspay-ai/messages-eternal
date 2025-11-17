/**
 * GET /api/aster/historical-trades?agentId=<id>&limit=<limit>
 * Fetch agent's historical trades from Aster using /fapi/v1/userTrades endpoint
 * This endpoint returns completed wallet trades (better for detail pages than market trades)
 */

import { AsterClient } from "@/lib/aster-client"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"
import { getAgentCredentials } from "@/lib/constants/agents"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId")
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "25")

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 })
    }

    console.log(`[Historical Trades API] 📋 Fetching ${limit} historical trades for ${agentId}`)

    // Get agent credentials
    const credentials = getAgentCredentials(agentId)
    if (!credentials) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Create Aster client
    const client = new AsterClient({
      agentId,
      signer: credentials.signer,
      apiSecret: undefined,
      userAddress: credentials.signer,
      userApiKey: credentials.userApiKey,
      userApiSecret: credentials.userApiSecret,
    })

    // Check cache first
    const cacheKey = `historical_trades:${agentId}:${limit}`
    try {
      const cached = await getCache(cacheKey)
      if (cached) {
        console.log(`[Historical Trades API] ✅ Using cached historical trades`)
        return NextResponse.json(cached)
      }
    } catch (cacheError) {
      console.warn("[Historical Trades API] Cache unavailable")
    }

    // Fetch historical trades from wallet using /fapi/v1/userTrades
    // This endpoint returns the wallet's completed trades, not market trades
    console.log(`[Historical Trades API] Fetching user trades from Aster...`)
    const tradesData = await client.getUserTrades(undefined, limit * 2) // Fetch 2x limit to account for filtering
    
    const allTrades = tradesData.trades || []
    console.log(`[Historical Trades API] Received ${allTrades.length} trades from Aster API`)

    if (allTrades.length === 0) {
      console.log(`[Historical Trades API] No historical trades found for ${agentId}`)
      return NextResponse.json([])
    }

    // Sort by time descending (most recent first) and limit to requested amount
    const sortedTrades = allTrades.sort((a, b) => b.time - a.time).slice(0, limit)

    console.log(`[Historical Trades API] ✅ Returning ${sortedTrades.length} historical trades`)
    if (sortedTrades.length > 0) {
      console.log(`[Historical Trades API] Most recent trade:`, {
        symbol: sortedTrades[0].symbol,
        side: sortedTrades[0].side,
        qty: sortedTrades[0].qty,
        price: sortedTrades[0].price,
        time: new Date(sortedTrades[0].time).toISOString(),
      })
    }

    // Try to cache for 5 minutes
    try {
      await setCache(cacheKey, sortedTrades, { ttl: 300 })
    } catch (cacheError) {
      console.warn("[Historical Trades API] Could not cache trades")
    }

    return NextResponse.json(sortedTrades)
  } catch (error) {
    console.error("[Historical Trades API] Error fetching historical trades:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch historical trades" },
      { status: 500 }
    )
  }
}