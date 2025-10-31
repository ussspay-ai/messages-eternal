/**
 * GET /api/market/prices
 * Fetch real-time cryptocurrency prices with fallback chain:
 * 1. CoinGecko (primary - free, reliable)
 * 2. Binance (fallback)
 * 3. Cached data (if available)
 * 4. Mock prices (last resort)
 */

import { NextResponse } from "next/server"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"

interface BinancePrice {
  symbol: string
  price: string
}

interface CoinGeckoPrice {
  bitcoin: { usd: number }
  ethereum: { usd: number }
  solana: { usd: number }
  binancecoin: { usd: number }
  dogecoin: { usd: number }
  [key: string]: { usd: number } | undefined
}

interface PriceData {
  BTC: number
  ETH: number
  SOL: number
  BNB: number
  DOGE: number
  ASTER: number
  timestamp: string
  source: "coingecko" | "binance" | "cached" | "mock"
}

// Type for numeric price keys only (excludes timestamp and source)
type NumericPriceKey = Exclude<keyof PriceData, 'timestamp' | 'source'>

// Map symbol names to CoinGecko IDs
const COINGECKO_IDS: Record<NumericPriceKey, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  DOGE: "dogecoin",
  ASTER: "aster", // CoinGecko ID for Aster
}

// Map symbol names to Binance trading pairs
const SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  DOGE: "DOGEUSDT",
  ASTER: "ASTERUSDT",
}

/**
 * Fetch prices from CoinGecko (primary source - free, no auth required)
 */
async function fetchCoinGeckoPrices(): Promise<Partial<PriceData>> {
  const prices: Partial<PriceData> = {}

  try {
    const coinIds = Object.values(COINGECKO_IDS).join(",")
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`
    
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000), // 8 second timeout
    })

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`)
    }

    const data: CoinGeckoPrice = await res.json()

    // Map CoinGecko response back to our symbols
    Object.entries(COINGECKO_IDS).forEach(([symbol, coinId]) => {
      const coinData = data[coinId]
      if (coinData?.usd) {
        prices[symbol as NumericPriceKey] = coinData.usd
      }
    })

    if (Object.keys(prices).length > 0) {
      console.log(`✅ Fetched ${Object.keys(prices).length} prices from CoinGecko`)
    }
  } catch (error) {
    console.warn("Failed to fetch from CoinGecko:", error instanceof Error ? error.message : error)
  }

  return prices
}

/**
 * Fetch prices from Binance (fallback source)
 */
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
          console.debug(`Failed to fetch ${key} from Binance:`, err instanceof Error ? err.message : err)
        })
    )

    await Promise.all(pricePromises)
    
    if (Object.keys(prices).length > 0) {
      console.log(`✅ Fetched ${Object.keys(prices).length} prices from Binance`)
    }
  } catch (error) {
    console.warn("Error fetching Binance prices:", error instanceof Error ? error.message : error)
  }

  return prices
}

export async function GET() {
  const cacheKey = CACHE_KEYS.market("prices")
  
  try {
    // 1. Try cache first (30 second TTL)
    try {
      const cached = await getCache<PriceData>(cacheKey)
      if (cached && Object.values(cached).some(v => typeof v === 'number' && v > 0)) {
        console.log("[Prices] Returning cached prices")
        return NextResponse.json({
          ...cached,
          source: "cached",
        })
      }
    } catch (cacheError) {
      console.debug("Cache unavailable:", cacheError instanceof Error ? cacheError.message : cacheError)
      // Continue without cache
    }

    // 2. Try CoinGecko (primary source)
    console.log("[Prices] Attempting CoinGecko fetch...")
    let prices = await fetchCoinGeckoPrices()

    // 3. If CoinGecko fails, try Binance (fallback)
    if (Object.keys(prices).length === 0) {
      console.log("[Prices] CoinGecko had no results, trying Binance...")
      prices = await fetchBinancePrices()
    }

    // 4. If we got prices from either source, return and cache them
    if (Object.keys(prices).length > 0) {
      const response: PriceData = {
        BTC: prices.BTC || 0,
        ETH: prices.ETH || 0,
        SOL: prices.SOL || 0,
        BNB: prices.BNB || 0,
        DOGE: prices.DOGE || 0,
        ASTER: prices.ASTER || 0,
        timestamp: new Date().toISOString(),
        source: Object.keys(prices).length >= 4 ? "coingecko" : "binance",
      }

      // Try to cache for 30 seconds
      try {
        await setCache(cacheKey, response, { ttl: 30 })
      } catch (cacheError) {
        console.debug("Could not cache prices:", cacheError instanceof Error ? cacheError.message : cacheError)
      }

      console.log(`[Prices] ✅ Returning ${response.source} prices`)
      return NextResponse.json(response)
    }

    // 5. Both APIs failed, try to get cached data as fallback
    console.warn("[Prices] Both CoinGecko and Binance failed, attempting cache fallback...")
    try {
      const cached = await getCache<PriceData>(cacheKey)
      if (cached) {
        return NextResponse.json({
          ...cached,
          source: "cached",
        })
      }
    } catch (cacheError) {
      console.debug("Cache fallback unavailable:", cacheError instanceof Error ? cacheError.message : cacheError)
    }

    // 6. Last resort: return mock prices
    console.warn("[Prices] All sources failed, using mock prices as fallback")
    const fallbackPrices: PriceData = {
      BTC: 42500,
      ETH: 2250,
      SOL: 145,
      BNB: 615,
      DOGE: 0.35,
      ASTER: 1.25,
      timestamp: new Date().toISOString(),
      source: "mock",
    }
    return NextResponse.json(fallbackPrices)
  } catch (error) {
    console.error("[Prices] Unexpected error in market prices endpoint:", error instanceof Error ? error.message : error)
    
    // Try cache as final fallback
    try {
      const cached = await getCache<PriceData>(cacheKey)
      if (cached) {
        return NextResponse.json({
          ...cached,
          source: "cached",
        })
      }
    } catch (cacheError) {
      console.error("[Prices] Cache fallback failed:", cacheError)
    }

    // Absolute last resort
    const fallbackPrices: PriceData = {
      BTC: 42500,
      ETH: 2250,
      SOL: 145,
      BNB: 615,
      DOGE: 0.35,
      ASTER: 1.25,
      timestamp: new Date().toISOString(),
      source: "mock",
    }
    return NextResponse.json(fallbackPrices)
  }
}