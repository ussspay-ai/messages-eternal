/**
 * ChatGPT OpenAI Strategy (Enhanced)
 * Multi-timeframe momentum trading with adaptive thresholds and risk management
 */

import { BaseStrategy, TradeSignal } from "../base-strategy.ts"
import { MarketAnalyzer } from "../lib/market-analyzer.ts"
import { RiskManager } from "../lib/risk-manager.ts"

export class ChatGPTOpenAIStrategy extends BaseStrategy {
  private params = {
    leverage: 2.5, // Reduced from 3
    position_size: 0.2, // Reduced from 0.3
    stop_loss_percent: 2.5, // Increased
    take_profit_percent: 2.5, // Adjusted
    min_trade_interval_ms: 15000,
    initial_buy_threshold: 0.0, // Execute initial buy immediately on startup
    scale_out_percent: 2.0, // Scale out on 2% gain after initial buy
  }
  private priceHistory: number[] = []
  private maxHistoryLength = 100
  private lastTradeTime = 0
  private riskManager: RiskManager
  private hasInitialBuy = false // Track if initial buy has been executed
  private positionEntryPrice: number | null = null // Store entry price for scale-out logic

  constructor(config: any) {
    super(config)
    this.riskManager = new RiskManager({
      maxDrawdownPercent: 14,
      maxPositionSizePercent: 12,
      maxDailyTrades: 28,
      minWinRate: 0.48,
      slippagePercent: 0.2,
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

      // RESET STATE: When position fully closes, allow re-entry
      if (!existingPosition && this.hasInitialBuy) {
        this.hasInitialBuy = false
        this.positionEntryPrice = null
        console.log(`[${this.config.name}] 🔄 Position fully closed. Resetting state for re-entry.`)
      }

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
              reason: `🚀 INITIAL BUY: Starting momentum trading with ${quantity} tokens (~$${positionSize.toFixed(2)}).`,
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

      // Need enough history
      if (this.priceHistory.length < 20) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Building history (${this.priceHistory.length}/20)`,
        }
      }

      // SCALE-OUT: After initial buy, sell on 2% gain or when RSI is overbought
      if (this.hasInitialBuy && existingPosition && this.positionEntryPrice) {
        const quantity = existingPosition.quantity || existingPosition.amount || 0
        const priceGainPercent = ((currentPrice - this.positionEntryPrice) / this.positionEntryPrice) * 100

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

      // Calculate indicators
      const volatility = MarketAnalyzer.calculateVolatility(this.priceHistory)
      const rsi = MarketAnalyzer.calculateRSI(this.priceHistory, 14)
      const macd = MarketAnalyzer.calculateMACD(this.priceHistory)
      const bollinger = MarketAnalyzer.calculateBollingerBands(this.priceHistory, 20, 2)
      const momentum = MarketAnalyzer.calculateMomentum(this.priceHistory, 10)

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
          reason: `Invalid position: ${positionSize}`,
        }
      }

      // Adaptive thresholds based on volatility
      const rsiLowThreshold = Math.max(20, 35 - volatility * 200)
      const rsiHighThreshold = Math.min(80, 65 + volatility * 200)

      // BUY signal: Multi-indicator confirmation
      const buyCondition =
        rsi < rsiLowThreshold &&
        momentum > 0 &&
        macd.strength > 10 &&
        currentPrice < bollinger.middle

      if (buyCondition) {
        const targets = MarketAnalyzer.calculateAdaptiveTargets(
          currentPrice,
          volatility,
          undefined,
          "BUY"
        )

        const confidence = Math.min(0.9, 0.6 + (macd.strength / 100) * 0.2)

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
          reason: `Momentum BUY: RSI ${rsi.toFixed(0)}, MACD ${macd.strength.toFixed(0)}, Momentum ${momentum.toFixed(2)}`,
        }
      }

      // SELL signal: Multi-indicator confirmation
      const sellCondition =
        rsi > rsiHighThreshold &&
        momentum < 0 &&
        macd.strength < -10 &&
        currentPrice > bollinger.middle

      if (sellCondition) {
        const targets = MarketAnalyzer.calculateAdaptiveTargets(
          currentPrice,
          volatility,
          undefined,
          "SELL"
        )

        const confidence = Math.min(0.9, 0.6 + (Math.abs(macd.strength) / 100) * 0.2)

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
          reason: `Momentum SELL: RSI ${rsi.toFixed(0)}, MACD ${macd.strength.toFixed(0)}, Momentum ${momentum.toFixed(2)}`,
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
        reason: `Waiting for setup: RSI ${rsi.toFixed(0)}, MACD ${macd.strength.toFixed(0)}. ${positionInfo}${gainsInfo}`,
      }
    } catch (error) {
      console.error("Error in GPT4 Momentum strategy:", error)
      return {
        action: "HOLD",
        quantity: 0,
        confidence: 0,
        reason: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }
}