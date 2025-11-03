/**
 * DEBUG: Check what trades are actually coming from Aster API
 */

import { AsterClient } from "@/lib/aster-client"
import { getAllAgents, getAgentCredentials } from "@/lib/constants/agents"
import { NextResponse } from "next/server"

export async function GET() {
  const agents = getAllAgents()
  const results: any = {}

  for (const agent of agents) {
    try {
      const credentials = getAgentCredentials(agent.id)
      if (!credentials) {
        results[agent.id] = { error: "No credentials" }
        continue
      }

      const client = new AsterClient({
        agentId: agent.id,
        signer: credentials.signer,
        apiSecret: undefined,
        userAddress: credentials.signer,
        userApiKey: credentials.userApiKey,
        userApiSecret: credentials.userApiSecret,
      })

      // Get account info
      const stats = await client.getAccountInfo()
      
      // Get trades
      const tradesResponse = await client.getTrades(undefined, 10)
      const trades = (tradesResponse.trades || []).slice(0, 3) // First 3 trades

      results[agent.id] = {
        currentValue: stats.equity,
        tradeCount: tradesResponse.trades?.length || 0,
        firstTrades: trades.map((t: any) => ({
          time: new Date(t.time).toISOString(),
          realizedPnl: t.realizedPnl,
          symbol: t.symbol,
          side: t.side,
        })),
        summary: tradesResponse.summary,
      }
    } catch (error: any) {
      results[agent.id] = { error: error.message }
    }
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-cache" } })
}