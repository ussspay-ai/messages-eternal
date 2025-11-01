"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface CompletedTrade {
  id: string
  agentId: string
  agentName: string
  agentLogo?: string
  model?: string
  side: "LONG" | "SHORT"
  symbol: string
  entryPrice: number
  exitPrice: number
  qty: number
  entryNotional: number
  exitNotional: number
  holdingTime: string
  realizedPnl: number
  timestamp: number
  openTime?: number
  closeTime?: number
}

interface CompletedTradesListProps {
  trades: any[]
}

// Helper to get emoji for symbol
const getSymbolEmoji = (symbol: string | undefined): string => {
  const emojis: Record<string, string> = {
    BTC: "₿",
    ETH: "Ξ",
    BNB: "🟡",
    SOL: "⚓",
    DOGE: "🐕",
    XRP: "✕",
    ASTER: "⭐",
  }
  
  if (!symbol) return "🪙"
  
  // Extract base symbol from pairs like "BTCUSDT"
  const baseSymbol = symbol.replace("USDT", "").replace("BUSD", "").replace("USDC", "")
  return emojis[baseSymbol] || "🪙"
}

// Helper to format holding time
const formatHoldingTime = (startMs: number, endMs: number): string => {
  const diffMs = endMs - startMs
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 60) {
    return `${diffMins}M`
  }
  
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  
  if (hours < 24) {
    return `${hours}H ${mins}M`
  }
  
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  
  return `${days}D ${remainingHours}H`
}

export function CompletedTradesList({ trades }: CompletedTradesListProps) {
  const [processedTrades, setProcessedTrades] = useState<CompletedTrade[]>([])

  useEffect(() => {
    if (trades && trades.length > 0) {
      const processed = trades.map((t: any, idx: number) => {
        const entryPrice = Number(t.entryPrice || t.price || 0)
        const exitPrice = Number(t.exitPrice || t.price || 0)
        const qty = Number(t.qty || 0)
        
        const entryNotional = Math.abs(entryPrice * qty)
        const exitNotional = Math.abs(exitPrice * qty)
        
        // Calculate holding time if we have timestamps
        let holdingTime = t.holdingTime || "N/A"
        if (t.openTime && t.closeTime && typeof t.openTime === "number" && typeof t.closeTime === "number") {
          holdingTime = formatHoldingTime(t.openTime, t.closeTime)
        }
        
        return {
          id: `${t.agentId || "unknown"}-${Date.now()}-${idx}`,
          agentId: t.agentId || "unknown",
          agentName: t.agentName || "Unknown Agent",
          agentLogo: t.agentLogo,
          model: t.model,
          side: (t.side === "BUY" || t.side === "LONG") ? "LONG" : (t.side === "SELL" || t.side === "SHORT") ? "SHORT" : t.side,
          symbol: t.symbol || "UNKNOWN",
          entryPrice,
          exitPrice,
          qty: Math.abs(qty),
          entryNotional,
          exitNotional,
          holdingTime,
          realizedPnl: Number(t.pnl || t.realizedPnl || 0),
          timestamp: t.timestamp || Date.now(),
          openTime: t.openTime,
          closeTime: t.closeTime,
        }
      })

      setProcessedTrades(processed)
    }
  }, [trades])

  if (processedTrades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-xs font-mono">
        Showing Last 100 Trades
      </div>
    )
  }

  return (
    <div className="space-y-0 h-full overflow-y-auto">
      <div className="sticky top-0 bg-background py-2 px-3 border-b border-border text-xs font-mono font-bold text-muted-foreground">
        Showing Last {Math.min(processedTrades.length, 100)} Trades
      </div>
      
      {processedTrades.map((trade) => (
        <div key={trade.id} className="border-b border-border px-3 py-3 last:border-b-0 hover:bg-muted/50 transition-colors">
          {/* Header: Agent name, trade type, timestamp */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {trade.agentLogo && (
                <Image
                  src={trade.agentLogo}
                  alt={trade.agentName}
                  width={20}
                  height={20}
                  className="rounded-full flex-shrink-0"
                />
              )}
              <div>
                <span className="font-bold text-xs">
                  {trade.agentName}
                  {trade.model && <span className="text-muted-foreground ml-1">{trade.model}</span>}
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {trade.timestamp ? new Date(trade.timestamp).toLocaleString() : "N/A"}
            </div>
          </div>

          {/* Trade description */}
          <div className="text-xs mb-2">
            <span>completed a </span>
            <span className={trade.side === "LONG" ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
              {trade.side?.toLowerCase() || "unknown"}
            </span>
            <span> trade on </span>
            <span className="font-bold">
              {getSymbolEmoji(trade.symbol)} {trade.symbol || "UNKNOWN"}
            </span>
          </div>

          {/* Trade details grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2">
            <div>
              <span className="text-muted-foreground">Price: </span>
              <span>
                ${isNaN(trade.entryPrice) ? "0" : trade.entryPrice.toFixed(trade.entryPrice < 1 ? 5 : 2)} → ${isNaN(trade.exitPrice) ? "0" : trade.exitPrice.toFixed(trade.exitPrice < 1 ? 5 : 2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Quantity: </span>
              <span>{isNaN(trade.qty) ? "0" : trade.qty.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Notional: </span>
              <span>
                ${isNaN(trade.entryNotional) ? "0" : trade.entryNotional.toLocaleString(undefined, { maximumFractionDigits: 0 })} → ${isNaN(trade.exitNotional) ? "0" : trade.exitNotional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Holding time: </span>
              <span>{trade.holdingTime}</span>
            </div>
          </div>

          {/* NET P&L */}
          <div className="text-xs font-bold">
            <span className="text-muted-foreground">NET P&L: </span>
            <span className={trade.realizedPnl >= 0 ? "text-green-500" : "text-red-500"}>
              {isNaN(trade.realizedPnl) ? "$0.00" : `${trade.realizedPnl >= 0 ? "+" : ""}$${trade.realizedPnl.toFixed(2)}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}