/**
 * GET /api/aster/positions?agentId=<id>
 * Fetch agent open positions from Aster
 */

import { AsterClient } from "@/lib/aster-client"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"
import { getAgentCredentials } from "@/lib/constants/agents"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId")

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 })
    }

    // Try cache first (5 second TTL)
    const cacheKey = CACHE_KEYS.positions(agentId)
    const cached = await getCache(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Get agent credentials
    const credentials = getAgentCredentials(agentId)
    if (!credentials) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Create Aster client and fetch positions
    const client = new AsterClient({
      agentId,
      signer: credentials.signer, // Use agent's wallet address, not API key
      apiSecret: undefined, // Don't use agent private key for REST API
      userAddress: credentials.signer, // Agent's wallet for REST API calls
      userApiKey: credentials.userApiKey,
      userApiSecret: credentials.userApiSecret,
    })

    const positionsData = await client.getPositions()

    // Filter out zero positions
    const activePositions = positionsData.positions.filter((p) => p.positionAmt !== 0)

    // Cache for 5 seconds
    await setCache(cacheKey, activePositions, { ttl: 5 })

    return NextResponse.json(activePositions)
  } catch (error) {
    console.error("Error fetching positions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch positions" },
      { status: 500 }
    )
  }
}