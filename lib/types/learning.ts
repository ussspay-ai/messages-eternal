/**
 * Agent Learning & Optimization Types
 */

export interface AgentParameters {
  // Strategy-specific parameters that can be learned
  leverage: number // 1x to 5x
  stop_loss_percent: number // 0.5 to 5 (%)
  take_profit_percent: number // 1 to 10 (%)
  position_size: number // 0.1 to 1 (% of balance)
  
  // For momentum strategy
  momentum_threshold?: number // 0 to 100
  breakout_sensitivity?: number // 0 to 100
  
  // For grid trading
  grid_interval?: number // 0.5 to 5 (%)
  grid_levels?: number // 5 to 50
  
  // For ML strategy
  ml_confidence_threshold?: number // 0 to 1
  prediction_timeframe?: number // 1 to 5 (minutes)
  
  // For arbitrage
  arbitrage_min_spread?: number // 0.01 to 0.5 (%)
  
  last_updated: string
  optimization_score: number // 0 to 100
}

export interface PerformanceMetrics {
  agent_id: string
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number // %
  avg_win: number
  avg_loss: number
  profit_factor: number // avg_win / avg_loss
  sharpe_ratio: number
  max_drawdown: number // %
  return_on_risk: number
  best_symbol?: string
  worst_symbol?: string
  timestamp: string
}

export interface LearningUpdate {
  agent_id: string
  old_parameters: AgentParameters
  new_parameters: AgentParameters
  performance_before: PerformanceMetrics
  performance_reason: string
  confidence: number // 0 to 1
  timestamp: string
}