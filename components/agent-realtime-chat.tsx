"use client"

import { useState, useEffect, useMemo } from "react"
import { ModelChatView } from "@/components/model-chat-view"
import { useRealtimeAgentMessages } from "@/hooks/use-realtime-agent-messages"
import { Zap, Wifi, WifiOff, AlertCircle } from "lucide-react"

export interface Agent {
  id: string
  name: string
  color: string
  logo?: string
}

interface AgentRealtimeChatProps {
  agents: Agent[]
  enableSSE?: boolean
  enableFallbackPolling?: boolean
  fallbackPollInterval?: number
  className?: string
}

/**
 * Real-time agent chat component
 * 
 * Combines SSE streaming (primary) + polling (fallback) for real-time agent messages
 * Automatically handles connection failures and switches to fallback gracefully
 * 
 * Usage:
 * ```tsx
 * <AgentRealtimeChat
 *   agents={[
 *     { id: 'claude_arbitrage', name: 'Claude Arbitrage', color: '#A0826D' },
 *     { id: 'chatgpt_openai', name: 'GPT-4 Momentum', color: '#C9B1E0' },
 *   ]}
 *   enableSSE={true}
 *   enableFallbackPolling={true}
 * />
 * ```
 */
export function AgentRealtimeChat({
  agents,
  enableSSE = true,
  enableFallbackPolling = true,
  fallbackPollInterval = 45000,
  className = "",
}: AgentRealtimeChatProps) {
  const agentIds = useMemo(() => agents.map((a) => a.id), [agents])
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [previousMessageCount, setPreviousMessageCount] = useState(0)

  // Initialize real-time messaging hook
  const { messages, isLoading, error, isRealtime } = useRealtimeAgentMessages({
    agentIds,
    enableSSE,
    enableFallbackPolling,
    fallbackPollInterval,
  })

  // Track new messages arriving
  useEffect(() => {
    const totalMessages = Object.values(messages)
      .flat()
      .length

    if (totalMessages > previousMessageCount) {
      setNewMessageCount(totalMessages - previousMessageCount)
      setPreviousMessageCount(totalMessages)
    }
  }, [messages, previousMessageCount])

  const handleClearNewMessages = () => {
    setNewMessageCount(0)
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Connection Status Bar */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/30 border border-border/50">
        <div className="flex items-center gap-2 flex-1">
          {isRealtime ? (
            <>
              <Wifi className="w-3 h-3 text-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-green-500">Real-time (SSE)</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-yellow-500" />
              <span className="text-[10px] font-mono text-yellow-500">Polling (fallback)</span>
            </>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground font-mono">
          <span>{Object.values(messages).flat().length} messages</span>
          <span>•</span>
          <span>{agents.length} agents</span>
        </div>
      </div>

      {/* Error message if present */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-mono text-red-500">Connection Error</p>
            <p className="text-[9px] text-red-400/80">{error}</p>
          </div>
        </div>
      )}

      {/* Main chat view */}
      <div className="flex-1 rounded-lg overflow-hidden">
        <ModelChatView
          agents={agents}
          messages={messages}
          newMessageCount={newMessageCount}
          onClearNewMessages={handleClearNewMessages}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-2 text-[10px] text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
          Fetching messages...
        </div>
      )}
    </div>
  )
}