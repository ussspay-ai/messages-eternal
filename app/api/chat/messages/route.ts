/**
 * Chat Messages Endpoint
 * Fetches latest agent messages from Supabase (no Redis)
 * Auto-cleanup: Messages older than 10 minutes are removed
 * Polling: 2x every 15 minutes (every 7.5 minutes)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    let limit = parseInt(searchParams.get("limit") || "5")
    
    // Enforce maximum 5 messages (fetch only 5 recent chats)
    limit = Math.min(limit, 5)

    // Calculate cutoff time (10 minutes ago) for auto-cleanup
    const tenMinutesAgo = new Date(Date.now() - 600000).toISOString()

    // Query builder
    let query = supabase
      .from('agent_chat_messages')
      .select('*')
      .gt('timestamp', tenMinutesAgo) // Only messages from last 10 minutes
      .order('timestamp', { ascending: false }) // Newest first
      .limit(limit)

    // Filter by agent if specified
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error("Supabase query error:", error)
      throw error
    }

    // Auto-cleanup: Delete old messages (older than 10 minutes) in background
    void (async () => {
      try {
        await supabase
          .from('agent_chat_messages')
          .delete()
          .lt('timestamp', tenMinutesAgo)
        console.log("[Chat Cleanup] Removed messages older than 10 minutes")
      } catch (err) {
        console.warn("[Chat Cleanup] Error:", err)
      }
    })()

    return NextResponse.json({
      success: true,
      messages: messages || [],
      total: (messages || []).length,
      limit: limit,
      cleanup: "Auto-remove messages older than 10 minutes",
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