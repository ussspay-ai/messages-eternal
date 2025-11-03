/**
 * GET /api/aster/save-snapshots
 * Dedicated endpoint to save agent snapshots every 5 minutes
 * Should be called via cron job or dashboard polling
 */

import { NextResponse } from "next/server"
import { AsterClient } from "@/lib/aster-client"
import { getAllAgents } from "@/lib/constants/agents"
import { saveAgentSnapshots } from "@/lib/supabase-client"
import { getCache, setCache } from "@/lib/redis-client"

export async function GET() {
  try {
    console.log("[SaveSnapshots] Starting snapshot save cycle...")
    const agents = getAllAgents()
    const snapshots: any[] = []

    // Fetch current account data for each agent
    for (const agent of agents) {
      try {
        const agentApiKey = process.env[`AGENT_${getAgentNumber(agent.id)}_API_KEY`]
        const agentApiSecret = process.env[`AGENT_${getAgentNumber(agent.id)}_API_SECRET`]

        if (!agentApiKey || !agentApiSecret) {
          console.warn(`[SaveSnapshots] No credentials for ${agent.id}`)
          continue
        }

        const client = new AsterClient({
          agentId: agent.id,
          signer: agent.aster_account_id,
          userAddress: agent.aster_account_id,
          userApiKey: agentApiKey,
          userApiSecret: agentApiSecret,
        })

        // Get account info
        const stats = await client.getAccountInfo()
        const positions = await client.getPositions()
        const activePositions = positions.positions.filter((p: any) => p.positionAmt !== 0).length

        // Create snapshot
        const snapshot = {
          agent_id: agent.id,
          timestamp: new Date().toISOString(),
          account_value: Math.round(stats.equity * 100) / 100,
          total_pnl: Math.round((stats.total_pnl || 0) * 100) / 100,
          return_percent: Math.round((stats.total_roi || 0) * 100) / 100,
          win_rate: 0,
          trades_count: 0,
          sharpe_ratio: 0,
          active_positions: activePositions,
        }

        snapshots.push(snapshot)
        console.log(`[SaveSnapshots] ✅ ${agent.id}: $${snapshot.account_value}`)
      } catch (error) {
        console.error(`[SaveSnapshots] ❌ Error fetching ${agent.id}:`, error)
      }
    }

    // Save all snapshots to Supabase
    if (snapshots.length > 0) {
      await saveAgentSnapshots(snapshots)
      console.log(`[SaveSnapshots] ✅ Saved ${snapshots.length} snapshots to database`)
    }

    return NextResponse.json({
      success: true,
      snapshotsSaved: snapshots.length,
      timestamp: new Date().toISOString(),
      snapshots: snapshots.map(s => ({ agent_id: s.agent_id, account_value: s.account_value })),
    })
  } catch (error) {
    console.error("[SaveSnapshots] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to save snapshots",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * Helper to map agent ID to agent number
 */
function getAgentNumber(agentId: string): number {
  const map: Record<string, number> = {
    claude_arbitrage: 1,
    chatgpt_openai: 2,
    gemini_grid: 3,
    deepseek_ml: 4,
    buy_and_hold: 5,
  }
  return map[agentId] || 1
}