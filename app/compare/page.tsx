"use client"

import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Bar,
  BarChart,
  TooltipProps,
} from "recharts"

// Custom Tooltip Component
interface TooltipEntry {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  agentData?: Agent[]
}

const ChartTooltip = ({ active, payload, label, agentData }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border-2 border-black p-2 rounded-none">
        <p className="text-[10px] font-mono font-bold mb-1">{label}</p>
        {payload.map((entry: TooltipEntry, index: number) => {
          // Find the agent matching this entry's dataKey (agent ID)
          const agent = agentData?.find((a) => a.id === entry.dataKey)
          const displayValue = agent?.accountValue || entry.value
          
          return (
            <p key={index} style={{ color: entry.color }} className="text-[10px] font-mono">
              {entry.name}: ${(displayValue as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          )
        })}
      </div>
    )
  }
  return null
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
  logo: string
  accountValue: number
  totalFees: number
  winRate: number
  sharpe: number
  avgLeverage: number
  avgConfidence: number
  biggestWin: number
  biggestLoss: number
  returnPercent: number
  totalPnL: number
  activePositions: number
  avgTradeSize: number
  avgHoldTime: string
  longPercent: number
}

export default function ComparePage() {
  const searchParams = useSearchParams()
  const agentsParam = useMemo(() => searchParams.get("agents"), [searchParams])

  const [allAgents, setAllAgents] = useState<Agent[]>([])
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [comparisonData, setComparisonData] = useState<any[]>([])
  const [riskMetrics, setRiskMetrics] = useState<Record<string, any>>({})

  useEffect(() => {
    // Fetch real agents data from leaderboard API
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        const agents = data.agents || []
        
        // Map leaderboard format to agent format for comparison
        const mappedAgents = agents.map((agent: any) => ({
          ...agent,
          pnl: agent.totalPnL || 0,
          roi: agent.returnPercent || 0,
          logo: agent.logo || "/placeholder.svg",
          totalFees: agent.fees || 0,
          totalPnL: agent.totalPnL || 0,
          returnPercent: agent.returnPercent || 0,
          avgTradeSize: agent.avgTradeSize || 0,
          activePositions: agent.activePositions || 0,
          biggestWin: agent.biggestWin || 0,
          biggestLoss: agent.biggestLoss || 0,
          winRate: agent.winRate || 0,
          sharpe: agent.sharpe || 0,
          avgLeverage: agent.avgLeverage || 1,
          avgConfidence: agent.avgConfidence || 0,
          longPercent: agent.longPercent || 0,
          avgHoldTime: agent.avgHoldTime || "N/A",
        }))
        
        setAllAgents(mappedAgents)

        // Get agents from URL params
        const agentIds = agentsParam?.split(",") || []
        if (agentIds.length > 0) {
          setSelectedAgents(agentIds.slice(0, 3))
        } else {
          // Default to top 3 agents
          setSelectedAgents(mappedAgents.slice(0, 3).map((a: Agent) => a.id))
        }
      })
      .catch((err) => {
        console.error("Error fetching agents:", err)
        // Fallback to mock data
        fetch("/api/mock/agents")
          .then((res) => res.json())
          .then((data) => {
            setAllAgents(data)
            const agentIds = agentsParam?.split(",") || []
            if (agentIds.length > 0) {
              setSelectedAgents(agentIds.slice(0, 3))
            } else {
              setSelectedAgents(data.slice(0, 3).map((a: Agent) => a.id))
            }
          })
      })
  }, [agentsParam])

  useEffect(() => {
    const generateData = () => {
      const data = []
      const now = new Date()
      // Initialize agent values
      const agentValues: Record<string, number> = {}
      selectedAgentData.forEach((agent) => {
        agentValues[agent.id] = 50
      })

      for (let i = 30; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dataPoint: any = {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        }

        // Generate realistic performance data for each selected agent
        selectedAgentData.forEach((agent) => {
          const volatility = Math.random() - 0.5
          agentValues[agent.id] = Math.max(20, Math.min(200, agentValues[agent.id] + volatility * 3))
          dataPoint[agent.id] = agentValues[agent.id]
        })

        data.push(dataPoint)
      }
      return data
    }

    if (selectedAgents.length > 0 && allAgents.length > 0) {
      const agentsToCompare = allAgents.filter((a) => selectedAgents.includes(a.id))
      if (agentsToCompare.length > 0) {
        setComparisonData(generateData())
      }
    }
  }, [selectedAgents, allAgents])

  // Fetch real risk metrics for selected agents
  useEffect(() => {
    const fetchRiskMetrics = async () => {
      const metrics: Record<string, any> = {}

      for (const agentId of selectedAgents) {
        try {
          const response = await fetch(`/api/aster/risk-metrics?agentId=${agentId}&period=30D`)
          if (response.ok) {
            const data = await response.json()
            metrics[agentId] = data.metrics
          }
        } catch (error) {
          console.error(`Failed to fetch risk metrics for ${agentId}:`, error)
        }
      }

      setRiskMetrics(metrics)
    }

    if (selectedAgents.length > 0) {
      fetchRiskMetrics()
    }
  }, [selectedAgents])

  const selectedAgentData = allAgents.filter((a) => selectedAgents.includes(a.id))

  const toggleAgent = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      setSelectedAgents(selectedAgents.filter((id) => id !== agentId))
    } else if (selectedAgents.length < 3) {
      setSelectedAgents([...selectedAgents, agentId])
    }
  }

  // Get real risk metrics from API data
  const getMetric = (agentId: string, metric: string, fallback: number = 0) => {
    return riskMetrics[agentId]?.[metric] ?? fallback
  }

  const getMaxDrawdown = (agentId: string) => {
    const value = getMetric(agentId, "maxDrawdown", 0)
    return isNaN(value) ? "N/A" : parseFloat(value).toFixed(2)
  }

  const getVolatility = (agentId: string) => {
    const value = getMetric(agentId, "volatility", 0)
    return isNaN(value) ? "N/A" : parseFloat(value).toFixed(2)
  }

  const getSortinoRatio = (agentId: string) => {
    const value = getMetric(agentId, "sortinoRatio", 0)
    return isNaN(value) ? "N/A" : parseFloat(value).toFixed(3)
  }

  const getCalmarRatio = (agentId: string) => {
    const value = getMetric(agentId, "calmarRatio", 0)
    return isNaN(value) ? "N/A" : parseFloat(value).toFixed(3)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Header />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xs font-bold font-mono mb-2">AGENT COMPARISON</h1>
            <p className="text-[11px] font-mono text-gray-600">Compare up to 3 AI trading agents side-by-side</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-muted border border-border rounded-lg text-xs font-medium hover:bg-muted/80"
          >
            ← BACK TO DASHBOARD
          </Link>
        </div>

        <div className="panel p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select Agents to Compare</h2>
          <div className="grid grid-cols-6 gap-4">
            {allAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                disabled={!selectedAgents.includes(agent.id) && selectedAgents.length >= 3}
                className={`p-4 border border-border rounded-lg text-left transition-all ${
                  selectedAgents.includes(agent.id)
                    ? "bg-black text-white"
                    : "bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Image
                    src={agent.logo || "/placeholder.svg"}
                    alt={agent.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="text-xs font-mono font-bold">{agent.name.split(" ")[0]}</span>
                </div>
                <div className="text-xs font-mono">${(agent.accountValue || 0).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedAgentData.length > 0 && (
          <>
            <div className="panel p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Performance Comparison (30 Days)</h2>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#666"
                      style={{ fontSize: "10px", fontFamily: "Space Mono" }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#666"
                      style={{ fontSize: "10px", fontFamily: "Space Mono" }}
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <Tooltip content={(props) => <ChartTooltip {...props} agentData={selectedAgentData} />} />
                    <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "Space Mono" }} />
                    {selectedAgentData.map((agent) => (
                      <Line
                        key={agent.id}
                        type="monotone"
                        dataKey={agent.id}
                        stroke={agent.color}
                        strokeWidth={2}
                        name={agent.name}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Key Metrics Comparison</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-3 px-2">METRIC</th>
                      {selectedAgentData.map((agent) => (
                        <th key={agent.id} className="text-center py-3 px-2">
                          <div className="flex items-center justify-center gap-2">
                            <Image
                              src={agent.logo || "/placeholder.svg"}
                              alt={agent.name}
                              width={16}
                              height={16}
                              className="rounded-full"
                            />
                            <span>{agent.name.split(" ")[0]}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-2 font-bold">Account Value</td>
                      {selectedAgentData.map((agent) => (
                        <td key={agent.id} className="py-3 px-2 text-center font-bold">
                          ${(agent.accountValue || 0).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-3 px-2 font-bold">Total P&L</td>
                      {selectedAgentData.map((agent) => (
                        <td
                          key={agent.id}
                          className={`py-3 px-2 text-center font-bold ${(agent.totalPnL || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          ${(agent.totalPnL || 0).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-2 font-bold">Return %</td>
                      {selectedAgentData.map((agent) => (
                        <td
                          key={agent.id}
                          className={`py-3 px-2 text-center font-bold ${(agent.returnPercent || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {(agent.returnPercent || 0) >= 0 ? "+" : ""}
                          {(agent.returnPercent || 0).toFixed(2)}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-3 px-2 font-bold">Win Rate</td>
                      {selectedAgentData.map((agent) => (
                        <td key={agent.id} className="py-3 px-2 text-center">
                          {(agent.winRate || 0).toFixed(1)}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-3 px-2 font-bold">Avg Leverage</td>
                      {selectedAgentData.map((agent) => (
                        <td key={agent.id} className="py-3 px-2 text-center">
                          {agent.avgLeverage}x
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-2 font-bold">Active Positions</td>
                      {selectedAgentData.map((agent) => (
                        <td key={agent.id} className="py-3 px-2 text-center">
                          {agent.activePositions}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Advanced Risk Metrics</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-3 px-2">RISK METRIC</th>
                      {selectedAgentData.map((agent) => (
                        <th key={agent.id} className="text-center py-3 px-2">
                          {agent.name.split(" ")[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-2 font-bold">Max Drawdown</td>
                      {selectedAgentData.map((agent) => (
                        <td key={agent.id} className="py-3 px-2 text-center text-red-600">
                          {getMaxDrawdown(agent.id)}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-3 px-2 font-bold">Volatility (Std Dev)</td>
                      {selectedAgentData.map((agent) => (
                        <td key={agent.id} className="py-3 px-2 text-center">
                          {getVolatility(agent.id)}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-2 font-bold">Sortino Ratio</td>
                      {selectedAgentData.map((agent) => (
                        <td key={agent.id} className="py-3 px-2 text-center">
                          {getSortinoRatio(agent.id)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-3 px-2 font-bold">Calmar Ratio</td>
                      {selectedAgentData.map((agent) => (
                        <td key={agent.id} className="py-3 px-2 text-center">
                          {getCalmarRatio(agent.id)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="text-lg font-semibold mb-4">Performance Metrics Bar Chart</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={selectedAgentData.map((agent) => ({
                      name: agent.name.split(" ")[0],
                      "Return %": Math.max(0, agent.returnPercent || 0),
                      "Win Rate": Math.max(0, agent.winRate || 0),
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#666"
                      style={{ fontSize: "10px", fontFamily: "Space Mono" }}
                      tickLine={false}
                    />
                    <YAxis stroke="#666" style={{ fontSize: "10px", fontFamily: "Space Mono" }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "2px solid black",
                        borderRadius: "0",
                        fontSize: "10px",
                        fontFamily: "Space Mono",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "Space Mono" }} />
                    <Bar dataKey="Return %" fill="#10B981" />
                    <Bar dataKey="Win Rate" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
