/**
 * Gemini Accumulation Strategy
 * Buy Low, Sell High - Accumulates positions on dips, profits on rallies
 * Uses moving averages and price history to identify entry/exit points
 */

import { BaseStrategy, TradeSignal } from "../base-strategy.ts"
import { MarketAnalyzer } from "../lib/market-analyzer.ts"
import { RiskManager } from "../lib/risk-manager.ts"

export class GeminiGridStrategy extends BaseStrategy {
  private params = {
    leverage: 1.5,
    position_size: 0.15, // Position size per trade (15% of equity)
    stop_loss_percent: 5,
    take_profit_percent: 3,
    buy_threshold: -0.03, // Buy when price is 3% below MA
    sell_threshold: 0.05, // Sell when price is 5% above MA
    ma_period: 20, // Moving average period
    min_order_notional: 5.0, // Aster API minimum
    initial_buy_threshold: 0.0, // Execute initial buy immediately on startup
    scale_out_percent: 0.02, // Scale out on 2% gain after initial buy
  }
  private lastCheckTime = 0
  private checkIntervalMs = 60000 // Check every 1 minute
  private priceHistory: number[] = []
  private riskManager: RiskManager
  private lastPosition: { quantity: number; entryPrice: number } | null = null
  private hasInitialBuy = false // Track if initial buy has been executed
  private positionEntryPrice: number | null = null // Store entry price for scale-out logic

  constructor(config: any) {
    super(config)
    this.riskManager = new RiskManager({
      maxDrawdownPercent: 16,
      maxPositionSizePercent: 15,
      maxDailyTrades: 50,
      minWinRate: 0.52,
      slippagePercent: 0.15,
    })
  }

