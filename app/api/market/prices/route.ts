/**
 * GET /api/market/prices
 * Fetch real-time cryptocurrency prices with fallback chain:
 * 1. CoinGecko (primary - free, reliable)
 * 2. Binance (fallback)
 * 3. Cached data (if available)
 * 4. Mock prices (last resort)
 * 
 * Supports dynamic symbol fetching:
 * - No params: returns hardcoded header display symbols (BTC, ETH, SOL, BNB, DOGE, ASTER)
 * - ?symbols=SAND,FLOKI: returns prices for requested symbols from agent's Pickaboo config
 */

import { NextRequest, NextResponse } from "next/server"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"

interface BinancePrice {
  symbol: string
  price: string
}

interface CoinGeckoPrice {
  [key: string]: { usd: number } | undefined
}

interface PriceData {
  [key: string]: number | string
  timestamp: string
  source: "coingecko" | "binance" | "cached" | "mock"
}

// Comprehensive mapping of all supported symbols to CoinGecko IDs
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  DOGE: "dogecoin",
  ASTER: "aster-2",
  SAND: "the-sandbox",
  FLOKI: "floki",
  XRP: "ripple",
  ADA: "cardano",
  POLR: "polygon",
  SUI: "sui",
  AAVE: "aave",
  // Add more symbols as needed
}

// Map symbol names to Binance trading pairs
const BINANCE_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  DOGE: "DOGEUSDT",
  ASTER: "ASTERUSDT",
  SAND: "SANDUSDT",
  FLOKI: "FLOKIUSDT",
  XRP: "XRPUSDT",
  ADA: "ADAUSDT",
  POLR: "POLRUSDT",
  SUI: "SUIUSDT",
  AAVE: "AAVEUSDT",
  // Add more symbols as needed
}

// Default header display symbols (for UI, not for agent trading)
const DEFAULT_DISPLAY_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "DOGE", "ASTER"]

/**
 * Fetch prices from CoinGecko (primary source - free, no auth required)
 */
async function fetchCoinGeckoPrices(symbols: string[]): Promise<Partial<PriceData>> {
  const prices: Partial<PriceData> = {}

  try {
    // Map requested symbols to CoinGecko IDs
    const coinIds = symbols
      .map(sym => COINGECKO_ID_MAP[sym])
      .filter(Boolean)
      .join(",")
    
    if (!coinIds) {
      console.warn("[Prices] No valid CoinGecko IDs found for symbols:", symbols)
      return prices
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`
    
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000), // 8 second timeout
    })

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`)
    }

    const data: CoinGeckoPrice = await res.json()

    // Map CoinGecko response back to our symbols
    symbols.forEach(symbol => {
      const coinId = COINGECKO_ID_MAP[symbol]
      if (coinId) {
        const coinData = data[coinId]
        if (coinData?.usd) {
          prices[symbol] = coinData.usd
        }
      }
    })

    if (Object.keys(prices).length > 0) {
      console.log(`[Prices] ✅ Fetched from CoinGecko: ${Object.keys(prices).join(", ")}`)
    }
  } catch (error) {
    console.warn("[Prices] Failed to fetch from CoinGecko:", error instanceof Error ? error.message : error)
  }

  return prices
}

/**
 * Fetch prices from Binance (fallback source)
 */
