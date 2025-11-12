/**
 * Hook for subscribing to real-time agent chat streams via Server-Sent Events (SSE)
 * Handles connection, message parsing, auto-reconnect, and cleanup
 */

import { useState, useEffect, useCallback, useRef } from "react"

export interface StreamMessage {
  id: string
  agentId: string
  agentName: string
  timestamp: string
  content: string
  type: "analysis" | "trade_signal" | "market_update" | "risk_management"
  confidence?: number
}

interface UseChatStreamOptions {
  agentId?: string
  enabled?: boolean
  autoReconnect?: boolean
  reconnectDelay?: number // milliseconds
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const {
    agentId,
    enabled = true,
    autoReconnect = true,
    reconnectDelay = 3000,
  } = options

  const [messages, setMessages] = useState<StreamMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!enabled || !agentId) {
      return
    }

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const url = `/api/chat/stream?agentId=${encodeURIComponent(agentId)}`
      const eventSource = new EventSource(url)

      eventSource.addEventListener("open", () => {
        console.log(`[Chat Stream] Connected to ${agentId}`)
        setIsConnected(true)
        setError(null)
      })

      // Handle regular messages (agent chat)
      eventSource.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data)

          // Skip connection status messages and heartbeats
          if (data.type === "connected" || event.data.startsWith(":")) {
            return
          }

          // Add new message to the list
          setMessages((prev) => {
            // Avoid duplicates by checking ID
            if (prev.some((m) => m.id === data.id)) {
              return prev
            }
            return [...prev, data]
          })
        } catch (err) {
          console.error("[Chat Stream] Failed to parse message:", err)
        }
      })

      // Handle connection errors
      eventSource.addEventListener("error", () => {
        console.error(`[Chat Stream] Connection error for ${agentId}`)
        setIsConnected(false)
        eventSource.close()

        // Auto-reconnect
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[Chat Stream] Attempting to reconnect to ${agentId}...`)
            connect()
          }, reconnectDelay)
        }
      })

      eventSourceRef.current = eventSource
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      setError(errorMsg)
      console.error("[Chat Stream] Connection failed:", err)

      // Auto-reconnect on failure
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay)
      }
    }
  }, [agentId, enabled, autoReconnect, reconnectDelay])

  // Auto-connect on mount and when dependencies change
  useEffect(() => {
    if (enabled && agentId) {
      connect()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        setIsConnected(false)
      }
    }
  }, [enabled, agentId, connect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      setIsConnected(false)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isConnected,
    error,
    connect,
    disconnect,
    clearMessages,
  }
}