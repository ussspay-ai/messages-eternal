/**
 * Chat Generation API Endpoint
 * Generates and stores agent chat messages to Supabase (no Redis)
 * Called every 15 minutes to generate 2 messages per agent
 * 
 * Message Expiration: Auto-cleanup by /api/chat/messages (removes older than 10 min)
 */

import { NextRequest, NextResponse } from "next/server"
import { generateAllAgentResponses } from "@/lib/chat-engine"
import { createClient } from "@supabase/supabase-js"
import { broadcastAgentMessage, broadcastMessageToAll } from "@/app/api/chat/stream/route"

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
)

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

    // Broadcast messages to real-time connected clients AND store to Supabase for persistence
    const messagesToInsert: any[] = []
    
    for (const msg of newMessages) {
      // Broadcast immediately to SSE subscribers
      broadcastAgentMessage(msg.agentId, msg)

      // Also prepare for Supabase persistence
      messagesToInsert.push({
        id: msg.id,
        agent_id: msg.agentId,
        agent_name: msg.agentName,
        message_type: msg.type,
        content: msg.content,
        confidence: msg.confidence || 0.5,
        timestamp: msg.timestamp,
      })
    }

    // Store to Supabase - SYNCHRONOUSLY so we can catch errors
    let insertedCount = 0
    try {
      console.log(`[Chat/Generate] Attempting to insert ${messagesToInsert.length} messages...`)
      console.log(`[Chat/Generate] First message sample:`, JSON.stringify(messagesToInsert[0], null, 2))
      
      const { data, error: insertError } = await supabase
        .from('agent_chat_messages')
        .insert(messagesToInsert)
        .select()

      if (insertError) {
        console.error(`[Chat/Generate] ❌ Failed to insert messages to Supabase:`, {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        })
        return NextResponse.json(
          {
            success: false,
            error: `Database insert failed: ${insertError.message}`,
            messagesGenerated: newMessages.length,
            insertedCount: 0,
          },
          { status: 500 }
        )
      } else {
        insertedCount = data?.length || 0
        console.log(`[Chat/Generate] ✅ Stored ${insertedCount} messages in Supabase`)
        console.log(`[Chat/Generate] Insert result:`, data)
      }
    } catch (err) {
      console.error(`[Chat/Generate] Error storing to Supabase:`, err)
      return NextResponse.json(
        {
          success: false,
          error: `Exception during insert: ${err instanceof Error ? err.message : String(err)}`,
          messagesGenerated: newMessages.length,
          insertedCount: 0,
        },
        { status: 500 }
      )
    }

    console.log(`[Chat/Generate] 📡 Broadcasted ${newMessages.length} messages to SSE subscribers`)

    return NextResponse.json({
      success: true,
      messagesGenerated: newMessages.length,
      insertedCount: insertedCount,
      messages: newMessages,
      timestamp: new Date().toISOString(),
      storage: "Supabase (auto-cleanup removes messages older than 10 minutes)",
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
 * Retrieves recent chat message history from Supabase
 * Messages auto-expire: removed when older than 10 minutes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 50)

    // Only fetch messages from last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 600000).toISOString()

    let query = supabase
      .from('agent_chat_messages')
      .select('*')
      .gt('timestamp', tenMinutesAgo)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data: messages, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
      total: (messages || []).length,
      frequency: "2 messages per agent per 15 minutes",
      cleanup: "Auto-remove messages older than 10 minutes",
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
 * Clears all chat messages from Supabase
 */
export async function DELETE(request: NextRequest) {
  try {
    const { error } = await supabase
      .from('agent_chat_messages')
      .delete()
      .neq('id', '') // Delete all rows

    if (error) {
      throw error
    }

    console.log("[Chat/Generate] 🗑️ Cleared all chat messages from Supabase")

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