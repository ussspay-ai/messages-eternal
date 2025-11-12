/**
 * Custom Hook for Model Chat Management
 * Handles fetching, caching, and real-time updates of agent chat messages
 */

import { useState, useEffect, useCallback } from "react"

export interface ChatMessage {
  id: string
  agentId: string
  agentName: string
  timestamp: string
  content: string
  type: "analysis" | "trade_signal" | "market_update" | "risk_management"
  confidence?: number
}

interface UseModelChatOptions {
  agentId?: string
  refreshInterval?: number // milliseconds
  enableAutoRefresh?: boolean
}

export function useModelChat(options: UseModelChatOptions = {}) {
  const {
    agentId,
    refreshInterval = 10000, // 10 seconds by default for display updates
    enableAutoRefresh = true,
  } = options

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [previousMessageCount, setPreviousMessageCount] = useState(0)

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true)

      const url = new URL("/api/chat/messages", window.location.origin)
      if (agentId) {
        url.searchParams.append("agentId", agentId)
      }
      url.searchParams.append("limit", "50")

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.success) {
        const fetchedMessages = data.messages || []
        setMessages(fetchedMessages)
        
        // Calculate new messages that arrived
        if (previousMessageCount > 0 && fetchedMessages.length > previousMessageCount) {
          const newCount = fetchedMessages.length - previousMessageCount
          setNewMessageCount(newCount)
        }
        
        setPreviousMessageCount(fetchedMessages.length)
        setError(null)
      } else {
        setError(data.error || "Failed to fetch messages")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      console.error("Error fetching chat messages:", err)
    } finally {
      setIsLoading(false)
    }
  }, [agentId, previousMessageCount])

  // Auto-refresh setup
  useEffect(() => {
    if (!enableAutoRefresh) return

    // Fetch immediately
    fetchMessages()

    // Set up interval for auto-refresh
    const interval = setInterval(fetchMessages, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchMessages, refreshInterval, enableAutoRefresh])

  return {
    messages,
    isLoading,
    error,
    newMessageCount,
    clearNewMessageCount: () => setNewMessageCount(0),
    refresh: fetchMessages,
  }
}

/**
 * Hook to trigger chat generation (call periodically from dashboard)
 * Default: 15 minutes (900 seconds) - generates 2 messages per agent
 */
export function useModelChatGeneration(interval: number = 900000) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)
  const [generationStats, setGenerationStats] = useState({ total: 0, generated: 0 })

  useEffect(() => {
    const generateChat = async () => {
      try {
        setIsGenerating(true)
        const response = await fetch("/api/chat/generate", { method: "POST" })
        const data = await response.json()
        setLastGenerated(new Date())
        
        if (data.success) {
          setGenerationStats({
            total: data.totalCached || 0,
            generated: data.messagesGenerated || 0,
          })
          console.log(`[Chat Generation] ✅ Generated ${data.messagesGenerated} messages (total: ${data.totalCached})`)
        }
      } catch (error) {
        console.error("Error generating chat messages:", error)
      } finally {
        setIsGenerating(false)
      }
    }

    // Generate immediately on first load
    generateChat()

    // Then set up interval (every 15 minutes by default)
    const timer = setInterval(generateChat, interval)

    return () => clearInterval(timer)
  }, [interval])

  return { isGenerating, lastGenerated, generationStats }
}