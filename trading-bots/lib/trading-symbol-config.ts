/**
 * Trading Symbol Configuration for Agents
 * Fetches trading symbols from Pickaboo dashboard (Supabase)
 * Falls back to environment variable and then default
 */

import { createClient } from '@supabase/supabase-js'

let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[Trading Symbol Config] Supabase credentials not configured. Will use environment variables.')
      return null
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
  }

  return supabaseClient
}

/**
 * Fetch trading symbol for a specific agent from Supabase (Pickaboo dashboard)
 * Priority order:
 * 1. agent_trading_symbols table (new multi-symbol support) - returns first symbol
 * 2. trading_symbols table (legacy single-symbol support)
 * 3. Environment variable fallback
 * 4. TRADING_SYMBOL env var
 * 5. Default 'ASTERUSDT'
 */
export async function getTradingSymbol(
  agentId: string,
  envFallback?: string
): Promise<string> {
  const supabase = getSupabaseClient()

  // First try: Fetch from agent_trading_symbols (new multi-symbol table)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('agent_trading_symbols')
        .select('symbols')
        .eq('agent_id', agentId)
        .single() as { data: { symbols: string[] } | null; error: any }

      if (!error && data && Array.isArray(data.symbols) && data.symbols.length > 0) {
        const symbol = data.symbols[0]
        console.log(`✅ [${agentId}] Fetched trading symbol from agent_trading_symbols: ${symbol} (multi-symbol config available)`)
        return symbol
      }

      if (error?.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is OK
        console.debug(`[${agentId}] Note: agent_trading_symbols not found, trying trading_symbols table`)
      }
    } catch (error) {
      console.debug(`[${agentId}] Checking agent_trading_symbols failed (this is OK if table is new):`, error)
    }
  }

  // Second try: Fetch from legacy trading_symbols table
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trading_symbols')
        .select('symbol')
        .eq('agent_id', agentId)
        .single() as { data: { symbol: string } | null; error: any }

      if (!error && data && data.symbol) {
        console.log(`✅ [${agentId}] Fetched trading symbol from trading_symbols (legacy): ${data.symbol}`)
        return data.symbol
      }

      if (error?.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is OK
        console.warn(`[${agentId}] Error fetching from trading_symbols:`, error)
      }
    } catch (error) {
      console.warn(`[${agentId}] Supabase connection failed:`, error)
    }
  }

  // Third try: Environment variable
  if (envFallback) {
    console.log(`✅ [${agentId}] Using trading symbol from environment: ${envFallback}`)
    return envFallback
  }

  // Fourth try: TRADING_SYMBOL env var
  const tradingSymbol = process.env.TRADING_SYMBOL
  if (tradingSymbol) {
    console.log(`✅ [${agentId}] Using TRADING_SYMBOL environment variable: ${tradingSymbol}`)
    return tradingSymbol
  }

  // Final fallback: Default symbol
  const defaultSymbol = 'ASTERUSDT'
  console.warn(`[${agentId}] No symbol found, using default: ${defaultSymbol}`)
  return defaultSymbol
}

/**
 * Fetch ALL trading symbols for a specific agent (supports multi-symbol trading)
 */
export async function getTradingSymbols(
  agentId: string,
  envFallback?: string
): Promise<string[]> {
  const supabase = getSupabaseClient()

  // First try: Fetch from agent_trading_symbols (new multi-symbol table)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('agent_trading_symbols')
        .select('symbols')
        .eq('agent_id', agentId)
        .single() as { data: { symbols: string[] } | null; error: any }

      if (!error && data && Array.isArray(data.symbols) && data.symbols.length > 0) {
        console.log(`✅ [${agentId}] Fetched ${data.symbols.length} symbols from agent_trading_symbols: ${data.symbols.join(', ')}`)
        return data.symbols
      }

      if (error?.code !== 'PGRST116') {
        console.debug(`[${agentId}] Note: agent_trading_symbols not found, trying trading_symbols table`)
      }
    } catch (error) {
      console.debug(`[${agentId}] Checking agent_trading_symbols failed (this is OK if table is new):`, error)
    }
  }

  // Second try: Fetch from legacy trading_symbols table (single symbol)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trading_symbols')
        .select('symbol')
        .eq('agent_id', agentId)
        .single() as { data: { symbol: string } | null; error: any }

      if (!error && data && data.symbol) {
        console.log(`✅ [${agentId}] Fetched trading symbol from trading_symbols (legacy): ${data.symbol}`)
        return [data.symbol]
      }

      if (error?.code !== 'PGRST116') {
        console.warn(`[${agentId}] Error fetching from trading_symbols:`, error)
      }
    } catch (error) {
      console.warn(`[${agentId}] Supabase connection failed:`, error)
    }
  }

  // Third try: Environment variable
  if (envFallback) {
    console.log(`✅ [${agentId}] Using trading symbol from environment: ${envFallback}`)
    return [envFallback]
  }

  // Fourth try: TRADING_SYMBOL env var
  const tradingSymbol = process.env.TRADING_SYMBOL
  if (tradingSymbol) {
    console.log(`✅ [${agentId}] Using TRADING_SYMBOL environment variable: ${tradingSymbol}`)
    return [tradingSymbol]
  }

  // Final fallback: Default symbol
  const defaultSymbol = 'ASTERUSDT'
  console.warn(`[${agentId}] No symbol found, using default: ${defaultSymbol}`)
  return [defaultSymbol]
}

/**
 * Fetch trading symbols for all agents
 * Useful for multi-agent initialization
 * Returns all symbols from agent_trading_symbols if available, falls back to trading_symbols
 */
export async function getAllTradingSymbols(): Promise<Record<string, string[]>> {
  const supabase = getSupabaseClient()
  // Default symbols - will be fetched dynamically from DB in most cases
  const defaultSymbols: Record<string, string[]> = {}

  if (!supabase) {
    console.warn('[Trading Symbol Config] Supabase not available, using all defaults')
    return defaultSymbols
  }

  try {
    // First try: Fetch from agent_trading_symbols (new multi-symbol table)
    const { data: agentSymbolData, error: agentSymbolError } = await supabase
      .from('agent_trading_symbols')
      .select('agent_id, symbols')

    if (!agentSymbolError && agentSymbolData && agentSymbolData.length > 0) {
      const symbolMap: Record<string, string[]> = { ...defaultSymbols }
      agentSymbolData.forEach((row: any) => {
        if (Array.isArray(row.symbols) && row.symbols.length > 0) {
          symbolMap[row.agent_id] = row.symbols
        }
      })
      console.log('[Trading Symbol Config] Fetched symbols from agent_trading_symbols:', symbolMap)
      return symbolMap
    }

    // Fallback: Fetch from legacy trading_symbols table
    const { data: legacyData, error: legacyError } = await supabase
      .from('trading_symbols')
      .select('agent_id, symbol')

    if (legacyError) {
      console.warn('[Trading Symbol Config] Error fetching symbols from both tables:', legacyError)
      return defaultSymbols
    }

    const symbolMap: Record<string, string[]> = { ...defaultSymbols }
    legacyData?.forEach((row: any) => {
      symbolMap[row.agent_id] = [row.symbol]
    })

    console.log('[Trading Symbol Config] Fetched symbols from trading_symbols (legacy):', symbolMap)
    return symbolMap
  } catch (error) {
    console.warn('[Trading Symbol Config] Exception fetching symbols:', error)
    return defaultSymbols
  }
}