  /**
   * Calculate simple moving average from price history
   */
  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) return prices.length > 0 ? prices[prices.length - 1] : 0
    const recentPrices = prices.slice(-period)
    return recentPrices.reduce((a, b) => a + b, 0) / period
  }

  /**
   * Determine if price is low or high relative to MA
   */
  private getPriceLevel(currentPrice: number, ma: number): string {
    const deviation = (currentPrice - ma) / ma
    if (deviation < this.params.buy_threshold) return "LOW"
    if (deviation > this.params.sell_threshold) return "HIGH"
    return "NEUTRAL"
  }

  async generateSignal(
    currentPrice: number,
    accountInfo: any,
    positions: any[]
  ): Promise<TradeSignal> {
    try {
      // Build price history
      this.priceHistory.push(currentPrice)
      if (this.priceHistory.length > 100) {
        this.priceHistory.shift()
      }

      // Validate inputs
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Invalid price: ${currentPrice}`,
        }
      }

      const equity = accountInfo.equity || 0
      if (!equity || equity <= 0 || !Number.isFinite(equity)) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Invalid equity: ${equity}`,
        }
      }

      // Check for existing position (checking quantity to handle 0-quantity positions)
      const existingPosition = positions.find((p) => p.symbol === this.config.symbol && (p.quantity || p.amount || 0) > 0)
      
      // DEBUG: Log all positions and symbol matching
      if (positions.length > 0) {
        console.log(`[${this.config.name}] 🔍 Available positions:`, positions.map(p => ({ symbol: p.symbol, qty: p.quantity || p.amount, unrealizedProfit: p.unrealizedProfit })))
        console.log(`[${this.config.name}] 🎯 Looking for symbol: ${this.config.symbol}`)
        if (!existingPosition) {
          console.log(`[${this.config.name}] ⚠️ NO MATCHING POSITION FOUND for ${this.config.symbol}`)
        } else {
          console.log(`[${this.config.name}] ✅ Found position: ${existingPosition.symbol}, qty=${existingPosition.quantity || existingPosition.amount}, unrealizedProfit=$${existingPosition.unrealizedProfit?.toFixed(2)}`)
        }
      }

      // RESET STATE: When position fully closes, allow re-entry
      if (!existingPosition && this.hasInitialBuy) {
        this.hasInitialBuy = false
        this.positionEntryPrice = null
        console.log(`[${this.config.name}] 🔄 Position fully closed. Resetting state for re-entry.`)
      }

      // INITIAL BUY: Execute immediate buy on startup if no active position
      if (!this.hasInitialBuy && !existingPosition && this.priceHistory.length >= 5) {
        // Calculate position size
        let positionSize = equity * this.params.position_size
        const orderNotional = positionSize

        // Check minimum notional
        if (orderNotional >= this.params.min_order_notional) {
          let quantity = Math.floor(positionSize / currentPrice)

          // Ensure at least 1 token for high-price assets
          if (quantity < 1 && equity > this.params.min_order_notional * 2) {
            const requiredNotional = currentPrice * 1.0
            if (requiredNotional <= equity * 0.8) {
              positionSize = Math.min(requiredNotional * 1.2, equity * 0.8)
              quantity = Math.floor(positionSize / currentPrice)
            }
          }

          if (quantity > 0) {
            this.hasInitialBuy = true
            this.positionEntryPrice = currentPrice
            this.lastCheckTime = Date.now()
            this.lastPosition = { quantity, entryPrice: currentPrice }

            return {
              action: "BUY",
              quantity: quantity,
              price: currentPrice,
              confidence: 0.9,
              reason: `🚀 INITIAL BUY: Starting accumulation with ${quantity} tokens (~$${positionSize.toFixed(2)}).`,
            }
          }
        }
      }

      // Check timing - don't trade too frequently (only after initial buy)
      const now = Date.now()
      if (this.hasInitialBuy && now - this.lastCheckTime < this.checkIntervalMs) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Next check in ${Math.round((this.checkIntervalMs - (now - this.lastCheckTime)) / 1000)}s`,
        }
      }

      // Check circuit breaker
      const circuitCheck = this.riskManager.checkCircuitBreaker(equity, equity * 1.2)
      if (circuitCheck.shouldStop) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Circuit breaker: ${circuitCheck.reason}`,
        }
      }

      // Calculate moving average
      const ma = this.calculateMA(this.priceHistory, this.params.ma_period)
      const priceLevel = this.getPriceLevel(currentPrice, ma)
      const deviation = ((currentPrice - ma) / ma) * 100

      // SCALE-OUT: After initial buy, sell on 2% gain or when price is HIGH
      if (this.hasInitialBuy && existingPosition && this.positionEntryPrice) {
        const quantity = existingPosition.quantity || 0
        const priceGainPercent = ((currentPrice - this.positionEntryPrice) / this.positionEntryPrice) * 100

        // Scale out on 2% gain
        if (priceGainPercent >= this.params.scale_out_percent) {
          const scaleOutQty = Math.max(1, Math.floor(quantity * 0.5)) // Sell 50% of position
          if (scaleOutQty > 0) {
            this.lastCheckTime = now
            return {
              action: "SELL",
              quantity: scaleOutQty,
              price: currentPrice,
              confidence: 0.85,
              reason: `📈 Scale Out (${priceGainPercent.toFixed(2)}% gain): Selling ${scaleOutQty} tokens to lock in profits.`,
            }
          }
        }

        // Also sell if price is significantly HIGH
        if (priceLevel === "HIGH" && quantity > 0) {
          this.lastCheckTime = now
          return {
            action: "SELL",
            quantity: quantity,
            price: currentPrice,
            confidence: 0.8,
            reason: `Sell High: Price ${deviation.toFixed(1)}% above MA. Exiting remaining ${quantity} tokens.`,
          }
        }
      }

      // ACCUMULATION: Normal buying on dips (after initial buy)
      if (this.hasInitialBuy && !existingPosition && priceLevel === "LOW") {
        let positionSize = equity * this.params.position_size
        const orderNotional = positionSize

        if (orderNotional >= this.params.min_order_notional) {
          let quantity = Math.floor(positionSize / currentPrice)

          if (quantity < 1 && equity > this.params.min_order_notional * 2) {
            const requiredNotional = currentPrice * 1.0
            if (requiredNotional <= equity * 0.8) {
              positionSize = Math.min(requiredNotional * 1.2, equity * 0.8)
              quantity = Math.floor(positionSize / currentPrice)
            }
          }

          if (quantity > 0) {
            this.lastCheckTime = now
            this.lastPosition = { quantity, entryPrice: currentPrice }
            return {
              action: "BUY",
              quantity: quantity,
              price: currentPrice,
              confidence: 0.8,
              reason: `🔄 Accumulate: Price ${deviation.toFixed(1)}% below MA. Adding ${quantity} tokens (~$${positionSize.toFixed(2)}).`,
            }
          }
        }
      }

      // HOLD
      this.lastCheckTime = now
      const positionInfo = existingPosition 
        ? `Position: ${existingPosition.quantity || existingPosition.amount || 0} tokens` 
        : "No position"
      // Use actual unrealized profit from Aster position data instead of local calculation
      const gainsInfo = existingPosition && existingPosition.unrealizedProfit !== undefined
        ? ` (Unrealized profit: $${existingPosition.unrealizedProfit.toFixed(2)})`
        : ""
      return {
        action: "HOLD",
        quantity: 0,
        confidence: 0.5,
        reason: `Holding. Price ${deviation.toFixed(1)}% vs MA (buy <${(this.params.buy_threshold * 100).toFixed(0)}%, sell >${(this.params.sell_threshold * 100).toFixed(0)}%). ${positionInfo}${gainsInfo}`,
      }
    } catch (error) {
      console.error("Error in Gemini Accumulation strategy:", error)
      return {
        action: "HOLD",
        quantity: 0,
        confidence: 0,
        reason: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }
}