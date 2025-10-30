/**
 * GET /api/aster/trades?agentId=<id>&symbol=<symbol>&limit=<limit>
 * Fetch agent trade history from Aster
 */

import { AsterClient } from "@/lib/aster-client"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"
import { getAgentCredentials } from "@/lib/constants/agents"
import { PRIMARY_SYMBOLS } from "@/lib/constants/agents"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId")
    const symbol = request.nextUrl.searchParams.get("symbol")
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100")

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 })
    }

    // Get agent credentials
    const credentials = getAgentCredentials(agentId)
    if (!credentials) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Create Aster client
    const client = new AsterClient({
      agentId,
      signer: credentials.signer, // Use agent's wallet address, not API key
      apiSecret: undefined, // Don't use agent private key for REST API
      userAddress: credentials.signer, // Agent's wallet for REST API calls
      userApiKey: credentials.userApiKey,
      userApiSecret: credentials.userApiSecret,
    })

    // If specific symbol requested, fetch those trades
    if (symbol) {
      const cacheKey = CACHE_KEYS.trades(agentId, limit)
      try {
        const cached = await getCache(cacheKey)
        if (cached) {
          return NextResponse.json(cached)
        }
      } catch (cacheError) {
        console.warn("Cache unavailable for trades, proceeding without cache:", cacheError)
        // Continue without cache
      }

      const tradesData = await client.getTrades(symbol, limit)
      const trades = tradesData.trades || []
      try {
        await setCache(cacheKey, trades, { ttl: 10 })
      } catch (cacheError) {
        console.warn("Could not cache trades:", cacheError)
      }
      return NextResponse.json(trades)
    }

    // Otherwise fetch trades from all primary symbols
    const allTrades: any[] = []

    for (const sym of PRIMARY_SYMBOLS) {
      try {
        const tradesData = await client.getTrades(sym, 50)
        const trades = tradesData.trades || []
        allTrades.push(...trades)
      } catch (error) {
        // Symbol might not have trades, continue
        console.debug(`No trades found for ${sym}`)
      }
    }

    // Sort by time descending
    allTrades.sort((a, b) => b.time - a.time)

    return NextResponse.json(allTrades.slice(0, limit))
  } catch (error) {
    console.error("Error fetching trades:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch trades" },
      { status: 500 }
    )
  }
}