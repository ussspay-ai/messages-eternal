/**
 * POST /api/cron/collect-snapshots
 * 
 * Scheduled endpoint for collecting agent snapshots every 5 minutes
 * Called by EasyCron (or other external cron service)
 * 
 * Authentication: Bearer token in Authorization header
 * Environment: CRON_SECRET (set in .env.local/.env.production)
 */

import { NextRequest, NextResponse } from "next/server"
import { AsterClient } from "@/lib/aster-client"
import { getAllAgents } from "@/lib/constants/agents"
import { saveAgentSnapshots } from "@/lib/supabase-client"

interface SnapshotData {
  agent_id: string
  timestamp: string
  account_value: number
  total_pnl: number
  return_percent: number
  win_rate: number
  trades_count: number
  sharpe_ratio: number
  active_positions: number
}

// Agent colors mapping (for consistency)
const AGENT_COLORS: Record<string, string> = {
  claude_arbitrage: "#D97757",
  chatgpt_openai: "#10B981",
  gemini_grid: "#8B5CF6",
  deepseek_ml: "#3B82F6",
  buy_and_hold: "#34C759",
}

/**
 * Fetch agent data from Aster DEX and prepare snapshot data
 */
async function collectAgentSnapshots(): Promise<SnapshotData[]> {
  const agents = getAllAgents()
  const snapshots: SnapshotData[] = []
  const timestamp = new Date().toISOString()

  // Agent number mapping
  const AGENT_NUMBER_MAP: Record<string, number> = {
    claude_arbitrage: 1,
    chatgpt_openai: 2,
    gemini_grid: 3,
    deepseek_ml: 4,
    buy_and_hold: 5,
  }

  console.log(`[Cron] Starting snapshot collection at ${timestamp}`)

  for (const agent of agents) {
    try {
      const agentNumber = AGENT_NUMBER_MAP[agent.id]
      if (!agentNumber) {
        console.warn(`[Cron] Unknown agent ID: ${agent.id}`)
        continue
      }

      // Get agent-specific API credentials
      const agentApiKey = process.env[`AGENT_${agentNumber}_API_KEY`]
      const agentApiSecret = process.env[`AGENT_${agentNumber}_API_SECRET`]

      if (!agentApiKey || !agentApiSecret) {
        console.warn(`[Cron] No API credentials for agent ${agent.id}`)
        continue
      }

      const signerAddress = agent.aster_account_id
      if (!signerAddress || signerAddress === "0x") {
        console.warn(`[Cron] Invalid signer address for agent ${agent.id}`)
        continue
      }

      // Create Aster client
      const client = new AsterClient({
        agentId: agent.id,
        signer: signerAddress,
        userAddress: signerAddress,
        userApiKey: agentApiKey,
        userApiSecret: agentApiSecret,
      })

      console.log(`[Cron] Fetching account data for ${agent.id}`)

      // Fetch account info
      const stats = await client.getAccountInfo()

      // Fetch positions
      const positionsData = await client.getPositions()
      const activePositions = positionsData.positions.filter((p) => p.positionAmt !== 0).length

      // Calculate metrics
      const initialCapital = agent.initial_capital || 50
      const currentAccountValue = stats.equity || 0
      const totalPnL = stats.total_pnl || 0
      const returnPercent = stats.total_roi !== undefined ? stats.total_roi : ((currentAccountValue - initialCapital) / initialCapital) * 100
      const winRate = stats.win_rate || 0

      // Calculate average leverage if there are positions
      const avgLeverage = positionsData.positions.length > 0
        ? Math.round((positionsData.positions.reduce((sum, p) => sum + p.leverage, 0) / positionsData.positions.length) * 10) / 10
        : 0

      const snapshot: SnapshotData = {
        agent_id: agent.id,
        timestamp,
        account_value: Math.round(currentAccountValue * 100) / 100,
        total_pnl: Math.round(totalPnL * 100) / 100,
        return_percent: Math.round(returnPercent * 100) / 100,
        win_rate: Math.round(winRate * 10) / 10,
        trades_count: 0, // Can be enhanced to fetch actual trades
        sharpe_ratio: 0, // Would need historical data to calculate
        active_positions: activePositions,
      }

      snapshots.push(snapshot)
      console.log(`✅ [Cron] Collected snapshot for ${agent.id}: $${currentAccountValue.toFixed(2)}`)
    } catch (error) {
      console.error(`❌ [Cron] Error collecting snapshot for ${agent.id}:`, error instanceof Error ? error.message : error)
      // Continue with next agent
    }
  }

  console.log(`[Cron] Collected ${snapshots.length} snapshots`)
  return snapshots
}

/**
 * Main cron handler
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization")
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`

    if (!authHeader || authHeader !== expectedToken) {
      console.warn("[Cron] ❌ Unauthorized request")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("[Cron] ✅ Request authorized, collecting snapshots...")

    // Collect snapshots
    const snapshots = await collectAgentSnapshots()

    if (snapshots.length === 0) {
      console.warn("[Cron] ⚠️ No snapshots collected")
      return NextResponse.json(
        { warning: "No snapshots collected", count: 0 },
        { status: 200 }
      )
    }

    // Save to Supabase
    await saveAgentSnapshots(snapshots)

    console.log(`[Cron] ✅ Successfully saved ${snapshots.length} snapshots`)

    return NextResponse.json({
      success: true,
      count: snapshots.length,
      timestamp: new Date().toISOString(),
      snapshots,
    })
  } catch (error) {
    console.error("[Cron] ❌ Error in snapshot collection:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * Also handle GET for testing
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization")
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`

    if (!authHeader || authHeader !== expectedToken) {
      console.warn("[Cron] ❌ Unauthorized GET request")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("[Cron] Testing snapshot collection...")

    // Collect and save snapshots
    const snapshots = await collectAgentSnapshots()

    if (snapshots.length === 0) {
      return NextResponse.json(
        { warning: "No snapshots collected", count: 0 },
        { status: 200 }
      )
    }

    await saveAgentSnapshots(snapshots)

    return NextResponse.json({
      success: true,
      count: snapshots.length,
      timestamp: new Date().toISOString(),
      snapshots,
    })
  } catch (error) {
    console.error("[Cron] ❌ Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}