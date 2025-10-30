/**
 * Hook for fetching individual agent data from Aster
 */

import { useEffect, useState, useCallback } from "react"

interface AsterPosition {
  symbol: string
  positionAmt: number
  initialMargin: number
  maintMargin: number
  unrealizedProfit: number
  entryPrice: number
  maxNotional: number
  liquidationPrice: number
  leverage: number
  isolated: boolean
  side: "LONG" | "SHORT"
  percentage: number
  notional: number
  markPrice: number
  updateTime: number
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

interface AsterAccountInfo {
  totalWalletBalance: number
  totalUnrealizedProfit: number
  totalMarginOpen: number
  totalPositionInitialMargin: number
  totalOpenOrderInitialMargin: number
  totalCrossWalletBalance: number
  totalCrossUnPnl: number
  availableBalance: number
  canDeposit: boolean
  canTrade: boolean
  feeTier: number
  updateTime: number
}

interface UseAgentDataReturn {
  accountInfo: AsterAccountInfo | null
  positions: AsterPosition[]
  trades: AsterTrade[]
  isLoading: boolean
  error: string | null
}

export function useAgentData(agentId: string | null, pollInterval: number = 5000): UseAgentDataReturn {
  const [accountInfo, setAccountInfo] = useState<AsterAccountInfo | null>(null)
  const [positions, setPositions] = useState<AsterPosition[]>([])
  const [trades, setTrades] = useState<AsterTrade[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!agentId) {
      setError("No agent selected")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Fetch account info
      const accountRes = await fetch(`/api/aster/account?agentId=${agentId}`)
      if (!accountRes.ok) throw new Error("Failed to fetch account info")
      const accountData = await accountRes.json()
      setAccountInfo(accountData)

      // Fetch positions
      const posRes = await fetch(`/api/aster/positions?agentId=${agentId}`)
      if (!posRes.ok) throw new Error("Failed to fetch positions")
      const posData = await posRes.json()
      setPositions(posData)

      // Fetch trades
      const tradesRes = await fetch(`/api/aster/trades?agentId=${agentId}&limit=50`)
      if (!tradesRes.ok) throw new Error("Failed to fetch trades")
      const tradesData = await tradesRes.json()
      setTrades(tradesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agent data")
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, pollInterval)
    return () => clearInterval(interval)
  }, [fetchData, pollInterval])

  return {
    accountInfo,
    positions,
    trades,
    isLoading,
    error,
  }
}