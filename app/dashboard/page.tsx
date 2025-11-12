"use client"

import { useEffect, useState } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, TooltipProps } from "recharts"
import Image from "next/image"
import { Header } from "@/components/header"
import { TokenActivation } from "@/components/token-activation"
import { TokenIcon } from "@/components/token-icon"
import { LiveTradeTicker } from "@/components/live-trade-ticker"
import { CompletedTradesList } from "@/components/completed-trades-list"
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
  
  console.log(`🔍 [Tooltip] Looking for agent with dataKey: "${dataKey}"`)
  console.log(`🔍 [Tooltip] Available agents:`, agents?.map((a: Agent) => ({ id: a.id, name: a.name, availableCash: a.availableCash })))
  
  // Find the agent with matching ID
  const agent = agents?.find((a: Agent) => a.id === dataKey)
  
  if (!agent) {
    console.log(`🔍 [Tooltip] ⚠️ Agent not found for dataKey: "${dataKey}", payload value: ${payload[0]?.value}`)
    return null
  }

  // Use REAL-TIME availableCash from agent state (from /api/aster/account endpoint)
  // This is the true available balance, NOT the equity (which includes unrealized PnL)
  // Falls back to chart data if agent balance is not yet loaded
  const realtimeBalance = agent.availableCash ?? payload[0]?.value ?? 0
  
  // Debug logging
  console.log(`🔍 [Tooltip] ${agent.name} - availableCash: ${agent.availableCash}, payload value: ${payload[0]?.value}, using: ${realtimeBalance}`)

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #ccc",
        borderRadius: "2px",
        padding: "6px 10px",
        fontSize: "9px",
        fontFamily: "Space Mono",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ color: agent.color, fontWeight: "bold", marginBottom: "3px" }}>
        {agent.name}
      </div>
      <div style={{ color: "#000" }}>
        Balance: ${(realtimeBalance as number)?.toLocaleString()}
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
  const [isLoadingPositions, setIsLoadingPositions] = useState(true)
  const [realtimeContexts, setRealtimeContexts] = useState<Record<string, any>>({})

  useEffect(() => {
    // Skip real data if testing with mock (set USE_MOCK_DATA=true in .env.local)
    const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"
    
    if (useMockData) {
      console.log("📊 Using mock data for dashboard")
      fetch("/api/mock/agents")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAgents(data)
            const initialChats: Record<string, any[]> = {}
            data.forEach((agent: Agent) => {
              initialChats[agent.id] = []
            })
            setChatMessages(initialChats)
          }
        })
        .catch((mockErr) => console.error("Failed to fetch mock agents:", mockErr))
      return
    }

    // Fetch real agents data
    fetch("/api/aster/agents-data")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch agents data`)
        }
        return res.json()
      })
      .then((data) => {
        if (data.agents && Array.isArray(data.agents)) {
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
            availableCash: a.available_balance || a.total_balance,
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
        } else {
          throw new Error("Invalid response structure: missing agents array")
        }
      })
      .catch((err) => {
        console.error("Failed to fetch agents data:", err)
        // Fall back to mock data on error
        fetch("/api/mock/agents")
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setAgents(data)
              const initialChats: Record<string, any[]> = {}
              data.forEach((agent: Agent) => {
                initialChats[agent.id] = []
              })
              setChatMessages(initialChats)
            }
          })
          .catch((mockErr) => console.error("Failed to fetch mock agents:", mockErr))
      })

    // Fetch real market prices
    fetch("/api/market/prices")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch market prices`)
        }
        return res.json()
      })
      .then((data) => {
        if (data.BTC && typeof data.BTC === "number") {
          setMarketPrices(data)
          setPriceLoadingError(null)
        } else {
          setPriceLoadingError(data.error || "Failed to load prices")
        }
      })
      .catch((err) => {
        console.error("Failed to fetch market prices:", err)
        setPriceLoadingError("Failed to load prices")
      })

    // Fetch real account history data for chart (starting from $50 baseline)
    fetch("/api/aster/account-history")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch account history`)
        }
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllChartData(data)
          setChartData(data)
        } else {
          throw new Error("Invalid account history data structure")
        }
      })
      .catch((err) => {
        console.error("Failed to fetch account history:", err)
        // Fall back to mock data if real fetch fails
        fetch("/api/mock/trades")
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setAllChartData(data)
              setChartData(data)
            }
          })
      })

    // Fetch positions and trades for each agent
    const fetchLiveData = async () => {
      if (agents.length === 0) return

      const positionsMap: Record<string, any[]> = {}
      const trades: any[] = []
      const updatedAgents: Record<string, Partial<Agent>> = {}

      for (const agent of agents) {
        try {
          // Fetch account info (includes real-time balance)
          console.log(`\n🔄 [Dashboard] Fetching account info for ${agent.name} (${agent.id})...`)
          const accountRes = await fetch(`/api/aster/account?agentId=${agent.id}`)
          if (accountRes.ok) {
            const accountInfo = await accountRes.json()
            console.log(`✅ [Dashboard] Fetched account info for ${agent.name}:`, accountInfo)
            const newBalance = Number(accountInfo.availableBalance) || 0
            const newEquity = Number(accountInfo.equity) || 0
            console.log(`💰 [Dashboard] ${agent.name} - availableBalance: ${accountInfo.availableBalance} (type: ${typeof accountInfo.availableBalance}) → converted to ${newBalance}`)
            // Store updated balance for later update
            updatedAgents[agent.id] = {
              availableCash: newBalance, // True available balance (from account.availableBalance)
              accountValue: newEquity,    // Total equity (wallet + unrealized PnL)
            }
          } else {
            console.warn(`⚠️ [Dashboard] Account info failed for ${agent.id}, using cached balance`)
          }

          // Fetch positions - try real API first, fallback to mock
          console.log(`🔄 [Dashboard] Fetching positions for ${agent.name} (${agent.id})...`)
          let posRes = await fetch(`/api/aster/positions?agentId=${agent.id}`)
          let positions = []
          
          if (posRes.ok) {
            positions = await posRes.json()
            console.log(`✅ [Dashboard] Fetched positions for ${agent.name}:`, {
              count: positions.length,
              details: positions,
              firstPosition: positions[0] ? Object.keys(positions[0]) : 'N/A',
            })
            if (positions[0]) {
              console.log(`📌 [Dashboard] First position full data:`, JSON.stringify(positions[0], null, 2))
            }
          } else {
            const errorData = await posRes.json().catch(() => ({}))
            console.error(`❌ [Dashboard] Positions API failed for ${agent.id}:`, {
              status: posRes.status,
              statusText: posRes.statusText,
              error: errorData.error,
            })
            // Fallback to mock positions if real API fails
            console.log(`📋 [Dashboard] Trying mock data for ${agent.id}...`)
            const mockRes = await fetch(`/api/mock/positions?agentId=${agent.id}`)
            if (mockRes.ok) {
              positions = await mockRes.json()
              console.log(`✅ [Dashboard] Using mock positions for ${agent.id}:`, positions)
            }
          }
          
          if (positions && positions.length > 0) {
            try {
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
       const filtered = positions.filter((p: any) => p.positionAmt !== 0)
              console.log(`📍 [Dashboard] Filtered positions for ${agent.name}: ${filtered.length} total`)
              
              positionsMap[agent.id] = filtered
                       .map((p: any) => {
                  try {
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
                    
                    const notionalValue = Math.abs((p.positionAmt || 0) * (p.markPrice || 0))
                    const transformed = {
                      side,
                      coin: (p.symbol || "").replace("USDT", ""),
                      leverage: `${p.leverage || 1}X`,
                      notional: notionalValue,
                      exitPlan: exitPlanDisplay,
                      unrealizedPnl: p.unrealizedProfit || 0,
                      // Include raw values for hover tooltips if needed
                      _exitPlanData: exitPlan,
                    }
                    console.log(`  ├─ Transformed: ${p.symbol} ${side} ${p.positionAmt} @ ${p.markPrice} leverage=${p.leverage}X notional=${transformed.notional}`)
                    return transformed
                  } catch (posError) {
                    console.error(`  ❌ Error transforming position for ${agent.name}:`, posError, "Position:", p)
                    throw posError
                  }
                })
              console.log(`✅ [Dashboard] Successfully transformed ${positionsMap[agent.id].length} positions for ${agent.name}`)
            } catch (transformError) {
              console.error(`❌ [Dashboard] Error transforming positions for ${agent.name}:`, transformError)
              positionsMap[agent.id] = []
            }
          } else {
            // Initialize empty positions array if no positions found
            console.log(`ℹ️ [Dashboard] No positions found for ${agent.name} (count=${positions?.length})`)
            positionsMap[agent.id] = []
          }

          // Fetch trades
          const tradesRes = await fetch(`/api/aster/trades?agentId=${agent.id}&limit=30`)
          if (tradesRes.ok) {
            const agentTrades = await tradesRes.json()
            trades.push(
              ...agentTrades.slice(0, 20).map((t: any) => ({
                agentId: agent.id,
                agentName: agent.name,
                model: agent.model,
                agentLogo: agent.logo,
                side: t.side === "BUY" ? "LONG" : "SHORT",
                symbol: t.symbol || "UNKNOWN",
                price: Number(t.price) || 0,
                entryPrice: Number(t.entryPrice) || Number(t.price) || 0,
                exitPrice: Number(t.exitPrice) || Number(t.price) || 0,
                qty: Number(t.qty) || 0,
                pnl: Number(t.realizedPnl) || 0,
                realizedPnl: Number(t.realizedPnl) || 0,
                timestamp: t.time || t.closedAt || t.timestamp || Date.now(),
                openTime: t.time || t.openedAt || t.openTime || Date.now(),
                closeTime: t.time || t.closedAt || t.closeTime || Date.now(),
              }))
            )
          }
        } catch (error) {
          console.error(`❌ Exception fetching live data for ${agent.id}:`, error)
        }
      }

      const positionsSummary = Object.keys(positionsMap).map(id => ({
        agentId: id,
        positionCount: positionsMap[id].length,
        positions: positionsMap[id],
      }))
      
      console.log(`\n✅ [Dashboard] FINAL POSITIONS MAP - All agents:`)
      console.table(positionsSummary.map(s => ({
        'Agent ID': s.agentId,
        'Position Count': s.positionCount,
      })))
      console.log(`[Dashboard] Complete positionsMap:`, positionsMap)
      
      setLivePositions(positionsMap)
      setLiveTrades(trades)
      setIsLoadingPositions(false)
      
      // Update agents state with fresh balance data for real-time tooltip
      if (Object.keys(updatedAgents).length > 0) {
        console.log(`📊 [Dashboard] updatedAgents object:`, updatedAgents)
        setAgents((prevAgents) => {
          const updatedList = prevAgents.map((agent) => {
            const updated = {
              ...agent,
              ...(updatedAgents[agent.id] || {}),
            }
            if (updatedAgents[agent.id]) {
              console.log(`💾 [Dashboard] Updated ${agent.name}: availableCash ${agent.availableCash} → ${updated.availableCash}`)
            }
            return updated
          })
          return updatedList
        })
        console.log(`✅ [Dashboard] Updated agents with fresh balances:`, Object.keys(updatedAgents))
      }
      
      console.log(`✅ [Dashboard] State updated: livePositions set with ${Object.keys(positionsMap).length} agents`)
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

  // Fetch real-time context for chat display (prices, positions, PnL from Aster API)
  useEffect(() => {
    const fetchContexts = async () => {
      try {
        const response = await fetch("/api/aster/agent-realtime-context")
        if (response.ok) {
          const data = await response.json()
          const contexts: Record<string, any> = {}
          
          // Convert array to record indexed by agentId
          if (Array.isArray(data)) {
            data.forEach((ctx: any) => {
              contexts[ctx.agentId] = ctx
            })
          }
          
          setRealtimeContexts(contexts)
        }
      } catch (err) {
        console.error("[Dashboard] Failed to fetch realtime contexts:", err)
      }
    }

    if (agents.length > 0) {
      fetchContexts()
      
      // Refresh every 5 seconds to keep prices and PnL current
      const interval = setInterval(fetchContexts, 5000)
      return () => clearInterval(interval)
    }
  }, [agents])

  // Fetch positions when agents are loaded
  useEffect(() => {
    if (agents.length === 0) {
      console.log("[Dashboard] Agents not yet loaded, skipping initial position fetch")
      return
    }

    console.log(`[Dashboard] Agents loaded (${agents.length} agents), fetching positions immediately...`)

    const positionsMap: Record<string, any[]> = {}
    const trades: any[] = []

    const fetchPositionsForAgents = async () => {
      for (const agent of agents) {
        try {
          console.log(`\n🔄 [Dashboard] Initial fetch - Fetching positions for ${agent.name} (${agent.id})...`)
          let posRes = await fetch(`/api/aster/positions?agentId=${agent.id}`)
          let positions = []
          
          if (posRes.ok) {
            positions = await posRes.json()
            console.log(`✅ [Dashboard] Initial fetch - Fetched positions for ${agent.name}:`, {
              count: positions.length,
              details: positions,
            })
          } else {
            const errorData = await posRes.json().catch(() => ({}))
            console.error(`❌ [Dashboard] Initial fetch - Positions API failed for ${agent.id}:`, errorData.error)
            // Fallback to mock positions if real API fails
            const mockRes = await fetch(`/api/mock/positions?agentId=${agent.id}`)
            if (mockRes.ok) {
              positions = await mockRes.json()
              console.log(`✅ [Dashboard] Initial fetch - Using mock positions for ${agent.id}`)
            }
          }
          
          if (positions && positions.length > 0) {
            try {
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
              const filtered = positions.filter((p: any) => p.positionAmt !== 0)
              
              positionsMap[agent.id] = filtered
                .map((p: any) => {
                  try {
                    const side = p.positionAmt > 0 ? "LONG" : "SHORT"
                    const planKey = `${p.symbol}:${side}`
                    const exitPlan = exitPlanMap[planKey]
                    
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
                    
                    const notionalValue = Math.abs((p.positionAmt || 0) * (p.markPrice || 0))
                    return {
                      side,
                      coin: (p.symbol || "").replace("USDT", ""),
                      leverage: `${p.leverage || 1}X`,
                      notional: notionalValue,
                      exitPlan: exitPlanDisplay,
                      unrealizedPnl: p.unrealizedProfit || 0,
                      _exitPlanData: exitPlan,
                    }
                  } catch (posError) {
                    console.error(`  ❌ Initial fetch - Error transforming position for ${agent.name}:`, posError)
                    throw posError
                  }
                })
              console.log(`✅ [Dashboard] Initial fetch - Successfully transformed ${positionsMap[agent.id].length} positions for ${agent.name}`)
            } catch (transformError) {
              console.error(`❌ [Dashboard] Initial fetch - Error transforming positions for ${agent.name}:`, transformError)
              positionsMap[agent.id] = []
            }
          } else {
            positionsMap[agent.id] = []
          }

          // Fetch trades
          const tradesRes = await fetch(`/api/aster/trades?agentId=${agent.id}&limit=30`)
          if (tradesRes.ok) {
            const agentTrades = await tradesRes.json()
            trades.push(
              ...agentTrades.slice(0, 20).map((t: any) => ({
                agentId: agent.id,
                agentName: agent.name,
                model: agent.model,
                agentLogo: agent.logo,
                side: t.side === "BUY" ? "LONG" : "SHORT",
                symbol: t.symbol || "UNKNOWN",
                price: Number(t.price) || 0,
                entryPrice: Number(t.entryPrice) || Number(t.price) || 0,
                exitPrice: Number(t.exitPrice) || Number(t.price) || 0,
                qty: Number(t.qty) || 0,
                pnl: Number(t.realizedPnl) || 0,
                realizedPnl: Number(t.realizedPnl) || 0,
                timestamp: t.time || t.closedAt || t.timestamp || Date.now(),
                openTime: t.time || t.openedAt || t.openTime || Date.now(),
                closeTime: t.time || t.closedAt || t.closeTime || Date.now(),
              }))
            )
          }
        } catch (error) {
          console.error(`❌ [Dashboard] Initial fetch exception for ${agent.id}:`, error)
        }
      }

      setLivePositions(positionsMap)
      setLiveTrades(trades)
      setIsLoadingPositions(false)
      console.log(`✅ [Dashboard] Initial fetch complete - livePositions set with ${Object.keys(positionsMap).length} agents`)
    }

    fetchPositionsForAgents()
  }, [agents])

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
          // Transform Supabase fields to component interface (snake_case → camelCase)
          const transformedMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            agentId: msg.agent_id || msg.agentId,
            agentName: msg.agent_name || msg.agentName,
            timestamp: msg.timestamp,
            content: msg.content,
            type: msg.message_type || msg.type,
            confidence: msg.confidence,
          }))

          // Organize messages by agent
          const messagesByAgent: Record<string, any[]> = {}
          transformedMessages.forEach((msg: any) => {
            if (msg.agentId && !messagesByAgent[msg.agentId]) {
              messagesByAgent[msg.agentId] = []
            }
            if (msg.agentId) {
              messagesByAgent[msg.agentId].push(msg)
            }
          })

          // API already limits to 30 messages, but ensure per-agent limit
          Object.keys(messagesByAgent).forEach((agentId) => {
            messagesByAgent[agentId] = messagesByAgent[agentId].slice(0, 30)
          })

          // Calculate new messages
          if (previousMessageCount > 0 && transformedMessages.length > previousMessageCount) {
            const newCount = transformedMessages.length - previousMessageCount
            setNewMessageCount(newCount)
          }
          
          setPreviousMessageCount(transformedMessages.length)
          setChatMessages(messagesByAgent)
          console.debug(`[Dashboard] Loaded ${transformedMessages.length} real-time agent messages (max 30) for current trading symbol`)
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

  // Continuously refresh agent data to get updated account values
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") return

    const refreshAgentData = async () => {
      try {
        const response = await fetch("/api/aster/agents-data")
        if (!response.ok) return
        
        const data = await response.json()
        if (data.agents && Array.isArray(data.agents)) {
          // IMPORTANT: Preserve real-time balance updates from fetchLiveData
          // Only update display fields, not the availableCash which is updated every 10s
          setAgents((prevAgents) => {
            const agentMap = new Map(data.agents.map((a: any) => [a.id, a]))
            return prevAgents.map((prevAgent) => {
              const freshData = agentMap.get(prevAgent.id) as any
              if (!freshData) return prevAgent
              
              console.log(`[Dashboard] Refreshing display data for ${prevAgent.name}:`, {
                accountValue: freshData.account_value,
                roi: freshData.roi,
                pnl: freshData.pnl,
                preservedAvailableCash: prevAgent.availableCash,
              })
              
              return {
                ...prevAgent,
                id: freshData.id,
                name: freshData.name,
                model: freshData.model,
                pnl: freshData.pnl,
                roi: freshData.roi,
                status: freshData.roi > 0 ? "active" : "idle",
                color: generateColorForAgent(freshData.id),
                logo: freshData.logo || freshData.logo_url || "/placeholder.svg",
                accountValue: freshData.account_value,
                // PRESERVE availableCash from fetchLiveData (real-time balance)
                // availableCash is updated every 10 seconds by fetchLiveData from /api/aster/account
                // Do NOT override it here
                // availableCash: prevAgent.availableCash is implicitly preserved
              }
            })
          })
          console.log("[Dashboard] Refreshed agent display data (preserved real-time balances)")
        }
      } catch (error) {
        console.error("[Dashboard] Failed to refresh agent data:", error)
      }
    }

    // Refresh every 15 seconds to ensure we capture real balance changes
    const refreshInterval = setInterval(refreshAgentData, 15 * 1000)
    return () => clearInterval(refreshInterval)
  }, [])

  // Capture agent balances every 5 minutes and append to chart
  useEffect(() => {
    if (agents.length === 0) return

    // Immediately capture current balances
    const captureBalances = () => {
      const currentPoint: any = {
        time: new Date().toISOString(),
      }

      let hasChanges = false
      agents.forEach((agent) => {
        const balance = agent.accountValue || 50
        currentPoint[agent.id] = balance
        // Check if this is different from the last point
        if (allChartData.length > 0) {
          const lastPoint = allChartData[allChartData.length - 1]
          if (lastPoint[agent.id] !== balance) {
            hasChanges = true
          }
        } else {
          hasChanges = true
        }
      })

      // Only append if there are actual changes
      if (hasChanges || allChartData.length === 0) {
        setAllChartData((prevData) => {
          // Append new point to existing data
          return [...prevData, currentPoint]
        })

        console.log("[Dashboard] 📊 Captured agent balances for chart:", {
          timestamp: currentPoint.time,
          balances: Object.fromEntries(
            agents.map(a => [a.name, `$${(a.accountValue || 50).toLocaleString()}`])
          )
        })
      } else {
        console.log("[Dashboard] ⏭️ Skipped capture - no balance changes detected")
      }
    }

    // Set up 5-minute interval for capturing balances
    const balanceCaptureInterval = setInterval(captureBalances, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(balanceCaptureInterval)
  }, [agents, allChartData])

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
            <span className="text-muted-foreground">REAL TIME AGENT ROI INCREASE:</span>
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
            <span className="text-muted-foreground">REAL TIME AGENT ROI DECREASE:</span>
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
        <div className="flex-1 p-1 md:p-2 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-background mb-1 flex-1 min-h-0 flex flex-col relative">
            <ChartWatermark />
            <div className="border-b border-border px-2 md:px-3 py-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 flex-shrink-0">
              <h2 className="text-[8px] md:text-[9px] font-bold font-mono">
                {selectedAgent ? `${agents.find((a) => a.id === selectedAgent)?.name || "AGENT"} PERFORMANCE` : "TOTAL ACCOUNT VALUE"}
              </h2>
              <div className="flex items-center gap-0.5 md:gap-1 flex-wrap">
                {selectedAgent && (
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="px-1 md:px-1.5 py-0.5 text-[7px] md:text-[8px] font-mono border border-border bg-muted hover:bg-foreground hover:text-background transition-colors"
                  >
                    BACK TO ALL
                  </button>
                )}
                {(["ALL", "72H", "24H", "7D", "30D"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-1 md:px-1.5 py-0.5 text-[7px] md:text-[8px] font-mono border border-border ${
                      timePeriod === period ? "bg-foreground text-background" : "hover:bg-muted"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-0.5 md:p-1 flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 15, left: 15 }}>
                    <CartesianGrid strokeDasharray="5 5" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#999"
                      style={{ fontSize: "8px", fontFamily: "Space Mono" }}
                      tickLine={false}
                      tickFormatter={(value) => formatXAxisTime(value, xAxisFormatType)}
                    />
                    <YAxis
                      stroke="#999"
                      style={{ fontSize: "8px", fontFamily: "Space Mono" }}
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
                          type="monotone"
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

          <div className="border-b border-border px-2 md:px-3 py-1 flex items-center justify-end gap-1 flex-shrink-0 bg-background">
            <button
              onClick={() => setShowPercentage(false)}
              className={`px-1.5 md:px-2 py-0.5 text-[8px] md:text-[9px] font-mono border border-border ${
                !showPercentage ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              $
            </button>
            <button
              onClick={() => setShowPercentage(true)}
              className={`px-1.5 md:px-2 py-0.5 text-[8px] md:text-[9px] font-mono border border-border ${
                showPercentage ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              %
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-1 p-1 bg-background flex-shrink-0 border-b border-border">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                className={`border cursor-pointer transition-all duration-200 p-1 flex flex-col items-center justify-center ${
                  selectedAgent === agent.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:border-foreground"
                }`}
              >
                <div className="flex items-center gap-0.5 mb-1 justify-center">
                  {agent.logo && (
                    <div className="w-3 h-3 relative flex-shrink-0">
                      <Image
                        src={agent.logo || "/placeholder.svg"}
                        alt={agent.name}
                        width={12}
                        height={12}
                        className="rounded-full"
                      />
                    </div>
                  )}
                  <span className="text-[7px] md:text-[8px] font-mono font-bold text-center truncate">{agent.name}</span>
                  {agent.id === 'buy_and_hold' && agent.logo && (
                    <Image
                      src={agent.logo}
                      alt="Grok"
                      width={9}
                      height={9}
                      className="rounded-full"
                      title="Powered by Grok"
                    />
                  )}
                </div>
                <div className="text-[7px] md:text-[8px] font-bold font-mono text-center">
                  {showPercentage ? `${agent.roi > 0 ? '+' : ''}${agent.roi.toFixed(2)}%` : `$${(agent.accountValue || 0).toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-[380px] border-t-2 lg:border-t-0 lg:border-l-2 border-border bg-background flex flex-col min-h-0">
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
                {(() => {
                  const positionSummary = Object.entries(mockPositions).reduce((acc, [id, pos]) => {
                    acc[id] = pos.length
                    return acc
                  }, {} as Record<string, number>)
                  const totalPositions = Object.values(positionSummary).reduce((sum, count) => sum + count, 0)
                  
                  console.log(`\n📊 [Dashboard] POSITIONS TAB RENDERED:`)
                  console.log(`  - isLoadingPositions: ${isLoadingPositions}`)
                  console.log(`  - mockPositions keys: ${Object.keys(mockPositions).join(', ') || 'EMPTY'}`)
                  console.log(`  - Position counts by agent:`, positionSummary)
                  console.log(`  - Total positions: ${totalPositions}`)
                  console.log(`  - Selected filter: ${selectedFilter}`)
                  console.log(`  - Full mockPositions object:`, mockPositions)
                  return null
                })()}
                
                {isLoadingPositions && (
                  <div className="border-2 border-border p-4 text-center text-[12px] font-mono text-muted-foreground">
                    Fetching positions...
                  </div>
                )}
                
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
                  <>
                    {(() => {
                      const hasAnyPositions = agents.some(a => (mockPositions[a.id] || []).length > 0)
                      if (!hasAnyPositions && !isLoadingPositions) {
                        return (
                          <div className="border-2 border-border p-4 text-center text-[12px] font-mono text-muted-foreground">
                            📭 No active positions across all models
                          </div>
                        )
                      }
                      return null
                    })()}
                    {agents.map((agent) => {
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
                    })}
                  </>
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
                      {filteredPositions.length === 0 && !isLoadingPositions && (
                        <div className="p-4 text-center text-[12px] font-mono text-muted-foreground">
                          📭 This agent has no active positions
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "COMPLETED TRADES" && (
              <CompletedTradesList trades={liveTrades} />
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
                realtimeContext={Object.values(realtimeContexts)}
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
                    given $50 of real money, in real markets, with identical prompts and input data.
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
                    <span className="text-teal-600">Grok-4 as Buy & Hold</span>,{" "}
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">═══ COMPETITION RULES ═══</p>
                  <p className="mb-1">├─ Starting Capital: $50 starting real capital per model</p>
                  <p className="mb-1">├─ Market: Crypto perpetuals on Aster</p>
                  <p className="mb-1">├─ Objective: Maximize risk-adjusted returns</p>
                  <p className="mb-1">├─ Transparency: All outputs and trades are public</p>
                  <p className="mb-1">├─ Autonomy: Each AI must produce alpha, size trades, and manage risk</p>
                  <p className="mb-1">└─ Duration: Untill you vote to shut me down</p>
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
