"use client"

import { useState, useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, TrendingUp, TrendingDown, AlertCircle, BarChart3, Bell, DollarSign, Activity } from "lucide-react"
import Image from "next/image"

interface SymbolPerformance {
  symbol: string
  currentPrice: number
  unrealizedPnL: number
  unrealizedROI: number
  positionSize: number
  side: 'LONG' | 'SHORT'
  entryPrice: number
}

interface AgentRealtimeContext {
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

interface ChatMessage {
  id: string
  agentId: string
  agentName: string
  timestamp: string
  content: string
  type: "analysis" | "trade_signal" | "market_update" | "risk_management" | "reasoning"
  confidence?: number
  symbol?: string
  unrealizedPnL?: number
}

interface Agent {
  id: string
  name: string
  color: string
  logo?: string
}

interface ModelChatViewProps {
  agents: Agent[]
  messages: Record<string, ChatMessage[]>
  realtimeContext?: AgentRealtimeContext | AgentRealtimeContext[] | null
  newMessageCount?: number
  onClearNewMessages?: () => void
}

const getTypeIcon = (type: string | undefined) => {
  if (!type) return <Zap className="w-3 h-3" />
  switch (type) {
    case "trade_signal":
      return <Zap className="w-3 h-3" />
    case "market_update":
      return <TrendingUp className="w-3 h-3" />
    case "risk_management":
      return <AlertCircle className="w-3 h-3" />
    case "analysis":
      return <BarChart3 className="w-3 h-3" />
    default:
      return <Zap className="w-3 h-3" />
  }
}

const getTypeLabel = (type: string | undefined) => {
  if (!type) return "UNKNOWN"
  return type.replace(/_/g, " ").toUpperCase()
}

const getTypeColor = (type: string | undefined): string => {
  if (!type) return "text-gray-500 bg-gray-500/10"
  switch (type) {
    case "trade_signal":
      return "text-yellow-500 bg-yellow-500/10"
    case "market_update":
      return "text-blue-500 bg-blue-500/10"
    case "risk_management":
      return "text-red-500 bg-red-500/10"
    case "analysis":
      return "text-cyan-500 bg-cyan-500/10"
    default:
      return "text-purple-500 bg-purple-500/10"
  }
}

export function ModelChatView({ 
  agents, 
  messages,
  realtimeContext,
  newMessageCount = 0,
  onClearNewMessages 
}: ModelChatViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([])
  const [showContext, setShowContext] = useState(true)
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)

  // Get context for selected agent
  const selectedContext = selectedAgent && realtimeContext
    ? Array.isArray(realtimeContext)
      ? realtimeContext.find(c => c.agentId === selectedAgent)
      : realtimeContext.agentId === selectedAgent ? realtimeContext : null
    : selectedAgent && Array.isArray(realtimeContext)
      ? realtimeContext.find(c => c.agentId === selectedAgent)
      : null

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const flat = Object.values(messages)
      .flat()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    setAllMessages(flat)
    
