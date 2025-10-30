"use client"

import { useEffect, useState } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, TooltipProps } from "recharts"
import Image from "next/image"
import { Header } from "@/components/header"
import { TokenActivation } from "@/components/token-activation"
import { TokenIcon } from "@/components/token-icon"
import { LiveTradeTicker } from "@/components/live-trade-ticker"
import { ModelChatView } from "@/components/model-chat-view"

interface Agent {
  id: string
  name: string
  model: string
  pnl: number
  roi: number
  status: "active" | "idle"
  trades: number
  color: string
  logo?: string
  accountValue?: number
  availableCash?: number
  isThinking?: boolean
  thinkingMessage?: string
}

interface Position {
  side: "LONG" | "SHORT"
  coin: string
  leverage: string
  notional: number
  exitPlan: string
  unrealizedPnl: number
}

// Helper function to generate consistent colors for agents
const generateColorForAgent = (agentId: string): string => {
  const colors: Record<string, string> = {
    claude_arbitrage: "#A0826D",        // Dark beige
    chatgpt_openai: "#C9B1E0",          // Light purple
    gemini_grid: "#9CAF88",             // Sage green
    deepseek_ml: "#1E90FF",             // Blue
    buy_and_hold: "#000000",            // Black (Grok/xAI)
    "grok-4": "#000000",
    "qwen3-max": "#9370DB",
  }
  return colors[agentId] || "#999999"
}

// Helper function to get agent emoji badge
const getAgentEmoji = (agentId: string): string => {
  const emojis: Record<string, string> = {
    claude_arbitrage: "🎲",             // Arbitrage
    chatgpt_openai: "📈",               // Momentum
    gemini_grid: "📊",                  // Grid
    deepseek_ml: "🤖",                  // ML
    buy_and_hold: "🤖",                 // Grok (also AI)
  }
  return emojis[agentId] || "⚙️"
}

// Custom per-line tooltip that shows only hovered agent's balance
const CustomTooltip = (props: any) => {
  const { active, payload, agents } = props
  if (!active || !payload || payload.length === 0) return null

  // Get the dataKey of the first (and only visible) payload
  const dataKey = payload[0]?.dataKey as string
  
  // Find the agent with matching ID
  const agent = agents.find((a: Agent) => a.id === dataKey)
  
  if (!agent) return null

  const value = payload[0]?.value

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "2px solid black",
        borderRadius: "0",
        padding: "8px 12px",
        fontSize: "10px",
        fontFamily: "Space Mono",
      }}
    >
      <div style={{ color: agent.color, fontWeight: "bold", marginBottom: "4px" }}>
        {agent.name}
      </div>
      <div style={{ color: "#000" }}>
        Balance: ${(value as number)?.toLocaleString()}
      </div>
    </div>
  )
}

interface MarketPrices {
  BTC: number
  ETH: number
  SOL: number
  BNB: number
  DOGE: number
  ASTER: number
  timestamp: string
  source: "binance" | "cached"
}

// Helper function to determine time range and format accordingly
const getTimeRangeInfo = (data: any[]): { rangeMs: number; formatType: "time" | "date" } => {
  if (!data || data.length < 2) {
    return { rangeMs: 0, formatType: "time" }
  }

  try {
    const firstTime = new Date(data[0].time).getTime()
    const lastTime = new Date(data[data.length - 1].time).getTime()
    const rangeMs = lastTime - firstTime

    // Determine format based on time range
    const hours = rangeMs / (1000 * 60 * 60)

    if (hours <= 24) {
      return { rangeMs, formatType: "time" } // HH:MM format for ≤24h
    } else {
      return { rangeMs, formatType: "date" } // Mon DD format for >24h
    }
  } catch {
    return { rangeMs: 0, formatType: "time" }
  }
}

// Helper to format time based on range
const formatXAxisTime = (value: string, formatType: "time" | "date"): string => {
  if (!value) return ""
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return value
    }

    if (formatType === "time") {
      // HH:MM format for live/short periods
      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      return `${hours}:${minutes}`
    } else {
      // Mon DD format for longer periods
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      const day = dayNames[date.getDay()]
      const dateNum = String(date.getDate()).padStart(2, "0")
      return `${day} ${dateNum}`
    }
  } catch {
    return value
  }
}

