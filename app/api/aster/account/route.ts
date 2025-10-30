/**
 * GET /api/aster/account?agentId=<id>
 * Fetch agent account information from Aster
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
    const cacheKey = CACHE_KEYS.accountInfo(agentId)
    const cached = await getCache(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Get agent credentials
    const credentials = getAgentCredentials(agentId)
    if (!credentials) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Create Aster client and fetch account info
    const client = new AsterClient({
      agentId,
      signer: credentials.signer, // Use agent's wallet address, not API key
      apiSecret: undefined, // Don't use agent private key for REST API
      userAddress: credentials.signer, // Agent's wallet for REST API calls
      userApiKey: credentials.userApiKey,
      userApiSecret: credentials.userApiSecret,
    })

    const accountInfo = await client.getAccountInfo()

    // Cache for 5 seconds
    await setCache(cacheKey, accountInfo, { ttl: 5 })

    return NextResponse.json(accountInfo)
  } catch (error) {
    console.error("Error fetching account info:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch account info" },
      { status: 500 }
    )
  }
}