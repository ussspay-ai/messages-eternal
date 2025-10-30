/**
 * PUT /api/pickaboo/update-symbol
 * Update trading symbol for agents
 * GET /api/pickaboo/update-symbol
 * Get supported symbols from Asterdex and current agent symbols
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase, isPickabooAdminWhitelisted } from '@/lib/supabase-client'
import { AsterClient } from '@/lib/aster-client'

interface UpdateSymbolRequest {
  wallet: string
  symbol: string
  agentId?: string // If not provided, update all agents
}

interface UpdateSymbolResponse {
  success: boolean
  message?: string
  updated_agents?: string[]
  error?: string
}

const ALL_AGENTS = ['agent_1', 'agent_2', 'agent_3', 'agent_4', 'agent_5']

// Validate trading symbol format (e.g., ASTERUSDT, ETHUSDT)
function isValidSymbol(symbol: string): boolean {
  return /^[A-Z]+USDT$/.test(symbol)
}

// Get supported symbols from Asterdex
async function getSupportedSymbols(): Promise<string[]> {
  try {
    const client = new AsterClient({
      agentId: 'system',
      signer: 'system',
    })
    return await client.getSupportedSymbols()
  } catch (error) {
    console.error('Error fetching supported symbols:', error)
    // Return default symbols on error
    return ['ASTERUSDT', 'ETHUSDT', 'BTCUSDT', 'BNBUSDT', 'SOLUSDT']
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<UpdateSymbolResponse>> {
  try {
    const body = (await request.json()) as UpdateSymbolRequest

    // Verify wallet is whitelisted
    if (!body.wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const isWhitelisted = await isPickabooAdminWhitelisted(body.wallet)
    if (!isWhitelisted) {
      return NextResponse.json(
        { success: false, error: 'Wallet not authorized' },
        { status: 403 }
      )
    }

    // Validate symbol
    if (!body.symbol || !isValidSymbol(body.symbol)) {
      return NextResponse.json(
        { success: false, error: 'Invalid symbol format. Use format like ASTERUSDT, ETHUSDT, etc.' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    const agentIds = body.agentId ? [body.agentId] : ALL_AGENTS

    // Update trading symbols in database
    const { error } = await supabase
      .from('trading_symbols')
      .upsert(
        agentIds.map(id => ({
          agent_id: id,
          symbol: body.symbol,
        })),
        { onConflict: 'agent_id' }
      )

    if (error) {
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    const message =
      agentIds.length === ALL_AGENTS.length
        ? `Updated trading symbol to ${body.symbol} for all agents`
        : `Updated trading symbol to ${body.symbol} for agent ${body.agentId}`

    return NextResponse.json({
      success: true,
      message,
      updated_agents: agentIds,
    })
  } catch (error: any) {
    console.error('Update symbol error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update symbol' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<any>> {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    // Verify wallet is whitelisted (optional for GET, but recommended)
    if (wallet) {
      const isWhitelisted = await isPickabooAdminWhitelisted(wallet)
      if (!isWhitelisted) {
        return NextResponse.json(
          { success: false, error: 'Wallet not authorized' },
          { status: 403 }
        )
      }
    }

    // Fetch supported symbols from Asterdex
    const supportedSymbols = await getSupportedSymbols()

    let symbols = ALL_AGENTS.map(id => ({
      agent_id: id,
      symbol: 'ASTERUSDT',
    }))

    if (supabase) {
      try {
        // Get current symbols from database
        const { data, error } = await supabase
          .from('trading_symbols')
          .select('agent_id, symbol')
          .in('agent_id', ALL_AGENTS)

        if (!error && data && data.length > 0) {
          symbols = data
        }
      } catch (err) {
        console.error('Error fetching symbols from database:', err)
      }
    }

    return NextResponse.json({
      success: true,
      symbols,
      supportedSymbols, // Include list of supported symbols for UI
    })
  } catch (error: any) {
    console.error('Get symbols error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to get symbols', supportedSymbols: ['ASTERUSDT', 'ETHUSDT', 'BTCUSDT'] },
      { status: 500 }
    )
  }
}