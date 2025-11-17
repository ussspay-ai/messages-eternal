"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { TokenIcon } from "@/components/token-icon"
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts"
import { calculateAllMetrics } from "@/lib/metrics-calculator"

/**
 * Format holding time from milliseconds to readable string
 */
function formatHoldingTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  if (seconds < 60) return `${seconds}s`
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

/**
 * Reconstruct complete round-trip trades from individual fills
 * Aster API returns individual BUY/SELL fills, we need to pair them into complete trades
 */
function reconstructCompleteTrades(asterFills: any[]): any[] {
  // Sort by time to process chronologically
  const sortedFills = [...asterFills].sort((a, b) => a.time - b.time)
  
  // Group fills by symbol to process separately
  const fillsBySymbol: Record<string, any[]> = {}
  sortedFills.forEach(fill => {
    if (!fillsBySymbol[fill.symbol]) {
      fillsBySymbol[fill.symbol] = []
    }
    fillsBySymbol[fill.symbol].push(fill)
  })
  
  const completeTrades: any[] = []
  const usedIndices = new Set<number>()
  
  // For each symbol, reconstruct trades by pairing entry/exit fills
  Object.entries(fillsBySymbol).forEach(([symbol, fills]) => {
    let i = 0
    while (i < fills.length) {
      // Skip already paired fills
      if (usedIndices.has(i)) {
        i++
        continue
      }
      
      const entryFill = fills[i]
      
      // Determine if this is an entry or exit based on positionSide and side
      const isLongEntry = entryFill.positionSide === "LONG" && entryFill.side === "BUY"
      const isShortEntry = entryFill.positionSide === "SHORT" && entryFill.side === "SELL"
      const isEntry = isLongEntry || isShortEntry
      
      // If this is an entry, look for matching exit
      if (isEntry) {
        let exitFill = null
        let exitIndex = -1
        
        // Search for matching exit fill
        for (let j = i + 1; j < fills.length; j++) {
          const potentialExit = fills[j]
          const isLongExit = entryFill.positionSide === "LONG" && potentialExit.side === "SELL"
          const isShortExit = entryFill.positionSide === "SHORT" && potentialExit.side === "BUY"
          
          if (isLongExit || isShortExit) {
            exitFill = potentialExit
            exitIndex = j
            break
          }
        }
        
        if (exitFill) {
          // Create complete trade record
          const holdingTimeMs = exitFill.time - entryFill.time
          const tradeId = `${entryFill.id}-${exitFill.id}`
          
          completeTrades.push({
            id: tradeId,
            side: entryFill.positionSide === "LONG" ? "LONG" : "SHORT",
            coin: symbol.replace("USDT", ""),
            entryPrice: parseFloat(entryFill.price),
            exitPrice: parseFloat(exitFill.price),
            quantity: parseFloat(entryFill.qty),
            holdingTime: formatHoldingTime(holdingTimeMs),
            notionalEntry: parseFloat(entryFill.price) * parseFloat(entryFill.qty),
            notionalExit: parseFloat(exitFill.price) * parseFloat(exitFill.qty),
            totalFees: parseFloat(entryFill.commission) + parseFloat(exitFill.commission),
            // Use realizedPnl from exit fill, or calculate if not available
            netPnl: exitFill.realizedPnl !== undefined ? parseFloat(exitFill.realizedPnl) : 0,
            entryTime: entryFill.time,
            exitTime: exitFill.time,
          })
          
          usedIndices.add(i)
          usedIndices.add(exitIndex)
        }
      }
      
      i++
    }
  })
  
  // Sort trades by exit time descending (most recent first)
  return completeTrades.sort((a, b) => b.exitTime - a.exitTime)
}

interface Agent {
  id: string
  name: string
  model: string
  pnl: number
  roi: number
  status: "active" | "idle"
  trades: number
  color: string
  description: string
  avatar: string
  logo: string
  accountValue: number
  availableCash: number
  totalFees: number
  netRealized: number
  avgLeverage: number
  avgConfidence: number
  biggestWin: number
  biggestLoss: number
  longWinRate: number
  shortWinRate: number
  flatRate: number
  totalUnrealizedPnl: number
}

interface Position {
  id: string
  coin: string
  side: "LONG" | "SHORT"
  entryTime: string
  entryPrice: number
  currentPrice: number
  quantity: number
  leverage: number
  margin: number
  liquidationPrice: number
  unrealizedPnl: number
  status: "winning" | "losing" | "neutral"
}

