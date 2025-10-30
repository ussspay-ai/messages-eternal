/**
 * GET /api/aster/agents-data
 * Fetch aggregated data for all agents (dashboard view)
 */

import { AsterClient } from "@/lib/aster-client"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"
import { getAllAgents, getAgentCredentials } from "@/lib/constants/agents"
import { NextResponse } from "next/server"

interface AgentData {
  id: string
  name: string
  model: string
  strategy: string
  logo_url: string
  account_value: number
  total_balance: number
  roi: number
  pnl: number
  total_pnl: number
  open_positions: number
  timestamp: string
}

export async function GET() {
  try {
    // Try cache first (5 second TTL for dashboard)
    const cacheKey = CACHE_KEYS.dashboard()
    const cached = await getCache(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const agents = getAllAgents()
    const agentsData: AgentData[] = []

    // Fetch data for each agent
    for (const agent of agents) {
      let credentials = null
      try {
        credentials = getAgentCredentials(agent.id)
        if (!credentials) continue

        const client = new AsterClient({
          agentId: agent.id,
          signer: credentials.signer, // Use agent's wallet address, not API key
          apiSecret: undefined, // Don't use agent private key for REST API
          userAddress: credentials.signer, // Agent's wallet for REST API calls
          userApiKey: credentials.userApiKey,
          userApiSecret: credentials.userApiSecret,
        })

        const stats = await client.getAccountInfo()

        const openPositions = stats.positions.filter((p) => p.positionAmt !== 0).length
        const initialCapital = 50 // Agents are funded with $50
        const currentValue = stats.equity || 50
        const totalPnl = stats.total_pnl || 0
        const roi = stats.total_roi !== undefined ? stats.total_roi : ((currentValue - initialCapital) / initialCapital) * 100

        agentsData.push({
          id: agent.id,
          name: agent.name,
          model: agent.model,
          strategy: agent.strategy,
          logo_url: agent.logo_url,
          account_value: currentValue,
          total_balance: stats.equity || 0,
          roi: roi,
          pnl: (currentValue - initialCapital),
          total_pnl: totalPnl,
          open_positions: openPositions,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error(`Error fetching data for agent ${agent.id}:`, error)
        console.error(`Stack trace:`, error instanceof Error ? error.stack : 'N/A')
        console.error(`Credentials for ${agent.id}:`, {
          hasCredentials: !!credentials,
          signer: credentials?.signer?.substring(0, 10),
          user: credentials?.user?.substring(0, 10),
          hasPrivateKey: !!credentials?.privateKey,
          hasUserApiKey: !!credentials?.userApiKey,
          hasUserApiSecret: !!credentials?.userApiSecret,
        })
        // Add agent with default $50 funding on error
        agentsData.push({
          id: agent.id,
          name: agent.name,
          model: agent.model,
          strategy: agent.strategy,
          logo_url: agent.logo_url,
          account_value: 50,
          total_balance: 50,
          roi: 0,
          pnl: 0,
          total_pnl: 0,
          open_positions: 0,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Calculate aggregates
    const portfolio_value = agentsData.reduce((sum, a) => sum + a.account_value, 0)
    const total_pnl = agentsData.reduce((sum, a) => sum + a.pnl, 0)
    const bestPerformer = agentsData.reduce((prev, current) =>
      prev.roi > current.roi ? prev : current
    )
    const worstPerformer = agentsData.reduce((prev, current) =>
      prev.roi < current.roi ? prev : current
    )

    const response = {
      agents: agentsData,
      portfolio_value,
      total_pnl,
      best_performer: bestPerformer,
      worst_performer: worstPerformer,
      timestamp: new Date().toISOString(),
    }

    // Cache for 5 seconds
    await setCache(cacheKey, response, { ttl: 5 })

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching agents data:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agents data" },
      { status: 500 }
    )
  }
}