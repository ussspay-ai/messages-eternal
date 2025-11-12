/**
 * Chat Generation API Endpoint
 * Generates and stores agent chat messages
 * Called every 15 minutes to generate 2 messages per agent
 * 
 * Message Expiration: Keep max 100 total messages (20 per agent on average)
 */

import { NextRequest, NextResponse } from "next/server"
import { generateAllAgentResponses } from "@/lib/chat-engine"
import { setCache, getCache, CACHE_KEYS, deleteCache } from "@/lib/redis-client"

interface ChatMessage {
  id: string
  agentId: string
  agentName: string
  timestamp: string
  createdAt?: number // milliseconds since epoch
  content: string
  type: "analysis" | "trade_signal" | "market_update" | "risk_management"
  confidence?: number
}

interface Agent {
  id: string
  name: string
  model: string
  pnl: number
  roi: number
  recentTrades?: number
}

/**
 * Remove old messages: Keep only recent N messages
 * Maintains max 100 messages total with ~20 messages per agent on average
 * (2 messages per agent per 15 minutes = 10 messages every 15 min)
 */
function removeOldMessages(messages: any[], maxMessages: number = 100): any[] {
  if (messages.length <= maxMessages) {
    return messages
  }
  
  // Sort by creation time (oldest first), then remove oldest
  const sorted = [...messages].sort((a, b) => {
    const timeA = a.createdAt ?? new Date(a.timestamp).getTime()
    const timeB = b.createdAt ?? new Date(b.timestamp).getTime()
    return timeA - timeB
  })
  
  // Keep only the most recent maxMessages
  return sorted.slice(-maxMessages)
}

/**
 * Fetch current agent data from Aster API
 */
async function fetchAgentData(): Promise<Agent[]> {
  try {
    // Use environment-aware URL for server-side fetch
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:3000`
    const response = await fetch(`${baseUrl}/api/aster/agents-data`)
    const data = await response.json()

    if (data.agents && Array.isArray(data.agents)) {
      return data.agents.map((a: any) => ({
        id: a.id,
        name: a.name,
        model: a.model,
        pnl: a.pnl || 0,
        roi: a.roi || 0,
        recentTrades: 0,
      }))
    }

    // Fallback mock agents
    return [
      { id: "claude_arbitrage", name: "Claude Arbitrage", model: "Claude 3.5 Sonnet", pnl: 1250, roi: 12.5, recentTrades: 0 },
      { id: "chatgpt_openai", name: "GPT-4 Momentum", model: "GPT-4 Turbo", pnl: 980, roi: 9.8, recentTrades: 0 },
      { id: "gemini_grid", name: "Gemini Grid", model: "Google Gemini Pro", pnl: 750, roi: 7.5, recentTrades: 0 },
      { id: "deepseek_ml", name: "DeepSeek ML", model: "DeepSeek-V3", pnl: 1520, roi: 15.2, recentTrades: 0 },
      { id: "buy_and_hold", name: "Buy & Hold", model: "Grok 2 (with X.com Sentiment)", pnl: 2150, roi: 21.5, recentTrades: 0 },
    ]
  } catch (error) {
    console.error("Failed to fetch agent data:", error)
    // Return mock agents on error
    return [
      { id: "claude_arbitrage", name: "Claude Arbitrage", model: "Claude 3.5 Sonnet", pnl: 1250, roi: 12.5, recentTrades: 0 },
      { id: "chatgpt_openai", name: "GPT-4 Momentum", model: "GPT-4 Turbo", pnl: 980, roi: 9.8, recentTrades: 0 },
      { id: "gemini_grid", name: "Gemini Grid", model: "Google Gemini Pro", pnl: 750, roi: 7.5, recentTrades: 0 },
      { id: "deepseek_ml", name: "DeepSeek ML", model: "DeepSeek-V3", pnl: 1520, roi: 15.2, recentTrades: 0 },
      { id: "buy_and_hold", name: "Buy & Hold", model: "Grok 2 (with X.com Sentiment)", pnl: 2150, roi: 21.5, recentTrades: 0 },
    ]
  }
}

/**
 * POST /api/chat/generate
 * Generates 2 new messages per agent (10 total per call)
 * Should be called every 15 minutes for consistent chat flow
 */
export async function POST(request: NextRequest) {
  try {
    // Fetch current agent data
    const agentsRaw = await fetchAgentData()

    // Ensure all required AgentData properties are present
    const agents = agentsRaw.map(agent => ({
      ...agent,
      recentTrades: agent.recentTrades ?? 0,
    }))

    console.log(`[Chat/Generate] Fetched ${agents.length} agents for chat generation`)

    // Generate 2 rounds of responses (2 messages per agent)
    const round1 = await generateAllAgentResponses(agents)
    const round2 = await generateAllAgentResponses(agents)
    const newMessages = [...round1, ...round2]
    
    console.log(`[Chat/Generate] Generated ${newMessages.length} new messages (2 per agent)`)

    // Add createdAt timestamp to new messages with slight delays between rounds
    const now = Date.now()
    const messagesWithTimestamp = newMessages.map((msg, idx) => ({
      ...msg,
      createdAt: idx < agents.length ? now : now + 100, // 100ms offset for round 2
    }))

    // Store in Redis with 1-hour TTL
    const cacheKey = CACHE_KEYS.market("chat:messages")
    const existingMessages = (await getCache<ChatMessage[]>(cacheKey)) || []
    
    // Combine new and existing messages
    let allMessages = [...messagesWithTimestamp, ...existingMessages]
    
    // Apply expiration: Keep max 100 messages
    // With 10 messages every 15 minutes: ~100 messages = 150 minutes of history
    allMessages = removeOldMessages(allMessages, 100)

    // Cache with 1-hour TTL to survive temporary Redis outages
    await setCache(cacheKey, allMessages, { ttl: 3600 })

    console.log(`[Chat/Generate] Successfully cached ${allMessages.length} total messages`)

    return NextResponse.json({
      success: true,
      messagesGenerated: newMessages.length,
      messages: messagesWithTimestamp,
      timestamp: new Date().toISOString(),
      totalCached: allMessages.length,
    })
  } catch (error) {
    console.error("[Chat/Generate] ❌ Chat generation error:", error)
    console.error("[Chat/Generate] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate chat messages",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/chat/generate
 * Retrieves chat message history
 * Messages expire naturally: max 100 messages total (~20 per agent)
 */
export async function GET(request: NextRequest) {
  try {
    const cacheKey = CACHE_KEYS.market("chat:messages")
    const messages = (await getCache<ChatMessage[]>(cacheKey)) || []

    // Support filtering by agent ID
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 50)

    let filtered = agentId ? messages.filter((m) => m.agentId === agentId) : messages
    
    // Sort by timestamp (newest first) and limit
    filtered = filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      messages: filtered,
      total: messages.length,
      maxMessages: 100,
      frequency: "2 messages per agent per 15 minutes",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Chat retrieval error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve chat messages",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat/generate
 * Clears all chat messages
 */
export async function DELETE(request: NextRequest) {
  try {
    const cacheKey = CACHE_KEYS.market("chat:messages")
    await deleteCache(cacheKey)

    console.log("[Chat/Generate] 🗑️ Cleared all chat messages")

    return NextResponse.json({
      success: true,
      message: "All chat messages cleared successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Chat/Generate] Error clearing messages:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clear chat messages",
      },
      { status: 500 }
    )
  }
}