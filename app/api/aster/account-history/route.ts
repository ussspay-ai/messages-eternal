/**
 * GET /api/aster/account-history
 * Fetch account value history for all agents (chart data)
 * Returns ACTUAL historical data based on trade history at 5-minute intervals
 */

import { AsterClient } from "@/lib/aster-client"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"
import { getAllAgents, getAgentCredentials } from "@/lib/constants/agents"
import { getAgentSnapshots, getLatestSnapshots } from "@/lib/supabase-client"
import { NextResponse } from "next/server"

interface HistoryDataPoint {
  time: string
  [agentId: string]: number | string
}

const INITIAL_BALANCE = 50 // $50 starting balance per agent
const INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Generate historical data from agent snapshots (already saved to Supabase)
 * Snapshots are saved every 5 minutes with account values
 */
async function generateAccountHistory(): Promise<HistoryDataPoint[]> {
  const agents = getAllAgents()
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  console.log(`[Account History] Fetching snapshots from ${twentyFourHoursAgo.toISOString()} to ${now.toISOString()}`)

  // Fetch historical snapshots for all agents
  const snapshotsByAgent: Record<string, any[]> = {}
  const agentCurrentValues: Record<string, number> = {}

  for (const agent of agents) {
    try {
      // Get snapshots for this agent over last 24 hours
      const snapshots = await getAgentSnapshots(agent.id, twentyFourHoursAgo, now)
      snapshotsByAgent[agent.id] = snapshots
      
      // Get latest value
      if (snapshots.length > 0) {
        agentCurrentValues[agent.id] = snapshots[snapshots.length - 1].account_value
        console.log(`[Account History] Agent ${agent.id}: ${snapshots.length} snapshots, latest value: ${agentCurrentValues[agent.id]}`)
      } else {
        agentCurrentValues[agent.id] = INITIAL_BALANCE
        console.log(`[Account History] Agent ${agent.id}: No snapshots found, using initial balance`)
      }
    } catch (error) {
      console.error(`Error fetching snapshots for ${agent.id}:`, error)
      snapshotsByAgent[agent.id] = []
      agentCurrentValues[agent.id] = INITIAL_BALANCE
    }
  }

  // If we have real snapshots, use them at 5-minute intervals
  // Otherwise, generate synthetic intervals
  const data: HistoryDataPoint[] = []

  // Collect all snapshot timestamps to use as anchor points
  const snapshotTimes = new Set<number>()
  agents.forEach((agent) => {
    (snapshotsByAgent[agent.id] || []).forEach((snapshot) => {
      snapshotTimes.add(new Date(snapshot.timestamp).getTime())
    })
  })

  // Add 5-minute interval timestamps
  let currentTime = new Date(twentyFourHoursAgo)
  while (currentTime <= now) {
    snapshotTimes.add(currentTime.getTime())
    currentTime = new Date(currentTime.getTime() + INTERVAL_MS)
  }

  // Sort timestamps and generate data points
  const sortedTimes = Array.from(snapshotTimes).sort((a, b) => a - b)

  sortedTimes.forEach((timeMs) => {
    const pointTime = new Date(timeMs)
    const dataPoint: HistoryDataPoint = {
      time: pointTime.toISOString(),
    }

    // For each agent, find the most recent snapshot at or before this time
    agents.forEach((agent) => {
      const snapshots = snapshotsByAgent[agent.id] || []
      
      // Find snapshot at or before this time
      let balance = INITIAL_BALANCE
      for (let i = snapshots.length - 1; i >= 0; i--) {
        if (new Date(snapshots[i].timestamp) <= pointTime) {
          balance = snapshots[i].account_value
          break
        }
      }
      
      dataPoint[agent.id] = Math.max(0, balance)
    })

    data.push(dataPoint)
  })

  console.log(`[Account History] Generated ${data.length} data points from ${sortedTimes.length} unique timestamps`)
  return data
}

export async function GET() {
  try {
    // Try cache first (2 minute TTL for history - updates every 5 minutes)
    const cacheKey = CACHE_KEYS.accountHistory()
    try {
      const cached = await getCache(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
    } catch (cacheError) {
      console.warn("Cache unavailable, proceeding without cache:", cacheError)
      // Continue without caching - don't fail if Redis is down
    }

    const historyData = await generateAccountHistory()

    // Try to cache, but don't fail if it doesn't work
    try {
      await setCache(cacheKey, historyData, { ttl: 120 })
    } catch (cacheError) {
      console.warn("Could not cache history data:", cacheError)
    }

    return NextResponse.json(historyData)
  } catch (error) {
    console.error("Error generating account history:", error)
    
    // Fallback: return baseline data if real fetch fails
    const agents = getAllAgents()
    const data: HistoryDataPoint[] = []
    const now = new Date()
    const HISTORY_POINTS = 288 // 24 hours of 5-minute intervals

    for (let i = HISTORY_POINTS - 1; i >= 0; i--) {
      const pointTime = new Date(now.getTime() - i * INTERVAL_MS)
      const timeStr = pointTime.toISOString()

      const dataPoint: HistoryDataPoint = {
        time: timeStr,
      }

      agents.forEach((agent) => {
        // Fallback: show all agents at their initial balance
        dataPoint[agent.id] = INITIAL_BALANCE
      })

      data.push(dataPoint)
    }

    return NextResponse.json(data)
  }
}