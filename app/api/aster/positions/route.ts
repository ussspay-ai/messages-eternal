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
      console.error("[Positions API] Missing agentId parameter")
      return NextResponse.json({ error: "agentId required" }, { status: 400 })
    }

    console.log(`[Positions API] Fetching positions for agent: ${agentId}`)

    // Try cache first (5 second TTL)
    const cacheKey = CACHE_KEYS.positions(agentId)
    const cached = await getCache(cacheKey)
    if (cached && Array.isArray(cached)) {
      console.log(`[Positions API] ✅ Returning cached positions for ${agentId}: ${cached.length} positions`)
      return NextResponse.json(cached)
    }

    // Get agent credentials
    const credentials = getAgentCredentials(agentId)
    if (!credentials) {
      console.error(`[Positions API] ❌ No credentials found for agent: ${agentId}`)
      return NextResponse.json(
        { error: `No credentials found for agent ${agentId}. Ensure AGENT_*_SIGNER, AGENT_*_PRIVATE_KEY, and API keys are configured in .env` },
        { status: 404 }
      )
    }

    console.log(`[Positions API] ✅ Credentials validated for ${agentId}`)
    console.log(`[Positions API] 📋 Using wallet: ${credentials.signer}`)
    console.log(`[Positions API] 🔑 API Key: ${credentials.userApiKey?.substring(0, 10)}...`)
    console.log(`[Positions API] 🔐 API Secret: ${credentials.userApiSecret?.substring(0, 10)}...`)

    // Create Aster client and fetch positions
    const client = new AsterClient({
      agentId,
      signer: credentials.signer, // Use agent's wallet address
      apiSecret: undefined, // Don't use agent private key for REST API
      userAddress: credentials.signer, // Agent's wallet for REST API calls
      userApiKey: credentials.userApiKey,
      userApiSecret: credentials.userApiSecret,
    })

    console.log(`[Positions API] 🚀 Calling AsterClient.getPositions()...`)
    const positionsData = await client.getPositions()
    console.log(`[Positions API] ✅ Aster API returned ${positionsData.positions.length} total positions for ${agentId}`)
    
    if (positionsData.positions.length > 0) {
      console.log(`[Positions API] 📍 Position details:`, positionsData.positions.map(p => ({
        symbol: p.symbol,
        side: p.side,
        amount: p.positionAmt,
        pnl: p.unrealizedProfit,
      })))
    }

    // Filter out zero positions
    const activePositions = positionsData.positions.filter((p) => p.positionAmt !== 0)
    console.log(`[Positions API] ✅ After filtering: ${activePositions.length} active positions for ${agentId}`)

    // Cache for 5 seconds
    await setCache(cacheKey, activePositions, { ttl: 5 })

    return NextResponse.json(activePositions)
  } catch (error) {
    console.error("[Positions API] Error fetching positions:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json(
      { error: `Failed to fetch positions: ${errorMessage}` },
      { status: 500 }
    )
  }
}