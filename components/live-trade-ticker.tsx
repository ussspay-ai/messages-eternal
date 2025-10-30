"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface Trade {
  id: string
  agentId: string
  agentName: string
  agentLogo?: string
  side: "LONG" | "SHORT"
  symbol: string
  price: number
  qty: number
  pnl: number
  timestamp: number
}

interface LiveTradeTickerProps {
  trades: any[]
}

export function LiveTradeTicker({ trades }: LiveTradeTickerProps) {
  const [displayTrades, setDisplayTrades] = useState<Trade[]>([])

  useEffect(() => {
    if (trades && trades.length > 0) {
      const newTrades = trades.map((t, idx) => ({
        id: `${t.agentId}-${Date.now()}-${idx}`,
        agentId: t.agentId,
        agentName: t.agentName,
        agentLogo: t.agentLogo,
        side: t.side,
        symbol: t.symbol,
        price: t.price,
        qty: t.qty,
        pnl: t.pnl,
        timestamp: Date.now(),
      }))

      setDisplayTrades((prev) => [...newTrades, ...prev].slice(0, 10))
    }
  }, [trades])

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-mono font-bold text-muted-foreground mb-3">LIVE TRADES</h3>
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {displayTrades.map((trade) => (
            <motion.div
              key={trade.id}
              layout
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`panel p-3 flex items-center justify-between text-xs font-mono overflow-hidden ${
                trade.pnl >= 0
                  ? "border-l-4 border-green-500 bg-green-500/5"
                  : "border-l-4 border-red-500 bg-red-500/5"
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {trade.agentLogo && (
                  <Image
                    src={trade.agentLogo}
                    alt={trade.agentName}
                    width={24}
                    height={24}
                    className="rounded-full flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{trade.agentName}</p>
                  <p className="text-muted-foreground">
                    {trade.side} {trade.qty.toFixed(2)} {trade.symbol}
                  </p>
                </div>
              </div>

              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`text-right font-bold flex-shrink-0 ml-2 ${
                  trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                <motion.div
                  animate={{
                    textShadow: trade.pnl >= 0 ? [
                      "0 0 0px rgba(34, 197, 94, 0)",
                      "0 0 8px rgba(34, 197, 94, 0.8)",
                      "0 0 0px rgba(34, 197, 94, 0)",
                    ] : [
                      "0 0 0px rgba(239, 68, 68, 0)",
                      "0 0 8px rgba(239, 68, 68, 0.8)",
                      "0 0 0px rgba(239, 68, 68, 0)",
                    ]
                  }}
                  transition={{ duration: 1 }}
                >
                  {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(0)}
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        {displayTrades.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            Waiting for trades...
          </div>
        )}
      </div>
    </div>
  )
}