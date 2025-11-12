/**
 * EXAMPLE: Dashboard with Real-Time Agent Chat
 * 
 * This is a reference implementation showing how to integrate the new
 * SSE-based real-time chat system into your dashboard.
 * 
 * Copy this pattern to your actual dashboard component.
 */

"use client"

import { useState, useMemo } from "react"
import { useRealtimeAgentMessages } from "@/hooks/use-realtime-agent-messages"
import { ModelChatView } from "@/components/model-chat-view"
import { ArrowUp, Zap, Wifi, WifiOff } from "lucide-react"

// Your agent configurations
const AGENTS = [
  {
    id: "claude_arbitrage",
    name: "Claude Arbitrage",
    color: "#8B5CF6", // Purple
    logo: "/logos/claude.png",
  },
  {
    id: "chatgpt_openai",
    name: "GPT-4 Momentum",
    color: "#10A981", // Teal
    logo: "/logos/openai.png",
  },
  {
    id: "gemini_grid",
    name: "Gemini Grid",
    color: "#4F46E5", // Indigo
    logo: "/logos/gemini.png",
  },
  {
    id: "deepseek_ml",
    name: "DeepSeek ML",
    color: "#F59E0B", // Amber
    logo: "/logos/deepseek.png",
  },
  {
    id: "buy_and_hold",
    name: "Buy & Hold",
    color: "#DC2626", // Red
    logo: "/logos/grok.png",
  },
]

export function DashboardRealtimeExample() {
  // Extract agent IDs for the hook
  const agentIds = useMemo(() => AGENTS.map((a) => a.id), [])

  // Real-time messages with SSE + fallback polling
  const {
    messages,
    isRealtime, // true = using SSE, false = using polling
    error,
    isLoading,
  } = useRealtimeAgentMessages({
    agentIds,
    enableSSE: true,
    enableFallbackPolling: true,
    fallbackPollInterval: 45000, // 45 seconds when SSE unavailable
  })

  const [newMessageCount, setNewMessageCount] = useState(0)

  // Mock realtime context (from your existing API)
  // In production, you'd fetch this from /api/aster/agent-realtime-context
  const realtimeContext = null

  const handleClearNewMessages = () => {
    setNewMessageCount(0)
  }

  return (
    <div className="space-y-4">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/10">
        <div className="flex items-center gap-2">
          {isRealtime ? (
            <>
              <div className="flex items-center gap-2 text-green-400">
                <Zap className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-mono">REALTIME (SSE)</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Messages appear instantly ({"<"}100ms)
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-yellow-400">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-mono">POLLING</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Updates every 45 seconds (SSE unavailable)
              </span>
            </>
          )}
        </div>

        {error && (
          <div className="text-xs text-red-400 max-w-xs">
            {error}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {Object.values(messages).flat().length} total messages
        </div>
      </div>

      {/* Chat View */}
      {isLoading && Object.values(messages).flat().length === 0 ? (
        <div className="flex items-center justify-center h-96 rounded-lg glass">
          <div className="text-center">
            <Wifi className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isRealtime ? "Connecting to realtime stream..." : "Loading messages..."}
            </p>
          </div>
        </div>
      ) : (
        <ModelChatView
          agents={AGENTS}
          messages={messages}
          realtimeContext={realtimeContext}
          newMessageCount={newMessageCount}
          onClearNewMessages={handleClearNewMessages}
        />
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="p-4 rounded-lg bg-black/20 border border-white/10 text-xs font-mono">
          <div className="mb-2 text-muted-foreground">Debug Info:</div>
          <div className="space-y-1 text-muted-foreground">
            <div>SSE Status: {isRealtime ? "✅ Active" : "⏸️ Polling"}</div>
            <div>Total Messages: {Object.values(messages).flat().length}</div>
            <div>
              Messages per Agent:
              {agentIds.map((id) => (
                <div key={id} className="ml-2">
                  {id}: {messages[id]?.length || 0}
                </div>
              ))}
            </div>
            {error && <div className="text-red-400">Error: {error}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardRealtimeExample