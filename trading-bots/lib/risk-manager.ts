/**
 * Risk Manager for Trading Agents
 * Handles position sizing, drawdown limits, and circuit breakers
 */

export interface RiskConfig {
  maxDrawdownPercent: number // Max allowed drawdown before stopping (e.g., 10%)
  maxPositionSizePercent: number // Max % of balance per position (e.g., 10%)
  maxDailyTrades: number // Max trades per day (e.g., 20)
  minWinRate: number // Min acceptable win rate (e.g., 0.4 = 40%)
  slippagePercent: number // Expected slippage/fees (e.g., 0.1%)
  volatilityMultiplier: number // Position size multiplier based on volatility (0-1)
  riskRewardRatio: number // Minimum risk:reward ratio (e.g., 1:2)
  correlationThreshold: number // Max correlation between positions (e.g., 0.7)
}

export interface PositionRisk {
  maxLossAmount: number
  positionSize: number
  adjustedLeverage: number
  slippageAdjustedTP: number
  slippageAdjustedSL: number
  recommendedAction: "HOLD" | "REDUCE" | "BUY" | "SELL"
  riskAssessment: string
}

export class RiskManager {
  private config: RiskConfig
  private dailyTradeCount = 0
  private dailyTradeCountTime = Date.now()
  private tradeHistory: Array<{ time: number; pnl: number; result: "WIN" | "LOSS" }> = []
  private peakEquity = 0
  private maxDrawdownSeen = 0

  constructor(config: Partial<RiskConfig> = {}) {
    this.config = {
      maxDrawdownPercent: 15,
      maxPositionSizePercent: 10,
      maxDailyTrades: 20,
      minWinRate: 0.4,
      slippagePercent: 0.15,
      volatilityMultiplier: 1,
      riskRewardRatio: 1.5,
      correlationThreshold: 0.7,
      ...config,
    }
  }

  /**
   * Calculate safe position size based on account equity and risk parameters
   */
  calculatePositionSize(
    equity: number,
    volatility: number,
    leverage: number,
    currentPrice: number
  ): number {
    // Base position size as % of equity
    const baseSize = (equity * this.config.maxPositionSizePercent) / 100

    // Adjust for volatility (higher volatility = smaller positions)
    const volatilityFactor = Math.max(0.5, 1 - volatility * 2)
    const adjustedSize = baseSize * volatilityFactor

    // Adjust for leverage (lower leverage = can take more)
    const leverageAdjustment = 1 / Math.max(1, leverage)

    let finalSize = adjustedSize * leverageAdjustment

    // For high-price assets, ensure at least 1 token if we have sufficient equity
    let quantity = Math.floor(finalSize / currentPrice)
    if (quantity < 1 && currentPrice > 50 && equity > currentPrice * 2) {
      // Asset is expensive and we have enough equity - use higher position size to get at least 1 token
      finalSize = Math.min(currentPrice * 1.5, equity * 0.25) // Use up to 25% of equity if needed
      quantity = Math.floor(finalSize / currentPrice)
    }

    // Convert to quantity (round to whole numbers for asset precision compatibility)
    return quantity
  }

  /**
   * Check if position complies with risk limits
   */
  assessPositionRisk(params: {
    entryPrice: number
    stopLossPrice: number
    takeProfitPrice: number
    quantity: number
    equity: number
    leverage: number
    volatility: number
  }): PositionRisk {
    const {
      entryPrice,
      stopLossPrice,
      takeProfitPrice,
      quantity,
      equity,
      leverage,
      volatility,
    } = params

    // Calculate risk metrics
    const maxLossAmount = Math.abs(entryPrice - stopLossPrice) * quantity
    const maxGainAmount = Math.abs(takeProfitPrice - entryPrice) * quantity
    const riskPercent = (maxLossAmount / equity) * 100
    const riskRewardRatio = maxGainAmount / maxLossAmount

    // Slippage adjustment (adverse movement)
    const slippageAmount = (entryPrice * this.config.slippagePercent) / 100
    const slippageAdjustedTP = takeProfitPrice - slippageAmount
    const slippageAdjustedSL = stopLossPrice + slippageAmount

    // Determine if position is acceptable
    let recommendedAction: "HOLD" | "REDUCE" | "BUY" | "SELL" = "BUY"
    let riskAssessment = "OK"

    // Check if risk exceeds limits
    if (riskPercent > this.config.maxPositionSizePercent) {
      recommendedAction = "REDUCE"
      riskAssessment = `Risk ${riskPercent.toFixed(1)}% exceeds limit ${this.config.maxPositionSizePercent}%`
    }

    // Check risk:reward ratio
    if (riskRewardRatio < this.config.riskRewardRatio) {
      recommendedAction = "REDUCE"
      riskAssessment = `Risk:Reward ${riskRewardRatio.toFixed(2)} below ${this.config.riskRewardRatio}`
    }

    // Check volatility
    if (volatility > 0.05) {
      recommendedAction = "REDUCE"
      riskAssessment = `High volatility ${(volatility * 100).toFixed(2)}% - reduce position`
    }

    // Check leverage
    if (leverage > 3) {
      recommendedAction = "REDUCE"
      riskAssessment = `Leverage ${leverage}x too high`
    }

    return {
      maxLossAmount,
      positionSize: quantity,
      adjustedLeverage: leverage * (1 - volatility),
      slippageAdjustedTP,
      slippageAdjustedSL,
      recommendedAction,
      riskAssessment,
    }
  }

