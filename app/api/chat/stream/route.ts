/**
 * Server-Sent Events (SSE) Streaming Endpoint
 * Real-time agent chat streaming
 * 
 * Clients connect via EventSource and receive agent messages as they're generated
 * Each agent streams their thinking about trades and market conditions
 */

import { NextRequest, NextResponse } from "next/server"

// Track active SSE connections per agent
const activeConnections: Map<string, Set<ReadableStreamDefaultController>> = new Map()

// Broadcast a message to all connected clients watching an agent
export function broadcastAgentMessage(
  agentId: string,
  message: {
    id: string
    agentId: string
    agentName: string
    timestamp: string
    content: string
    type: "analysis" | "trade_signal" | "market_update" | "risk_management"
    confidence?: number
  }
) {
  const connections = activeConnections.get(agentId) || new Set()
  const messageEvent = `data: ${JSON.stringify(message)}\n\n`

  connections.forEach((controller) => {
    try {
      controller.enqueue(messageEvent)
    } catch (err) {
      // Connection closed, remove it
      connections.delete(controller)
    }
  })

  // Clean up empty sets
  if (connections.size === 0) {
    activeConnections.delete(agentId)
  } else {
    activeConnections.set(agentId, connections)
  }
}

// Broadcast to all agents (for "ALL AGENTS" view)
export function broadcastMessageToAll(
  message: any
) {
  const allMessage = `data: ${JSON.stringify(message)}\n\n`
  
  activeConnections.forEach((connections) => {
    connections.forEach((controller) => {
      try {
        controller.enqueue(allMessage)
      } catch (err) {
        connections.delete(controller)
      }
    })
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId parameter is required" },
        { status: 400 }
      )
    }

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Add this connection to active connections
        if (!activeConnections.has(agentId)) {
          activeConnections.set(agentId, new Set())
        }
        activeConnections.get(agentId)!.add(controller)

        // Send initial connection message
        controller.enqueue(
          `data: ${JSON.stringify({
            type: "connected",
            message: `Connected to agent stream: ${agentId}`,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(`:heartbeat ${Date.now()}\n\n`)
          } catch (err) {
            clearInterval(heartbeatInterval)
          }
        }, 30000)

        // Cleanup on connection close
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeatInterval)
          activeConnections.get(agentId)?.delete(controller)
          if (activeConnections.get(agentId)?.size === 0) {
            activeConnections.delete(agentId)
          }
          try {
            controller.close()
          } catch (err) {
            // Already closed
          }
        })
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    })
  } catch (error) {
    console.error("[Chat/Stream] Error:", error)
    return NextResponse.json(
      { error: "Failed to establish stream connection" },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}