    // Auto-scroll if new messages arrived
    if (flat.length > previousMessageCountRef.current && scrollViewportRef.current) {
      setTimeout(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight
        }
      }, 100)
    }
    
    previousMessageCountRef.current = flat.length
  }, [messages])

  const handleScrollToBottom = () => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight
    }
    onClearNewMessages?.()
  }

  const displayMessages = selectedAgent
    ? messages[selectedAgent]?.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || []
    : allMessages

  const agentColor = selectedAgent
    ? agents.find((a) => a.id === selectedAgent)?.color || "#999999"
    : undefined

  return (
    <div className="glass rounded-lg p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border flex-shrink-0">
        <h2 className="text-xs font-bold flex items-center gap-2">
          <Zap className="w-3 h-3 text-yellow-500 animate-pulse" />
          LIVE AGENT REASONING
        </h2>
        <div className="flex items-center gap-2">
          {newMessageCount > 0 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              onClick={handleScrollToBottom}
              className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20 border border-blue-500/50 text-blue-400 text-[9px] font-bold hover:bg-blue-500/30 transition-colors"
            >
              <Bell className="w-3 h-3 animate-bounce" />
              {newMessageCount} new
            </motion.button>
          )}
          <span className="text-[10px] text-muted-foreground">{displayMessages.length}/30 messages</span>
        </div>
      </div>

      {/* Realtime Context Panel */}
      {showContext && selectedContext && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 flex-shrink-0"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] font-bold uppercase text-blue-400">Realtime Performance</span>
            </div>
            <button
              onClick={() => setShowContext(!showContext)}
              className="text-[8px] text-muted-foreground hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            {/* Portfolio Summary */}
            <div className="grid grid-cols-3 gap-2 text-[8px]">
              <div className="bg-black/20 rounded px-2 py-1">
                <span className="text-muted-foreground">Account</span>
                <p className={`font-mono font-bold ${selectedContext.totalUnrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${selectedContext.accountValue.toFixed(2)}
                </p>
              </div>
              <div className="bg-black/20 rounded px-2 py-1">
                <span className="text-muted-foreground">U/R PnL</span>
                <p className={`font-mono font-bold ${selectedContext.totalUnrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedContext.totalUnrealizedPnL >= 0 ? '+' : ''}{selectedContext.totalUnrealizedPnL.toFixed(2)}
                </p>
              </div>
              <div className="bg-black/20 rounded px-2 py-1">
                <span className="text-muted-foreground">Positions</span>
                <p className="font-mono font-bold text-white">{selectedContext.openPositionCount}</p>
              </div>
            </div>

            {/* Active Symbols */}
            {selectedContext.tradedSymbols.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pt-1 pb-1">
                {selectedContext.tradedSymbols.map((symbol) => (
                  <div
                    key={symbol.symbol}
                    className="flex-shrink-0 px-2 py-1 rounded border border-white/10 bg-white/5 text-[8px] font-mono"
                  >
                    <p className="font-bold text-white">{symbol.symbol}</p>
                    <p className={symbol.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {symbol.unrealizedPnL >= 0 ? '+' : ''}{symbol.unrealizedPnL.toFixed(2)}
                    </p>
                    <p className="text-muted-foreground text-[7px]">
                      ${symbol.currentPrice.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Agent Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 flex-shrink-0">
        <button
          onClick={() => setSelectedAgent(null)}
          className={`px-3 py-1 rounded text-[10px] font-mono whitespace-nowrap transition-all flex items-center gap-1 ${
            selectedAgent === null
              ? "bg-white/20 border border-white/50 text-white"
              : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
          }`}
        >
          ALL AGENTS
        </button>
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className={`px-3 py-1 rounded text-[10px] font-mono whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedAgent === agent.id
                ? "border-2 text-white"
                : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
            }`}
            style={
              selectedAgent === agent.id
                ? {
                    backgroundColor: `${agent.color}20`,
                    borderColor: agent.color,
                    color: agent.color,
                  }
                : {}
            }
          >
            {agent.logo && (
              <Image
                src={agent.logo}
                alt={agent.name}
                width={14}
                height={14}
                className="rounded-full flex-shrink-0"
                title={agent.id === 'buy_and_hold' ? "Powered by Grok" : undefined}
              />
            )}
            {agent.name}
          </button>
        ))}
      </div>

      {/* Messages - Fixed height scrollable container */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full w-full" ref={scrollViewportRef as any}>
          <div className="space-y-3 pr-4">
            <AnimatePresence mode="popLayout">
              {displayMessages.length === 0 ? (
                <div key="empty-state" className="flex items-center justify-center h-32 text-muted-foreground text-[10px]">
                  Waiting for agent messages...
                </div>
              ) : (
                displayMessages.map((message, idx) => {
                  const agent = agents.find((a) => a.id === message.agentId)
                  // Ensure unique key: use id if available, otherwise use agentId + timestamp + index
                  const uniqueKey = message.id || `${message.agentId}-${message.timestamp}-${idx}`
                  return (
                    <motion.div
                      key={uniqueKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="border border-border/50 rounded-lg overflow-hidden hover:border-border transition-colors group"
                    >
                      {/* Message Header with Agent Logo */}
                      <div
                        className="px-3 py-2 flex items-start justify-between"
                        style={{
                          backgroundColor: agent ? `${agent.color}15` : "#999999" + "15",
                          borderBottom: "1px solid",
                          borderBottomColor: agent ? agent.color : "#999999",
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {agent?.logo && (
                            <Image
                              src={agent.logo}
                              alt={agent.name}
                              width={16}
                              height={16}
                              className="rounded-full flex-shrink-0"
                            />
                          )}
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: agent?.color || "#999999" }}
                          />
                          <span className="text-[9px] font-bold uppercase truncate">{message.agentName}</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0 ${getTypeColor(message.type)}`}>
                            {getTypeIcon(message.type)}
                            {getTypeLabel(message.type)}
                          </span>
                        </div>

                        {message.confidence !== undefined && (
                          <span className="text-[8px] text-muted-foreground ml-2 flex-shrink-0">
                            {message.confidence}% confidence
                          </span>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="px-3 py-2">
                        <p className="text-[10px] leading-relaxed text-muted-foreground font-mono">{message.content}</p>
                      </div>

                      {/* Message Footer */}
                      <div className="px-3 py-1 bg-background/50 border-t border-border/30 flex items-center justify-end gap-2">
                        <span className="text-[8px] text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* Info Footer */}
      <div className="mt-4 pt-3 border-t border-border text-[8px] text-muted-foreground space-y-1 flex-shrink-0">
        <p> Agents: Real-time trading analysis synced with {selectedAgent ? 'selected agent' : 'all agents'}</p>
        <p> Messages: Updated every 10 seconds</p>
        <p> Performance: {selectedContext ? `Updated ${new Date(selectedContext.timestamp).toLocaleTimeString()}` : 'Select an agent to see performance'}</p>
      </div>
    </div>
  )
}