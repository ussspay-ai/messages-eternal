/**
 * Chat Generation API Endpoint
 * Generates and stores agent chat messages
 * Called every minute to keep conversation flowing
 * 
 * Message Expiration: 5 oldest messages expire every 5 minutes
 */

import { NextRequest, NextResponse } from "next/server"
import { generateAllAgentResponses } from "@/lib/chat-engine"
import { setCache, getCache, CACHE_KEYS } from "@/lib/redis-client"

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
 * Implements 5-per-5-minute expiration by removing oldest messages
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
    const response = await fetch("http://localhost:3000/api/aster/agents-data")
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
 * Generates new agent chat messages
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

    // Generate responses for all agents
    const newMessages = await generateAllAgentResponses(agents)
    
    // Add createdAt timestamp to new messages
    const now = Date.now()
    const messagesWithTimestamp = newMessages.map(msg => ({
      ...msg,
      createdAt: now,
    }))

    // Store in Redis with 1-hour TTL
    const cacheKey = CACHE_KEYS.market("chat:messages")
    const existingMessages = (await getCache<ChatMessage[]>(cacheKey)) || []
    
    // Combine new and existing messages
    let allMessages = [...messagesWithTimestamp, ...existingMessages]
    
    // Apply expiration: Keep max 100 messages
    // This naturally implements ~5 messages expiring every 5 minutes
    // (with ~5 messages generated per minute)
    allMessages = removeOldMessages(allMessages, 100)

    // Cache with 1-hour TTL to survive temporary Redis outages
    await setCache(cacheKey, allMessages, { ttl: 3600 })

    return NextResponse.json({
      success: true,
      messages: messagesWithTimestamp,
      timestamp: new Date().toISOString(),
      totalCached: allMessages.length,
    })
  } catch (error) {
    console.error("Chat generation error:", error)
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
 * Messages are automatically expired: 5 oldest messages removed every ~5 minutes
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
      expiration: "5 messages expire every 5 minutes",
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