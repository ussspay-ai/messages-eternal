/**
 * GET /api/realtime/agents
 * Server-Sent Events endpoint for real-time agent data updates
 * Uses 15-second intervals with shared caching to avoid rate limiting
 */

import { getAllAgents, getAgentCredentials, PRIMARY_SYMBOLS } from "@/lib/constants/agents"
import { AsterClient } from "@/lib/aster-client"
import { NextRequest, NextResponse } from "next/server"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

interface AgentUpdate {
  id: string
  name: string
  account_value: number
  roi: number
  pnl: number
  total_pnl: number
  open_positions: number
  timestamp: string
}

async function fetchAgentData(): Promise<AgentUpdate[]> {
  const agents = getAllAgents()
  const updates: AgentUpdate[] = []

  for (const agent of agents) {
    try {
      const credentials = getAgentCredentials(agent.id)
      if (!credentials) continue

      const client = new AsterClient({
        agentId: agent.id,
        signer: credentials.signer, // Use agent's wallet address, not API key
        apiSecret: undefined, // Don't use agent private key for REST API
        userAddress: credentials.signer, // Agent's wallet for REST API calls
        userApiKey: credentials.userApiKey,
        userApiSecret: credentials.userApiSecret,
      })

      // Only call getAccountInfo (includes positions and pnl data)
      const stats = await client.getAccountInfo()

      const openPositions = (stats.positions || []).filter((p) => p.positionAmt !== 0).length
      const initialCapital = 10000
      const currentValue = stats.equity || 0
      const roi = stats.total_roi !== undefined ? stats.total_roi : ((currentValue - initialCapital) / initialCapital) * 100

      updates.push({
        id: agent.id,
        name: agent.name,
        account_value: currentValue,
        roi: roi,
        pnl: currentValue - initialCapital,
        total_pnl: stats.total_pnl || 0,
        open_positions: openPositions,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`Error fetching data for agent ${agent.id}:`, error)
    }
  }

  return updates
}

export async function GET(request: NextRequest) {
  // Check if client supports SSE
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send data
      const sendUpdate = (data: AgentUpdate[]) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
      }

      try {
        // Send initial data
        let cachedData = await getCache<AgentUpdate[]>(CACHE_KEYS.realtime_agents())
        if (!cachedData) {
          cachedData = await fetchAgentData()
          // Cache for 15 seconds to share across multiple clients
          await setCache(CACHE_KEYS.realtime_agents(), cachedData, { ttl: 15 })
        }
        sendUpdate(cachedData || [])

        // Send updates every 15 seconds (reduced from 5s to stay below API rate limits)
        // This means each client connection only polls Aster API every 15s
        // Combined with caching, this significantly reduces API pressure
        const interval = setInterval(async () => {
          try {
            // Try cache first
            let data = await getCache<AgentUpdate[]>(CACHE_KEYS.realtime_agents())
            if (!data) {
              // Cache miss - fetch fresh data
              data = await fetchAgentData()
              await setCache(CACHE_KEYS.realtime_agents(), data, { ttl: 15 })
            }
            sendUpdate(data || [])
          } catch (error) {
            console.error("Error in SSE interval:", error)
          }
        }, 15000)

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(interval)
          controller.close()
        })
      } catch (error) {
        console.error("Error starting SSE:", error)
        controller.enqueue(`event: error\ndata: ${JSON.stringify({ error: "Stream error" })}\n\n`)
        controller.close()
      }
    },
  })

  return new NextResponse(stream, { headers })
}