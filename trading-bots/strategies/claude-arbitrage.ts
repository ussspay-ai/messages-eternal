/**
 * Claude Arbitrage Strategy (Enhanced)
 * Identifies price discrepancies using trend reversion and spread analysis
 */

import { BaseStrategy, TradeSignal } from "../base-strategy.ts"
import { MarketAnalyzer } from "../lib/market-analyzer.ts"
import { RiskManager } from "../lib/risk-manager.ts"

export class ClaudeArbitrageStrategy extends BaseStrategy {
  private params = {
    leverage: 2,
    position_size: 0.2, // Reduced for safety
    stop_loss_percent: 1.5,
    take_profit_percent: 0.8,
    min_spread_percent: 0.15, // Minimum 0.15% spread to trade
    min_trade_interval_ms: 45000, // Minimum 45s between trades
    initial_buy_threshold: 0.0, // Execute initial buy immediately on startup
    scale_out_percent: 2.0, // Scale out on 2% gain after initial buy
  }
  private lastTradeTime = 0
  private priceHistory: number[] = []
  private maxHistoryLength = 100
  private riskManager: RiskManager
  private hasInitialBuy = false // Track if initial buy has been executed
  private positionEntryPrice: number | null = null // Store entry price for scale-out logic

  constructor(config: any) {
    super(config)
    this.riskManager = new RiskManager({
      maxDrawdownPercent: 15,
      maxPositionSizePercent: 12,
      maxDailyTrades: 25,
      minWinRate: 0.5,
      slippagePercent: 0.25,
    })
  }

