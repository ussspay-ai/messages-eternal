/**
 * DeepSeek ML Predictor Strategy (Enhanced)
 * Uses advanced pattern recognition and order book analysis for price prediction
 * Includes risk management, slippage modeling, and dynamic confidence thresholds
 */

import { BaseStrategy, TradeSignal } from "../base-strategy.ts"
import { MarketAnalyzer, CandleData } from "../lib/market-analyzer.ts"
import { RiskManager } from "../lib/risk-manager.ts"

export class DeepseekMLStrategy extends BaseStrategy {
  private params = {
    leverage: 2,
    position_size: 0.15, // Reduced for safety
    stop_loss_percent: 1.2,
    take_profit_percent: 1.5,
    base_confidence_threshold: 0.65, // Lower base, adjusted dynamically
    prediction_timeframe: 5, // minutes
    min_trade_interval_ms: 10000, // 10s between trades
    max_trades_per_hour: 10,
    initial_buy_threshold: 0.0, // Execute initial buy immediately on startup
    scale_out_percent: 2.0, // Scale out on 2% gain after initial buy
  }

  // Extended price history (1 hour of 5s candles = 720 points)
  private priceHistory: Array<{ price: number; time: number }> = []
  private maxHistoryLength = 300 // ~25 minutes of data
  private predictions: Array<{ time: number; prediction: number; confidence: number }> = []
  private lastTradeTime = 0
  private lastTradesThisHour: number[] = []
  private riskManager: RiskManager
  private candles: CandleData[] = []
  private orderBookImbalances: number[] = [] // Track bid/ask imbalance
  private hasInitialBuy = false // Track if initial buy has been executed
  private positionEntryPrice: number | null = null // Store entry price for scale-out logic

  constructor(config: any) {
    super(config)
    this.riskManager = new RiskManager({
      maxDrawdownPercent: 12,
      maxPositionSizePercent: 15,
      maxDailyTrades: 30,
      minWinRate: 0.45,
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
      this.priceHistory.push({
        price: currentPrice,
        time: Date.now(),
      })

      // Maintain extended history
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
            this.lastTradesThisHour.push(Date.now())

            return {
              action: "BUY",
              quantity: quantity,
              price: currentPrice,
              confidence: 0.9,
              reason: `🚀 INITIAL BUY: Starting ML trading with ${quantity} tokens (~$${positionSize.toFixed(2)}).`,
            }
          }
        }
      }

