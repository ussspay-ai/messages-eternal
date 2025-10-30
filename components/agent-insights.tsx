"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AgentInsight {
  agentInfo: {
    id: string
    name: string
    model: string
    strategy: string
  }
  status: any
  recentTrades: any[]
  recentSignals: any[]
  recentThinking: any[]
  timestamps: {
    lastTrade: string | null
    lastSignal: string | null
    lastThinking: string | null
    lastHeartbeat: string | null
  }
}

export function AgentInsights({ agentId }: { agentId: string }) {
  const [insight, setInsight] = useState<AgentInsight | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/aster/agent-insights")
        if (!response.ok) throw new Error("Failed to fetch insights")

        const data = await response.json()
        setInsight(data.insights[agentId] || null)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
    const interval = setInterval(fetchInsights, 5000) // Refresh every 5s

    return () => clearInterval(interval)
  }, [agentId])

  if (loading) {
    return <div className="text-sm text-gray-500">Loading insights...</div>
  }

  if (error || !insight) {
    return <div className="text-sm text-red-500">Error: {error || "No data available"}</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getSignalColor = (action: string) => {
    switch (action) {
      case "BUY":
        return "bg-green-100 text-green-800"
      case "SELL":
        return "bg-red-100 text-red-800"
      case "HOLD":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{insight.agentInfo.name}</CardTitle>
            <CardDescription>{insight.agentInfo.model}</CardDescription>
          </div>
          <Badge className={getStatusColor(insight.status?.status || "unknown")}>
            {insight.status?.status || "unknown"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="thinking" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="thinking">Thinking</TabsTrigger>
            <TabsTrigger value="signals">Signals</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          {/* Thinking Tab */}
          <TabsContent value="thinking" className="space-y-3">
            <ScrollArea className="h-[300px] w-full border rounded-lg p-4">
              {insight.recentThinking.length > 0 ? (
                <div className="space-y-3">
                  {insight.recentThinking.map((t, i) => (
                    <div key={i} className="border-l-2 border-blue-500 pl-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {t.thinking_type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(t.thinking_timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-gray-700">{t.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No thinking logs yet</p>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Signals Tab */}
          <TabsContent value="signals" className="space-y-3">
            <ScrollArea className="h-[300px] w-full border rounded-lg p-4">
              {insight.recentSignals.length > 0 ? (
                <div className="space-y-3">
                  {insight.recentSignals.map((s, i) => (
                    <div key={i} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <Badge className={getSignalColor(s.action)}>
                          {s.action} - {s.confidence}%
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(s.signal_timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mt-2 text-gray-700">{s.reasoning}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No signals yet</p>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value="trades" className="space-y-3">
            <ScrollArea className="h-[300px] w-full border rounded-lg p-4">
              {insight.recentTrades.length > 0 ? (
                <div className="space-y-3">
                  {insight.recentTrades.map((t, i) => (
                    <div key={i} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={t.side === "BUY" ? "bg-green-600" : "bg-red-600"}>
                            {t.side}
                          </Badge>
                          <span className="text-sm font-semibold">{t.quantity}</span>
                          <span className="text-sm text-gray-600">@ ${t.entry_price}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {t.status}
                        </Badge>
                      </div>
                      <p className="text-sm mt-2 text-gray-700">{t.reason}</p>
                      {t.pnl && (
                        <p className={`text-sm mt-1 font-semibold ${t.pnl > 0 ? "text-green-600" : "text-red-600"}`}>
                          PnL: ${t.pnl.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No trades yet</p>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge className={getStatusColor(insight.status?.status || "unknown")}>
                  {insight.status?.status || "unknown"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Heartbeat:</span>
                <span className="text-gray-800">
                  {insight.status?.last_heartbeat
                    ? new Date(insight.status.last_heartbeat).toLocaleTimeString()
                    : "Never"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Position:</span>
                <span className="text-gray-800 font-mono">{insight.status?.current_position || "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thinking:</span>
                <span className="text-gray-800 text-right">{insight.status?.thinking_message || "-"}</span>
              </div>
              {insight.status?.performance_metrics && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className="text-gray-800 font-semibold">
                    ${insight.status.performance_metrics.balance?.toFixed(2) || "0.00"}
                  </span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}