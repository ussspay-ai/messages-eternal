/**
 * GET /api/aster/agent-realtime-context
 * Fetch realtime data for agent chat context: traded symbols, prices, unrealized PnL
 */

import { AsterClient } from "@/lib/aster-client"
import { getAgentCredentials, getAllAgents } from "@/lib/constants/agents"
import { NextRequest, NextResponse } from "next/server"

interface SymbolContext {
  symbol: string
  currentPrice: number
  unrealizedPnL: number
  unrealizedROI: number
  positionSize: number
  side: 'LONG' | 'SHORT'
  entryPrice: number
}

interface AgentRealtimeContext {
  agentId: string
  agentName: string
  totalUnrealizedPnL: number
  totalUnrealizedROI: number
  openPositionCount: number
  tradedSymbols: SymbolContext[]
  accountValue: number
  equity: number
  timestamp: string
}

/**
 * Fetch current price from Binance
 */
async function getCurrentPrice(symbol: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { next: { revalidate: 5 } }
    )
    const data = await response.json()
    return parseFloat(data.price)
  } catch (error) {
    console.warn(`Failed to fetch price for ${symbol}:`, error)
    return 0
  }
}

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId")
    const allAgents = getAllAgents()

    // Validate agent if specified
    if (agentId) {
      const agent = allAgents.find(a => a.id === agentId)
      if (!agent) {
        return NextResponse.json(
          { error: `Agent ${agentId} not found` },
          { status: 404 }
        )
      }
    }

    const agentsToFetch = agentId 
      ? allAgents.filter(a => a.id === agentId)
      : allAgents

    const contextData: AgentRealtimeContext[] = []

    for (const agent of agentsToFetch) {
      try {
        const credentials = getAgentCredentials(agent.id)
        if (!credentials) continue

        const client = new AsterClient({
          agentId: agent.id,
          signer: credentials.signer,
          apiSecret: undefined,
          userAddress: credentials.signer,
          userApiKey: credentials.userApiKey,
          userApiSecret: credentials.userApiSecret,
        })

        // Fetch account info with positions
        const accountInfo = await Promise.race([
          client.getAccountInfo(),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 5000)
          )
        ])

        // Note: Trading symbols fetched dynamically per position from Aster
        // No need to pre-fetch AGENT_TRADING_SYMBOLS - we get actual positions

        // Fetch prices and match with positions
        const symbolContexts: SymbolContext[] = []
        let totalUnrealizedPnL = 0
        let totalUnrealizedROI = 0

        // Process each open position
        const openPositions = accountInfo.positions?.filter((p: any) => p.positionAmt !== 0) || []
        
        for (const position of openPositions) {
          try {
            const currentPrice = await Promise.race([
              getCurrentPrice(position.symbol),
              new Promise<number>((_, reject) =>
                setTimeout(() => reject(new Error("Price timeout")), 2000)
              )
            ])

            const unrealizedPnL = Number(position.unrealizedProfit) || 0
            const positionValue = Math.abs(Number(position.positionAmt)) * currentPrice
            const unrealizedROI = positionValue > 0 ? (unrealizedPnL / positionValue) * 100 : 0

            symbolContexts.push({
              symbol: position.symbol,
              currentPrice,
              unrealizedPnL,
              unrealizedROI,
              positionSize: Number(position.positionAmt),
              side: Number(position.positionAmt) > 0 ? 'LONG' : 'SHORT',
              entryPrice: Number(position.entryPrice) || 0,
            })

            totalUnrealizedPnL += unrealizedPnL
            totalUnrealizedROI += unrealizedROI
          } catch (priceError) {
            console.warn(`Failed to fetch price for ${position.symbol}:`, priceError)
          }
        }

        // Calculate average unrealized ROI
        const avgUnrealizedROI = openPositions.length > 0 
          ? totalUnrealizedROI / openPositions.length
          : 0

        contextData.push({
          agentId: agent.id,
          agentName: agent.name,
          totalUnrealizedPnL,
          totalUnrealizedROI: avgUnrealizedROI,
          openPositionCount: openPositions.length,
          tradedSymbols: symbolContexts,
          accountValue: Number(accountInfo.equity) || 0,
          equity: Number(accountInfo.equity) || 0,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error(`Error fetching realtime context for agent ${agent.id}:`, error)
        // Provide fallback empty context
        contextData.push({
          agentId: agent.id,
          agentName: agent.name,
          totalUnrealizedPnL: 0,
          totalUnrealizedROI: 0,
          openPositionCount: 0,
          tradedSymbols: [],
          accountValue: agent.initial_capital || 50,
          equity: agent.initial_capital || 50,
          timestamp: new Date().toISOString(),
        })
      }
    }

    const response = agentId 
      ? contextData[0] || null
      : contextData

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching agent realtime context:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch context" },
      { status: 500 }
    )
  }
}