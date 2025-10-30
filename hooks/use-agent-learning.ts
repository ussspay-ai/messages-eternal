"use client"

import { useEffect, useState } from "react"
import { AgentParameters, LearningUpdate, PerformanceMetrics } from "@/lib/types/learning"

interface OptimizationResult {
  agent_id: string
  status: "optimized" | "skipped" | "error"
  reason: string
  update?: LearningUpdate
  error?: string
}

interface UseAgentLearningResult {
  parameters: AgentParameters | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  optimize: (agentId?: string, forceOptimize?: boolean) => Promise<OptimizationResult[]>
  optimizationResults: OptimizationResult[] | null
  updateParameters: (newParams: Partial<AgentParameters>) => Promise<void>
}

/**
 * Hook to manage agent learning and optimization
 */
export function useAgentLearning(agentId?: string): UseAgentLearningResult {
  const [parameters, setParameters] = useState<AgentParameters | null>(null)
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch agent parameters
  const fetchParameters = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const url = agentId
        ? `/api/aster/agents/parameters?agentId=${agentId}`
        : `/api/aster/agents/parameters`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setParameters(data.parameters || data.parameters)
      } else {
        setError(data.error || "Failed to fetch parameters")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch optimization results
  const fetchOptimizationResults = async () => {
    try {
      const response = await fetch(`/api/aster/agents/optimize`)
      const data = await response.json()

      if (data.success && data.results) {
        setOptimizationResults(data.results)
      }
    } catch (err) {
      console.error("Failed to fetch optimization results:", err)
    }
  }

  // Run optimization
  const optimize = async (targetAgentId?: string, forceOptimize = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/aster/agents/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: targetAgentId || agentId,
          tradesLimit: 100,
          forceOptimize,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setOptimizationResults(data.results)
        // Refetch parameters after optimization
        await fetchParameters()
        return data.results
      } else {
        setError(data.error || "Optimization failed")
        return []
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  // Update parameters
  const updateParameters = async (newParams: Partial<AgentParameters>) => {
    if (!agentId || !parameters) {
      setError("Agent ID or parameters not available")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/aster/agents/parameters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          parameters: { ...parameters, ...newParams },
        }),
      })

      const data = await response.json()

      if (data.success) {
        setParameters(data.parameters)
      } else {
        setError(data.error || "Failed to update parameters")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchParameters()
    fetchOptimizationResults()
  }, [agentId])

  return {
    parameters,
    isLoading,
    error,
    refetch: fetchParameters,
    optimize,
    optimizationResults,
    updateParameters,
  }
}

/**
 * Hook to get specific performance metrics
 */
export function useAgentPerformance(agentId: string) {
  const { optimizationResults } = useAgentLearning(agentId)

  const result = optimizationResults?.find((r) => r.agent_id === agentId)

  if (!result?.update?.performance_before) {
    return null
  }

  const metrics = result.update.performance_before

  return {
    winRate: metrics.win_rate,
    profitFactor: metrics.profit_factor,
    sharpeRatio: metrics.sharpe_ratio,
    maxDrawdown: metrics.max_drawdown,
    totalTrades: metrics.total_trades,
    bestSymbol: metrics.best_symbol,
    worstSymbol: metrics.worst_symbol,
  }
}

/**
 * Format parameter value for display
 */
export function formatParameterValue(key: string, value: any): string {
  switch (key) {
    case "leverage":
      return `${value}x`
    case "stop_loss_percent":
    case "take_profit_percent":
    case "grid_interval":
    case "arbitrage_min_spread":
      return `${value}%`
    case "position_size":
      return `${(value * 100).toFixed(0)}%`
    case "ml_confidence_threshold":
      return `${(value * 100).toFixed(0)}%`
    case "momentum_threshold":
    case "breakout_sensitivity":
    case "grid_levels":
    case "prediction_timeframe":
      return `${value}`
    case "last_updated":
      return new Date(value).toLocaleString()
    default:
      return String(value)
  }
}