      // Check rate limiting
      if (Date.now() - this.lastTradeTime < this.params.min_trade_interval_ms) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: "Rate limited - minimum interval between trades",
        }
      }

      // Check hourly trade limit
      const now = Date.now()
      this.lastTradesThisHour = this.lastTradesThisHour.filter((t) => now - t < 3600000)
      if (this.lastTradesThisHour.length >= this.params.max_trades_per_hour) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Hourly trade limit (${this.params.max_trades_per_hour}) reached`,
        }
      }

      // Check circuit breaker
      const circuitCheck = this.riskManager.checkCircuitBreaker(
        accountInfo.equity,
        accountInfo.equity * 1.2 // Starting equity assumption
      )
      if (circuitCheck.shouldStop) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Circuit breaker: ${circuitCheck.reason}`,
        }
      }

      // Check daily trade limit
      const dailyCheck = this.riskManager.checkDailyTradeLimit()
      if (!dailyCheck.canTrade) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: dailyCheck.reason,
        }
      }

      // Need enough data to predict (reduced from 20 to 15)
      if (this.priceHistory.length < 15) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Building prediction model (${this.priceHistory.length}/15)`,
        }
      }

      // SCALE-OUT: After initial buy, sell on 2% gain or when prediction is too bearish
      if (this.hasInitialBuy && existingPosition && this.positionEntryPrice) {
        const quantity = existingPosition.quantity || existingPosition.amount || 0
        const priceGainPercent = ((currentPrice - this.positionEntryPrice) / this.positionEntryPrice) * 100

        if (priceGainPercent >= this.params.scale_out_percent) {
          const scaleOutQty = Math.max(1, Math.floor(quantity * 0.5))
          if (scaleOutQty > 0) {
            this.lastTradeTime = Date.now()
            this.lastTradesThisHour.push(now)
            return {
              action: "SELL",
              quantity: scaleOutQty,
              price: currentPrice,
              confidence: 0.85,
              reason: `📈 Scale Out (${priceGainPercent.toFixed(2)}% gain): Locking in profits, selling ${scaleOutQty} tokens.`,
            }
          }
        }
      }

      // Build candle data for better analysis
      this.updateCandles(currentPrice, accountInfo)

      // Calculate market conditions
      const prices = this.priceHistory.map((h) => h.price)
      const volatility = MarketAnalyzer.calculateVolatility(prices, 20)
      const rsi = MarketAnalyzer.calculateRSI(prices, 14)
      const macd = MarketAnalyzer.calculateMACD(prices)

      // Generate ML prediction with multiple indicators
      const prediction = this.generateMLPrediction(this.priceHistory, volatility, rsi, macd)

      // Dynamically adjust confidence threshold based on volatility
      const adjustedThreshold = this.calculateDynamicThreshold(volatility, rsi)

      if (prediction.confidence < adjustedThreshold) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `ML confidence ${(prediction.confidence * 100).toFixed(1)}% below dynamic threshold ${(adjustedThreshold * 100).toFixed(1)}% (vol: ${(volatility * 100).toFixed(2)}%)`,
        }
      }

      // Calculate position size using risk manager
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
          reason: `Invalid position size calculated: ${positionSize}`,
        }
      }

      // Generate signal based on prediction
      const priceDiff = prediction.predictedPrice - currentPrice
      const changePercent = (priceDiff / currentPrice) * 100

      // Adjust thresholds based on volatility (lower vol = stricter threshold)
      const movementThreshold = Math.max(0.3, volatility * 10)

      if (changePercent > movementThreshold && prediction.direction === "UP") {
        // Predicted price increase - BUY
        const targets = MarketAnalyzer.calculateAdaptiveTargets(
          currentPrice,
          volatility,
          undefined,
          "BUY"
        )

        // Apply slippage adjustment
        const takeProfit = this.applySlippage(targets.takeProfit, "TP")
        const stopLoss = this.applySlippage(targets.stopLoss, "SL")

        // Assess risk
        const riskCheck = this.riskManager.assessPositionRisk({
          entryPrice: currentPrice,
          stopLossPrice: stopLoss,
          takeProfitPrice: takeProfit,
          quantity: positionSize,
          equity,
          leverage: this.params.leverage,
          volatility,
        })

        if (riskCheck.recommendedAction === "REDUCE") {
          return {
            action: "HOLD",
            quantity: 0,
            confidence: 0,
            reason: `Risk check failed: ${riskCheck.riskAssessment}`,
          }
        }

        this.lastTradeTime = Date.now()
        this.lastTradesThisHour.push(now)

        // Convert notional to quantity
        const quantity = Math.floor(positionSize / currentPrice)

        return {
          action: "BUY",
          quantity: quantity,
          price: currentPrice,
          takeProfit,
          stopLoss,
          confidence: Math.min(prediction.confidence, 0.95),
          reason: `ML: ${changePercent.toFixed(2)}% move expected (vol: ${(volatility * 100).toFixed(1)}%, RSI: ${rsi.toFixed(0)}, MACD: ${macd.strength.toFixed(0)})`,
        }
      } else if (changePercent < -movementThreshold && prediction.direction === "DOWN") {
        // Predicted price decrease - SELL
        const targets = MarketAnalyzer.calculateAdaptiveTargets(
          currentPrice,
          volatility,
          undefined,
          "SELL"
        )

        const takeProfit = this.applySlippage(targets.takeProfit, "TP")
        const stopLoss = this.applySlippage(targets.stopLoss, "SL")

        const riskCheck = this.riskManager.assessPositionRisk({
          entryPrice: currentPrice,
          stopLossPrice: stopLoss,
          takeProfitPrice: takeProfit,
          quantity: positionSize,
          equity,
          leverage: this.params.leverage,
          volatility,
        })

        if (riskCheck.recommendedAction === "REDUCE") {
          return {
            action: "HOLD",
            quantity: 0,
            confidence: 0,
            reason: `Risk check failed: ${riskCheck.riskAssessment}`,
          }
        }

        this.lastTradeTime = Date.now()
        this.lastTradesThisHour.push(now)

        // Convert notional to quantity
        const quantity = Math.floor(positionSize / currentPrice)

        return {
          action: "SELL",
          quantity: quantity,
          price: currentPrice,
          takeProfit,
          stopLoss,
          confidence: Math.min(prediction.confidence, 0.95),
          reason: `ML: ${changePercent.toFixed(2)}% move expected (vol: ${(volatility * 100).toFixed(1)}%, RSI: ${rsi.toFixed(0)}, MACD: ${macd.strength.toFixed(0)})`,
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
        reason: `Minimal movement (${changePercent.toFixed(2)}%), threshold: ±${movementThreshold.toFixed(2)}%. ${positionInfo}${gainsInfo}`,
      }
    } catch (error) {
      console.error("Error in DeepSeek ML strategy:", error)
      return {
        action: "HOLD",
        quantity: 0,
        confidence: 0,
        reason: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  /**
   * Advanced ML prediction using multiple indicators
   */
  private generateMLPrediction(
    history: Array<{ price: number; time: number }>,
    volatility: number,
    rsi: number,
    macd: any
  ): { predictedPrice: number; confidence: number; direction: "UP" | "DOWN" } {
    const prices = history.map((h) => h.price)
    const currentPrice = prices[prices.length - 1]

    let prediction = currentPrice
    let confidence = 0.5
    let signals = 0
    let bullishSignals = 0
    let bearishSignals = 0

    // 1. Trend analysis (weight: 25%)
    const shortTermTrend = this.calculateTrend(prices.slice(-15))
    const mediumTermTrend = this.calculateTrend(prices.slice(-50))
    const longTermTrend = this.calculateTrend(prices.slice(-100))

    if (shortTermTrend > 0.01) {
      bullishSignals++
      confidence += 0.1
    } else if (shortTermTrend < -0.01) {
      bearishSignals++
      confidence += 0.1
    }

    // Multi-timeframe confirmation
    if (mediumTermTrend > 0 && shortTermTrend > 0) {
      bullishSignals++
      confidence += 0.08
    } else if (mediumTermTrend < 0 && shortTermTrend < 0) {
      bearishSignals++
      confidence += 0.08
    }

    // 2. RSI analysis (weight: 25%)
    if (rsi < 30) {
      bullishSignals++
      confidence += 0.12
      prediction += currentPrice * 0.005
    } else if (rsi > 70) {
      bearishSignals++
      confidence += 0.12
      prediction -= currentPrice * 0.005
    }

    // 3. MACD analysis (weight: 25%)
    if (macd.strength > 20) {
      bullishSignals++
      confidence += 0.12
    } else if (macd.strength < -20) {
      bearishSignals++
      confidence += 0.12
    }

    // 4. Pattern recognition (weight: 15%)
    const reversal = this.detectReversal(prices)
    const trend = this.detectTrend(prices)

    if (reversal === "UP" && trend === "UP") {
      bullishSignals++
      confidence += 0.08
      prediction += currentPrice * 0.008
    } else if (reversal === "DOWN" && trend === "DOWN") {
      bearishSignals++
      confidence += 0.08
      prediction -= currentPrice * 0.008
    }

    // 5. Volatility adjustment (weight: 10%)
    if (volatility > 0.08) {
      confidence *= 0.8 // High volatility reduces confidence
    } else if (volatility < 0.01) {
      confidence *= 1.1 // Low volatility increases confidence
    }

    // Determine direction
    let direction: "UP" | "DOWN" = bullishSignals > bearishSignals ? "UP" : "DOWN"

    // Final confidence calculation
    const totalSignals = bullishSignals + bearishSignals
    if (totalSignals > 0) {
      confidence = Math.min(confidence, 0.95)
    }
    confidence = Math.max(confidence, 0.4)

    return {
      predictedPrice: prediction,
      confidence,
      direction,
    }
  }

  /**
   * Calculate dynamic confidence threshold based on market conditions
   */
  private calculateDynamicThreshold(volatility: number, rsi: number): number {
    let threshold = this.params.base_confidence_threshold

    // Adjust for volatility (higher vol = higher threshold needed)
    if (volatility > 0.05) {
      threshold += 0.05
    } else if (volatility < 0.01) {
      threshold -= 0.03
    }

    // Adjust for RSI extremes (more confident in extreme RSI levels)
    if (rsi < 25 || rsi > 75) {
      threshold -= 0.05
    } else if (rsi > 40 && rsi < 60) {
      threshold += 0.05
    }

    return Math.max(0.55, Math.min(0.85, threshold))
  }

  /**
   * Apply slippage and fee adjustments to prices
   */
  private applySlippage(price: number, type: "TP" | "SL"): number {
    const slippageAmount = price * (this.riskManager["config"].slippagePercent / 100)

    if (type === "TP") {
      // Take profit: reduce by slippage
      return price - slippageAmount
    } else {
      // Stop loss: widen by slippage
      return price + slippageAmount
    }
  }

  /**
   * Update candle data for analysis
   */
  private updateCandles(currentPrice: number, accountInfo: any): void {
    const now = Date.now()

    // Add to current candle or create new one
    if (
      this.candles.length === 0 ||
      now - this.candles[this.candles.length - 1].time > 60000
    ) {
      // New 1-minute candle
      this.candles.push({
        time: now,
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        volume: 1,
      })
    } else {
      const lastCandle = this.candles[this.candles.length - 1]
      lastCandle.high = Math.max(lastCandle.high, currentPrice)
      lastCandle.low = Math.min(lastCandle.low, currentPrice)
      lastCandle.close = currentPrice
      lastCandle.volume++
    }

    // Keep last hour of candles
    if (this.candles.length > 60) {
      this.candles.shift()
    }
  }

  /**
   * Calculate price trend with better accuracy
   */
  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0

    // Use linear regression for better trend detection
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0

    for (let i = 0; i < prices.length; i++) {
      sumX += i
      sumY += prices[i]
      sumXY += i * prices[i]
      sumX2 += i * i
    }

    const n = prices.length
    const slope =
      (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

    // Normalize slope to percentage change
    return slope / prices[prices.length - 1]
  }

  /**
   * Detect reversal pattern (improved)
   */
  private detectReversal(prices: number[]): "UP" | "DOWN" | "NONE" {
    if (prices.length < 5) return "NONE"

    // Check for V-shaped and inverted V-shaped reversals with more flexibility
    const last5 = prices.slice(-5)

    // V-shaped: price down, then up significantly
    const v_valley = last5[1] < last5[0] && last5[2] < last5[1] && last5[3] > last5[2]
    if (v_valley && last5[3] > last5[2] * 1.005) {
      return "UP"
    }

    // Inverted V: price up, then down significantly
    const v_peak = last5[1] > last5[0] && last5[2] > last5[1] && last5[3] < last5[2]
    if (v_peak && last5[3] < last5[2] * 0.995) {
      return "DOWN"
    }

    return "NONE"
  }

  /**
   * Detect trend direction (improved)
   */
  private detectTrend(prices: number[]): "UP" | "DOWN" | "FLAT" {
    if (prices.length < 8) return "FLAT"

    const recent = prices.slice(-8)
    let upCount = 0
    let downCount = 0

    for (let i = 0; i < recent.length - 1; i++) {
      if (recent[i + 1] > recent[i]) upCount++
      else if (recent[i + 1] < recent[i]) downCount++
    }

    // Require at least 60% of moves in one direction
    const threshold = recent.length * 0.6

    if (upCount >= threshold) return "UP"
    if (downCount >= threshold) return "DOWN"
    return "FLAT"
  }
}