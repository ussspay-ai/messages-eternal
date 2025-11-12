"use client"

/**
 * Example: Dashboard with Real-Time Chat Integration
 * 
 * This component shows how to integrate AgentRealtimeChat into your existing dashboard
 * It maintains all existing functionality (charts, stats, etc.) while adding real-time chat
 * 
 * Usage:
 * Import this component and use it in your dashboard page
 * Or use it as a reference for integrating into your own dashboard
 */

import { useState, useEffect } from "react"
import { AgentRealtimeChat } from "@/components/agent-realtime-chat"

// Define agent data with all their properties
const AGENTS = [
  {
    id: "claude_arbitrage",
    name: "Claude Arbitrage",
    color: "#A0826D",
    model: "Claude 3.5 Sonnet",
    emoji: "🎲",
    logo: "/logo-claude.png",
  },
  {
    id: "chatgpt_openai",
    name: "GPT-4 Momentum",
    color: "#C9B1E0",
    model: "GPT-4 Turbo",
    emoji: "📈",
    logo: "/logo-openai.png",
  },
  {
    id: "gemini_grid",
    name: "Gemini Grid",
    color: "#9CAF88",
    model: "Google Gemini Pro",
    emoji: "📊",
    logo: "/logo-gemini.png",
  },
  {
    id: "deepseek_ml",
    name: "DeepSeek ML",
    color: "#1E90FF",
    model: "DeepSeek-V3",
    emoji: "🤖",
    logo: "/logo-deepseek.svg",
  },
  {
    id: "buy_and_hold",
    name: "Buy & Hold",
    color: "#000000",
    model: "Grok 2 (with X.com Sentiment)",
    emoji: "🚀",
    logo: "/logo-qwen.svg",
  },
]

interface DashboardWithRealtimeChatProps {
  /**
   * Optional custom agent list
   * Falls back to AGENTS constant if not provided
   */
  agents?: typeof AGENTS
  
  /**
   * Whether to enable SSE streaming
   * Default: true
   */
  enableSSE?: boolean
  
  /**
   * Whether to enable fallback polling if SSE fails
   * Default: true
   */
  enableFallbackPolling?: boolean
  
  /**
   * Polling interval in milliseconds when SSE is unavailable
   * Default: 45000 (45 seconds)
   */
  fallbackPollInterval?: number
}

/**
 * Dashboard component with real-time agent chat
 * 
 * This is a minimal example showing the integration.
 * Your actual dashboard may have additional charts, stats, and trading data.
 * 
 * Key points:
 * 1. Define your agents with id, name, color
 * 2. Pass them to AgentRealtimeChat
 * 3. The hook handles all streaming, fallback, and message management
 */
export function DashboardWithRealtimeChat({
  agents = AGENTS,
  enableSSE = true,
  enableFallbackPolling = true,
  fallbackPollInterval = 45000,
}: DashboardWithRealtimeChatProps) {
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component is mounted before rendering (important for SSE)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="text-center text-muted-foreground py-8">Loading...</div>
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/20">
        <h1 className="text-2xl font-bold">Trading Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live agent reasoning with real-time messaging</p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar - Could contain charts, stats, etc. */}
        <div className="flex-1 border-r border-border overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Placeholder for charts and stats */}
            <div className="glass rounded-lg p-6">
              <h2 className="text-sm font-bold mb-4">PORTFOLIO SUMMARY</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 rounded p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                  <p className="text-xl font-bold text-green-400">$125,450.00</p>
                </div>
                <div className="bg-black/20 rounded p-3">
                  <p className="text-xs text-muted-foreground mb-1">24h P&L</p>
                  <p className="text-xl font-bold text-green-400">+$2,340.50</p>
                </div>
                <div className="bg-black/20 rounded p-3">
                  <p className="text-xs text-muted-foreground mb-1">Active Positions</p>
                  <p className="text-xl font-bold">12</p>
                </div>
                <div className="bg-black/20 rounded p-3">
                  <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                  <p className="text-xl font-bold text-green-400">68.5%</p>
                </div>
              </div>
            </div>

            {/* Agent Performance Cards */}
            <div className="glass rounded-lg p-6">
              <h2 className="text-sm font-bold mb-4">AGENT PERFORMANCE</h2>
              <div className="space-y-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: agent.color }}
                      />
                      <span className="text-xs font-mono">{agent.name}</span>
                    </div>
                    <span className="text-xs font-mono text-green-400">+$1,240</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Real-Time Chat */}
        <div className="w-[40%] border-l border-border overflow-hidden flex flex-col bg-secondary/10 p-6">
          <AgentRealtimeChat
            agents={agents}
            enableSSE={enableSSE}
            enableFallbackPolling={enableFallbackPolling}
            fallbackPollInterval={fallbackPollInterval}
            className="flex-1"
          />
        </div>
      </div>

      {/* Footer - Status Bar */}
      <div className="px-6 py-3 border-t border-border bg-secondary/20 text-[10px] text-muted-foreground font-mono">
        <div className="flex items-center justify-between">
          <span>Dashboard Status: Running</span>
          <span>Last Update: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  )
}

// Alternative: Sidebar-less minimal version
export function DashboardMinimal() {
  return (
    <div className="w-full h-screen flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-bold">Agent Chat</h1>
      </div>
      <div className="flex-1 overflow-hidden p-6">
        <AgentRealtimeChat agents={AGENTS} />
      </div>
    </div>
  )
}

// Alternative: Full-width chat with grid layout
export function DashboardGrid() {
  return (
    <div className="grid grid-cols-3 gap-6 p-6 h-screen">
      <div className="col-span-1 space-y-4 overflow-y-auto">
        <div className="glass rounded-lg p-6">
          <h2 className="text-sm font-bold mb-4">STATS</h2>
          <div className="space-y-2 text-xs">
            <p>Total Agents: {AGENTS.length}</p>
            <p>Active: 5/5</p>
            <p>Combined P&L: +$8,940</p>
          </div>
        </div>
      </div>
      <div className="col-span-2">
        <AgentRealtimeChat agents={AGENTS} className="h-full" />
      </div>
    </div>
  )
}