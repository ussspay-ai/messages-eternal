/**
 * DEBUG: Check what agent snapshots exist in Supabase
 */

import { getAgentSnapshots, getLatestSnapshots } from "@/lib/supabase-client"
import { getAllAgents } from "@/lib/constants/agents"
import { NextResponse } from "next/server"

export async function GET() {
  const agents = getAllAgents()
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const results: any = {
    timeRange: {
      from: twentyFourHoursAgo.toISOString(),
      to: now.toISOString(),
    },
    agents: {},
  }

  // Check snapshots for each agent
  for (const agent of agents) {
    try {
      const snapshots = await getAgentSnapshots(agent.id, twentyFourHoursAgo, now)
      results.agents[agent.id] = {
        snapshotCount: snapshots.length,
        samples: snapshots.slice(0, 3).map((s: any) => ({
          timestamp: s.timestamp,
          account_value: s.account_value,
        })),
      }
    } catch (error: any) {
      results.agents[agent.id] = { error: error.message }
    }
  }

  // Also check latest snapshots across all agents
  try {
    const latest = await getLatestSnapshots()
    results.latestSnapshots = latest
  } catch (error: any) {
    results.latestSnapshots = { error: error.message }
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-cache" } })
}