"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAgentData } from "@/hooks/use-agent-data"

interface Message {
  id: string
  type: "agent" | "system" | "trade"
  content: string
  timestamp: string
}

interface AgentChatProps {
  agentId: string
  agentName: string
  agentColor: string
}

interface AsterTrade {
  symbol: string
  id: string
  orderId: string
  side: "BUY" | "SELL"
  price: number
  qty: number
  realizedPnl: number
  marginAsset: string
  quoteQty: number
  commission: number
  commissionAsset: string
  time: number
  positionSide: "BOTH" | "LONG" | "SHORT"
  buyer: boolean
  maker: boolean
}

export function AgentChat({ agentId, agentName, agentColor }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const { trades, isLoading, error } = useAgentData(agentId)
  const [previousTradeCount, setPreviousTradeCount] = useState(0)

  // Initialize with system message on first load
  useEffect(() => {
    setMessages([
      {
        id: "system",
        type: "system",
        content: `Trading session active. Agent: ${agentName}. Monitoring markets...`,
        timestamp: new Date().toISOString(),
      },
    ])
  }, [agentName])

  // Convert Aster trades to chat messages
  useEffect(() => {
    if (!trades || trades.length === 0) return

    // If there are new trades since last update, add them to messages
    if (trades.length > previousTradeCount) {
      const newTrades = trades.slice(previousTradeCount)

      const newMessages = newTrades.map((trade: AsterTrade) => ({
        id: trade.id,
        type: "trade" as const,
        content: `EXECUTED: ${trade.side} ${trade.qty} ${trade.symbol} @ $${trade.price.toFixed(2)} | PnL: $${trade.realizedPnl.toFixed(2)}`,
        timestamp: new Date(trade.time).toISOString(),
      }))

      setMessages((prev) => [...newMessages, ...prev])
      setPreviousTradeCount(trades.length)
    }
  }, [trades, previousTradeCount])

  return (
    <div className="glass rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold">AGENT CHAT LOG</h2>
        {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Updating...</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">No trades yet</div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-4 rounded-lg ${
                message.type === "agent"
                  ? "bg-secondary/50 border-l-4"
                  : message.type === "trade"
                    ? "bg-neon-green/10 border-l-4 border-neon-green"
                    : "bg-muted/30 border-l-4 border-muted-foreground"
              }`}
              style={message.type === "agent" ? { borderLeftColor: agentColor } : {}}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {message.type === "agent" ? agentName : message.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-[11px] font-mono leading-relaxed">{message.content}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
