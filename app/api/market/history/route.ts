/**
 * GET /api/market/history
 * Fetch historical OHLCV (candlestick) data from Binance
 * Used for performance charts and technical analysis
 * Query params: symbol (BTC, ETH, SOL, etc), interval (1h, 4h, 1d), limit (default 24)
 */

import { NextResponse } from "next/server"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"

interface BinanceCandle {
  0: number // Open time
  1: string // Open
  2: string // High
  3: string // Low
  4: string // Close
  5: string // Volume
  6: number // Close time
  7: string // Quote asset volume
  8: number // Number of trades
  9: string // Taker buy base asset volume
  10: string // Taker buy quote asset volume
  11: string // Ignore
}

interface HistoryData {
  symbol: string
  interval: string
  data: Array<{
    time: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
  timestamp: string
  source: "binance" | "cached"
}

// Map symbol names to Binance trading pairs
const SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  DOGE: "DOGEUUSDT",
  ASTER: "ASTERUSDT",
}

const VALID_INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = (searchParams.get("symbol") || "BTC").toUpperCase()
    const interval = searchParams.get("interval") || "1h"
    const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 1000) // Max 1000

    // Validate inputs
    if (!SYMBOL_MAP[symbol]) {
      return NextResponse.json(
        { error: `Invalid symbol: ${symbol}. Valid symbols: ${Object.keys(SYMBOL_MAP).join(", ")}` },
        { status: 400 }
      )
    }

    if (!VALID_INTERVALS.includes(interval)) {
      return NextResponse.json(
        { error: `Invalid interval: ${interval}. Valid intervals: ${VALID_INTERVALS.join(", ")}` },
        { status: 400 }
      )
    }

    // Try cache first
    const cacheKey = CACHE_KEYS.market(`history_${symbol}_${interval}`)
    try {
      const cached = await getCache(cacheKey)
      if (cached) {
        return NextResponse.json({
          ...cached,
          source: "cached",
        })
      }
    } catch (cacheError) {
      console.warn("Cache unavailable for market history, proceeding without cache:", cacheError)
      // Continue without cache - don't fail if Redis is down
    }

    // Fetch from Binance klines endpoint
    const binanceSymbol = SYMBOL_MAP[symbol]
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`)
    }

    const klines: BinanceCandle[] = await response.json()

    // Transform Binance format to our format
    const historyData: HistoryData = {
      symbol,
      interval,
      data: klines.map((candle) => ({
        time: new Date(candle[0]).toISOString(),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      })),
      timestamp: new Date().toISOString(),
      source: "binance",
    }

    // Try to cache based on interval, but don't fail if it doesn't work
    try {
      const ttl = interval === "1m" ? 60 : interval === "5m" ? 300 : 3600 // 1h default
      await setCache(cacheKey, historyData, { ttl })
    } catch (cacheError) {
      console.warn("Could not cache market history:", cacheError)
    }

    return NextResponse.json(historyData)
  } catch (error) {
    console.error("Error fetching market history:", error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch market history" },
      { status: 500 }
    )
  }
}