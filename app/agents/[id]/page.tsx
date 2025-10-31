"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { TokenIcon } from "@/components/token-icon"
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts"

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

      // Fetch live trades for the agent (25 trades instead of 20)
      // Show all trades, including breakeven trades (realizedPnl === 0)
      fetch(`/api/aster/trades?agentId=${params.id}&limit=25`)
        .then((res) => res.json())
        .then((asterTrades) => {
          const trades: Trade[] = asterTrades
            // Show ALL trades, not just profitable ones
            .map((t: any) => ({
              id: t.id,
              side: t.side === "BUY" ? "LONG" : "SHORT",
              coin: t.symbol.replace("USDT", ""),
              coinIcon: "📊",
              entryPrice: t.price,
              exitPrice: t.price,
              quantity: t.qty,
              holdingTime: "N/A",
              notionalEntry: t.price * t.qty,
              notionalExit: t.price * t.qty,
              totalFees: t.commission,
              netPnl: t.realizedPnl,
            }))
          setTrades(trades)
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
          }
        })
        .catch((err) => {
          console.debug("Failed to fetch Pickaboo trading symbols:", err)
          // Keep empty array if API fails
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

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="text-xs font-mono">Loading model info just a min buddy...</div>
      </div>
    )
  }

  const strategyProfiles: Record<string, any> = {
    gpt5: {
      philosophy: "Adaptive momentum trading with dynamic risk management",
      approach:
        "GPT-5 employs a multi-timeframe analysis approach, combining technical indicators with sentiment analysis. The model focuses on identifying high-probability setups with favorable risk-reward ratios.",
      riskTolerance: "Moderate to High",
      typicalHolding: "4-12 hours",
      preferredAssets: "BTC, ETH, high-volume altcoins",
      strengths: ["Pattern recognition", "Rapid adaptation", "Complex scenario analysis"],
      weaknesses: ["Can be overconfident", "Sometimes holds losing positions too long"],
    },
    claude: {
      philosophy: "Conservative value-based trading with strong risk controls",
      approach:
        "Claude Sonnet focuses on fundamental analysis combined with technical confirmation. Emphasizes capital preservation and consistent small gains over aggressive profit-seeking.",
      riskTolerance: "Low to Moderate",
      typicalHolding: "2-6 hours",
      preferredAssets: "BTC, ETH, established coins",
      strengths: ["Risk management", "Logical decision-making", "Consistent performance"],
      weaknesses: ["May miss high-volatility opportunities", "Conservative position sizing"],
    },
    gemini: {
      philosophy: "Multi-modal analysis with correlation-based strategies",
      approach:
        "Gemini Pro leverages its multi-modal capabilities to analyze market data from multiple perspectives. Focuses on inter-asset correlations and market structure.",
      riskTolerance: "Moderate",
      typicalHolding: "6-18 hours",
      preferredAssets: "Diversified across major cryptocurrencies",
      strengths: ["Comprehensive analysis", "Cross-asset insights", "Adaptive strategies"],
      weaknesses: ["Can be slow to react", "Sometimes over-analyzes"],
    },
    grok: {
      philosophy: "Real-time data-driven aggressive trading",
      approach:
        "Grok 4 utilizes real-time market data and news sentiment to make rapid trading decisions. Focuses on capturing short-term momentum and volatility.",
      riskTolerance: "High",
      typicalHolding: "1-4 hours",
      preferredAssets: "High-volatility assets, trending coins",
      strengths: ["Real-time adaptation", "Quick execution", "Volatility capture"],
      weaknesses: ["Higher drawdowns", "Can be whipsawed in choppy markets"],
    },
    deepseek: {
      philosophy: "Pattern-based systematic trading with high conviction",
      approach:
        "DeepSeek employs advanced pattern recognition to identify high-probability setups. Uses systematic rules with occasional discretionary overrides for exceptional opportunities.",
      riskTolerance: "Moderate to High",
      typicalHolding: "12-48 hours",
      preferredAssets: "BTC, ETH, SOL",
      strengths: ["Pattern recognition", "Systematic approach", "High win rate on setups"],
      weaknesses: ["Lower trade frequency", "Can miss fast-moving opportunities"],
    },
    qwen: {
      philosophy: "Mathematical optimization with quantitative strategies",
      approach:
        "Qwen Max applies advanced mathematical models and quantitative analysis to identify market inefficiencies. Focuses on statistical edges and probability-based decision-making.",
      riskTolerance: "Moderate",
      typicalHolding: "6-12 hours",
      preferredAssets: "Liquid major cryptocurrencies",
      strengths: ["Quantitative rigor", "Statistical edge", "Consistent methodology"],
      weaknesses: ["May underperform in irrational markets", "Requires sufficient liquidity"],
    },
  }

  const currentStrategy = strategyProfiles[agent.id] || strategyProfiles.gpt5

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

        <div className="grid grid-cols-3 gap-6 mb-6">
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

        <div className="grid grid-cols-[2fr_1fr] gap-6 mb-6">
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
          <div className="grid grid-cols-3 gap-4">
            {positions.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-xs text-gray-500 font-mono">
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
                  <div>
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

        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold font-mono">30-DAY PERFORMANCE</h2>
            <div className="text-xs font-mono">
              Total Return:{" "}
              <span className={`font-bold ${agent.roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                {agent.roi >= 0 ? "+" : ""}
                {agent.roi.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={agent.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={agent.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="font-bold mb-1">RISK TOLERANCE:</div>
                  <div className="text-gray-700">{currentStrategy.riskTolerance}</div>
                </div>
                <div>
                  <div className="font-bold mb-1">TYPICAL HOLDING:</div>
                  <div className="text-gray-700">{currentStrategy.typicalHolding}</div>
                </div>
                <div>
                  <div className="font-bold mb-1">PREFERRED ASSETS:</div>
                  <div className="text-gray-700">
                    {pickabooSymbols.length > 0 
                      ? pickabooSymbols.join(", ") 
                      : currentStrategy.preferredAssets}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    <td className="py-2 px-2">${trade.entryPrice.toLocaleString()}</td>
                    <td className="py-2 px-2">${trade.exitPrice.toLocaleString()}</td>
                    <td className="py-2 px-2">{trade.quantity}</td>
                    <td className="py-2 px-2">{trade.holdingTime}</td>
                    <td className="py-2 px-2">${trade.notionalEntry.toLocaleString()}</td>
                    <td className="py-2 px-2">${trade.notionalExit.toLocaleString()}</td>
                    <td className="py-2 px-2">${trade.totalFees.toFixed(2)}</td>
                    <td className={`py-2 px-2 font-bold ${trade.netPnl < 0 ? "text-red-600" : "text-green-600"}`}>
                      ${trade.netPnl.toFixed(2)}
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
            className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-2xl w-full mx-4"
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
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">ENTRY PRICE</div>
                  <div className="text-xs font-bold">${selectedTrade.entryPrice.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">EXIT PRICE</div>
                  <div className="text-xs font-bold">${selectedTrade.exitPrice.toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">QUANTITY</div>
                  <div className="font-bold">{selectedTrade.quantity}</div>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">HOLDING TIME</div>
                  <div className="font-bold">{selectedTrade.holdingTime}</div>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">TOTAL FEES</div>
                  <div className="font-bold">${selectedTrade.totalFees.toFixed(2)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">NOTIONAL ENTRY</div>
                  <div className="font-bold">${selectedTrade.notionalEntry.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 border-2 border-black p-4">
                  <div className="text-xs text-gray-600 mb-1">NOTIONAL EXIT</div>
                  <div className="font-bold">${selectedTrade.notionalExit.toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-gray-50 border-2 border-black p-4">
                <div className="text-xs text-gray-600 mb-1">NET P&L</div>
                <div className={`text-xs font-bold ${selectedTrade.netPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {selectedTrade.netPnl >= 0 ? "+" : ""}${selectedTrade.netPnl.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Return: {((selectedTrade.netPnl / selectedTrade.notionalEntry) * 100).toFixed(2)}%
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
