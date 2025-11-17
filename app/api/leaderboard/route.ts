/**
 * Live Leaderboard API - REAL DATA
 * Provides real-time agent performance data from Aster API
 * Uses intelligent caching to minimize API calls and rate limiting
 */

import { NextRequest, NextResponse } from "next/server"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"
import { AsterClient } from "@/lib/aster-client"
import { AGENTS, getAllAgents, getAgentCredentials, PRIMARY_SYMBOLS } from "@/lib/constants/agents"
import { saveAgentSnapshots, get5MinuteOldSnapshot } from "@/lib/supabase-client"

interface LeaderboardAgent {
  id: string
  name: string
  model: string
  logo: string
  accountValue: number
  availableBalance: number
  returnPercent: number
  totalPnL: number
  fees: number
  winRate: number
  biggestWin: number
  biggestLoss: number
  sharpe: number
  trades: number
  color: string
  activePositions: number
  walletAddress?: string
  avgTradeSize?: number
  medianTradeSize?: number
  avgHoldTime?: string
  medianHoldTime?: string
  longPercent?: number
  expectancy?: number
  medianLeverage?: number
  avgLeverage?: number
  avgConfidence?: number
  medianConfidence?: number
  status: "active" | "idle"
  lastUpdate: string
  winRatePercent5m?: number
}

// Agent colors mapping
const AGENT_COLORS: Record<string, string> = {
  claude_arbitrage: "#D97757",
  chatgpt_openai: "#10B981",
  gemini_grid: "#8B5CF6",
  deepseek_ml: "#3B82F6",
  buy_and_hold: "#34C759",
}

/**
 * Save agent snapshots to Supabase every 5 minutes
 * Uses Redis to track last save time
 */
async function saveSnapshotsIfNeeded(agents: LeaderboardAgent[]): Promise<void> {
  const lastSaveKey = "leaderboard:last_snapshot_save"
  let lastSave: number | undefined = undefined
  
  try {
    lastSave = (await getCache<number>(lastSaveKey)) ?? undefined
  } catch (cacheError) {
    console.warn("Cache unavailable for snapshot check:", cacheError)
    // Continue without cache
  }
  
  const now = Date.now()
  const fiveMinutesMs = 5 * 60 * 1000

  // Only save if 5 minutes have passed since last save
  if (lastSave && (now - lastSave) < fiveMinutesMs) {
    return
  }

  try {
    const snapshots = agents.map((agent) => ({
      agent_id: agent.id,
      timestamp: new Date().toISOString(),
      account_value: agent.accountValue,
      total_pnl: agent.totalPnL,
      return_percent: agent.returnPercent,
      win_rate: agent.winRate,
      trades_count: agent.trades,
      sharpe_ratio: agent.sharpe,
      active_positions: agent.activePositions,
    }))

    // Save to Supabase
    await saveAgentSnapshots(snapshots)

    // Try to update last save time in Redis
    try {
      await setCache(lastSaveKey, now, { ttl: 600 }) // Keep in cache for 10 minutes
    } catch (cacheError) {
      console.warn("Could not update snapshot cache:", cacheError)
    }
  } catch (error) {
    console.error("Error saving snapshots:", error)
    // Don't throw - let the leaderboard request continue even if snapshot save fails
  }
}

/**
 * Get agent's configured trading symbols from Pickaboo
 * Queries agent_trading_symbols table first, falls back to defaults
 */
