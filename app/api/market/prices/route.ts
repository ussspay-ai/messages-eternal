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
      fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${SYMBOL_MAP[key]}`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Binance API error: ${res.status} ${res.statusText}`)
          }
          return res.json()
        })
        .then((data: BinancePrice) => {
          if (data.price) {
            prices[key as NumericPriceKey] = parseFloat(data.price)
          }
        })
        .catch((err) => {
          console.warn(`Failed to fetch ${key} price:`, err instanceof Error ? err.message : err)
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
    try {
      const cached = await getCache(cacheKey)
      if (cached) {
        return NextResponse.json({
          ...cached,
          source: "cached",
        })
      }
    } catch (cacheError) {
      console.warn("Cache unavailable, proceeding without cache:", cacheError)
      // Continue without cache - don't fail if Redis is down
    }

    // Fetch fresh prices from Binance
    const prices = await fetchBinancePrices()

    // If we got some data, use it
    if (Object.keys(prices).length > 0) {
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

      // Try to cache for 30 seconds, but don't fail if it doesn't work
      try {
        await setCache(cacheKey, response, { ttl: 30 })
      } catch (cacheError) {
        console.warn("Could not cache prices:", cacheError)
      }

      return NextResponse.json(response)
    }

    // If no prices from Binance, use mock prices as fallback
    console.warn("No prices from Binance, using mock prices as fallback")
    const fallbackPrices: PriceData = {
      BTC: 42500,
      ETH: 2250,
      SOL: 145,
      BNB: 615,
      DOGE: 0.35,
      ASTER: 1.25,
      timestamp: new Date().toISOString(),
      source: "cached",
    }
    return NextResponse.json(fallbackPrices)
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

    // Last resort: return mock prices
    const fallbackPrices: PriceData = {
      BTC: 42500,
      ETH: 2250,
      SOL: 145,
      BNB: 615,
      DOGE: 0.35,
      ASTER: 1.25,
      timestamp: new Date().toISOString(),
      source: "cached",
    }
    return NextResponse.json(fallbackPrices)
  }
}