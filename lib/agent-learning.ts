/**
 * Agent Learning Utilities
 * Helper functions to fetch, apply, and manage learned parameters
 */

import { AgentParameters } from "@/lib/types/learning"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"
import { DEFAULT_PARAMETERS } from "@/lib/learning-engine"

/**
 * Get current parameters for an agent (learned or default)
 */
export async function getAgentParameters(agentId: string): Promise<AgentParameters> {
  // Try cache first
  const cached = await getCache<AgentParameters>(CACHE_KEYS.agentParameters(agentId))
  if (cached) {
    return cached
  }

  // Fall back to defaults
  const defaults = DEFAULT_PARAMETERS[agentId] || DEFAULT_PARAMETERS.claude_arbitrage
  
  // Cache the defaults
  await setCache(CACHE_KEYS.agentParameters(agentId), defaults, { ttl: 86400 })
  
  return defaults
}

/**
 * Update agent parameters (after learning)
 */
export async function updateAgentParameters(
  agentId: string,
  parameters: AgentParameters
): Promise<void> {
  await setCache(CACHE_KEYS.agentParameters(agentId), parameters, { ttl: 86400 })
}

/**
 * Get parameter values as a human-readable string
 */
export function formatParameters(params: AgentParameters): string {
  const parts = [
    `Leverage: ${params.leverage}x`,
    `SL: ${params.stop_loss_percent}%`,
    `TP: ${params.take_profit_percent}%`,
    `Position: ${params.position_size * 100}%`,
  ]

  if (params.momentum_threshold !== undefined) {
    parts.push(`Momentum: ${params.momentum_threshold}`)
  }
  if (params.grid_interval !== undefined) {
    parts.push(`Grid: ${params.grid_interval}%`)
  }
  if (params.ml_confidence_threshold !== undefined) {
    parts.push(`ML Confidence: ${(params.ml_confidence_threshold * 100).toFixed(0)}%`)
  }

  return parts.join(" | ")
}

/**
 * Compare two parameter sets and show differences
 */
export function compareParameters(
  old: AgentParameters,
  newParams: AgentParameters
): Record<string, { old: any; new: any; change: string }> {
  const changes: Record<string, { old: any; new: any; change: string }> = {}

  if (old.leverage !== newParams.leverage) {
    changes.leverage = {
      old: old.leverage,
      new: newParams.leverage,
      change: `${((newParams.leverage / old.leverage - 1) * 100).toFixed(1)}%`,
    }
  }

  if (old.stop_loss_percent !== newParams.stop_loss_percent) {
    changes.stop_loss_percent = {
      old: old.stop_loss_percent,
      new: newParams.stop_loss_percent,
      change: `${((newParams.stop_loss_percent / old.stop_loss_percent - 1) * 100).toFixed(1)}%`,
    }
  }

  if (old.take_profit_percent !== newParams.take_profit_percent) {
    changes.take_profit_percent = {
      old: old.take_profit_percent,
      new: newParams.take_profit_percent,
      change: `${((newParams.take_profit_percent / old.take_profit_percent - 1) * 100).toFixed(1)}%`,
    }
  }

  if (old.position_size !== newParams.position_size) {
    changes.position_size = {
      old: old.position_size,
      new: newParams.position_size,
      change: `${((newParams.position_size / old.position_size - 1) * 100).toFixed(1)}%`,
    }
  }

  return changes
}

/**
 * Calculate expected performance improvement
 */
export function estimatePerformanceImprovement(
  oldParams: AgentParameters,
  newParams: AgentParameters,
  currentWinRate: number
): number {
  let improvement = 0

  // Leverage impact
  if (newParams.leverage > oldParams.leverage) {
    improvement += (newParams.leverage - oldParams.leverage) * (currentWinRate > 60 ? 5 : 2)
  } else if (newParams.leverage < oldParams.leverage) {
    improvement -= (oldParams.leverage - newParams.leverage) * 3
  }

  // Stop loss tightening helps reduce losses
  if (newParams.stop_loss_percent < oldParams.stop_loss_percent) {
    improvement += (oldParams.stop_loss_percent - newParams.stop_loss_percent) * 5
  }

  // Position size impact
  if (newParams.position_size > oldParams.position_size) {
    improvement += (newParams.position_size - oldParams.position_size) * 100 * (currentWinRate > 50 ? 2 : 1)
  }

  return Math.round(improvement * 100) / 100
}