  /**
   * Check if we should stop trading (circuit breaker)
   */
  checkCircuitBreaker(equity: number, startingEquity: number): {
    shouldStop: boolean
    reason: string
    drawdownPercent: number
  } {
    // Track peak equity
    if (equity > this.peakEquity) {
      this.peakEquity = equity
    }

    // Calculate drawdown from peak
    const drawdownPercent = ((this.peakEquity - equity) / this.peakEquity) * 100
    this.maxDrawdownSeen = Math.max(this.maxDrawdownSeen, drawdownPercent)

    // Check if drawdown exceeds limit
    if (drawdownPercent > this.config.maxDrawdownPercent) {
      return {
        shouldStop: true,
        reason: `Drawdown ${drawdownPercent.toFixed(1)}% exceeds limit ${this.config.maxDrawdownPercent}%`,
        drawdownPercent,
      }
    }

    // Check if we've lost more than 50% from starting equity
    const totalLossPercent = ((startingEquity - equity) / startingEquity) * 100
    if (totalLossPercent > 50) {
      return {
        shouldStop: true,
        reason: `Total loss ${totalLossPercent.toFixed(1)}% exceeds 50%`,
        drawdownPercent,
      }
    }

    return {
      shouldStop: false,
      reason: "Within risk limits",
      drawdownPercent,
    }
  }

  /**
   * Check if we've exceeded daily trade limit
   */
  checkDailyTradeLimit(): { canTrade: boolean; reason: string; tradesRemaining: number } {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    // Reset counter if 24 hours have passed
    if (now - this.dailyTradeCountTime > oneDayMs) {
      this.dailyTradeCount = 0
      this.dailyTradeCountTime = now
    }

    const tradesRemaining = this.config.maxDailyTrades - this.dailyTradeCount

    if (this.dailyTradeCount >= this.config.maxDailyTrades) {
      return {
        canTrade: false,
        reason: `Daily trade limit (${this.config.maxDailyTrades}) reached`,
        tradesRemaining: 0,
      }
    }

    return {
      canTrade: true,
      reason: "Within daily trade limit",
      tradesRemaining,
    }
  }

  /**
   * Record a trade result
   */
  recordTrade(pnl: number): void {
    this.dailyTradeCount++
    const result = pnl >= 0 ? "WIN" : "LOSS"
    this.tradeHistory.push({
      time: Date.now(),
      pnl,
      result,
    })

    // Keep only last 100 trades
    if (this.tradeHistory.length > 100) {
      this.tradeHistory.shift()
    }
  }

  /**
   * Get win rate from recent trades
   */
  getWinRate(): number {
    if (this.tradeHistory.length === 0) return 0.5

    const wins = this.tradeHistory.filter((t) => t.result === "WIN").length
    return wins / this.tradeHistory.length
  }

  /**
   * Check if win rate is acceptable
   */
  isWinRateAcceptable(): boolean {
    return this.getWinRate() >= this.config.minWinRate
  }

  /**
   * Get stats
   */
  getStats() {
    const winRate = this.getWinRate()
    const totalPnL = this.tradeHistory.reduce((sum, t) => sum + t.pnl, 0)
    const avgPnL = this.tradeHistory.length > 0 ? totalPnL / this.tradeHistory.length : 0

    return {
      totalTrades: this.tradeHistory.length,
      winRate: (winRate * 100).toFixed(1),
      totalPnL: totalPnL.toFixed(2),
      avgPnL: avgPnL.toFixed(2),
      maxDrawdown: this.maxDrawdownSeen.toFixed(1),
      dailyTradesUsed: this.dailyTradeCount,
      dailyTradesRemaining: this.config.maxDailyTrades - this.dailyTradeCount,
    }
  }
}