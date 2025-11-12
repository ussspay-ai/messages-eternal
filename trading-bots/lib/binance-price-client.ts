/**
 * Binance Price Client
 * Fetches real-time market prices from Binance public API (no authentication required)
 */

export interface BinancePriceData {
  symbol: string
  price: string
  time: number
}

export class BinancePriceClient {
  private readonly baseUrl = "https://api.binance.com/api/v3"
  private readonly timeout = 5000 // 5 seconds

  /**
   * Fetch market price for a symbol from Binance
   * @param symbol - Trading symbol (e.g., "ETHUSDT", "BTCUSDT")
   * @returns Price data
   */
  async getMarketPrice(symbol: string): Promise<{ symbol: string; price: string }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(
        `${this.baseUrl}/ticker/price?symbol=${symbol}`,
        {
          method: "GET",
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as BinancePriceData

      if (!data.price) {
        throw new Error(`No price data for symbol ${symbol}`)
      }

      console.log(`[BinanceClient] ✅ Fetched ${symbol}: $${data.price}`)
      return { symbol, price: data.price }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error)
      console.error(`[BinanceClient] ❌ Failed to fetch price for ${symbol}:`, errorMsg)
      throw new Error(`Could not fetch ${symbol} price from Binance: ${errorMsg}`)
    }
  }

  /**
   * Fetch 24h price change for a symbol (useful for trend analysis)
   * @param symbol - Trading symbol
   * @returns 24h price change data
   */
  async get24hPriceChange(symbol: string): Promise<{
    symbol: string
    priceChange: string
    priceChangePercent: string
    highPrice: string
    lowPrice: string
  }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(
        `${this.baseUrl}/ticker/24hr?symbol=${symbol}`,
        {
          method: "GET",
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`)
      }

      const data = (await response.json()) as any
      return {
        symbol: data.symbol,
        priceChange: data.priceChange,
        priceChangePercent: data.priceChangePercent,
        highPrice: data.highPrice,
        lowPrice: data.lowPrice,
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error)
      console.error(`[BinanceClient] ❌ Failed to fetch 24h data for ${symbol}:`, errorMsg)
      throw new Error(`Could not fetch 24h data for ${symbol}: ${errorMsg}`)
    }
  }

  /**
   * Fetch multiple symbols in one call for efficiency
   * @param symbols - Array of trading symbols
   * @returns Map of symbol to price
   */
  async getMultiplePrices(
    symbols: string[]
  ): Promise<Record<string, string>> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      // Build query with multiple symbols: [[BTCUSDT], [ETHUSDT]]
      const symbolParams = symbols.map((s) => `["${s}"]`).join(",")
      const url = `${this.baseUrl}/ticker/price?symbols=[${symbolParams}]`

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`)
      }

      const data = (await response.json()) as BinancePriceData[]
      const priceMap: Record<string, string> = {}

      for (const item of data) {
        priceMap[item.symbol] = item.price
      }

      console.log(`[BinanceClient] ✅ Fetched ${symbols.length} prices from Binance`)
      return priceMap
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error)
      console.error(`[BinanceClient] ❌ Failed to fetch multiple prices:`, errorMsg)
      // Fallback: fetch individually
      console.log(`[BinanceClient] 🔄 Falling back to individual price fetches...`)
      const priceMap: Record<string, string> = {}
      for (const symbol of symbols) {
        try {
          const result = await this.getMarketPrice(symbol)
          priceMap[symbol] = result.price
        } catch (e) {
          console.warn(`[BinanceClient] Could not fetch ${symbol}, skipping`)
        }
      }
      return priceMap
    }
  }

  /**
   * Get OHLCV (Open, High, Low, Close, Volume) candle data for technical analysis
   * @param symbol - Trading symbol
   * @param interval - Candle interval (1m, 5m, 15m, 1h, 4h, 1d)
   * @param limit - Number of candles (default 100)
   * @returns Array of candles
   */
  async getCandles(
    symbol: string,
    interval: string = "1h",
    limit: number = 100
  ): Promise<
    Array<{
      open: number
      high: number
      low: number
      close: number
      volume: number
      timestamp: number
    }>
  > {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(
        `${this.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        {
          method: "GET",
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`)
      }

      const data = (await response.json()) as any[]
      return data.map((candle) => ({
        timestamp: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[7]),
      }))
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error)
      console.error(`[BinanceClient] ❌ Failed to fetch candles for ${symbol}:`, errorMsg)
      throw new Error(`Could not fetch candles for ${symbol}: ${errorMsg}`)
    }
  }
}

// Export singleton instance
export const binancePriceClient = new BinancePriceClient()