/**
 * API Endpoint: PUT /api/pickaboo/update-agent-symbols
 * Updates multiple trading symbols for a specific agent
 * Allows each agent to trade different symbols simultaneously
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isPickabooAdminWhitelisted } from '@/lib/supabase-client'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, agent_id, symbols } = body

    if (!wallet || !agent_id || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields: wallet, agent_id, symbols' },
        { status: 400 }
      )
    }

    // Verify wallet is authorized using the central whitelist check
    const isAdmin = await isPickabooAdminWhitelisted(wallet)

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Wallet not in admin list' },
        { status: 403 }
      )
    }

    if (!supabase) {
      console.warn('[Pickaboo API] Supabase not configured, cannot update symbols')
      return NextResponse.json(
        {
          error: 'Agent trading symbols feature is not available. Configure SUPABASE_URL and SUPABASE_SERVICE_KEY to enable.',
          setup_instruction: 'Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables'
        },
        { status: 503 }
      )
    }

    // Store agent symbols in agent_trading_symbols table
    console.log('[Pickaboo API] Updating symbols for agent:', {
      agent_id,
      symbols,
      updated_by: wallet.toLowerCase(),
    })

    const { data, error: upsertError } = await supabase
      .from('agent_trading_symbols')
      .upsert(
        {
          agent_id,
          symbols: symbols, // Store as TEXT[] array
          updated_at: new Date().toISOString(),
          updated_by: wallet.toLowerCase(),
        },
        {
          onConflict: 'agent_id',
        }
      )
      .select()

    if (upsertError) {
      console.error('[Pickaboo API] Error upserting agent symbols:', upsertError)
      return NextResponse.json(
        {
          error: `Failed to save symbols: ${upsertError.message}`,
          details: upsertError,
        },
        { status: 500 }
      )
    }

    console.log('[Pickaboo API] Successfully saved symbols:', {
      agent_id,
      symbols,
      data,
    })

    // Also update the primary trading symbol in trading_symbols table for legacy compatibility
    const primarySymbol = symbols[0]
    const { error: legacyError } = await supabase
      .from('trading_symbols')
      .upsert(
        {
          agent_id,
          symbol: primarySymbol,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'agent_id',
        }
      )

    if (legacyError) {
      console.warn('[Pickaboo API] Warning: Could not update legacy trading_symbols table:', legacyError.message)
      // Don't fail the request for this - it's just for legacy compatibility
    }

    return NextResponse.json({
      success: true,
      message: `Agent ${agent_id} now trading: ${symbols.join(', ')}`,
      agent_id,
      symbols,
      primary_symbol: primarySymbol,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating agent symbols:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update agent symbols',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    const agentId = searchParams.get('agent_id')

    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing wallet parameter' },
        { status: 400 }
      )
    }

    console.log('[Pickaboo API] Fetching agent symbols:', {
      wallet,
      agentId,
    })

    if (!supabase) {
      console.warn('[Pickaboo API] Supabase not configured')
      return NextResponse.json({
        success: true,
        agent_symbols: {},
        count: 0,
        warning: 'Supabase not configured. Configure SUPABASE_URL and SUPABASE_SERVICE_KEY to enable.',
      })
    }

    // Get agent symbols from agent_trading_symbols table
    let query = supabase.from('agent_trading_symbols').select('agent_id, symbols, updated_at, updated_by')

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Pickaboo API] Error fetching agent symbols:', error)
      // Return empty data instead of error - table might not exist yet
      return NextResponse.json(
        {
          success: true,
          agent_symbols: {},
          message: 'Agent trading symbols table not configured yet',
          error_details: error.message,
        }
      )
    }

    const agentSymbols: Record<string, string[]> = {}
    if (data && data.length > 0) {
      console.log(`[Pickaboo API] Found ${data.length} agent symbol configurations`)
      data.forEach((row: any) => {
        agentSymbols[row.agent_id] = Array.isArray(row.symbols) ? row.symbols : [row.symbols]
        console.log(`[Pickaboo API] Agent ${row.agent_id}: ${agentSymbols[row.agent_id].join(', ')}`)
      })
    } else {
      console.log('[Pickaboo API] No agent symbols configured yet')
    }

    return NextResponse.json({
      success: true,
      agent_symbols: agentSymbols,
      count: Object.keys(agentSymbols).length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching agent symbols:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch agent symbols',
        success: false,
        agent_symbols: {},
      },
      { status: 500 }
    )
  }
}