"use client"

import { useState, useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, TrendingUp, TrendingDown, AlertCircle, BarChart3, Bell } from "lucide-react"
import Image from "next/image"

interface ChatMessage {
  id: string
  agentId: string
  agentName: string
  timestamp: string
  content: string
  type: "analysis" | "trade_signal" | "market_update" | "risk_management"
  confidence?: number
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
  newMessageCount?: number
  onClearNewMessages?: () => void
}

const getTypeIcon = (type: string) => {
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

const getTypeLabel = (type: string) => {
  return type.replace(/_/g, " ").toUpperCase()
}

const getTypeColor = (type: string): string => {
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
  newMessageCount = 0,
  onClearNewMessages 
}: ModelChatViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([])
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)

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
        <p> Updates: Every 5 minutes with latest market signals</p>
      </div>
    </div>
  )
}