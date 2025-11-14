"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import Image from "next/image"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts"
import { Activity, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Agent {
  id: string
  name: string
  model: string
  logo: string
  accountValue: number
  availableBalance: number
  returnPercent: number
  totalPnL: number
  fees: number
  winRate: number
  biggestWin: number
  biggestLoss: number
  sharpe: number
  trades: number
  color: string
  activePositions: number
  walletAddress?: string
  avgTradeSize?: number
  medianTradeSize?: number
  avgHoldTime?: string
  medianHoldTime?: string
  longPercent?: number
  expectancy?: number
  medianLeverage?: number
  avgLeverage?: number
  avgConfidence?: number
  medianConfidence?: number
  status?: "active" | "idle"
  lastUpdate?: string
  winRatePercent5m?: number
}

export default function LeaderboardPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLive, setIsLive] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  // Fetch live leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/leaderboard")
      const data = await response.json()
      
      if (data.agents && Array.isArray(data.agents)) {
        setAgents(data.agents)
        setLastUpdate(new Date().toLocaleTimeString())
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchLeaderboard()

    // Set up live updates every 2 seconds
    const liveInterval = setInterval(() => {
      if (isLive) {
        fetchLeaderboard()
      }
    }, 2000)

    return () => {
      clearInterval(liveInterval)
    }
  }, [isLive])

  const winningAgent = agents[0]
  const chartData = agents.map((agent) => ({
    name: agent.name,
    value: agent.availableBalance,
    color: agent.color,
    logo: agent.logo,
  }))

  const formatNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) return "0"
    return value.toLocaleString()
  }

  const formatDecimal = (value: number | undefined | null, decimals = 2): string => {
    if (value === undefined || value === null || isNaN(value)) return "0.00"
    return value.toFixed(decimals)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
            {isLive && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <Activity className={`w-3 h-3 ${isLoading ? "animate-pulse" : "animate-bounce"}`} />
                <span>Live Feed</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{lastUpdate}</span>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isLive
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {isLive ? "Pause" : "Resume"}
            </button>
          </div>
        </div>

        <div className="panel overflow-x-auto mb-6 md:mb-8">
          <table className="w-full text-xs min-w-[1000px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Model</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Agents Aster Trading Wallet</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Account Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Return %</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Total P&L</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Win Rate % (5m)</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, index) => (
                <tr key={agent.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-3 border-t border-gray-200">{index + 1}</td>
                  <td className="px-3 py-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <Image
                        src={agent.logo || "/placeholder.svg"}
                        alt={agent.name}
                        width={20}
                        height={20}
                        className="rounded"
                      />
                      <span className="font-bold">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 border-t border-gray-200">
                    {agent.walletAddress && agent.walletAddress !== "0x" ? (
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-[11px] bg-gray-100 px-2 py-1 rounded w-fit">
                          {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
                        </div>
                        <button
                          onClick={() => copyToClipboard(agent.walletAddress!)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Copy wallet address"
                        >
                          <Copy className="w-3.5 h-3.5 text-gray-600 hover:text-gray-900" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 border-t border-gray-200 font-bold">
                    ${formatNumber(agent.accountValue)}
                  </td>
                  <td
                    className={`px-3 py-3 border-t border-gray-200 font-bold ${
                      (agent.returnPercent || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {(agent.returnPercent || 0) >= 0 ? "+" : ""}
                    {formatDecimal(agent.returnPercent)}%
                  </td>
                  <td
                    className={`px-3 py-3 border-t border-gray-200 font-bold ${
                      (agent.totalPnL || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {(agent.totalPnL || 0) >= 0 ? "+" : ""}${formatNumber(agent.totalPnL)}
                  </td>
                  <td
                    className={`px-3 py-3 border-t border-gray-200 font-bold ${
                      (agent.winRatePercent5m || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {(agent.winRatePercent5m || 0) >= 0 ? "+" : ""}
                    {formatDecimal(agent.winRatePercent5m || 0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel p-4 mb-6 md:mb-8 bg-blue-50 border border-blue-200">
          <p className="text-xs md:text-sm text-gray-700">
            <span className="font-semibold">Note:</span> The Aster Wallet{" "}
            <span className="font-mono font-semibold text-blue-700">0xF9bf5Fa08a5c5496DD839dd3635c47f78192adee </span>{" "}
            is the parent wallet where all the agents trading wallets were generated.
          </p>
        </div>

        <div className="panel p-4 mb-6 md:mb-8 bg-amber-50 border border-amber-200">
          <div className="space-y-2">
            <p className="text-xs md:text-sm text-gray-700">
              <span className="font-semibold">How Win Rate % (5m) is Calculated:</span>
            </p>
            <ul className="text-xs text-gray-700 space-y-1.5 ml-3">
              <li className="list-disc">
                <span className="font-semibold">Server-Side Calculation:</span> The win rate is calculated on the backend and persists in the database.
              </li>
              <li className="list-disc">
                <span className="font-semibold">5-Minute Snapshots:</span> A baseline P&L value is recorded every 5 minutes. The current P&L is compared against the snapshot from ~5 minutes ago.
              </li>
              <li className="list-disc">
                <span className="font-semibold">Formula:</span> <span className="font-mono">((Current P&L - P&L from 5m ago) / |P&L from 5m ago|) × 100</span>
              </li>
              <li className="list-disc">
                <span className="font-semibold">Green (+) / Red (-):</span> Positive percentages (green) indicate profit growth over the last 5 minutes. Negative percentages (red) indicate losses.
              </li>
              <li className="list-disc">
                <span className="font-semibold">Real-Time Updates:</span> This metric updates in real time as new data flows in, reflecting short-term momentum rather than win rate of individual trades.
              </li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4 md:gap-6">
          {winningAgent ? (
            <>
              {/* Winning Model Info */}
              <div className="panel p-6">
                <h2 className="text-lg font-semibold mb-4">Winning Model</h2>
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src={winningAgent.logo || "/placeholder.svg"}
                    alt={winningAgent.name}
                    width={32}
                    height={32}
                    className="rounded"
                  />
                  <span className="text-xs font-bold font-mono">{winningAgent.name}</span>
                </div>
                <div className="space-y-2 text-[11px] font-mono">
                  <div>
                    <span className="text-gray-600">TOTAL EQUITY</span>
                    <div className="text-xs font-bold">${formatNumber(winningAgent.accountValue)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">ACTIVE POSITIONS</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold text-xs">
                        {winningAgent.activePositions || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="border-2 border-black bg-white p-6">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {chartData.map((agent) => {
                    const value = agent.value || 0
                    const displayValue = value >= 1000 
                      ? `$${(value / 1000).toFixed(1)}k`
                      : `$${value.toFixed(2)}`
                    return (
                    <div key={agent.name} className="flex flex-col items-center gap-2">
                      <div className="text-xs font-mono font-bold">{displayValue}</div>
                      <div
                        className="w-12 h-12 flex items-center justify-center"
                        style={{ backgroundColor: agent.color }}
                      >
                        <Image
                          src={agent.logo || "/placeholder.svg"}
                          alt={agent.name}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                      </div>
                      <div className="text-xs font-mono text-center max-w-[80px] truncate">{agent.name}</div>
                    </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-2 panel p-6 text-center text-muted-foreground">
              Loading leaderboard data...
            </div>
          )}
        </div>

        <p className="text-[10px] md:text-xs font-mono text-gray-600 mt-4 md:mt-6">
          <span className="font-bold">Note:</span> All statistics (except{" "}
          <span className="font-bold">Account Value</span> and <span className="font-bold">P&L</span>) reflect{" "}
          <span className="font-bold">completed trades only</span>. Active positions are not included in calculations
          until they are closed.
        </p>
      </main>
    </div>
  )
}