async function getAgentTradingSymbols(agentId: string): Promise<string[]> {
  const { getCache, setCache } = await import("@/lib/redis-client")
  const { supabase } = await import("@/lib/supabase-client")
  
  // Check cache first
  const cacheKey = `agent_symbols:${agentId}`
  try {
    const cached = await getCache<string[]>(cacheKey)
    if (cached) {
      return cached
    }
  } catch (cacheError) {
    console.warn(`Cache unavailable for agent symbols ${agentId}:`, cacheError)
    // Continue without cache
  }

  try {
    // Query Pickaboo configuration if Supabase is available
    if (supabase) {
      const { data, error } = await supabase
        .from("agent_trading_symbols")
        .select("symbols")
        .eq("agent_id", agentId)
        .single()

      if (!error && data && data.symbols) {
        const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols]
        // Convert base symbols to USDT pairs if needed
        const pairs = symbols.map((s: string) => s.endsWith("USDT") ? s : `${s}USDT`)
        
        // Try to cache for 1 hour
        try {
          await setCache(cacheKey, pairs, { ttl: 3600 })
        } catch (cacheError) {
          console.warn("Could not cache agent symbols:", cacheError)
        }
        console.log(`[Leaderboard] Fetched configured symbols for ${agentId}: ${pairs.join(", ")}`)
        return pairs
      }
    }
  } catch (e) {
    console.debug(`[Leaderboard] Could not fetch Pickaboo config for ${agentId}:`, e)
  }

  // Fallback to default symbols from constants
  const defaultSymbols = PRIMARY_SYMBOLS
  try {
    await setCache(cacheKey, defaultSymbols, { ttl: 3600 })
  } catch (cacheError) {
    console.warn("Could not cache default agent symbols:", cacheError)
  }
  console.log(`[Leaderboard] Using default symbols for ${agentId}: ${defaultSymbols.join(", ")}`)
  return defaultSymbols
}

/**
 * Get agent data from /api/aster/agents-data endpoint
 * This fetches real account values for all agents
 */
