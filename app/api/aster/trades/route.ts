/**
 * GET /api/aster/trades?agentId=<id>&symbol=<symbol>&limit=<limit>
 * Fetch agent trade history from Aster
 * Uses Pickaboo-configured trading symbols instead of hardcoded list
 */

import { AsterClient } from "@/lib/aster-client"
import { getCache, setCache, CACHE_KEYS } from "@/lib/redis-client"
import { getAgentCredentials, PRIMARY_SYMBOLS } from "@/lib/constants/agents"
import { supabase } from "@/lib/supabase-client"
import { NextRequest, NextResponse } from "next/server"

/**
 * Get agent's configured trading symbols from Pickaboo
 * Falls back to PRIMARY_SYMBOLS if not configured in database
 */
async function getAgentTradingSymbols(agentId: string): Promise<string[]> {
  // Check cache first
  const cacheKey = `agent_symbols:${agentId}`
  try {
    const cached = await getCache<string[]>(cacheKey)
    if (cached) {
      console.log(`[Trades API] Using cached symbols for ${agentId}: ${cached.join(", ")}`)
      return cached
    }
  } catch (cacheError) {
    console.warn(`[Trades API] Cache unavailable for agent symbols ${agentId}`)
  }

  try {
    // Query Pickaboo configuration if Supabase is available
    if (supabase) {
      const { data, error } = await supabase
        .from("agent_trading_symbols")
        .select("symbols")
        .eq("agent_id", agentId)
        .single()

      if (!error && data && data.symbols) {
        const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols]
        // Convert base symbols to USDT pairs if needed
        const pairs = symbols.map((s: string) => s.endsWith("USDT") ? s : `${s}USDT`)
        
        // Try to cache for 1 hour
        try {
          await setCache(cacheKey, pairs, { ttl: 3600 })
        } catch (cacheError) {
          console.warn("[Trades API] Could not cache agent symbols")
        }
        console.log(`[Trades API] ✅ Fetched configured symbols from Pickaboo for ${agentId}: ${pairs.join(", ")}`)
        return pairs
      }
    }
  } catch (e) {
    console.debug(`[Trades API] Could not fetch Pickaboo config for ${agentId}:`, e)
  }

  // Fallback to default symbols
  try {
    await setCache(cacheKey, PRIMARY_SYMBOLS, { ttl: 3600 })
  } catch (cacheError) {
    console.warn("[Trades API] Could not cache default symbols")
  }
  console.log(`[Trades API] ⚠️ Using default symbols for ${agentId}: ${PRIMARY_SYMBOLS.join(", ")}`)
  return PRIMARY_SYMBOLS
}

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId")
    const symbol = request.nextUrl.searchParams.get("symbol")
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100")

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 })
    }

    // Get agent credentials
    const credentials = getAgentCredentials(agentId)
    if (!credentials) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Create Aster client
    const client = new AsterClient({
      agentId,
      signer: credentials.signer,
      apiSecret: undefined,
      userAddress: credentials.signer,
      userApiKey: credentials.userApiKey,
      userApiSecret: credentials.userApiSecret,
    })

    // If specific symbol requested, fetch those trades
    if (symbol) {
      const cacheKey = CACHE_KEYS.trades(agentId, limit)
      try {
        const cached = await getCache(cacheKey)
        if (cached) {
          return NextResponse.json(cached)
        }
      } catch (cacheError) {
        console.warn("[Trades API] Cache unavailable for trades")
      }

      const tradesData = await client.getTrades(symbol, limit)
      const trades = tradesData.trades || []
      // Ensure each trade has the symbol field
      const enrichedTrades = trades.map((t: any) => ({
        ...t,
        symbol: t.symbol || symbol,
      }))
      try {
        await setCache(cacheKey, enrichedTrades, { ttl: 10 })
      } catch (cacheError) {
        console.warn("[Trades API] Could not cache trades")
      }
      return NextResponse.json(enrichedTrades)
    }

    // Fetch configured trading symbols from Pickaboo (instead of hardcoded PRIMARY_SYMBOLS)
    const tradingSymbols = await getAgentTradingSymbols(agentId)
    console.log(`[Trades API] 📊 Fetching trades for ${agentId} from symbols: ${tradingSymbols.join(", ")}`)

    const allTrades: any[] = []

    // Fetch trades from ALL configured symbols
    for (const sym of tradingSymbols) {
      try {
        const tradesData = await client.getTrades(sym, 50)
        const trades = tradesData.trades || []
        if (trades.length > 0) {
          console.log(`[Trades API] Found ${trades.length} trades for ${sym}`)
          // Ensure each trade has the symbol field
          const enrichedTrades = trades.map((t: any) => ({
            ...t,
            symbol: t.symbol || sym, // Use trade's symbol or fallback to requested symbol
          }))
          allTrades.push(...enrichedTrades)
        }
      } catch (error) {
        // Symbol might not have trades, continue
        console.debug(`[Trades API] No trades found for ${sym}:`, error instanceof Error ? error.message : error)
      }
    }

    // Sort by time descending
    allTrades.sort((a, b) => b.time - a.time)

    const result = allTrades.slice(0, limit)
    console.log(`[Trades API] ✅ Returning ${result.length} trades (limited to ${limit})`)
    if (result.length > 0) {
      console.log(`[Trades API] Sample trade structure:`, JSON.stringify(result[0], null, 2))
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("[Trades API] Error fetching trades:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch trades" },
      { status: 500 }
    )
  }
}