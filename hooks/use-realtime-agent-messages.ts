/**
 * Enhanced hook for real-time agent messages
 * Combines SSE streaming (primary) + polling (fallback) for maximum reliability
 * 
 * Flow:
 * 1. SSE streams connect for each agent
 * 2. Messages arrive instantly via SSE when agents generate them
 * 3. Fallback polling every 45 seconds if SSE fails or for initial load
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { useChatStream } from "./use-chat-stream"

export interface ChatMessage {
  id: string
  agentId: string
  agentName: string
  timestamp: string
  content: string
  type: "analysis" | "trade_signal" | "market_update" | "risk_management"
  confidence?: number
}

interface UseRealtimeMessagesOptions {
  agentIds?: string[]
  enableSSE?: boolean
  enableFallbackPolling?: boolean
  fallbackPollInterval?: number // milliseconds, default 45 seconds
}

export function useRealtimeAgentMessages(options: UseRealtimeMessagesOptions = {}) {
  const {
    agentIds = [],
    enableSSE = true,
    enableFallbackPolling = true,
    fallbackPollInterval = 45000, // 45 seconds
  } = options

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useSSE, setUseSSE] = useState(enableSSE)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use SSE for real-time streaming
  const sseHooks = useRef<{[key: string]: any}>({})
  
  // Initialize SSE connections
  useEffect(() => {
    if (!enableSSE || !agentIds.length) return

    agentIds.forEach((agentId) => {
      if (!sseHooks.current[agentId]) {
        // Dynamic hook - this is a workaround; normally you'd use multiple hook instances
        // We'll manually manage SSE instead
      }
    })
  }, [agentIds, enableSSE])

  // Fallback polling function
  const pollMessages = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const fetchPromises = agentIds.map((agentId) =>
        fetch(`/api/chat/messages?agentId=${encodeURIComponent(agentId)}&limit=10`)
          .then((res) => res.json())
      )

      const results = await Promise.all(fetchPromises)
      const newMessages: Record<string, ChatMessage[]> = {}

      agentIds.forEach((agentId, idx) => {
        const result = results[idx]
        if (result.success) {
          // Transform Supabase fields to match component interface
          const transformed = (result.messages || []).map((msg: any) => ({
            id: msg.id,
            agentId: msg.agent_id,
            agentName: msg.agent_name,
            timestamp: msg.timestamp,
            content: msg.content,
            type: msg.message_type,
            confidence: msg.confidence,
          }))
          newMessages[agentId] = transformed
        }
      })

      setMessages(newMessages)
      setError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      setError(errorMsg)
      console.error("[Realtime Messages] Polling failed:", err)
    } finally {
      setIsLoading(false)
    }
  }, [agentIds])

  // Setup SSE subscriptions manually (since we can't use multiple hook instances)
  useEffect(() => {
    if (!enableSSE || !agentIds.length) {
      // Fall back to polling only
      if (enableFallbackPolling) {
        pollMessages()
        pollTimeoutRef.current = setTimeout(
          () => pollMessages(),
          fallbackPollInterval
        )
      }
      return
    }

    const eventSources: { [key: string]: EventSource } = {}
    let hasActiveSSE = false

    agentIds.forEach((agentId) => {
      try {
        const url = `/api/chat/stream?agentId=${encodeURIComponent(agentId)}`
        const eventSource = new EventSource(url)

        eventSource.addEventListener("open", () => {
          console.log(`[Realtime Messages] SSE connected for ${agentId}`)
          hasActiveSSE = true
          setUseSSE(true)
        })

        eventSource.addEventListener("message", (event) => {
          try {
            if (event.data.startsWith(":")) return // Skip heartbeats

            const data = JSON.parse(event.data)

            // Ignore connection messages and non-chat data
            const msgType = data.type || data.message_type
            if (msgType === "connected" || !["analysis", "trade_signal", "market_update", "risk_management"].includes(msgType)) {
              return
            }

            // Transform Supabase fields if needed
            const message: ChatMessage = {
              id: data.id,
              agentId: data.agentId || data.agent_id,
              agentName: data.agentName || data.agent_name,
              timestamp: data.timestamp,
              content: data.content,
              type: msgType,
              confidence: data.confidence,
            }

            setMessages((prev) => {
              const agentMessages = prev[agentId] || []
              
              // Avoid duplicates
              if (agentMessages.some((m) => m.id === message.id)) {
                return prev
              }

              // Keep last 20 messages per agent, sorted by timestamp
              const updated = [message, ...agentMessages]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 20)

              return {
                ...prev,
                [agentId]: updated,
              }
            })
          } catch (err) {
            console.error("[Realtime Messages] Failed to parse SSE message:", err)
          }
        })

        eventSource.addEventListener("error", () => {
          console.warn(`[Realtime Messages] SSE error for ${agentId}, falling back to polling`)
          eventSource.close()
          
          // If all SSE connections fail, switch to polling
          hasActiveSSE = false
          setUseSSE(false)
          
          if (enableFallbackPolling) {
            // Start aggressive polling on SSE failure
            pollMessages()
            pollTimeoutRef.current = setTimeout(
              () => pollMessages(),
              Math.min(fallbackPollInterval, 15000) // 15s minimum
            )
          }
        })

        eventSources[agentId] = eventSource
      } catch (err) {
        console.error(`[Realtime Messages] Failed to setup SSE for ${agentId}:`, err)
      }
    })

    // Setup fallback polling as backup
    if (enableFallbackPolling && !hasActiveSSE) {
      pollMessages()
      pollTimeoutRef.current = setTimeout(
        () => pollMessages(),
        fallbackPollInterval
      )
    }

    return () => {
      // Close all SSE connections
      Object.values(eventSources).forEach((es) => {
        try {
          es.close()
        } catch (err) {
          // Already closed
        }
      })

      // Clear polling
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
    }
  }, [agentIds, enableSSE, enableFallbackPolling, fallbackPollInterval, pollMessages])

  return {
    messages,
    isLoading,
    error,
    useSSE, // Indicates if SSE is active (vs polling)
    isRealtime: useSSE, // Alias for clarity
    refresh: pollMessages,
  }
}