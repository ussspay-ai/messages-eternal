/**
 * Market Analyzer
 * Provides technical analysis and market data utilities
 */

export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OrderBookData {
  bids: Array<[price: number, quantity: number]>
  asks: Array<[price: number, quantity: number]>
  timestamp: number
}

export class MarketAnalyzer {
  /**
   * Calculate RSI (Relative Strength Index)
   */
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50

    let gains = 0
    let losses = 0

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }

    const avgGain = gains / period
    const avgLoss = losses / period

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  static calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): {
    macd: number
    signal: number
    histogram: number
    strength: number // -100 to 100
  } {
    const ema12 = this.calculateEMA(prices, fastPeriod)
    const ema26 = this.calculateEMA(prices, slowPeriod)
    const macd = ema12 - ema26

    // Calculate signal line (EMA of MACD)
    const macdValues = [macd] // In real implementation, calculate for all points
    const signal = this.calculateEMA(macdValues, signalPeriod)
    const histogram = macd - signal

    // Strength from -100 to 100
    const strength = Math.max(-100, Math.min(100, histogram * 100))

    return { macd, signal, histogram, strength }
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  static calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0
    if (prices.length === 1) return prices[0]

    const multiplier = 2 / (period + 1)
    let ema = prices[0]

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * multiplier + ema * (1 - multiplier)
    }

    return ema
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1]
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0)
    return sum / period
  }

  /**
   * Calculate Bollinger Bands
   */
  static calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDevMultiplier: number = 2
  ): {
    upper: number
    middle: number
    lower: number
    width: number
  } {
    const sma = this.calculateSMA(prices, period)
    const recentPrices = prices.slice(-period)
    const variance =
      recentPrices.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period
    const stdDev = Math.sqrt(variance)

    const upper = sma + stdDev * stdDevMultiplier
    const lower = sma - stdDev * stdDevMultiplier
    const width = (upper - lower) / sma

    return { upper, middle: sma, lower, width }
  }

  /**
   * Calculate ATR (Average True Range) - volatility indicator
   */
  static calculateATR(candles: CandleData[], period: number = 14): number {
    if (candles.length < period) {
      const last = candles[candles.length - 1]
      return last.high - last.low
    }

    let atr = 0
    const recentCandles = candles.slice(-period)

    for (const candle of recentCandles) {
      const tr = Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - (recentCandles[0]?.close ?? candle.close)),
        Math.abs(candle.low - (recentCandles[0]?.close ?? candle.close))
      )
      atr += tr
    }

    return atr / period
  }

  /**
   * Calculate volatility as % of price
   */
  static calculateVolatility(prices: number[], lookback: number = 20): number {
    if (prices.length < lookback) lookback = prices.length

    const recentPrices = prices.slice(-lookback)
    const mean = recentPrices.reduce((a, b) => a + b) / recentPrices.length
    const variance =
      recentPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / recentPrices.length
    const stdDev = Math.sqrt(variance)

    return stdDev / mean
  }

  /**
   * Calculate price momentum
   */
  static calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period) return 0
    const current = prices[prices.length - 1]
    const past = prices[prices.length - period - 1]
    return ((current - past) / past) * 100
  }

  /**
   * Detect support/resistance levels
   */
  static detectLevels(prices: number[], windowSize: number = 5): {
    support: number
    resistance: number
  } {
    const recent = prices.slice(-windowSize * 3)
    const support = Math.min(...recent)
    const resistance = Math.max(...recent)
    return { support, resistance }
  }

  /**
   * Detect divergence (price moving opposite to indicator)
   */
  static detectDivergence(prices: number[], rsi: number[]): {
    bullish: boolean
    bearish: boolean
  } {
    if (prices.length < 3 || rsi.length < 3) {
      return { bullish: false, bearish: false }
    }

    const priceLowRecent = prices[prices.length - 1] < prices[prices.length - 2]
    const priceLowPrev = prices[prices.length - 2] < prices[prices.length - 3]
    const rsiLowRecent = rsi[rsi.length - 1] < rsi[rsi.length - 2]
    const rsiLowPrev = rsi[rsi.length - 2] < rsi[rsi.length - 3]

    // Bullish divergence: price makes lower low but RSI makes higher low
    const bullish = priceLowRecent && priceLowPrev && !rsiLowRecent && !rsiLowPrev

    // Bearish divergence: price makes higher high but RSI makes lower high
    const bearish = !priceLowRecent && !priceLowPrev && rsiLowRecent && rsiLowPrev

    return { bullish, bearish }
  }

  /**
   * Analyze order book imbalance
   */
  static analyzeOrderBook(orderBook: OrderBookData): {
    bidVolume: number
    askVolume: number
    imbalance: number // -1 (all ask) to +1 (all bid)
    spreadPercent: number
  } {
    const bidVolume = orderBook.bids.reduce((sum, [, qty]) => sum + qty, 0)
    const askVolume = orderBook.asks.reduce((sum, [, qty]) => sum + qty, 0)
    const total = bidVolume + askVolume

    const imbalance = total > 0 ? (bidVolume - askVolume) / total : 0

    const bestBid = orderBook.bids[0]?.[0] ?? 0
    const bestAsk = orderBook.asks[0]?.[0] ?? 0
    const spreadPercent = bestAsk > 0 ? ((bestAsk - bestBid) / bestAsk) * 100 : 0

    return { bidVolume, askVolume, imbalance, spreadPercent }
  }

  /**
   * Calculate profit targets and stop losses based on volatility
   */
  static calculateAdaptiveTargets(
    entryPrice: number,
    volatility: number,
    atr: number | undefined,
    direction: "BUY" | "SELL"
  ): {
    takeProfit: number
    stopLoss: number
    riskAmount: number
  } {
    // Use ATR if available, else use volatility
    const riskAmount = atr ?? entryPrice * volatility

    // Scale targets based on volatility (high vol = wider targets)
    const targetMultiplier = Math.max(1, Math.min(3, 1 + volatility * 5))

    if (direction === "BUY") {
      return {
        takeProfit: entryPrice + riskAmount * targetMultiplier,
        stopLoss: entryPrice - riskAmount * 0.5,
        riskAmount,
      }
    } else {
      return {
        takeProfit: entryPrice - riskAmount * targetMultiplier,
        stopLoss: entryPrice + riskAmount * 0.5,
        riskAmount,
      }
    }
  }

  /**
   * Multi-signal confirmation
   */
  static getSignalStrength(indicators: {
    rsiOverbought?: boolean
    rsiOversold?: boolean
    macdCrossover?: "UP" | "DOWN" | "NONE"
    bollinger?: "UPPER" | "LOWER" | "MIDDLE"
    volumeConfirm?: boolean
    trendAlign?: boolean
  }): number {
    let strength = 0
    const maxSignals = 5

    if (indicators.rsiOverbought || indicators.rsiOversold) strength++
    if (indicators.macdCrossover !== "NONE") strength++
    if (indicators.bollinger === "UPPER" || indicators.bollinger === "LOWER") strength++
    if (indicators.volumeConfirm) strength++
    if (indicators.trendAlign) strength++

    return (strength / maxSignals) * 100
  }
}