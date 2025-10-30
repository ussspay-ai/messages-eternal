/**
 * API Endpoint: GET /api/pickaboo/supported-symbols
 * Fetches available trading symbols from Aster DEX
 * Returns symbols that agents can trade
 */

import { NextRequest, NextResponse } from 'next/server'
import { AsterClient } from '@/lib/aster-client'

export async function GET(request: NextRequest) {
  try {
    // Create Aster client with default config to fetch exchange info
    const asterClient = new AsterClient({
      agentId: 'pickaboo_admin',
      signer: '0x0000000000000000000000000000000000000000', // Dummy address for public endpoint
      userApiKey: process.env.ASTER_USER_API_KEY || '',
      userApiSecret: process.env.ASTER_USER_SECRET_KEY || '',
      userAddress: process.env.ASTER_USER_ADDRESS || '',
      baseUrl: process.env.ASTER_API_URL || 'https://fapi.asterdex.com',
    })

    // Fetch supported symbols from Aster DEX
    const symbols = await asterClient.getSupportedSymbols()

    console.log(`[Pickaboo API] Fetched ${symbols.length} supported symbols from Aster DEX`)

    return NextResponse.json({
      success: true,
      symbols,
      timestamp: new Date().toISOString(),
      source: 'aster_dex',
    })
  } catch (error) {
    console.error('[Pickaboo API] Error fetching supported symbols:', error)
    
    // Return default symbols as fallback
    const defaultSymbols = ['ASTERUSDT', 'ETHUSDT', 'BTCUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT']
    
    return NextResponse.json({
      success: true,
      symbols: defaultSymbols,
      timestamp: new Date().toISOString(),
      source: 'default_fallback',
      error: error instanceof Error ? error.message : 'Failed to fetch from Aster DEX',
    })
  }
}