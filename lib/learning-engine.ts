/**
 * Self-Learning Engine for AI Trading Agents
 * Analyzes trade history and optimizes parameters
 */

import { AgentParameters, PerformanceMetrics, LearningUpdate } from "@/lib/types/learning"
import { Trade } from "@/lib/types/trading"

/**
 * Convert Aster API trades to internal Trade format
 */
export function convertAsterTradesToTrades(
  asterTrades: any[],
  agentId: string
): Trade[] {
  return asterTrades.map((at) => ({
    id: at.id,
    agent_id: agentId,
    symbol: at.symbol,
    side: at.side,
    entry_price: at.price,
    exit_price: at.price,
    quantity: at.qty,
    entry_time: new Date(at.time).toISOString(),
    exit_time: new Date(at.time).toISOString(),
    pnl: at.realizedPnl,
    roi: (at.realizedPnl / (at.price * at.qty)) * 100,
    status: at.realizedPnl !== 0 ? "CLOSED" : "OPEN",
    aster_trade_id: at.id,
    created_at: new Date(at.time).toISOString(),
    updated_at: new Date(at.time).toISOString(),
  }))
}

// Default parameters for each agent type
export const DEFAULT_PARAMETERS: Record<string, AgentParameters> = {
  claude_arbitrage: {
    leverage: 2,
    stop_loss_percent: 1,
    take_profit_percent: 0.5,
    position_size: 0.5,
    arbitrage_min_spread: 0.1,
    last_updated: new Date().toISOString(),
    optimization_score: 50,
  },
  chatgpt_openai: {
    leverage: 3,
    stop_loss_percent: 2,
    take_profit_percent: 3,
    position_size: 0.3,
    momentum_threshold: 70,
    breakout_sensitivity: 75,
    last_updated: new Date().toISOString(),
    optimization_score: 50,
  },
  gemini_grid: {
    leverage: 1.5,
    stop_loss_percent: 3,
    take_profit_percent: 2,
    position_size: 0.4,
    grid_interval: 2,
    grid_levels: 10,
    last_updated: new Date().toISOString(),
    optimization_score: 50,
  },
  deepseek_ml: {
    leverage: 2,
    stop_loss_percent: 0.8,
    take_profit_percent: 1,
    position_size: 0.2,
    ml_confidence_threshold: 0.7,
    prediction_timeframe: 5,
    last_updated: new Date().toISOString(),
    optimization_score: 50,
  },
}

/**
 * Analyze trade history and calculate performance metrics
 */
