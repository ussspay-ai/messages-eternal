/**
 * Custom Hook for Model Chat Management
 * Handles fetching, caching, and real-time updates of agent chat messages
 * Now includes realtime reasoning with agent performance metrics and unrealized PnL
 */

import { useState, useEffect, useCallback } from "react"

export interface ChatMessage {
  id: string
  agentId: string
  agentName: string
  timestamp: string
  content: string
  type: "analysis" | "trade_signal" | "market_update" | "risk_management" | "reasoning"
  confidence?: number
  symbol?: string
  unrealizedPnL?: number
  unrealizedROI?: number
}

export interface SymbolPerformance {
  symbol: string
  currentPrice: number
  unrealizedPnL: number
  unrealizedROI: number
  positionSize: number
  side: 'LONG' | 'SHORT'
  entryPrice: number
}

export interface AgentRealtimeContext {
  agentId: string
  agentName: string
  totalUnrealizedPnL: number
  totalUnrealizedROI: number
  openPositionCount: number
  tradedSymbols: SymbolPerformance[]
  accountValue: number
  equity: number
  timestamp: string
}

interface UseModelChatOptions {
  agentId?: string
  refreshInterval?: number // milliseconds
  enableAutoRefresh?: boolean
  includeRealtimeContext?: boolean // Fetch unrealized PnL and symbols
}

export function useModelChat(options: UseModelChatOptions = {}) {
  const {
    agentId,
    refreshInterval = 450000, // 7.5 minutes (450 seconds) = 2x per 15 min interval
    enableAutoRefresh = true,
    includeRealtimeContext = true,
  } = options

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [previousMessageCount, setPreviousMessageCount] = useState(0)
  const [realtimeContext, setRealtimeContext] = useState<AgentRealtimeContext | AgentRealtimeContext[] | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [lastCleanupTime, setLastCleanupTime] = useState<number>(Date.now())

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true)

      const url = new URL("/api/chat/messages", window.location.origin)
      if (agentId) {
        url.searchParams.append("agentId", agentId)
      }
      url.searchParams.append("limit", "5") // Only fetch 5 most recent chats

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.success) {
        let fetchedMessages = data.messages || []
        
        // Auto-cleanup: Remove messages older than 10 minutes
        const tenMinutesAgo = Date.now() - 600000 // 10 minutes in ms
        const now = Date.now()
        
        // Only cleanup every 10 minutes to avoid excessive filtering
        if (now - lastCleanupTime > 600000) {
          fetchedMessages = fetchedMessages.filter((msg: ChatMessage) => {
            const msgTime = new Date(msg.timestamp).getTime()
            return msgTime > tenMinutesAgo
          })
          setLastCleanupTime(now)
        }
        
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
  }, [agentId, previousMessageCount, lastCleanupTime])

  // Fetch realtime context: unrealized PnL, symbol positions, prices
  const fetchRealtimeContext = useCallback(async () => {
    if (!includeRealtimeContext) return

    try {
      setContextLoading(true)
      
      const url = new URL("/api/aster/agent-realtime-context", window.location.origin)
      if (agentId) {
        url.searchParams.append("agentId", agentId)
      }

      const response = await fetch(url.toString())
      const data = await response.json()
      
      setRealtimeContext(data)
    } catch (err) {
      console.error("Error fetching realtime context:", err)
      // Don't fail chat if context fails - it's supplemental
    } finally {
      setContextLoading(false)
    }
  }, [agentId, includeRealtimeContext])

  // Auto-refresh setup
  useEffect(() => {
    if (!enableAutoRefresh) return

    // Fetch immediately
    fetchMessages()
    fetchRealtimeContext()

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      fetchMessages()
      fetchRealtimeContext()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchMessages, fetchRealtimeContext, refreshInterval, enableAutoRefresh])

  return {
    messages,
    isLoading,
    error,
    newMessageCount,
    realtimeContext,
    contextLoading,
    clearNewMessageCount: () => setNewMessageCount(0),
    refresh: fetchMessages,
    refreshContext: fetchRealtimeContext,
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