async function fetchBinancePrices(symbols: string[]): Promise<Partial<PriceData>> {
  const prices: Partial<PriceData> = {}

  try {
    // Fetch all prices in parallel
    const pricePromises = symbols.map((symbol) => {
      const binanceSymbol = BINANCE_SYMBOL_MAP[symbol]
      if (!binanceSymbol) {
        console.debug(`[Prices] No Binance symbol mapping for ${symbol}`)
        return Promise.resolve()
      }

      return fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`, {
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
            prices[symbol] = parseFloat(data.price)
          }
        })
        .catch((err) => {
          console.debug(`[Prices] Failed to fetch ${symbol} from Binance:`, err instanceof Error ? err.message : err)
        })
    })

    await Promise.all(pricePromises)
    
    if (Object.keys(prices).length > 0) {
      console.log(`[Prices] ✅ Fetched from Binance: ${Object.keys(prices).join(", ")}`)
    }
  } catch (error) {
    console.warn("[Prices] Error fetching Binance prices:", error instanceof Error ? error.message : error)
  }

  return prices
}

/**
 * Get default fallback prices for a list of symbols
 */
function getDefaultPrices(symbols: string[]): Record<string, number> {
  const defaults: Record<string, number> = {
    BTC: 42500,
    ETH: 2250,
    SOL: 145,
    BNB: 615,
    DOGE: 0.35,
    ASTER: 1.25,
    SAND: 0.45,
    FLOKI: 0.12,
    XRP: 2.5,
    ADA: 1.2,
    POLR: 0.8,
    SUI: 3.85,
    AAVE: 250,
  }
  
  const result: Record<string, number> = {}
  symbols.forEach(sym => {
    result[sym] = defaults[sym] || 100 // Default to 100 if unknown
  })
  return result
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters to get requested symbols
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')
    
    // Determine which symbols to fetch
    const requestedSymbols = symbolsParam 
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase())
      : DEFAULT_DISPLAY_SYMBOLS

    console.log(`[Prices] 🔍 Fetching prices for: ${requestedSymbols.join(", ")}`)

    const cacheKey = CACHE_KEYS.market(`prices:${requestedSymbols.sort().join(',')}`)
    
    // 1. Try cache first (30 second TTL)
    try {
      const cached = await getCache<PriceData>(cacheKey)
      if (cached && Object.values(cached).filter(v => typeof v === 'number').some(v => v > 0)) {
        console.log(`[Prices] 📦 Returning cached prices for: ${requestedSymbols.join(", ")}`)
        return NextResponse.json({
          ...cached,
          source: "cached",
        })
      }
    } catch (cacheError) {
      console.debug("[Prices] Cache unavailable:", cacheError instanceof Error ? cacheError.message : cacheError)
      // Continue without cache
    }

    // 2. Try CoinGecko (primary source)
    console.log("[Prices] 🌐 Attempting CoinGecko fetch...")
    let prices = await fetchCoinGeckoPrices(requestedSymbols)

    // 3. If CoinGecko fails, try Binance (fallback)
    if (Object.keys(prices).length < requestedSymbols.length) {
      console.log("[Prices] ⚡ CoinGecko incomplete, trying Binance for missing symbols...")
      const missingSymbols = requestedSymbols.filter(s => !prices[s])
      const binancePrices = await fetchBinancePrices(missingSymbols)
      prices = { ...prices, ...binancePrices }
    }

    // 4. If we got prices from either source, return and cache them
    if (Object.keys(prices).length > 0) {
      const response: PriceData = {
        ...prices,
        timestamp: new Date().toISOString(),
        source: Object.keys(prices).length >= requestedSymbols.length / 2 ? "coingecko" : "binance",
      }

      // Try to cache for 30 seconds
      try {
        await setCache(cacheKey, response, { ttl: 30 })
      } catch (cacheError) {
        console.debug("[Prices] Could not cache prices:", cacheError instanceof Error ? cacheError.message : cacheError)
      }

      console.log(`[Prices] ✅ Returning prices from ${response.source}: ${Object.keys(prices).join(", ")}`)
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
      console.debug("[Prices] Cache fallback unavailable:", cacheError instanceof Error ? cacheError.message : cacheError)
    }

    // 6. Last resort: return mock prices
    console.warn(`[Prices] ⚠️  All sources failed, using mock prices as fallback`)
    const fallbackPrices: PriceData = {
      ...getDefaultPrices(requestedSymbols),
      timestamp: new Date().toISOString(),
      source: "mock",
    }
    return NextResponse.json(fallbackPrices)
  } catch (error) {
    console.error("[Prices] ❌ Unexpected error:", error instanceof Error ? error.message : error)
    
    // Parse symbols from request for fallback
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')
    const requestedSymbols = symbolsParam 
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase())
      : DEFAULT_DISPLAY_SYMBOLS

    // Try cache as final fallback
    const cacheKey = CACHE_KEYS.market(`prices:${requestedSymbols.sort().join(',')}`)
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
      ...getDefaultPrices(requestedSymbols),
      timestamp: new Date().toISOString(),
      source: "mock",
    }
    return NextResponse.json(fallbackPrices)
  }
}