interface Trade {
  id: string
  side: "LONG" | "SHORT"
  coin: string
  entryPrice: number
  exitPrice: number
  quantity: number
  holdingTime: string
  notionalEntry: number
  notionalExit: number
  totalFees: number
  netPnl: number
}

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [allAgents, setAllAgents] = useState<Agent[]>([])
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [showStrategyProfile, setShowStrategyProfile] = useState(false)
  const [pickabooSymbols, setPickabooSymbols] = useState<string[]>([])
  const [symbolsSource, setSymbolsSource] = useState<'pickaboo_config' | 'default_config' | null>(null)

  useEffect(() => {
    // Fetch real agent data from Aster API
    fetch("/api/aster/agents-data")
      .then((res) => res.json())
      .then((data) => {
        const agents = data.agents || []
        setAllAgents(agents as Agent[])
        const found = agents.find((a: any) => a.id === params.id)
        if (found) {
          // Transform Aster agent data to Agent interface
          setAgent({
            id: found.id,
            name: found.name,
            model: found.model,
            pnl: found.pnl,
            roi: found.roi,
            status: "active",
            trades: 0,
            color: "#3b82f6",
            description: "",
            avatar: "",
            logo: found.logo_url,
            accountValue: found.account_value,
            availableCash: found.total_balance,
            totalFees: 0,
            netRealized: found.total_pnl,
            avgLeverage: 0,
            avgConfidence: 0,
            biggestWin: 0,
            biggestLoss: 0,
            longWinRate: 0,
            shortWinRate: 0,
            flatRate: 0,
            totalUnrealizedPnl: 0,
          } as Agent)
        }
      })
      .catch((err) => {
        console.debug("Failed to fetch agent data:", err)
      })

    // Fetch live positions for the agent
    if (params.id) {
      fetch(`/api/aster/positions?agentId=${params.id}`)
        .then((res) => res.json())
        .then((asterPositions) => {
          const positions: Position[] = asterPositions
            .filter((p: any) => p.positionAmt !== 0)
            .map((p: any) => ({
              id: p.symbol,
              coin: p.symbol.replace("USDT", ""),
              side: p.positionAmt > 0 ? "LONG" : "SHORT",
              entryTime: new Date(p.updateTime).toLocaleTimeString(),
              entryPrice: p.entryPrice,
              currentPrice: p.markPrice,
              quantity: Math.abs(p.positionAmt),
              leverage: p.leverage,
              margin: p.initialMargin,
              liquidationPrice: p.liquidationPrice,
              unrealizedPnl: p.unrealizedProfit,
              status:
                p.unrealizedProfit > 0 ? "winning" : p.unrealizedProfit < 0 ? "losing" : "neutral",
            }))
          setPositions(positions)
        })
        .catch((err) => {
          console.debug("Failed to fetch positions:", err)
          // Keep existing mock positions if API fails
        })

      // Fetch live trades for the agent
      // Reconstruct complete round-trip trades from individual fills
      fetch(`/api/aster/trades?agentId=${params.id}&limit=100`)
        .then((res) => res.json())
        .then((asterFills) => {
          // Reconstruct complete trades from fills and limit to 25 most recent
          const completeTrades = reconstructCompleteTrades(asterFills)
          const trades: Trade[] = completeTrades.slice(0, 25).map((t: any) => ({
            id: t.id,
            side: t.side,
            coin: t.coin,
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice,
            quantity: t.quantity,
            holdingTime: t.holdingTime,
            notionalEntry: t.notionalEntry,
            notionalExit: t.notionalExit,
            totalFees: t.totalFees,
            netPnl: t.netPnl,
          }))
          setTrades(trades)
          console.log(`[Agent Detail] Reconstructed ${completeTrades.length} trades from fills, displaying 25 most recent`)
        })
        .catch((err) => {
          console.debug("Failed to fetch trades:", err)
          // Keep existing mock trades if API fails
        })

      // Fetch Pickaboo configured trading symbols for this agent
      fetch(`/api/pickaboo/agent-trading-symbols?agent_id=${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.symbols && Array.isArray(data.symbols)) {
            setPickabooSymbols(data.symbols)
            setSymbolsSource(data.source || 'default_config')
            console.log(`[Agent Detail] Loaded symbols from ${data.source}: ${data.symbols.join(', ')}`)
          }
        })
        .catch((err) => {
          console.debug("Failed to fetch Pickaboo trading symbols:", err)
          setPickabooSymbols([])
          setSymbolsSource(null)
        })

      // Fetch 30-day historical performance from Supabase
      fetch(`/api/leaderboard/history?period=30D&agentId=${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          const agentHistory = data.agents?.[0]
          if (agentHistory && agentHistory.data) {
            // Transform historical snapshots to performance chart data
            const chartData = agentHistory.data.map((snapshot: any) => ({
              date: new Date(snapshot.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              value: snapshot.accountValue,
              pnl: snapshot.totalPnL,
            }))
            setPerformanceData(chartData)
          } else {
            // No historical data available, generate fallback
            throw new Error("No historical data available")
          }
        })
        .catch((err) => {
          console.debug("Failed to fetch historical performance:", err)
          // Generate fallback mock data if historical fetch fails
          const fallbackData = []
          const startValue = 10000
          let currentValue = startValue
          const now = new Date()

          for (let i = 30; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
            currentValue = currentValue + (Math.random() - 0.45) * 500
            fallbackData.push({
              date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              value: Math.max(0, currentValue),
              pnl: currentValue - startValue,
            })
          }
          setPerformanceData(fallbackData)
        })
    }

  }, [params.id])

  // Calculate metrics from trades and positions data
  useEffect(() => {
    if (trades.length > 0 || positions.length > 0) {
      const metrics = calculateAllMetrics(trades, positions)
      
      setAgent((prevAgent) => {
        if (!prevAgent) return prevAgent
        return {
          ...prevAgent,
          avgLeverage: metrics.avgLeverage,
          biggestWin: metrics.biggestWin,
          biggestLoss: metrics.biggestLoss,
          totalFees: metrics.totalFees,
          longWinRate: metrics.longWinRate,
          shortWinRate: metrics.shortWinRate,
          flatRate: metrics.flatRate,
        }
      })
    }
  }, [trades, positions])

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="text-xs font-mono">Loading model info just a min buddy...</div>
      </div>
    )
  }

  const strategyProfiles: Record<string, any> = {
    claude: {
      philosophy: "Cross-exchange spot-futures arbitrage with strong risk controls",
      approach:
        "Claude Arbitrage identifies price discrepancies between perpetual futures and spot prices, executing low-risk arbitrage trades with 2-3x leverage. Focus on symbols configured to trade via the Pickaboo dashboard for consistent for capital preservation.",
      riskTolerance: "Low to Moderate",
      typicalHolding: "Minutes to Hours",
      preferredAssets: "BTC, ETH",
      strengths: ["Risk management", "Statistical arbitrage", "Consistent performance"],
      weaknesses: ["Limited to arbitrage opportunities", "Tight margins require efficiency"],
    },
    openai: {
      philosophy: "Advanced multi-timeframe trading combining momentum with macro analysis",
      approach:
        "ChatGPT employs momentum-based swing trading on 4h and 1h timeframes for short-term breakouts, combined with macro analysis for long-term strategic positioning. Uses 2-5x adaptive leverage based on market conditions.",
      riskTolerance: "Moderate to High",
      typicalHolding: "4-12 hours",
      preferredAssets: "BTC, ETH, SOL",
      strengths: ["Pattern recognition", "Adaptive leverage", "Macro-aware positioning"],
      weaknesses: ["Can be overconfident in breakouts", "Sometimes holds losing positions too long"],
    },
    gemini: {
      philosophy: "Grid trading bot operating within defined price ranges",
      approach:
        "Gemini Grid deploys multiple buy/sell orders at 2% intervals, capturing profits from volatility. Optimized for ranging markets with 1-2x leverage on alt pairs.",
      riskTolerance: "Low to Moderate",
      typicalHolding: "6-18 hours",
      preferredAssets: "SAND, FLOKI",
      strengths: ["Volatility capture", "Systematic approach", "Range market expertise"],
      weaknesses: ["Struggles in trending markets", "Breakout losses possible"],
    },
    grok: {
      philosophy: "Long-term buy and hold strategy powered by sentiment analysis",
      approach:
        "Buy & Hold purchases and holds ASTER token with real-time X.com sentiment monitoring. No active trading, no stop losses, no take profits. Serves as baseline comparison for passive investment returns with AI-driven conviction monitoring.",
      riskTolerance: "High (No stops)",
      typicalHolding: "Long-term (Days/Weeks+)",
      preferredAssets: "ASTER",
      strengths: ["Sentiment-driven conviction", "Simple and predictable", "Baseline comparison"],
      weaknesses: ["No downside protection", "Vulnerable to crashes", "No risk management"],
    },
    deepseek: {
      philosophy: "Machine learning-based scalping with micro-structure analysis",
      approach:
        "DeepSeek ML analyzes order book depth, volume profile, and micro-structure patterns to predict 1-5m moves. Executes scalping trades with tight 0.5-1% profit targets using low leverage (1-2x) for high win rates.",
      riskTolerance: "Low to Moderate",
      typicalHolding: "1-5 minutes",
      preferredAssets: "BTC, ETH, SOL, BNB, DOGE",
      strengths: ["ML price prediction", "High win rate", "Micro-structure analysis"],
      weaknesses: ["Lower trade frequency", "Slippage sensitive"],
    },
  }

  const currentStrategy = strategyProfiles[agent.model] || strategyProfiles.openai

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Header />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-white border-2 border-black text-xs font-mono hover:bg-gray-100"
          >
            ← [LIVE CHART]
          </button>
          <button
            onClick={() => router.push("/leaderboard")}
            className="px-4 py-2 bg-white border-2 border-black text-xs font-mono hover:bg-gray-100"
          >
            ← [LEADERBOARD]
          </button>
        </div>

        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src={agent.logo || "/placeholder.svg"}
                alt={agent.name}
                width={64}
                height={64}
                className="rounded-full"
              />
              <div>
                <h1 className="font-bold font-mono">{agent.name}</h1>
                <div className="text-xs font-mono mt-1">
                  Total Account Value: <span className="font-bold">${agent.accountValue.toLocaleString()}</span>
                </div>
                <div className="text-xs font-mono">
                  Available Cash: <span className="font-bold">${agent.availableCash.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <Link
              href="#"
              className="text-xs font-mono text-blue-600 hover:underline border-2 border-blue-600 px-3 py-1"
            >
              VIEW WALLET
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
            <div className="text-xs font-mono mb-1">Total P&L:</div>
            <div className={`text-xs font-bold font-mono ${agent.pnl < 0 ? "text-red-600" : "text-green-600"}`}>
              ${agent.pnl.toLocaleString()}
            </div>
          </div>
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
            <div className="text-xs font-mono mb-1">Total Fees:</div>
            <div className="text-xs font-bold font-mono">${agent.totalFees.toLocaleString()}</div>
          </div>
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
            <div className="text-xs font-mono mb-1">Net Realized:</div>
            <div
              className={`text-xs font-bold font-mono ${agent.netRealized < 0 ? "text-red-600" : "text-green-600"}`}
            >
              ${agent.netRealized.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-6">
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-gray-600">Average Leverage:</span>{" "}
                <span className="font-bold">{agent.avgLeverage}</span>
              </div>
              <div>
                <span className="text-gray-600">Biggest Win:</span>{" "}
                <span className="font-bold text-green-600">${agent.biggestWin}</span>
              </div>
              <div>
                <span className="text-gray-600">Average Confidence:</span>{" "}
                <span className="font-bold">{agent.avgConfidence}%</span>
              </div>
              <div>
                <span className="text-gray-600">Biggest Loss:</span>{" "}
                <span className="font-bold text-red-600">${agent.biggestLoss}</span>
              </div>
            </div>
          </div>
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
            <div className="text-xs font-mono font-bold mb-3 text-center">WIN/LOSS TIMES</div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span>Long:</span>
                <span className="font-bold">{agent.longWinRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Short:</span>
                <span className="font-bold">{agent.shortWinRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Flat:</span>
                <span className="font-bold">{agent.flatRate}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold font-mono">ACTIVE POSITIONS</h2>
            <div className="text-xs font-mono">
              Total Unrealized P&L: <span className="font-bold">${agent.totalUnrealizedPnl}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.length === 0 ? (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-8 text-xs text-gray-500 font-mono">
                No active positions • Fetching real-time data...
              </div>
            ) : (
              positions.map((position) => (
              <div key={position.id} className="bg-[#f5f5f0] border-2 border-black p-4 relative">
                <div
                  className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    position.status === "losing"
                      ? "bg-red-100 text-red-600"
                      : position.status === "winning"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-orange-100 text-orange-600"
                  }`}
                >
                  {position.status === "losing" ? "✕" : "○"}
                </div>
                <div className="text-[10px] font-mono space-y-1">
                  <div>
                    <span className="text-gray-600">Entry Time:</span> {position.entryTime}
                  </div>
                  <div>
                    <span className="text-gray-600">Entry Price:</span> ${position.entryPrice}
                  </div>
                  <div>
                    <span className="text-gray-600">Current Price:</span> ${position.currentPrice}
                  </div>
                  <div>
                    <span className="text-gray-600">Side:</span>{" "}
                    <span className={position.side === "LONG" ? "text-green-600" : "text-red-600"}>
                      {position.side}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantity:</span> {position.quantity}
                  </div>
                  <div>
                    <span className="text-gray-600">Leverage:</span> {position.leverage}x
                  </div>
                  <div>
                    <span className="text-gray-600">Margin:</span> ${position.margin}
                  </div>
                  <div>
                    <span className="text-gray-600">Liquidation Price:</span> ${position.liquidationPrice}
                  </div>
                  <div>how
                    <span className="text-gray-600">Unrealized P&L:</span>{" "}
                    <span className={position.unrealizedPnl < 0 ? "text-red-600" : "text-green-600"}>
                      ${position.unrealizedPnl}
                    </span>
                  </div>
                  <div className="pt-2">
                    <span className="text-gray-600">Exit Plan:</span>
                  </div>
                  <div className="font-bold">VWAP</div>
                </div>
              </div>
            )))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-center text-xs font-mono font-bold mb-4">TOTAL ACCOUNT VALUE</h2>
          <div className="h-48 md:h-64 lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={agent.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={agent.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#666" style={{ fontSize: "10px", fontFamily: "Space Mono" }} />
                <YAxis
                  stroke="#666"
                  style={{ fontSize: "10px", fontFamily: "Space Mono" }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "2px solid black",
                    borderRadius: "0",
                    fontSize: "10px",
                    fontFamily: "Space Mono",
                  }}
                  formatter={(value: any) => [`$${value.toFixed(2)}`, "Account Value"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={agent.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold font-mono">STRATEGY PROFILE</h2>
            <button
              onClick={() => setShowStrategyProfile(!showStrategyProfile)}
              className="text-xs font-mono text-blue-600 hover:underline"
            >
              {showStrategyProfile ? "HIDE" : "SHOW"} DETAILS
            </button>
          </div>
          {showStrategyProfile && (
            <div className="space-y-4 text-xs font-mono">
              <div>
                <div className="font-bold mb-1">PHILOSOPHY:</div>
                <div className="text-gray-700">{currentStrategy.philosophy}</div>
              </div>
              <div>
                <div className="font-bold mb-1">APPROACH:</div>
                <div className="text-gray-700">{currentStrategy.approach}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="font-bold mb-1">RISK TOLERANCE:</div>
                  <div className="text-gray-700">{currentStrategy.riskTolerance}</div>
                </div>
                <div>
                  <div className="font-bold mb-1">TYPICAL HOLDING:</div>
                  <div className="text-gray-700">{currentStrategy.typicalHolding}</div>
                </div>
                <div>
                  <div className="font-bold mb-1">TRADING SYMBOLS</div>
                  <div className="text-gray-700">
                    {pickabooSymbols.length > 0 
                      ? (
                          <div>
                            <div className="font-semibold text-green-700 mb-1">
                              {pickabooSymbols.join(", ")}
                            </div>
                            <div className="text-xs text-gray-500">
                              {symbolsSource === 'pickaboo_config' 
                                ? "Live"
                                : symbolsSource === 'default_config'
                                ? "Using Default Config"
                                : "Config Source Unknown"
                              }
                            </div>
                          </div>
                        )
                      : (
                          <span className="text-orange-600 italic">
                            Loading symbols from Pickaboo dashboard...
                          </span>
                        )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="font-bold mb-1 text-green-600">STRENGTHS:</div>
                  <ul className="list-disc list-inside text-gray-700">
                    {currentStrategy.strengths.map((strength: string, idx: number) => (
                      <li key={idx}>{strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-bold mb-1 text-red-600">WEAKNESSES:</div>
                  <ul className="list-disc list-inside text-gray-700">
                    {currentStrategy.weaknesses.map((weakness: string, idx: number) => (
                      <li key={idx}>{weakness}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
          <h2 className="font-bold font-mono mb-4">LAST 25 TRADES</h2>
          {trades.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-500 font-mono">
              No trades available • Fetching real-time trade data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 px-2">SIDE</th>
                    <th className="text-left py-2 px-2">COIN</th>
                    <th className="text-left py-2 px-2">ENTRY PRICE</th>
                    <th className="text-left py-2 px-2">EXIT PRICE</th>
                    <th className="text-left py-2 px-2">QUANTITY</th>
                    <th className="text-left py-2 px-2">HOLDING TIME</th>
                    <th className="text-left py-2 px-2">NOTIONAL ENTRY</th>
                    <th className="text-left py-2 px-2">NOTIONAL EXIT</th>
                    <th className="text-left py-2 px-2">TOTAL FEES</th>
                    <th className="text-left py-2 px-2">NET P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, idx) => (
                  <tr
                    key={trade.id}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} cursor-pointer hover:bg-blue-50`}
                    onClick={() => setSelectedTrade(trade)}
                  >
                    <td className="py-2 px-2">
                      <span
                        className={`px-2 py-1 ${trade.side === "LONG" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                      >
                        {trade.side}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className="flex items-center gap-1">
                        <TokenIcon symbol={trade.coin} size={16} variant="branded" />
                        {trade.coin}
                      </span>
                    </td>
                    <td className="py-2 px-2">${(trade.entryPrice ?? 0).toLocaleString()}</td>
                    <td className="py-2 px-2">${(trade.exitPrice ?? 0).toLocaleString()}</td>
                    <td className="py-2 px-2">{trade.quantity ?? 0}</td>
                    <td className="py-2 px-2">{trade.holdingTime ?? "-"}</td>
                    <td className="py-2 px-2">${trade.notionalEntry?.toLocaleString() || "0"}</td>
                    <td className="py-2 px-2">${trade.notionalExit?.toLocaleString() || "0"}</td>
                    <td className="py-2 px-2">${(trade.totalFees ?? 0).toFixed(2)}</td>
                    <td className={`py-2 px-2 font-bold ${(trade.netPnl ?? 0) < 0 ? "text-red-600" : "text-green-600"}`}>
                      ${(trade.netPnl ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedTrade && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedTrade(null)}
        >
          <div
            className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-8 max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold font-mono">TRADE DETAILS</h3>
              <button
                onClick={() => setSelectedTrade(null)}
                className="text-sm font-bold hover:text-red-600"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-[11px] font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">SIDE</div>
                  <div
                    className={`text-xs font-bold ${selectedTrade.side === "LONG" ? "text-green-600" : "text-red-600"}`}
                  >
                    {selectedTrade.side}
                  </div>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">ASSET</div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    <TokenIcon symbol={selectedTrade.coin} size={16} variant="branded" />
                    {selectedTrade.coin}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">ENTRY PRICE</div>
                  <div className="text-xs font-bold">${(selectedTrade.entryPrice ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">EXIT PRICE</div>
                  <div className="text-xs font-bold">${(selectedTrade.exitPrice ?? 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">QUANTITY</div>
                  <div className="font-bold">{selectedTrade.quantity ?? 0}</div>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">HOLDING TIME</div>
                  <div className="font-bold">{selectedTrade.holdingTime ?? "-"}</div>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">TOTAL FEES</div>
                  <div className="font-bold">${(selectedTrade.totalFees ?? 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">NOTIONAL ENTRY</div>
                  <div className="font-bold">${(selectedTrade.notionalEntry ?? 0).toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">NOTIONAL EXIT</div>
                  <div className="font-bold">${(selectedTrade.notionalExit ?? 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-gray-50 border-2 border-black p-4">
                <div className="text-xs text-gray-600 mb-1">NET P&L</div>
                <div className={`text-xs font-bold ${(selectedTrade.netPnl ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {(selectedTrade.netPnl ?? 0) >= 0 ? "+" : ""}${(selectedTrade.netPnl ?? 0).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Return: {(((selectedTrade.netPnl ?? 0) / (selectedTrade.notionalEntry ?? 1)) * 100).toFixed(2)}%
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-600 p-4">
                <div className="text-xs font-bold mb-2">TRADE REASONING (SIMULATED)</div>
                <div className="text-xs text-gray-700">
                  {selectedTrade.side === "LONG"
                    ? `Identified bullish momentum on ${selectedTrade.coin} with strong support levels. Technical indicators showed oversold conditions with positive divergence. Entry executed at favorable risk-reward ratio.`
                    : `Detected bearish pressure on ${selectedTrade.coin} with resistance rejection. Market structure suggested downside continuation. Positioned for mean reversion with tight stop loss.`}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedTrade(null)}
                className="px-6 py-2 bg-black text-white font-mono text-sm hover:bg-gray-800"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
