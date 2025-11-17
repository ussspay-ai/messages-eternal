/**
 * POST /api/cron/generate-chat
 * 
 * Scheduled endpoint for generating agent chat messages every 15 minutes
 * Called by EasyCron (or other external cron service)
 * 
 * This generates 2 messages per agent with real Aster position data
 * Messages are stored in Supabase and streamed to frontend via SSE/polling
 * 
 * Authentication: Bearer token in Authorization header
 * Environment: CRON_SECRET (set in .env.local/.env.production)
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization")
    const expectedToken = `Bearer ${process.env.CHAT_CRON_SECRET}`

    if (!authHeader || authHeader !== expectedToken) {
      console.warn("[Chat Cron] ❌ Unauthorized request")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("[Chat Cron] ✅ Request authorized, generating chat messages...")

    // Call the chat generation endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : `http://localhost:3000`

    const response = await fetch(`${baseUrl}/api/chat/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Chat Cron] ❌ Chat generation failed (${response.status}):`, errorText)
      return NextResponse.json(
        { error: `Chat generation failed: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()

    console.log(`[Chat Cron] ✅ Successfully generated ${result.messagesGenerated} chat messages`)
    console.log(`[Chat Cron] Stored ${result.insertedCount} messages in Supabase`)

    return NextResponse.json({
      success: true,
      messagesGenerated: result.messagesGenerated,
      insertedCount: result.insertedCount,
      timestamp: new Date().toISOString(),
      storage: "Supabase (messages auto-expire after 10 minutes)",
    })
  } catch (error) {
    console.error("[Chat Cron] ❌ Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
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
    const expectedToken = `Bearer ${process.env.CHAT_CRON_SECRET}`

    if (!authHeader || authHeader !== expectedToken) {
      console.warn("[Chat Cron] ❌ Unauthorized GET request")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("[Chat Cron] Testing chat generation...")

    // Call the chat generation endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : `http://localhost:3000`

    const response = await fetch(`${baseUrl}/api/chat/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Chat Cron] ❌ Chat generation failed (${response.status}):`, errorText)
      return NextResponse.json(
        { error: `Chat generation failed: ${response.status}` },
        { status: response.status }
      )
    }

    const result = await response.json()

    console.log(`[Chat Cron] ✅ Successfully generated ${result.messagesGenerated} chat messages (test)`)

    return NextResponse.json({
      success: true,
      messagesGenerated: result.messagesGenerated,
      insertedCount: result.insertedCount,
      timestamp: new Date().toISOString(),
      note: "This was a test call. Set up automatic cron job to call this endpoint every 15 minutes.",
    })
  } catch (error) {
    console.error("[Chat Cron] ❌ Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}