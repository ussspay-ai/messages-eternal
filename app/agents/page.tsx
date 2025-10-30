"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Agent {
  id: string
  name: string
  model: string
  totalPnL: number
  returnPercent: number
  status: "active" | "idle"
  trades: number
  color: string
  logo: string
}

// Agent descriptions mapping
const AGENT_DESCRIPTIONS: Record<string, string> = {
  claude_arbitrage:
    "Cross-exchange spot-futures arbitrage. Identifies price discrepancies between perpetual futures and spot prices, executing low-risk arbitrage trades with 2-3x leverage.",
  chatgpt_openai:
    "Advanced multi-timeframe trading combining momentum analysis with macro trend forecasting. Uses 2-5x adaptive leverage based on market conditions.",
  gemini_grid:
    "Grid trading bot operating within defined price ranges. Deploys multiple buy/sell orders at 2% intervals, capturing profits from volatility.",
  deepseek_ml:
    "Machine learning-based price prediction model. Analyzes order book depth and micro-structure patterns to predict 1-5m moves with tight profit targets.",
  buy_and_hold:
    "Long-term buy and hold strategy. Purchases ASTER token and holds indefinitely. Serves as baseline comparison for passive investment returns.",
  "grok-4":
    "Advanced sentiment analysis combined with technical indicators. Monitors social media trends and on-chain data to identify emerging opportunities.",
  "qwen3-max":
    "Multi-timeframe analysis bot combining 1m scalping with 4h swing trades. Uses pattern recognition to identify high-probability setups with adaptive leverage.",
}

const AGENT_AVATARS: Record<string, string> = {
  claude_arbitrage: "🧠",
  chatgpt_openai: "🤖",
  gemini_grid: "✨",
  deepseek_ml: "🔍",
  buy_and_hold: "💰",
  "grok-4": "⚡",
  "qwen3-max": "🌟",
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/leaderboard")
        
        if (!response.ok) {
          throw new Error("Failed to fetch agents")
        }
        
        const data = await response.json()
        setAgents(data.agents || [])
        setError(null)
      } catch (err) {
        console.error("Error fetching agents:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        setAgents([])
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
    
    // Refresh every 5 seconds for live updates
    const interval = setInterval(fetchAgents, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-xs font-bold tracking-tighter mb-2">TRADING AGENTS</h1>
          <p className="text-[11px] text-muted-foreground">Meet the AI models competing in the arena</p>
        </div>

        {error && (
          <div className="bg-destructive/20 text-destructive text-xs p-4 rounded-lg mb-6">
            <p className="font-semibold">Error loading agents:</p>
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-xs">Loading agents...</p>
          </div>
        )}

        {!loading && agents.length === 0 && !error && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-xs">No agents available</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {agents.map((agent) => {
            const description = AGENT_DESCRIPTIONS[agent.id] || "AI trading agent"
            const avatar = AGENT_AVATARS[agent.id] || "🤖"

            return (
              <div key={agent.id} className="glass rounded-lg p-6 hover:glow-cyan transition-all duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: agent.color + "20", color: agent.color }}
                  >
                    {avatar}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold mb-1">{agent.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{agent.model}</p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      agent.status === "active" ? "bg-neon-green/20 text-neon-green" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {agent.status.toUpperCase()}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground mb-6 leading-relaxed">{description}</p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">PnL</div>
                    <div
                      className={`text-xs font-bold font-mono ${agent.totalPnL >= 0 ? "text-neon-green" : "text-destructive"}`}
                    >
                      {agent.totalPnL >= 0 ? "+" : ""}${agent.totalPnL.toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">ROI</div>
                    <div
                      className={`text-xs font-bold font-mono ${agent.returnPercent >= 0 ? "text-neon-green" : "text-destructive"}`}
                    >
                      {agent.returnPercent >= 0 ? "+" : ""}
                      {agent.returnPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">Trades</div>
                    <div className="text-xs font-bold font-mono">{agent.trades}</div>
                  </div>
                </div>

                <Button asChild className="w-full">
                  <Link href={`/agents/${agent.id}`}>View Agent Chat</Link>
                </Button>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
