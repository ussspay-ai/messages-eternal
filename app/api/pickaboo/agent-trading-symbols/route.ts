/**
 * API Endpoint: GET /api/pickaboo/agent-trading-symbols
 * Fetch the trading symbols configured for a specific agent in Pickaboo
 * Falls back to default symbols if not configured
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AGENT_TRADING_SYMBOLS } from '@/lib/constants/agents'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agent_id parameter' },
        { status: 400 }
      )
    }

    // Try to fetch from agent_trading_symbols table (Pickaboo config)
    if (supabase) {
      try {
        console.log(`[Chat Engine] 📡 Querying agent_trading_symbols for ${agentId}`)
        
        const { data, error } = await supabase
          .from('agent_trading_symbols')
          .select('symbols, updated_at, updated_by')
          .eq('agent_id', agentId)
          .single()

        if (error) {
          console.warn(`[Chat Engine] ⚠️ Query error for ${agentId}:`, error.message)
        } else if (data && data.symbols) {
          // Handle both array and string formats
          const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols]
          console.log(`[Chat Engine] ✅ Fetched configured symbols for ${agentId}: ${symbols.join(', ')}`)
          return NextResponse.json({
            success: true,
            agent_id: agentId,
            symbols: symbols,
            source: 'pickaboo_config',
            updated_at: data.updated_at,
            updated_by: data.updated_by,
            timestamp: new Date().toISOString(),
          })
        }
      } catch (dbError) {
        console.warn(`[Chat Engine] ⚠️ Exception querying Pickaboo config for ${agentId}:`, dbError instanceof Error ? dbError.message : dbError)
      }
    } else {
      console.warn(`[Chat Engine] ⚠️ Supabase not configured, using default symbols for ${agentId}`)
    }

    // Fallback to static AGENT_TRADING_SYMBOLS config
    const defaultSymbols = AGENT_TRADING_SYMBOLS[agentId] || AGENT_TRADING_SYMBOLS.claude_arbitrage
    
    console.log(`[Chat Engine] 📡 Using default symbols for ${agentId}: ${defaultSymbols.join(', ')}`)
    return NextResponse.json({
      success: true,
      agent_id: agentId,
      symbols: defaultSymbols,
      source: 'default_config',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching agent trading symbols:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch agent trading symbols',
      },
      { status: 500 }
    )
  }
}