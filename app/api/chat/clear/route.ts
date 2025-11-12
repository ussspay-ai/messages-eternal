/**
 * Clear Chat Messages Endpoint
 * Clears all stored chat messages from Redis
 * Allows model chats to start fresh
 */

import { NextRequest, NextResponse } from "next/server"
import { deleteCache, CACHE_KEYS } from "@/lib/redis-client"

export async function POST(request: NextRequest) {
  try {
    const cacheKey = CACHE_KEYS.market("chat:messages")
    
    console.log(`[Chat/Clear] Clearing chat messages from Redis: ${cacheKey}`)
    
    await deleteCache(cacheKey)
    
    console.log(`[Chat/Clear] Successfully cleared chat messages`)
    
    return NextResponse.json({
      success: true,
      message: "Chat messages cleared. Model chats will start fresh.",
      clearedKey: cacheKey,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Chat/Clear] Error clearing chat messages:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const cacheKey = CACHE_KEYS.market("chat:messages")
    
    console.log(`[Chat/Clear] Clearing chat messages from Redis: ${cacheKey}`)
    
    await deleteCache(cacheKey)
    
    console.log(`[Chat/Clear] Successfully cleared chat messages`)
    
    return NextResponse.json({
      success: true,
      message: "Chat messages cleared. Model chats will start fresh.",
      clearedKey: cacheKey,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Chat/Clear] Error clearing chat messages:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}