export function analyzePerformance(agentId: string, trades: Trade[]): PerformanceMetrics {
  if (trades.length === 0) {
    return {
      agent_id: agentId,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      avg_win: 0,
      avg_loss: 0,
      profit_factor: 0,
      sharpe_ratio: 0,
      max_drawdown: 0,
      return_on_risk: 0,
      timestamp: new Date().toISOString(),
    }
  }

  const closedTrades = trades.filter((t) => t.status === "CLOSED")
  const winningTrades = closedTrades.filter((t) => t.pnl > 0)
  const losingTrades = closedTrades.filter((t) => t.pnl < 0)

  const totalPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0)
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0

  // Calculate metrics
  const winRate = (winningTrades.length / closedTrades.length) * 100 || 0
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0

  // Simple Sharpe ratio approximation (returns / volatility)
  const returns = closedTrades.map((t) => t.roi / 100)
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const sharpeRatio = stdDev > 0 ? mean / stdDev : 0

  // Max drawdown calculation
  let maxDrawdown = 0
  let runningMax = 0
  closedTrades.forEach((t) => {
    runningMax = Math.max(runningMax, t.pnl)
    const drawdown = ((runningMax - t.pnl) / Math.abs(runningMax)) * 100
    maxDrawdown = Math.max(maxDrawdown, drawdown)
  })

  // Symbol analysis
  const symbolPerformance: Record<string, { wins: number; losses: number }> = {}
  closedTrades.forEach((t) => {
    if (!symbolPerformance[t.symbol]) {
      symbolPerformance[t.symbol] = { wins: 0, losses: 0 }
    }
    if (t.pnl > 0) {
      symbolPerformance[t.symbol].wins++
    } else {
      symbolPerformance[t.symbol].losses++
    }
  })

  const bestSymbol = Object.entries(symbolPerformance).reduce<[string, { wins: number; losses: number }]>(
    (prev, [sym, perf]) => {
      const prevWinRate = (prev[1].wins / (prev[1].wins + prev[1].losses)) * 100 || 0
      const currWinRate = (perf.wins / (perf.wins + perf.losses)) * 100 || 0
      return currWinRate > prevWinRate ? [sym, perf] : prev
    },
    ["", { wins: 0, losses: 0 }]
  )[0]

  const worstSymbol = Object.entries(symbolPerformance).reduce<[string, { wins: number; losses: number }]>(
    (prev, [sym, perf]) => {
      const prevWinRate = (prev[1].wins / (prev[1].wins + prev[1].losses)) * 100 || 0
      const currWinRate = (perf.wins / (perf.wins + perf.losses)) * 100 || 0
      return currWinRate < prevWinRate ? [sym, perf] : prev
    },
    ["", { wins: 0, losses: 0 }]
  )[0]

  return {
    agent_id: agentId,
    total_trades: closedTrades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    win_rate: winRate,
    avg_win: avgWin,
    avg_loss: avgLoss,
    profit_factor: profitFactor,
    sharpe_ratio: sharpeRatio,
    max_drawdown: maxDrawdown,
    return_on_risk: avgLoss > 0 ? avgWin / avgLoss : 0,
    best_symbol: bestSymbol,
    worst_symbol: worstSymbol,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Generate learning updates based on performance metrics
 */
export function generateLearningUpdate(
  agentId: string,
  currentParams: AgentParameters,
  metrics: PerformanceMetrics,
  agentModel: string
): LearningUpdate {
  const newParams = { ...currentParams }
  let reason = ""
  let confidence = 0

  // Strategy: Adjust leverage based on win rate
  if (metrics.win_rate > 70 && metrics.total_trades >= 10) {
    // High win rate - increase leverage slightly
    const leverageIncrease = Math.min(newParams.leverage * 1.1, 5) // Max 5x
    newParams.leverage = Math.round(leverageIncrease * 10) / 10
    reason += `High win rate (${metrics.win_rate.toFixed(1)}%), increasing leverage. `
    confidence += 0.3
  } else if (metrics.win_rate < 40 && metrics.total_trades >= 10) {
    // Low win rate - decrease leverage
    const leverageDecrease = Math.max(newParams.leverage * 0.8, 1) // Min 1x
    newParams.leverage = Math.round(leverageDecrease * 10) / 10
    reason += `Low win rate (${metrics.win_rate.toFixed(1)}%), decreasing leverage. `
    confidence += 0.4
  }

  // Strategy: Tighten stop loss if drawdown is high
  if (metrics.max_drawdown > 15 && metrics.total_trades >= 5) {
    newParams.stop_loss_percent = Math.max(newParams.stop_loss_percent * 0.9, 0.3)
    reason += `High max drawdown (${metrics.max_drawdown.toFixed(1)}%), tightening stops. `
    confidence += 0.25
  }

  // Strategy: Adjust take profit based on profit factor
  if (metrics.profit_factor > 2.5 && metrics.total_trades >= 10) {
    // Good ratio - increase take profit slightly to capture more upside
    newParams.take_profit_percent = Math.min(newParams.take_profit_percent * 1.15, 10)
    reason += `Excellent profit factor (${metrics.profit_factor.toFixed(2)}), increasing take profit. `
    confidence += 0.2
  } else if (metrics.profit_factor < 1 && metrics.total_trades >= 10) {
    // Poor ratio - reduce take profit target
    newParams.take_profit_percent = Math.max(newParams.take_profit_percent * 0.85, 0.5)
    reason += `Poor profit factor (${metrics.profit_factor.toFixed(2)}), tightening take profit. `
    confidence += 0.25
  }

  // Strategy: Adjust position size based on Sharpe ratio
  if (metrics.sharpe_ratio > 1 && metrics.total_trades >= 10) {
    // Good risk-adjusted returns - increase position size
    newParams.position_size = Math.min(newParams.position_size * 1.1, 1)
    reason += `Good Sharpe ratio (${metrics.sharpe_ratio.toFixed(2)}), increasing position size. `
    confidence += 0.15
  } else if (metrics.sharpe_ratio < -0.5 && metrics.total_trades >= 10) {
    // Poor risk-adjusted returns - decrease position size
    newParams.position_size = Math.max(newParams.position_size * 0.8, 0.1)
    reason += `Poor Sharpe ratio (${metrics.sharpe_ratio.toFixed(2)}), decreasing position size. `
    confidence += 0.2
  }

  // Model-specific adjustments
  if ((agentModel === "gpt4" || agentModel === "openai") && metrics.best_symbol) {
    newParams.momentum_threshold = Math.min(
      newParams.momentum_threshold! * (1 + metrics.win_rate / 100),
      100
    )
    reason += `Focused on best symbol (${metrics.best_symbol}). `
    confidence += 0.1
  }

  if (agentModel === "deepseek" && metrics.profit_factor > 1.5) {
    newParams.ml_confidence_threshold = Math.max(
      newParams.ml_confidence_threshold! * 0.95,
      0.5
    )
    reason += `ML model improving, lowering confidence threshold. `
    confidence += 0.15
  }

  // Round parameters to reasonable precision
  newParams.leverage = Math.round(newParams.leverage * 10) / 10
  newParams.stop_loss_percent = Math.round(newParams.stop_loss_percent * 100) / 100
  newParams.take_profit_percent = Math.round(newParams.take_profit_percent * 100) / 100
  newParams.position_size = Math.round(newParams.position_size * 100) / 100
  newParams.last_updated = new Date().toISOString()

  // Calculate optimization score
  newParams.optimization_score = Math.min(
    currentParams.optimization_score + Math.floor(confidence * 30),
    100
  )

  return {
    agent_id: agentId,
    old_parameters: currentParams,
    new_parameters: newParams,
    performance_before: metrics,
    performance_reason: reason || "No significant changes in performance.",
    confidence: Math.round(confidence * 100) / 100,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Calculate optimization score based on how well parameters are tuned
 */
export function calculateOptimizationScore(metrics: PerformanceMetrics): number {
  let score = 50 // baseline

  // Win rate component
  if (metrics.win_rate >= 60) score += 15
  else if (metrics.win_rate >= 50) score += 10
  else if (metrics.win_rate >= 40) score += 5

  // Profit factor component
  if (metrics.profit_factor >= 2) score += 15
  else if (metrics.profit_factor >= 1.5) score += 10
  else if (metrics.profit_factor >= 1) score += 5

  // Sharpe ratio component
  if (metrics.sharpe_ratio >= 1) score += 15
  else if (metrics.sharpe_ratio >= 0.5) score += 10
  else if (metrics.sharpe_ratio >= 0) score += 5

  // Drawdown penalty
  if (metrics.max_drawdown > 30) score -= 20
  else if (metrics.max_drawdown > 20) score -= 10
  else if (metrics.max_drawdown > 10) score -= 5

  return Math.max(Math.min(score, 100), 0)
}