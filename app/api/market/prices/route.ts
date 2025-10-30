/**
 * GET /api/market/prices
 * Fetch real-time cryptocurrency prices from Binance
 * Public endpoint - no authentication required
 */

import { NextResponse } from "next/server"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"

interface BinancePrice {
  symbol: string
  price: string
}

interface PriceData {
  BTC: number
  ETH: number
  SOL: number
  BNB: number
  DOGE: number
  ASTER: number
  timestamp: string
  source: "binance" | "cached"
}

// Type for numeric price keys only (excludes timestamp and source)
type NumericPriceKey = Exclude<keyof PriceData, 'timestamp' | 'source'>

// Map symbol names to Binance trading pairs
const SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  DOGE: "DOGEUSDT",
  ASTER: "ASTERUSDT",
}

async function fetchBinancePrices(): Promise<Partial<PriceData>> {
  const prices: Partial<PriceData> = {}

  try {
    // Fetch all prices in parallel
    const symbolKeys = Object.keys(SYMBOL_MAP)
    const pricePromises = symbolKeys.map((key) =>
      fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${SYMBOL_MAP[key]}`)
        .then((res) => res.json())
        .then((data: BinancePrice) => {
          prices[key as NumericPriceKey] = parseFloat(data.price)
        })
        .catch((err) => {
          console.error(`Failed to fetch ${key} price:`, err)
        })
    )

    await Promise.all(pricePromises)
  } catch (error) {
    console.error("Error fetching Binance prices:", error)
  }

  return prices
}

export async function GET() {
  try {
    // Try cache first (30 second TTL - respects Binance rate limits)
    const cacheKey = CACHE_KEYS.market("prices")
    const cached = await getCache(cacheKey)
    if (cached) {
      return NextResponse.json({
        ...cached,
        source: "cached",
      })
    }

    // Fetch fresh prices from Binance
    const prices = await fetchBinancePrices()

    // Validate we got some data
    if (Object.keys(prices).length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch market prices from Binance" },
        { status: 503 }
      )
    }

    const response: PriceData = {
      BTC: prices.BTC || 0,
      ETH: prices.ETH || 0,
      SOL: prices.SOL || 0,
      BNB: prices.BNB || 0,
      DOGE: prices.DOGE || 0,
      ASTER: prices.ASTER || 0,
      timestamp: new Date().toISOString(),
      source: "binance",
    }

    // Cache for 30 seconds
    await setCache(cacheKey, response, { ttl: 30 })

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in market prices endpoint:", error)
    
    // Try to return cached data as fallback
    try {
      const cacheKey = CACHE_KEYS.market("prices")
      const cached = await getCache(cacheKey)
      if (cached) {
        return NextResponse.json({
          ...cached,
          source: "cached",
        })
      }
    } catch (cacheError) {
      console.error("Cache fallback failed:", cacheError)
    }

    return NextResponse.json(
      { error: "Failed to fetch market prices" },
      { status: 500 }
    )
  }
}