/**
 * Chat Messages Endpoint
 * Fetches latest agent messages
 * Messages expire automatically: 5 oldest messages removed every ~5 minutes
 */

import { NextRequest, NextResponse } from "next/server"
import { getCache, CACHE_KEYS } from "@/lib/redis-client"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    let limit = parseInt(searchParams.get("limit") || "30")
    
    // Enforce maximum 30 messages per agent/request
    limit = Math.min(limit, 30)

    const cacheKey = CACHE_KEYS.market("chat:messages")
    const allMessages = (await getCache<any[]>(cacheKey)) || []

    // Filter by agent if specified
    let messages = allMessages

    if (agentId) {
      messages = allMessages.filter((m) => m.agentId === agentId)
    }

    // Return latest N messages (ordered by timestamp descending)
    const latest = messages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      messages: latest,
      total: messages.length,
      limit: limit,
      expiration: "5 messages auto-expire every 5 minutes",
    })
  } catch (error) {
    console.error("Chat messages fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        messages: [],
        total: 0,
      },
      { status: 200 } // Return 200 even on error to prevent frontend crashes
    )
  }
}