async function getAgentsDataFromEndpoint(): Promise<LeaderboardAgent[]> {
  try {
    // Call the agents-data endpoint internally
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:3000`
    const response = await fetch(`${baseUrl}/api/aster/agents-data`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!response.ok) {
      console.warn(`agents-data endpoint returned ${response.status}`)
      return []
    }

    const data = await response.json()
    if (!data.agents || !Array.isArray(data.agents)) {
      console.warn("Invalid response from agents-data endpoint")
      return []
    }

    // Transform agents-data response to LeaderboardAgent format
    const agents: LeaderboardAgent[] = data.agents.map((agent: any) => {
      const agentConfig = AGENTS[agent.id as keyof typeof AGENTS]
      return {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        logo: agent.logo_url,
        accountValue: agent.account_value || 0,
        availableBalance: agent.available_balance || agent.account_value || 0,
        returnPercent: agent.roi || 0,
        totalPnL: agent.total_pnl || 0,
        fees: 0,
        winRate: 0,
        biggestWin: 0,
        biggestLoss: 0,
        sharpe: 0,
        trades: 0,
        color: AGENT_COLORS[agent.id] || "#999999",
        activePositions: agent.open_positions || 0,
        walletAddress: agentConfig?.aster_account_id,
        status: "active" as const,
        lastUpdate: agent.timestamp || new Date().toISOString(),
      }
    })

    // Fetch trades for each agent to calculate win rate and other metrics
    for (const agent of agents) {
      try {
        const credentials = getAgentCredentials(agent.id)
        if (!credentials) {
          console.warn(`⚠️ [Leaderboard] No credentials found for agent ${agent.id}`)
          continue
        }

        console.log(`[Leaderboard] Fetching trades for ${agent.id}...`)

        const client = new AsterClient({
          agentId: agent.id,
          signer: credentials.signer,
          userAddress: credentials.user,
          userApiKey: credentials.userApiKey,
          userApiSecret: credentials.userApiSecret,
        })

        const tradesResponse = await client.getTrades()
        console.log(`[Leaderboard] Got ${tradesResponse.trades.length} trades for ${agent.id}`)
        
        let fees = 0
        let biggestWin = 0
        let biggestLoss = 0
        let winRate = 0

        if (tradesResponse.trades.length > 0) {
          const winningTrades = tradesResponse.trades.filter((t) => t.realizedPnl > 0)
          winRate = (winningTrades.length / tradesResponse.trades.length) * 100
          console.log(`[Leaderboard] ${agent.id} win rate calculation: ${winningTrades.length}/${tradesResponse.trades.length} = ${winRate}%`)

          tradesResponse.trades.forEach((trade) => {
            if (trade.realizedPnl > 0 && trade.realizedPnl > biggestWin) {
              biggestWin = trade.realizedPnl
            }
            if (trade.realizedPnl < 0 && trade.realizedPnl < biggestLoss) {
              biggestLoss = trade.realizedPnl
            }
            fees += trade.commission || 0
          })
        }

        // Calculate advanced metrics for this agent
        const advancedMetrics = calculateAdvancedMetrics(tradesResponse.trades)

        agent.winRate = Math.round(winRate * 10) / 10
        agent.trades = tradesResponse.trades.length
        agent.fees = Math.round(fees * 100) / 100
        agent.biggestWin = Math.round(biggestWin * 100) / 100
        agent.biggestLoss = Math.round(biggestLoss * 100) / 100
        agent.avgTradeSize = advancedMetrics.avgTradeSize
        agent.medianTradeSize = advancedMetrics.medianTradeSize
        agent.avgHoldTime = advancedMetrics.avgHoldTime
        agent.medianHoldTime = advancedMetrics.medianHoldTime
        agent.longPercent = advancedMetrics.longPercent
        agent.expectancy = advancedMetrics.expectancy
        agent.medianLeverage = advancedMetrics.medianLeverage
        agent.avgConfidence = advancedMetrics.avgConfidence
        agent.medianConfidence = advancedMetrics.medianConfidence
        console.log(`[Leaderboard] ✅ ${agent.id}: WR=${agent.winRate}%, Fees=$${agent.fees}, Trades=${agent.trades}`)
      } catch (error) {
        console.error(`❌ [Leaderboard] Error fetching trades for ${agent.id}:`, error instanceof Error ? error.message : error)
      }
    }

    console.log(`✅ Fetched ${agents.length} agents from agents-data endpoint`)
    return agents
  } catch (error) {
    console.warn("Error calling agents-data endpoint:", error)
    return []
  }
}

/**
 * Calculate advanced analytics metrics from trade array
 */
function calculateAdvancedMetrics(tradesArray: any[]) {
  if (!tradesArray || tradesArray.length === 0) {
    return {
      avgTradeSize: 0,
      medianTradeSize: 0,
      avgHoldTime: "0h 0m",
      medianHoldTime: "0h 0m",
      longPercent: 0,
      expectancy: 0,
      avgLeverage: 1,
      medianLeverage: 1,
      avgConfidence: 0,
      medianConfidence: 0,
    }
  }

  // Calculate trade sizes (entryPrice * entryQty)
  const tradeSizes = tradesArray
    .map((trade) => {
      const size = (trade.entryPrice || 0) * Math.abs(trade.qty || 0)
      return size
    })
    .filter((size) => size > 0)
    .sort((a, b) => a - b)

  const avgTradeSize = tradeSizes.length > 0 ? tradeSizes.reduce((a, b) => a + b, 0) / tradeSizes.length : 0
  const medianTradeSize = tradeSizes.length > 0 ? tradeSizes[Math.floor(tradeSizes.length / 2)] : 0

  // Calculate hold times (in milliseconds from entryTime to exitTime if available)
  const holdTimes = tradesArray
    .map((trade) => {
      if (trade.entryTime && trade.exitTime) {
        return new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime()
      }
      return 0
    })
    .filter((time) => time > 0)
    .sort((a, b) => a - b)

  const avgHoldTimeMs = holdTimes.length > 0 ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length : 0
  const medianHoldTimeMs = holdTimes.length > 0 ? holdTimes[Math.floor(holdTimes.length / 2)] : 0

  // Convert milliseconds to readable format
  const formatHoldTime = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const avgHoldTime = formatHoldTime(avgHoldTimeMs)
  const medianHoldTime = formatHoldTime(medianHoldTimeMs)

  // Calculate long percentage (side === 'LONG' or posSide === 'LONG')
  const longTrades = tradesArray.filter((trade) => trade.side === "LONG" || trade.posSide === "LONG").length
  const longPercent = tradesArray.length > 0 ? (longTrades / tradesArray.length) * 100 : 0

  // Calculate expectancy (average PnL per trade)
  const expectancy = tradesArray.length > 0 ? tradesArray.reduce((sum, trade) => sum + (trade.realizedPnl || 0), 0) / tradesArray.length : 0

  // Calculate average and median leverage from trades (if available)
  const leverages = tradesArray
    .map((trade) => trade.leverage || 1)
    .filter((lev) => lev > 0)
    .sort((a, b) => a - b)

  const avgLeverage = leverages.length > 0 ? leverages.reduce((a, b) => a + b, 0) / leverages.length : 1
  const medianLeverage = leverages.length > 0 ? leverages[Math.floor(leverages.length / 2)] : 1

  // Calculate average and median confidence (if available in trade data)
  const confidences = tradesArray
    .map((trade) => trade.confidence || trade.confidence_score || 50)
    .filter((conf) => conf > 0)
    .sort((a, b) => a - b)

  const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0
  const medianConfidence = confidences.length > 0 ? confidences[Math.floor(confidences.length / 2)] : 0

  return {
    avgTradeSize: Math.round(avgTradeSize * 100) / 100,
    medianTradeSize: Math.round(medianTradeSize * 100) / 100,
    avgHoldTime,
    medianHoldTime,
    longPercent: Math.round(longPercent * 10) / 10,
    expectancy: Math.round(expectancy * 100) / 100,
    avgLeverage: Math.round(avgLeverage * 10) / 10,
    medianLeverage: Math.round(medianLeverage * 10) / 10,
    avgConfidence: Math.round(avgConfidence * 10) / 10,
    medianConfidence: Math.round(medianConfidence * 10) / 10,
  }
}

/**
 * Calculate 5-minute win rate based on P&L change
 */
async function calculate5MinuteWinRate(agentId: string, currentTotalPnL: number): Promise<number> {
  try {
    const baseline5mAgo = await get5MinuteOldSnapshot(agentId)
    
    if (!baseline5mAgo) {
      // No baseline available yet - log this to diagnose data collection issues
      console.debug(`[Leaderboard] No 5m baseline for ${agentId} - snapshots may not have 3-7m history yet`)
      return 0
    }

    const pnlChange = currentTotalPnL - baseline5mAgo.total_pnl
    
    console.debug(`[Leaderboard] ${agentId} 5m PnL: baseline=$${baseline5mAgo.total_pnl} current=$${currentTotalPnL} change=$${pnlChange}`)
    
    // If baseline was 0, check if current is non-zero
    if (baseline5mAgo.total_pnl === 0) {
      const rate = currentTotalPnL === 0 ? 0 : 100
      console.debug(`[Leaderboard] ${agentId} 5m win rate (zero baseline): ${rate}%`)
      return rate
    }
    
    // Calculate percentage change
    const percentageChange = (pnlChange / Math.abs(baseline5mAgo.total_pnl)) * 100
    const rounded = Math.round(percentageChange * 10) / 10
    console.debug(`[Leaderboard] ${agentId} 5m win rate: ${rounded}%`)
    return rounded
  } catch (error) {
    console.warn(`Could not calculate 5m win rate for ${agentId}:`, error)
    return 0
  }
}

/**
 * Fetch real data from Aster API for all agents
 * Uses agent-specific credentials (matching agent-balances implementation)
 */
async function fetchRealAgentsData(): Promise<LeaderboardAgent[]> {
  const agents = getAllAgents()
  const agentDataList: LeaderboardAgent[] = []

  // Agent number mapping
  const AGENT_NUMBER_MAP: Record<string, number> = {
    claude_arbitrage: 1,
    chatgpt_openai: 2,
    gemini_grid: 3,
    deepseek_ml: 4,
    buy_and_hold: 5,
  }

  // Get main account address
  const userAddress = process.env.ASTER_USER_ADDRESS
  if (!userAddress) {
    console.error("❌ Missing main Asterdex user address (ASTER_USER_ADDRESS)")
    return []
  }

  for (const agent of agents) {
    try {
      const agentNumber = AGENT_NUMBER_MAP[agent.id]
      if (!agentNumber) {
        console.warn(`Unknown agent ID: ${agent.id}`)
        continue
      }

      // Get agent-specific API credentials (matching agent-balances)
      const agentApiKey = process.env[`AGENT_${agentNumber}_API_KEY`]
      const agentApiSecret = process.env[`AGENT_${agentNumber}_API_SECRET`]

      if (!agentApiKey || !agentApiSecret) {
        console.warn(`No API credentials for agent ${agent.id} (AGENT_${agentNumber}_API_KEY/SECRET)`)
        continue
      }

      // Get agent signer address
      const signerAddress = agent.aster_account_id
      if (!signerAddress || signerAddress === "0x") {
        console.warn(`Invalid signer address for agent ${agent.id}`)
        continue
      }

      // Create Aster client using AGENT-SPECIFIC credentials (like agent-balances)
      const client = new AsterClient({
        agentId: agent.id,
        signer: signerAddress, // Agent's wallet address
        userAddress: signerAddress, // Agent's wallet for REST API calls (not main user wallet)
        userApiKey: agentApiKey,
        userApiSecret: agentApiSecret,
      })

      console.log(`[Leaderboard] Fetching account data for ${agent.id} using agent-specific credentials`)

      // Fetch account info (includes available balance)
      const stats = await client.getAccountInfo()
      
      // Fetch positions for active positions count
      const positionsData = await client.getPositions()
      const activePositions = positionsData.positions.filter((p) => p.positionAmt !== 0).length
      
      // Get available balance from account stats
      const availableBalance = stats.availableBalance || 0

      // Fetch trades for ALL configured symbols (from Pickaboo)
      let tradesArray: any[] = []
      try {
        // Get agent's configured trading symbols from Pickaboo
        const tradingSymbols = await getAgentTradingSymbols(agent.id)
        console.log(`[Leaderboard] Fetching trades for ${agent.id} across symbols: ${tradingSymbols.join(", ")}`)
        
        // Fetch trades for each configured symbol and aggregate
        for (const symbol of tradingSymbols) {
          try {
            const tradesData = await client.getTrades(symbol, 1000)
            const symbolTrades = tradesData.trades || []
            tradesArray = tradesArray.concat(symbolTrades)
            console.log(`[Leaderboard] Fetched ${symbolTrades.length} trades for ${agent.id} on ${symbol}`)
          } catch (e) {
            console.debug(`[Leaderboard] Could not fetch trades for ${agent.id} on ${symbol}:`, e)
          }
        }
      } catch (e) {
        console.debug(`Could not fetch trades for agent ${agent.id}:`, e)
      }

      // Calculate metrics
      const initialCapital = agent.initial_capital || 50 // Fallback to 50 if not set
      const currentAccountValue = stats.equity || 0
      const totalPnL = stats.total_pnl || 0
      const returnPercent = stats.total_roi !== undefined ? stats.total_roi : ((currentAccountValue - initialCapital) / initialCapital) * 100

      // Calculate trade statistics
      let winRate = stats.win_rate || 0
      let biggestWin = 0
      let biggestLoss = 0
      let fees = 0

      if (tradesArray.length > 0) {
        const winningTrades = tradesArray.filter((t) => t.realizedPnl > 0)
        winRate = (winningTrades.length / tradesArray.length) * 100
        
        tradesArray.forEach((trade) => {
          if (trade.realizedPnl > 0 && trade.realizedPnl > biggestWin) {
            biggestWin = trade.realizedPnl
          }
          if (trade.realizedPnl < 0 && trade.realizedPnl < biggestLoss) {
            biggestLoss = trade.realizedPnl
          }
          fees += trade.commission || 0
        })
        console.log(`[Leaderboard] ${agent.id}: Calculated from ${tradesArray.length} trades - Win Rate: ${winRate.toFixed(1)}%, Fees: $${fees.toFixed(2)}, Biggest Win: $${biggestWin.toFixed(2)}, Biggest Loss: $${biggestLoss.toFixed(2)}`)
      } else {
        console.log(`[Leaderboard] ⚠️ ${agent.id}: No trades fetched (tradesArray length = 0)`)
      }

      console.log(`✅ [Leaderboard] Fetched data for ${agent.id}: account value $${currentAccountValue.toFixed(2)}`)

      // Calculate advanced metrics from trades
      const advancedMetrics = calculateAdvancedMetrics(tradesArray)

      // Calculate 5-minute win rate from database
      const winRatePercent5m = await calculate5MinuteWinRate(agent.id, totalPnL)

      const agentData: LeaderboardAgent = {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        logo: agent.logo_url,
        accountValue: Math.round(currentAccountValue * 100) / 100,
        availableBalance: Math.round(availableBalance * 100) / 100,
        returnPercent: Math.round(returnPercent * 100) / 100,
        totalPnL: Math.round(totalPnL * 100) / 100,
        fees: Math.round(fees * 100) / 100,
        winRate: Math.round(winRate * 10) / 10,
        biggestWin: Math.round(biggestWin * 100) / 100,
        biggestLoss: Math.round(biggestLoss * 100) / 100,
        sharpe: 0, // Would calculate from historical data
        trades: tradesArray.length,
        color: AGENT_COLORS[agent.id] || "#999999",
        activePositions,
        walletAddress: agent.aster_account_id,
        avgTradeSize: advancedMetrics.avgTradeSize,
        medianTradeSize: advancedMetrics.medianTradeSize,
        avgHoldTime: advancedMetrics.avgHoldTime,
        medianHoldTime: advancedMetrics.medianHoldTime,
        longPercent: advancedMetrics.longPercent,
        expectancy: advancedMetrics.expectancy,
        medianLeverage: advancedMetrics.medianLeverage,
        avgLeverage: positionsData.positions.length > 0 ? Math.round((positionsData.positions.reduce((sum, p) => sum + p.leverage, 0) / positionsData.positions.length) * 10) / 10 : advancedMetrics.avgLeverage,
        avgConfidence: advancedMetrics.avgConfidence,
        medianConfidence: advancedMetrics.medianConfidence,
        status: "active",
        lastUpdate: new Date().toISOString(),
        winRatePercent5m,
      }

      agentDataList.push(agentData)
    } catch (error) {
      console.error(`❌ Error fetching data for agent ${agent.id}:`, error instanceof Error ? error.message : error)
      // Continue with next agent instead of failing
    }
  }

  return agentDataList
}

export async function GET(request: NextRequest) {
  try {
    const cacheKey = CACHE_KEYS.leaderboard()

    // Try to get cached agents first (5 second TTL)
    let agents: LeaderboardAgent[] = []
    try {
      agents = await getCache<LeaderboardAgent[]>(cacheKey) || []
    } catch (cacheError) {
      console.warn("Cache unavailable for leaderboard, proceeding without cache:", cacheError)
      // Continue without cache - don't fail if Redis is down
    }

    // If no cache, fetch fresh data from agents-data endpoint
    if (agents.length === 0) {
      console.log("Fetching fresh leaderboard data from agents-data endpoint...")
      agents = await getAgentsDataFromEndpoint()
    }

    // If still no data, fall back to direct Aster API fetch
    if (agents.length === 0) {
      console.log("⚠️ agents-data endpoint returned no data, falling back to direct Aster API fetch...")
      agents = await fetchRealAgentsData()
    }

    // If still no data, log warning but continue with empty array
    if (agents.length === 0) {
      console.warn("⚠️ Could not fetch agent data from any source")
    }

    // Sort by account value (descending)
    const sorted = agents.sort((a, b) => b.accountValue - a.accountValue)

    // Try to cache for 5 seconds, but don't fail if it doesn't work
    if (sorted.length > 0) {
      try {
        await setCache(cacheKey, sorted, { ttl: 5 })
      } catch (cacheError) {
        console.warn("Could not cache leaderboard data:", cacheError)
      }
      
      // Save historical snapshots every 5 minutes
      await saveSnapshotsIfNeeded(sorted)
    }

    // Calculate summary statistics
    const summary = sorted.length > 0 ? {
      avgAccountValue: (sorted.reduce((sum, a) => sum + a.accountValue, 0) / sorted.length).toFixed(2),
      avgROI: (sorted.reduce((sum, a) => sum + a.returnPercent, 0) / sorted.length).toFixed(2),
      totalTrades: sorted.reduce((sum, a) => sum + a.trades, 0),
      totalAgents: sorted.length,
    } : {
      avgAccountValue: "0",
      avgROI: "0",
      totalTrades: 0,
      totalAgents: 0,
    }

    // Add metadata
    const response = {
      agents: sorted,
      timestamp: new Date().toISOString(),
      totalAgents: sorted.length,
      topAgent: sorted.length > 0 ? sorted[0] : null,
      summary,
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=5",
        "X-Data-Source": "aster-api",
      },
    })
  } catch (error) {
    console.error("Leaderboard API error:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch leaderboard data",
        message: error instanceof Error ? error.message : "Unknown error",
        agents: [],
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Trigger manual refresh (for webhook integrations)
 */
export async function POST(request: NextRequest) {
  try {
    // Clear cache to force fresh fetch on next request
    const cacheKey = CACHE_KEYS.leaderboard()
    await setCache(cacheKey, null, { ttl: 1 })

    return NextResponse.json({
      success: true,
      message: "Leaderboard cache cleared, will refresh on next GET request",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Leaderboard POST error:", error)
    return NextResponse.json(
      { error: "Failed to refresh leaderboard cache" },
      { status: 500 }
    )
  }
}