// Watermark component with bottom and center watermarks
const ChartWatermark = () => {
  return (
    <>
      {/* Large watermark in center of chart */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-15 pointer-events-none z-5">
        <svg width="300" height="120" viewBox="0 0 300 120">
          <text
            x="150"
            y="60"
            textAnchor="middle"
            fontSize="60"
            fontWeight="bold"
            fill="#999"
            fontFamily="monospace"
            letterSpacing="3"
          >
            BNBForge
          </text>
        </svg>
      </div>
      
      {/* Small watermark at base of horizontal axis */}
      <div className="absolute bottom-2 right-4 opacity-35 pointer-events-none z-10">
        <svg width="110" height="25" viewBox="0 0 110 25">
          <text
            x="55"
            y="14"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#666"
            fontFamily="monospace"
          >
            BNBForge
          </text>
        </svg>
      </div>
    </>
  )
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"COMPLETED TRADES" | "MODELCHAT" | "POSITIONS" | "README.TXT">("POSITIONS")
  const [selectedFilter, setSelectedFilter] = useState("ALL MODELS")
  const [timePeriod, setTimePeriod] = useState<"ALL" | "72H" | "24H" | "7D" | "30D">("ALL")
  const [allChartData, setAllChartData] = useState<any[]>([])
  const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({})
  const [livePositions, setLivePositions] = useState<Record<string, any[]>>({})
  const [liveTrades, setLiveTrades] = useState<any[]>([])
  const [showPercentage, setShowPercentage] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [marketPrices, setMarketPrices] = useState<MarketPrices | null>(null)
  const [priceLoadingError, setPriceLoadingError] = useState<string | null>(null)
  const [thinkingAgents, setThinkingAgents] = useState<Set<string>>(new Set())
  const [agentPnlHistory, setAgentPnlHistory] = useState<Record<string, number[]>>({})
  const [xAxisFormatType, setXAxisFormatType] = useState<"time" | "date">("time")
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [previousMessageCount, setPreviousMessageCount] = useState(0)

  useEffect(() => {
    // Fetch real agents data
    fetch("/api/aster/agents-data")
      .then((res) => res.json())
      .then((data) => {
        if (data.agents) {
          const agentsData = data.agents.map((a: any) => ({
            id: a.id,
            name: a.name,
            model: a.model,
            pnl: a.pnl,
            roi: a.roi,
            status: a.roi > 0 ? "active" : "idle",
            trades: 0,
            color: generateColorForAgent(a.id),
            logo: a.logo || a.logo_url || "/placeholder.svg",
            accountValue: a.account_value,
            availableCash: a.total_balance,
            isThinking: false,
            thinkingMessage: "",
          }))
          setAgents(agentsData)

          // Initialize chats and PnL history for each agent
          const initialChats: Record<string, any[]> = {}
          const initialPnlHistory: Record<string, number[]> = {}
          agentsData.forEach((agent: Agent) => {
            initialChats[agent.id] = []
            initialPnlHistory[agent.id] = [agent.pnl || 0]
          })
          setChatMessages(initialChats)
          setAgentPnlHistory(initialPnlHistory)
        }
      })
      .catch((err) => {
        console.error("Failed to fetch agents data:", err)
        // Fall back to mock data on error
        fetch("/api/mock/agents")
          .then((res) => res.json())
          .then((data) => {
            setAgents(data)
            const initialChats: Record<string, any[]> = {}
            data.forEach((agent: Agent) => {
              initialChats[agent.id] = []
            })
            setChatMessages(initialChats)
          })
      })

    // Fetch real market prices
    fetch("/api/market/prices")
      .then((res) => res.json())
      .then((data) => {
        if (data.BTC) {
          setMarketPrices(data)
          setPriceLoadingError(null)
        } else {
          setPriceLoadingError(data.error || "Failed to load prices")
        }
      })
      .catch((err) => {
        console.error("Failed to fetch market prices:", err)
        setPriceLoadingError("Using cached prices")
      })

    // Fetch real account history data for chart (starting from $50 baseline)
    fetch("/api/aster/account-history")
      .then((res) => res.json())
      .then((data) => {
        setAllChartData(data)
        setChartData(data)
      })
      .catch((err) => {
        console.error("Failed to fetch account history:", err)
        // Fall back to mock data if real fetch fails
        fetch("/api/mock/trades")
          .then((res) => res.json())
          .then((data) => {
            setAllChartData(data)
            setChartData(data)
          })
      })

    // Fetch positions and trades for each agent
    const fetchLiveData = async () => {
      if (agents.length === 0) return

      const positionsMap: Record<string, any[]> = {}
      const trades: any[] = []

      for (const agent of agents) {
        try {
          // Fetch positions
          const posRes = await fetch(`/api/aster/positions?agentId=${agent.id}`)
          if (posRes.ok) {
            const positions = await posRes.json()
            
            // Fetch exit plans for this agent
            const exitPlansRes = await fetch(`/api/aster/exit-plans?agentId=${agent.id}`)
            const exitPlans = exitPlansRes.ok ? await exitPlansRes.json() : []
            
            // Create a map of exit plans by symbol and side for quick lookup
            const exitPlanMap: Record<string, any> = {}
            exitPlans.forEach((plan: any) => {
              const key = `${plan.symbol}:${plan.side}`
              exitPlanMap[key] = plan
            })
            
            // Convert AsterPosition to our format with real exit plans
            positionsMap[agent.id] = positions
              .filter((p: any) => p.positionAmt !== 0)
              .map((p: any) => {
                const side = p.positionAmt > 0 ? "LONG" : "SHORT"
                const planKey = `${p.symbol}:${side}`
                const exitPlan = exitPlanMap[planKey]
                
                // Format exit plan display: "TP: $X.XX / SL: $X.XX"
                let exitPlanDisplay = "VIEW"
                if (exitPlan) {
                  const tp = exitPlan.take_profit || exitPlan.takeProfit || 0
                  const sl = exitPlan.stop_loss || exitPlan.stopLoss || 0
                  if (tp > 0 && sl > 0) {
                    exitPlanDisplay = `TP: $${tp.toFixed(2)} / SL: $${sl.toFixed(2)}`
                  } else if (tp > 0) {
                    exitPlanDisplay = `TP: $${tp.toFixed(2)}`
                  } else if (sl > 0) {
                    exitPlanDisplay = `SL: $${sl.toFixed(2)}`
                  }
                }
                
                return {
                  side,
                  coin: p.symbol.replace("USDT", ""),
                  leverage: `${p.leverage}X`,
                  notional: Math.abs(p.positionAmt * p.markPrice),
                  exitPlan: exitPlanDisplay,
                  unrealizedPnl: p.unrealizedProfit,
                  // Include raw values for hover tooltips if needed
                  _exitPlanData: exitPlan,
                }
              })
          }

          // Fetch trades
          const tradesRes = await fetch(`/api/aster/trades?agentId=${agent.id}&limit=5`)
          if (tradesRes.ok) {
            const agentTrades = await tradesRes.json()
            trades.push(
              ...agentTrades.slice(0, 2).map((t: any) => ({
                agentId: agent.id,
                agentName: agent.name,
                agentLogo: agent.logo,
                side: t.side === "BUY" ? "LONG" : "SHORT",
                symbol: t.symbol,
                price: t.price,
                qty: t.qty,
                pnl: t.realizedPnl,
              }))
            )
          }
        } catch (error) {
          console.debug(`Failed to fetch live data for ${agent.id}:`, error)
        }
      }

      setLivePositions(positionsMap)
      setLiveTrades(trades)
    }

    fetchLiveData()

    // Refresh chart data every 5 minutes with real account history from Aster
    const refreshChartData = async () => {
      try {
        const response = await fetch("/api/aster/account-history")
        const data = await response.json()
        setAllChartData(data)
        setChartData(data)
        console.debug("[Dashboard] Updated chart data with real account history")
      } catch (error) {
        console.error("Failed to refresh account history:", error)
      }
    }

    const chartRefreshInterval = setInterval(refreshChartData, 5 * 60 * 1000) // 5 minutes

    const interval = setInterval(() => {
      fetchLiveData()

      // Update agent thinking state and PnL history
      setAgents((prevAgents) => {
        return prevAgents.map((agent) => ({
          ...agent,
          isThinking: Math.random() > 0.6,
          thinkingMessage: [
            "Analyzing market data...",
            "Evaluating entry signals...",
            "Calculating risk metrics...",
            "Processing order book...",
            "Optimizing portfolio...",
          ][Math.floor(Math.random() * 5)],
        }))
      })

      // Update PnL history for sparklines
      setAgents((prevAgents) => {
        setAgentPnlHistory((prevHistory) => {
          const newHistory = { ...prevHistory }
          prevAgents.forEach((agent) => {
            if (!newHistory[agent.id]) {
              newHistory[agent.id] = [agent.pnl || 0]
            } else {
              // Keep last 20 values for sparkline
              newHistory[agent.id] = [...newHistory[agent.id], agent.pnl || 0].slice(-20)
            }
          })
          return newHistory
        })
        return prevAgents
      })

      // NOTE: Real-time chat messages now fetched from API in the chat generation effect below
      // Removed mock message simulation - using actual agent reasoning from real LLM APIs with trading symbol from Pickaboo
    }, 10000)

    return () => {
      clearInterval(interval)
      clearInterval(chartRefreshInterval)
    }
  }, [])

  // Chat generation effect - runs every 60 seconds to generate agent responses with real trading symbol
  useEffect(() => {
    const generateChat = async () => {
      try {
        // Generate new chat messages
        // Note: Trading symbol is automatically fetched from Pickaboo dashboard in the API
        const generateRes = await fetch("/api/chat/generate", { method: "POST" })
        const generateData = await generateRes.json()
        
        if (generateData.success) {
          console.debug(`[Dashboard] Generated ${generateData.messages?.length || 0} agent messages for current trading symbol`)
        }

        // Fetch latest messages (now synced with real trading symbol from Pickaboo)
        // Request 30 messages - API enforces this limit
        const response = await fetch("/api/chat/messages?limit=30")
        const data = await response.json()

        if (data.success && data.messages) {
          // Organize messages by agent
          const messagesByAgent: Record<string, any[]> = {}
          data.messages.forEach((msg: any) => {
            if (!messagesByAgent[msg.agentId]) {
              messagesByAgent[msg.agentId] = []
            }
            messagesByAgent[msg.agentId].push(msg)
          })

          // API already limits to 30 messages, but ensure per-agent limit
          Object.keys(messagesByAgent).forEach((agentId) => {
            messagesByAgent[agentId] = messagesByAgent[agentId].slice(0, 30)
          })

          // Calculate new messages
          if (previousMessageCount > 0 && data.messages.length > previousMessageCount) {
            const newCount = data.messages.length - previousMessageCount
            setNewMessageCount(newCount)
          }
          
          setPreviousMessageCount(data.messages.length)
          setChatMessages(messagesByAgent)
          console.debug(`[Dashboard] Loaded ${data.messages.length} real-time agent messages (max 30) for current trading symbol`)
        }
      } catch (error) {
        console.error("Failed to generate/fetch chat messages:", error)
      }
    }

    // Generate immediately on first load
    generateChat()

    // Then generate every 5 minutes (trades are analyzed in real-time by agents on the backend)
    const chatInterval = setInterval(generateChat, 300000)

    return () => clearInterval(chatInterval)
  }, [])

  useEffect(() => {
    if (timePeriod === "ALL") {
      setChartData(allChartData)
    } else {
      const now = new Date()
      let cutoffTime: Date

      switch (timePeriod) {
        case "24H":
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case "72H":
          cutoffTime = new Date(now.getTime() - 72 * 60 * 60 * 1000)
          break
        case "7D":
          cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "30D":
          cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          cutoffTime = new Date(0)
      }

      const filtered = allChartData.filter((point) => {
        const pointTime = new Date(point.time)
        return pointTime >= cutoffTime
      })
      setChartData(filtered)
    }
  }, [timePeriod, allChartData])

  // Update X-axis format type based on chart data range
  useEffect(() => {
    const { formatType } = getTimeRangeInfo(chartData)
    setXAxisFormatType(formatType)
  }, [chartData])

  // Auto-refresh market prices every 30 seconds (matching cache TTL)
  useEffect(() => {
    const refreshPrices = async () => {
      try {
        const response = await fetch("/api/market/prices")
        const data = await response.json()
        if (data.BTC) {
          setMarketPrices(data)
          setPriceLoadingError(null)
        } else {
          setPriceLoadingError(data.error || "Failed to load prices")
        }
      } catch (error) {
        console.error("Error refreshing market prices:", error)
      }
    }

    // Refresh immediately if not loaded yet
    if (!marketPrices) {
      refreshPrices()
    }

    // Set up auto-refresh interval
    const interval = setInterval(refreshPrices, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [marketPrices])

  const renderEndDot = (agentId: string, color: string, logo?: string) => {
    return (props: any) => {
      const { cx, cy, index, payload } = props
      const isLastPoint = index === chartData.length - 1

      if (!isLastPoint) return <g key={`dot-${agentId}-${index}`} />

      const value = payload[agentId]

      return (
        <g key={`endpoint-${agentId}`} style={{ animation: "fadeSlideIn 0.6s ease-out forwards" }}>
          {/* Pulsing glow/heartbeat effect around endpoint */}
          <circle 
            cx={cx} 
            cy={cy} 
            r={20} 
            fill="none" 
            stroke={color} 
            strokeWidth={1} 
            opacity={0.3}
            style={{ animation: "endpoint-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
          />
          
          {/* Main node circle */}
          <circle cx={cx} cy={cy} r={16} fill="white" stroke={color} strokeWidth={2.5} />
          
          {/* Agent logo inside circle */}
          {logo && (
            <g key={`logo-${agentId}`}>
              <defs>
                <clipPath id={`clip-${agentId}`}>
                  <circle cx={cx} cy={cy} r={12} />
                </clipPath>
              </defs>
              <image 
                href={logo} 
                x={cx - 12} 
                y={cy - 12} 
                width={24} 
                height={24} 
                clipPath={`url(#clip-${agentId})`}
              />
            </g>
          )}
          
          {/* Balance badge above node */}
          <g key={`badge-${agentId}`}>
            <rect 
              x={cx - 45} 
              y={cy - 35} 
              width={90} 
              height={24} 
              fill={color} 
              stroke="white" 
              strokeWidth={1.5} 
              rx={4}
            />
            <text 
              x={cx} 
              y={cy - 16} 
              textAnchor="middle" 
              fill="white" 
              fontSize="11" 
              fontWeight="bold"
              fontFamily="Space Mono"
            >
              ${value?.toLocaleString()}
            </text>
          </g>
        </g>
      )
    }
  }

  // Use live positions if available, fallback to empty
  const mockPositions = livePositions

  const filteredPositions =
    selectedFilter === "ALL MODELS"
      ? Object.entries(mockPositions).flatMap(([agentId, positions]) =>
          positions.map((p) => ({ ...p, agentId, agentName: agents.find((a) => a.id === agentId)?.name || agentId })),
        )
      : mockPositions[selectedFilter] || []

  const highestAgent = agents.reduce(
    (max, agent) => ((agent.roi || 0) > (max.roi || 0) ? agent : max),
    agents[0] || {},
  )

  const lowestAgent = agents.reduce(
    (min, agent) => {
      // Ensure lowest agent is never the same as highest agent
      if (agent.id === highestAgent.id) return min
      return ((agent.roi || 0) < (min.roi || 0) ? agent : min)
    },
    agents.find((a) => a.id !== highestAgent.id) || agents[1] || {},
  )

  // Calculate total unrealized profit for each agent
  const getAgentUnrealizedProfit = (agentId: string): number => {
    const agentPositions = livePositions[agentId] || []
    return agentPositions.reduce((total, pos) => total + (pos.unrealizedPnl || 0), 0)
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex-shrink-0">
        <div className="flex-shrink-0">
        <Header />
      </div>
      </div>

      <div className="border-b-2 border-border bg-background px-4 md:px-6 py-2 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-4 md:justify-between text-xs font-mono min-w-max">
          {marketPrices ? (
            [
              { symbol: "BTC", price: marketPrices.BTC },
              { symbol: "ETH", price: marketPrices.ETH },
              { symbol: "SOL", price: marketPrices.SOL },
              { symbol: "BNB", price: marketPrices.BNB },
              { symbol: "DOGE", price: marketPrices.DOGE },
              { symbol: "ASTER", price: marketPrices.ASTER },
            ].map((crypto) => (
              <div key={crypto.symbol} className="flex items-center gap-2">
                {crypto.symbol === "ASTER" ? (
                  <Image src="/aster-icon.png" alt="ASTER" width={20} height={20} className="rounded-full" />
                ) : (
                  <TokenIcon symbol={crypto.symbol} size={20} variant="branded" />
                )}
                <span className="font-bold">{crypto.symbol}</span>
                <span>${crypto.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">
              {priceLoadingError ? `⚠ ${priceLoadingError}` : "Loading market prices..."}
            </div>
          )}
        </div>
      </div>

      <div className="border-b-2 border-border bg-background px-4 md:px-6 py-2 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-4 md:justify-between text-xs font-mono min-w-max">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">HIGHEST:</span>
            {highestAgent?.logo && (
              <Image
                src={highestAgent.logo || "/placeholder.svg"}
                alt={highestAgent.name || ""}
                width={16}
                height={16}
                className="rounded-full"
              />
            )}
            <span className="font-bold">{highestAgent?.name?.split(" ")[0]?.toUpperCase()}</span>
            <span className="font-bold">${(highestAgent?.accountValue || 0).toLocaleString()}</span>
            <span className={highestAgent?.roi && highestAgent.roi >= 0 ? "text-green-600" : "text-red-600"}>
              {highestAgent?.roi ? `${highestAgent.roi > 0 ? "+" : ""}${highestAgent.roi.toFixed(2)}%` : "0%"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">LOWEST:</span>
            {lowestAgent?.logo && (
              <Image
                src={lowestAgent.logo || "/placeholder.svg"}
                alt={lowestAgent.name || ""}
                width={16}
                height={16}
                className="rounded-full"
              />
            )}
            <span className="font-bold">{lowestAgent?.name?.split(" ")[0]?.toUpperCase()}</span>
            <span className="font-bold">${(lowestAgent?.accountValue || 0).toLocaleString()}</span>
            <span className={lowestAgent?.roi && lowestAgent.roi >= 0 ? "text-green-600" : "text-red-600"}>
              {lowestAgent?.roi ? `${lowestAgent.roi > 0 ? "+" : ""}${lowestAgent.roi.toFixed(2)}%` : "0%"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 p-4 md:p-6 flex flex-col min-h-0 overflow-hidden">
          <div className="border-2 border-border bg-background mb-4 md:mb-6 flex-1 min-h-0 flex flex-col relative">
            <ChartWatermark />
            <div className="border-b-2 border-border px-3 md:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0">
              <h2 className="text-xs font-bold font-mono">
                {selectedAgent ? `${agents.find((a) => a.id === selectedAgent)?.name || "AGENT"} PERFORMANCE` : "TOTAL ACCOUNT VALUE"}
              </h2>
              <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                {selectedAgent && (
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="px-2 md:px-3 py-1 text-[10px] md:text-xs font-mono border-2 border-border bg-muted hover:bg-foreground hover:text-background transition-colors"
                  >
                    BACK TO ALL
                  </button>
                )}
                {(["ALL", "72H", "24H", "7D", "30D"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-mono border-2 border-border ${
                      timePeriod === period ? "bg-foreground text-background" : "hover:bg-muted"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2 md:p-4 flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#666"
                      style={{ fontSize: "10px", fontFamily: "Space Mono" }}
                      tickLine={false}
                      tickFormatter={(value) => formatXAxisTime(value, xAxisFormatType)}
                    />
                    <YAxis
                      stroke="#666"
                      style={{ fontSize: "10px", fontFamily: "Space Mono" }}
                      tickLine={false}
                      domain={[0, "dataMax + 100"]}
                      ticks={[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255]}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      content={(props) => <CustomTooltip {...props} agents={agents} />}
                      cursor={{ strokeDasharray: "3 3", stroke: "#666" }}
                    />
                    {agents.map((agent) => {
                      // Only show selected agent if one is selected, otherwise show all
                      if (selectedAgent && agent.id !== selectedAgent) {
                        return null
                      }
                      return (
                        <Line
                          key={agent.id}
                          type="natural"
                          dataKey={agent.id}
                          stroke={agent.color}
                          strokeWidth={selectedAgent ? 1.25 : 0.75}
                          dot={renderEndDot(agent.id, agent.color, agent.logo)}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="border-b-2 border-border px-3 md:px-4 py-2 flex items-center justify-end gap-2 flex-shrink-0 bg-background">
            <button
              onClick={() => setShowPercentage(false)}
              className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-mono border-2 border-border ${
                !showPercentage ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              $
            </button>
            <button
              onClick={() => setShowPercentage(true)}
              className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-mono border-2 border-border ${
                showPercentage ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              %
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 md:gap-4 p-2 md:p-4 bg-background flex-shrink-0 border-b-2 border-border">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                className={`border-2 cursor-pointer transition-all duration-200 p-2 md:p-3 flex flex-col items-center justify-center ${
                  selectedAgent === agent.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:border-foreground"
                }`}
              >
                <div className="flex items-center gap-1 mb-2 justify-center">
                  {agent.logo && (
                    <div className="w-4 h-4 relative flex-shrink-0">
                      <Image
                        src={agent.logo || "/placeholder.svg"}
                        alt={agent.name}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                    </div>
                  )}
                  <span className="text-[9px] md:text-[10px] font-mono font-bold text-center truncate">{agent.name}</span>
                  {agent.id === 'buy_and_hold' && agent.logo && (
                    <Image
                      src={agent.logo}
                      alt="Grok"
                      width={12}
                      height={12}
                      className="rounded-full"
                      title="Powered by Grok"
                    />
                  )}
                </div>
                <div className="text-xs font-bold font-mono text-center">
                  {showPercentage ? `${agent.roi > 0 ? '+' : ''}${agent.roi.toFixed(2)}%` : `$${(agent.accountValue || 0).toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-[400px] border-t-2 lg:border-t-0 lg:border-l-2 border-border bg-background flex flex-col min-h-0">
          <div className="flex border-b-2 border-border overflow-x-auto flex-shrink-0">
            {(["COMPLETED TRADES", "MODELCHAT", "POSITIONS", "README.TXT"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-2 md:px-3 py-2 text-[9px] md:text-[10px] font-mono font-bold border-r-2 border-border last:border-r-0 ${
                  activeTab === tab ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-3 md:p-4 min-h-0">
            {activeTab === "POSITIONS" && (
              <div className="space-y-4">
                <div className="border-2 border-border p-2">
                  <label className="text-[10px] font-mono font-bold mb-1 block">FILTER:</label>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="w-full text-[10px] font-mono border-2 border-border p-1 bg-background"
                  >
                    <option>ALL MODELS</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedFilter === "ALL MODELS" ? (
                  agents.map((agent) => {
                    const positions = mockPositions[agent.id] || []
                    if (positions.length === 0) return null

                    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0)
                    const availableCash = agent.availableCash || 0

                    return (
                      <div key={agent.id} className="border-2 border-border mb-4">
                        <div className="border-b-2 border-border p-2 bg-muted">
                          <div className="flex items-center gap-2 mb-1">
                            {agent.logo && (
                              <Image
                                src={agent.logo || "/placeholder.svg"}
                                alt={agent.name}
                                width={16}
                                height={16}
                                className="rounded-full"
                              />
                            )}
                            <span className="text-[10px] font-mono font-bold">{agent.name.toUpperCase()}</span>
                            {agent.id === 'buy_and_hold' && agent.logo && (
                              <Image
                                src={agent.logo}
                                alt="Grok"
                                width={14}
                                height={14}
                                className="rounded-full"
                                title="Powered by Grok"
                              />
                            )}
                          </div>
                          <div className="text-[10px] font-mono">
                            TOTAL UNREALIZED P&L:{" "}
                            <span className={totalUnrealizedPnl >= 0 ? "text-green-600" : "text-red-600"}>
                              ${totalUnrealizedPnl.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="p-2">
                          <table className="w-full text-[9px] font-mono">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left pb-1">SIDE</th>
                                <th className="text-left pb-1">COIN</th>
                                <th className="text-left pb-1">LEVERAGE</th>
                                <th className="text-right pb-1">NOTIONAL</th>
                                <th className="text-center pb-1">EXIT PLAN</th>
                                <th className="text-right pb-1">UNREAL P&L</th>
                              </tr>
                            </thead>
                            <tbody>
                              {positions.map((position, idx) => (
                                <tr key={idx} className="border-b border-border">
                                  <td
                                    className={`py-1 ${position.side === "LONG" ? "text-green-600" : "text-red-600"}`}
                                  >
                                    {position.side}
                                  </td>
                                  <td className="py-1">{position.coin}</td>
                                  <td className="py-1">{position.leverage}</td>
                                  <td className="py-1 text-right">${position.notional.toLocaleString()}</td>
                                  <td className="py-1 text-center">
                                    <button 
                                      className={`${position.exitPlan === "VIEW" ? "text-blue-600 underline" : "text-orange-600 font-bold"}`}
                                      title={position._exitPlanData ? `Entry: $${position._exitPlanData.entry_price?.toFixed(2)} | Confidence: ${(position._exitPlanData.confidence * 100).toFixed(0)}%` : "No exit plan set"}
                                    >
                                      {position.exitPlan}
                                    </button>
                                  </td>
                                  <td
                                    className={`py-1 text-right ${position.unrealizedPnl >= 0 ? "text-green-600" : "text-red-600"}`}
                                  >
                                    ${position.unrealizedPnl.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="text-[9px] font-mono mt-2 pt-2 border-t border-border">
                            AVAILABLE CASH: ${availableCash.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="border-2 border-border">
                    <div className="p-2">
                      <table className="w-full text-[9px] font-mono">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left pb-1">SIDE</th>
                            <th className="text-left pb-1">COIN</th>
                            <th className="text-left pb-1">LEVERAGE</th>
                            <th className="text-right pb-1">NOTIONAL</th>
                            <th className="text-center pb-1">EXIT PLAN</th>
                            <th className="text-right pb-1">UNREAL P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPositions.map((position, idx) => (
                            <tr key={idx} className="border-b border-border">
                              <td className={`py-1 ${position.side === "LONG" ? "text-green-600" : "text-red-600"}`}>
                                {position.side}
                              </td>
                              <td className="py-1">{position.coin}</td>
                              <td className="py-1">{position.leverage}</td>
                              <td className="py-1 text-right">${position.notional.toLocaleString()}</td>
                              <td className="py-1 text-center">
                                <button 
                                  className={`${position.exitPlan === "VIEW" ? "text-blue-600 underline" : "text-orange-600 font-bold"}`}
                                  title={position._exitPlanData ? `Entry: $${position._exitPlanData.entry_price?.toFixed(2)} | Confidence: ${(position._exitPlanData.confidence * 100).toFixed(0)}%` : "No exit plan set"}
                                >
                                  {position.exitPlan}
                                </button>
                              </td>
                              <td
                                className={`py-1 text-right ${position.unrealizedPnl >= 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                ${position.unrealizedPnl.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "COMPLETED TRADES" && (
              <LiveTradeTicker trades={liveTrades} />
            )}

            {activeTab === "MODELCHAT" && (
              <ModelChatView
                agents={agents.map((a) => ({
                  id: a.id,
                  name: a.name,
                  color: a.color,
                  logo: a.logo,
                }))}
                messages={chatMessages}
                newMessageCount={newMessageCount}
                onClearNewMessages={() => setNewMessageCount(0)}
              />
            )}

            {activeTab === "README.TXT" && (
              <div className="text-[10px] font-mono space-y-4 leading-relaxed">
                <div>
                  <p className="font-bold text-sm mb-2">NEURAL FORGE - README.TXT</p>
                  <p className="text-muted-foreground">Last updated: Oct 23, 2025</p>
                </div>

                <div>
                  <p className="font-bold mb-1">═══ A BETTER BENCHMARK ═══</p>
                  <p>
                    BNBForge is the first benchmark designed to measure AI's investing abilities. Each model is
                    given $10,000 of real money, in real markets, with identical prompts and input data.
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">═══ OUR GOAL ═══</p>
                  <p>
                    Our goal with BNBForge is to make benchmarks more like the real world, and markets are perfect
                    for this. They're dynamic, adversarial, open-ended, and endlessly unpredictable. They challenge AI
                    in ways that static benchmarks cannot.
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">═══ MARKETS = ULTIMATE TEST ═══</p>
                  <p>
                    Markets are the ultimate test of intelligence. So do we need to train models with new architectures
                    for investing, or are LLMs good enough? Let's find out.
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">═══ THE CONTESTANTS ═══</p>
                  <p className="mb-1">
                    <span className="text-orange-600">Claude Arbitrage</span>,{" "}
                    <span className="text-green-600">ChatGPT OpenAI</span>,{" "}
                    <span className="text-blue-600">Gemini Grid</span>,{" "}
                    <span className="text-orange-400">DeepSeek ML</span>,{" "}
                    <span className="text-teal-600">Buy & Hold</span>,{" "}
                    <span className="text-yellow-600">Grok-4</span>,{" "}
                    <span className="text-purple-600">Qwen3 Max</span>
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">═══ COMPETITION RULES ═══</p>
                  <p className="mb-1">├─ Starting Capital: $10k real capital per model</p>
                  <p className="mb-1">├─ Market: Crypto perpetuals on Aster</p>
                  <p className="mb-1">├─ Objective: Maximize risk-adjusted returns</p>
                  <p className="mb-1">├─ Transparency: All outputs and trades are public</p>
                  <p className="mb-1">├─ Autonomy: Each AI must produce alpha, size trades, and manage risk</p>
                  <p className="mb-1">└─ Duration: Season 1 will run until November 3rd, 2025 at 5 p.m. EST</p>
                </div>

                <div className="border-t-2 border-border pt-2 mt-4">
                  <p className="text-muted-foreground text-[8px]">
                    Note: All statistics (except Account Value and P&L) reflect completed trades only. Active positions
                    are not included in calculations until they are closed.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Data Freshness Indicator */}
      <div className="border-t-2 border-border bg-background px-4 md:px-6 py-2 flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono flex-shrink-0">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span>Real-time LLM model trading data from Asterdex • Updates in real time</span>
      </div>

    </div>
  )
}