  async generateSignal(
    currentPrice: number,
    accountInfo: any,
    positions: any[]
  ): Promise<TradeSignal> {
    try {
      // Build price history
      this.priceHistory.push(currentPrice)
      if (this.priceHistory.length > this.maxHistoryLength) {
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

      // INITIAL BUY: Execute immediate buy on startup if no position
      if (!this.hasInitialBuy && !existingPosition && this.priceHistory.length >= 5) {
        let positionSize = equity * this.params.position_size
        const orderNotional = positionSize

        if (orderNotional >= 5.0) {
          let quantity = Math.floor(positionSize / currentPrice)

          if (quantity < 1 && equity > 10.0) {
            const requiredNotional = currentPrice * 1.0
            if (requiredNotional <= equity * 0.8) {
              positionSize = Math.min(requiredNotional * 1.2, equity * 0.8)
              quantity = Math.floor(positionSize / currentPrice)
            }
          }

          if (quantity > 0) {
            this.hasInitialBuy = true
            this.positionEntryPrice = currentPrice
            this.lastTradeTime = Date.now()

            return {
              action: "BUY",
              quantity: quantity,
              price: currentPrice,
              confidence: 0.9,
              reason: `🚀 INITIAL BUY: Starting arbitrage with ${quantity} tokens (~$${positionSize.toFixed(2)}).`,
            }
          }
        }
      }

      // Rate limiting for subsequent trades
      if (Date.now() - this.lastTradeTime < this.params.min_trade_interval_ms) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: "Rate limited - cooldown between trades",
        }
      }

      if (this.priceHistory.length < 20) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Building price history (${this.priceHistory.length}/20)`,
        }
      }

      // SCALE-OUT: After initial buy, sell on 2% gain or when RSI is overbought
      if (this.hasInitialBuy && existingPosition && this.positionEntryPrice) {
        const quantity = existingPosition.quantity || existingPosition.amount || 0
        const priceGainPercent = ((currentPrice - this.positionEntryPrice) / this.positionEntryPrice) * 100

        // Quick check if we should scale out - need minimal history for RSI
        if (this.priceHistory.length >= 14) {
          const rsi = MarketAnalyzer.calculateRSI(this.priceHistory, 14)

          // Scale out on 2% gain or high RSI
          if (priceGainPercent >= this.params.scale_out_percent || rsi > 70) {
            const scaleOutQty = Math.max(1, Math.floor(quantity * 0.5))
            if (scaleOutQty > 0) {
              this.lastTradeTime = Date.now()
              return {
                action: "SELL",
                quantity: scaleOutQty,
                price: currentPrice,
                confidence: 0.85,
                reason: `📈 Scale Out (${priceGainPercent.toFixed(2)}% gain, RSI ${rsi.toFixed(0)}): Locking in profits, selling ${scaleOutQty} tokens.`,
              }
            }
          }
        }
      }

      // Calculate market metrics
      const volatility = MarketAnalyzer.calculateVolatility(this.priceHistory)
      const rsi = MarketAnalyzer.calculateRSI(this.priceHistory, 14)
      const { support, resistance } = MarketAnalyzer.detectLevels(this.priceHistory)
      
      // Calculate averages
      const avgPrice = this.priceHistory.reduce((a, b) => a + b) / this.priceHistory.length
      const ema20 = MarketAnalyzer.calculateEMA(this.priceHistory, 20)
      const sma50 = MarketAnalyzer.calculateSMA(this.priceHistory, 50)
      
      const spreadPercent = Math.abs((currentPrice - avgPrice) / avgPrice) * 100
      const distanceFromEMA = Math.abs((currentPrice - ema20) / ema20) * 100

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

      // Position sizing
      const positionSize = this.riskManager.calculatePositionSize(
        equity,
        volatility,
        this.params.leverage,
        currentPrice
      )

      if (!Number.isFinite(positionSize) || positionSize <= 0) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Invalid position size: ${positionSize}`,
        }
      }

      // Signal generation: Mean reversion with trend confirmation
      const isBelowMA = currentPrice < ema20 && currentPrice < sma50
      const isAboveMA = currentPrice > ema20 && currentPrice > sma50
      const rsiOversold = rsi < 30
      const rsiOverbought = rsi > 70

      // BUY signal: Price below MA, RSI oversold, good spread
      if (
        isBelowMA &&
        rsiOversold &&
        spreadPercent > this.params.min_spread_percent &&
        distanceFromEMA > 0.3
      ) {
        const targets = MarketAnalyzer.calculateAdaptiveTargets(
          currentPrice,
          volatility,
          undefined,
          "BUY"
        )

        const confidence = Math.min(
          0.9,
          0.6 + (spreadPercent * 0.1) + (rsiOversold ? 0.15 : 0)
        )

        this.lastTradeTime = Date.now()

        // Convert notional to quantity
        const quantity = Math.floor(positionSize / currentPrice)

        return {
          action: "BUY",
          quantity: quantity,
          price: currentPrice,
          takeProfit: targets.takeProfit,
          stopLoss: targets.stopLoss,
          confidence,
          reason: `Mean reversion: Price ${distanceFromEMA.toFixed(2)}% below EMA20 (RSI: ${rsi.toFixed(0)}, Spread: ${spreadPercent.toFixed(2)}%)`,
        }
      }

      // SELL signal: Price above MA, RSI overbought, good spread
      if (
        isAboveMA &&
        rsiOverbought &&
        spreadPercent > this.params.min_spread_percent &&
        distanceFromEMA > 0.3
      ) {
        const targets = MarketAnalyzer.calculateAdaptiveTargets(
          currentPrice,
          volatility,
          undefined,
          "SELL"
        )

        const confidence = Math.min(
          0.9,
          0.6 + (spreadPercent * 0.1) + (rsiOverbought ? 0.15 : 0)
        )

        this.lastTradeTime = Date.now()

        // Convert notional to quantity
        const quantity = Math.floor(positionSize / currentPrice)

        return {
          action: "SELL",
          quantity: quantity,
          price: currentPrice,
          takeProfit: targets.takeProfit,
          stopLoss: targets.stopLoss,
          confidence,
          reason: `Mean reversion: Price ${distanceFromEMA.toFixed(2)}% above EMA20 (RSI: ${rsi.toFixed(0)}, Spread: ${spreadPercent.toFixed(2)}%)`,
        }
      }

      // HOLD: Use actual unrealized profit from Aster position data
      const positionInfo = existingPosition 
        ? `Position: ${existingPosition.quantity || existingPosition.amount || 0} tokens` 
        : "No position"
      const gainsInfo = existingPosition && existingPosition.unrealizedProfit !== undefined
        ? ` (Unrealized profit: $${existingPosition.unrealizedProfit.toFixed(2)})`
        : ""
      return {
        action: "HOLD",
        quantity: 0,
        confidence: 0,
        reason: `No setup: Spread ${spreadPercent.toFixed(2)}%, Distance from EMA ${distanceFromEMA.toFixed(2)}%, RSI ${rsi.toFixed(0)}. ${positionInfo}${gainsInfo}`,
      }
    } catch (error) {
      console.error("Error in Claude Arbitrage strategy:", error)
      return {
        action: "HOLD",
        quantity: 0,
        confidence: 0,
        reason: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }
}