"use client"

import { AgentParameters } from "@/lib/types/learning"
import { formatParameterValue } from "@/hooks/use-agent-learning"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Zap, Target } from "lucide-react"

interface AgentLearningDisplayProps {
  parameters: AgentParameters | null
  isLoading?: boolean
  onOptimize?: () => void
}

export function AgentLearningDisplay({
  parameters,
  isLoading = false,
  onOptimize,
}: AgentLearningDisplayProps) {
  if (!parameters) {
    return (
      <Card className="p-4">
        <p className="text-[11px] text-muted-foreground">Loading learning parameters...</p>
      </Card>
    )
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">Excellent</Badge>
    if (score >= 60) return <Badge className="bg-blue-500">Good</Badge>
    if (score >= 40) return <Badge className="bg-yellow-500">Fair</Badge>
    return <Badge className="bg-red-500">Poor</Badge>
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-blue-600"
    if (score >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const coreParams = [
    { key: "leverage", label: "Leverage", icon: <Zap className="w-4 h-4" /> },
    { key: "stop_loss_percent", label: "Stop Loss", icon: <TrendingDown className="w-4 h-4" /> },
    { key: "take_profit_percent", label: "Take Profit", icon: <TrendingUp className="w-4 h-4" /> },
    { key: "position_size", label: "Position Size", icon: <Target className="w-4 h-4" /> },
  ]

  const strategyParams = Object.entries(parameters).filter(
    ([key]) =>
      ![
        "leverage",
        "stop_loss_percent",
        "take_profit_percent",
        "position_size",
        "last_updated",
        "optimization_score",
      ].includes(key)
  )

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header with optimization score */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold">LEARNING PARAMETERS</h3>
            <p className="text-[11px] text-muted-foreground">
              Last updated: {new Date(parameters.last_updated).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold ${getScoreColor(parameters.optimization_score)}`}>
              {parameters.optimization_score}
            </div>
            <p className="text-xs text-muted-foreground">Optimization Score</p>
            {getScoreBadge(parameters.optimization_score)}
          </div>
        </div>

        {/* Core parameters grid */}
        <div>
          <h4 className="text-[11px] font-medium mb-3">CORE PARAMETERS</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {coreParams.map(({ key, label, icon }) => (
              <div
                key={key}
                className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  {icon}
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <p className="text-xs font-semibold">
                  {formatParameterValue(key, (parameters as any)[key])}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy-specific parameters */}
        {strategyParams.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium mb-3">STRATEGY PARAMETERS</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {strategyParams.map(([key, value]) => (
                <div key={key} className="p-2 border rounded bg-muted/50">
                  <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                  <p className="text-[11px] font-medium">{formatParameterValue(key, value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        {onOptimize && (
          <Button
            onClick={onOptimize}
            disabled={isLoading}
            className="w-full"
            variant="default"
          >
            {isLoading ? "Optimizing..." : "Run Optimization"}
          </Button>
        )}
      </div>
    </Card>
  )
}

interface OptimizationResultsDisplayProps {
  results: Array<{
    agent_id: string
    status: "optimized" | "skipped" | "error"
    reason: string
    update?: any
  }>
}

export function OptimizationResultsDisplay({
  results,
}: OptimizationResultsDisplayProps) {
  const optimized = results.filter((r) => r.status === "optimized")
  const skipped = results.filter((r) => r.status === "skipped")
  const errors = results.filter((r) => r.status === "error")

  return (
    <Card className="p-6">
      <h3 className="text-xs font-semibold mb-4">OPTIMIZATION RESULTS</h3>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="optimized" disabled={optimized.length === 0}>
            Optimized ({optimized.length})
          </TabsTrigger>
          <TabsTrigger value="skipped" disabled={skipped.length === 0}>
            Skipped ({skipped.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
              <p className="text-[11px] text-muted-foreground">Optimized</p>
              <p className="text-xs font-bold text-green-600">{optimized.length}</p>
            </div>
            <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
              <p className="text-[11px] text-muted-foreground">Skipped</p>
              <p className="text-xs font-bold text-yellow-600">{skipped.length}</p>
            </div>
            <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
              <p className="text-[11px] text-muted-foreground">Errors</p>
              <p className="text-xs font-bold text-red-600">{errors.length}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="optimized" className="space-y-3">
          {optimized.map((result) => (
            <div
              key={result.agent_id}
              className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium capitalize">{result.agent_id.replace(/_/g, " ")}</h4>
                <Badge className="bg-green-500">Optimized</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">{result.reason}</p>

              {result.update && (
                <div className="text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(result.update.old_parameters).map(([key, oldVal]: any) => {
                      const newVal = result.update.new_parameters[key]
                      if (oldVal === newVal || key === "last_updated" || key === "optimization_score") {
                        return null
                      }
                      return (
                        <div key={key} className="p-2 bg-white dark:bg-black/20 rounded">
                          <p className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                          <p className="font-medium">
                            {formatParameterValue(key, oldVal)} →{" "}
                            <span className="text-green-600">{formatParameterValue(key, newVal)}</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-muted-foreground">
                    Confidence: <span className="font-medium">{(result.update.confidence * 100).toFixed(0)}%</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="skipped" className="space-y-3">
          {skipped.map((result) => (
            <div
              key={result.agent_id}
              className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium capitalize">{result.agent_id.replace(/_/g, " ")}</h4>
                <Badge variant="secondary">Skipped</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{result.reason}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </Card>
  )
}