/**
 * GET /api/pickaboo/agent-balances?password=<password>
 * Fetch real trading stats and balances for all agents from Asterdex
 * Returns: wallet balance, unrealized PnL, equity, and signer addresses
 */

import { NextRequest, NextResponse } from 'next/server'
import { AsterClient } from '@/lib/aster-client'
import { AGENTS } from '@/lib/constants/agents'
import { isPickabooAdminWhitelisted } from '@/lib/supabase-client'

interface AgentBalance {
  agent_id: string
  agent_name: string
  agent_signer: string // Agent's wallet address
  wallet_balance: number
  unrealized_pnl: number
  equity: number
  total_roi: number
  positions_count: number
  status: 'success' | 'error'
  error?: string
  last_updated: string
}

interface AgentBalancesResponse {
  success: boolean
  results?: AgentBalance[]
  total_equity?: number
  timestamp: string
  error?: string
}

// Map agent IDs to their environment variable numbers and signer addresses
const AGENT_CONFIG = {
  claude_arbitrage: { number: 1, env: 'AGENT_1_SIGNER' },
  chatgpt_openai: { number: 2, env: 'AGENT_2_SIGNER' },
  gemini_grid: { number: 3, env: 'AGENT_3_SIGNER' },
  deepseek_ml: { number: 4, env: 'AGENT_4_SIGNER' },
  buy_and_hold: { number: 5, env: 'AGENT_5_SIGNER' },
}

export async function GET(request: NextRequest): Promise<NextResponse<AgentBalancesResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    // Verify wallet is whitelisted
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    const isWhitelisted = await isPickabooAdminWhitelisted(wallet)
    if (!isWhitelisted) {
      return NextResponse.json(
        { success: false, error: 'Wallet not authorized', timestamp: new Date().toISOString() },
        { status: 403 }
      )
    }

    const results: AgentBalance[] = []
    let totalEquity = 0

    // Get main account address from environment
    const userAddress = process.env.ASTER_USER_ADDRESS

    console.log('[Pickaboo] Checking Asterdex API credentials...')
    console.log('[Pickaboo] Main User Address:', userAddress ? `${userAddress.substring(0, 10)}...` : 'NOT SET')

    if (!userAddress) {
      console.error('❌ [Pickaboo] Missing main Asterdex user address')
      return NextResponse.json(
        {
          success: false,
          error: 'Main Asterdex user address not configured',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
    
    console.log('✅ [Pickaboo] Main account configured')

    // Agent number mapping
    const AGENT_NUMBER_MAP: Record<string, number> = {
      claude_arbitrage: 1,
      chatgpt_openai: 2,
      gemini_grid: 3,
      deepseek_ml: 4,
      buy_and_hold: 5,
    }

    // Fetch balance for each agent
    for (const [agentId, agentConfig] of Object.entries(AGENTS)) {
      let signerAddress: string | undefined
      try {
        signerAddress = agentConfig.aster_account_id
        
        console.log(`[Pickaboo] Processing agent ${agentId}:`, {
          agentName: agentConfig.name,
          signerAddress: signerAddress ? `${signerAddress.substring(0, 10)}...` : 'NOT SET',
        })

        // Skip if signer address is not valid
        if (!signerAddress || signerAddress === '0x') {
          console.warn(`⚠️  [Pickaboo] Agent ${agentId} has invalid signer address: ${signerAddress}`)
          results.push({
            agent_id: agentId,
            agent_name: agentConfig.name,
            agent_signer: 'N/A',
            wallet_balance: 0,
            unrealized_pnl: 0,
            equity: 0,
            total_roi: 0,
            positions_count: 0,
            status: 'error',
            error: 'Agent signer address not configured',
            last_updated: new Date().toISOString(),
          })
          continue
        }

        // Get agent-specific API credentials
        const agentNumber = AGENT_NUMBER_MAP[agentId]
        const agentApiKey = process.env[`AGENT_${agentNumber}_API_KEY`]
        const agentApiSecret = process.env[`AGENT_${agentNumber}_API_SECRET`]

        if (!agentApiKey || !agentApiSecret) {
          console.warn(`⚠️  [Pickaboo] Agent ${agentId} missing API credentials`)
          results.push({
            agent_id: agentId,
            agent_name: agentConfig.name,
            agent_signer: signerAddress,
            wallet_balance: 0,
            unrealized_pnl: 0,
            equity: 0,
            total_roi: 0,
            positions_count: 0,
            status: 'error',
            error: 'Agent API credentials not configured',
            last_updated: new Date().toISOString(),
          })
          continue
        }

        console.log(`[Pickaboo] Using agent-specific credentials for ${agentId}`)

        // Create Aster client for this agent using AGENT-SPECIFIC credentials
        const asterClient = new AsterClient({
          agentId,
          signer: signerAddress,
          userAddress: signerAddress,
          userApiKey: agentApiKey,
          userApiSecret: agentApiSecret,
        })

        // Fetch account stats from Asterdex
        const stats = await asterClient.getStats()

        console.log(`✅ [Pickaboo] Agent ${agentId} stats fetched:`, {
          equity: stats.equity,
          total_pnl: stats.total_pnl,
          total_roi: stats.total_roi,
          positions: stats.positions?.length || 0,
        })

        // wallet_balance is the actual equity from Asterdex (total account value in signer wallet)
        // unrealized_pnl is profit/loss on open positions
        const agentBalance: AgentBalance = {
          agent_id: agentId,
          agent_name: agentConfig.name,
          agent_signer: signerAddress,
          wallet_balance: Math.round(stats.equity * 100) / 100,
          unrealized_pnl: Math.round(stats.total_pnl * 100) / 100,
          equity: Math.round(stats.equity * 100) / 100,
          total_roi: Math.round(stats.total_roi * 100) / 100,
          positions_count: stats.positions?.length || 0,
          status: 'success',
          last_updated: new Date().toISOString(),
        }

        results.push(agentBalance)
        totalEquity += agentBalance.equity
      } catch (error: any) {
        const errorMsg = error?.message || 'Failed to fetch balance'
        console.error(`❌ [Pickaboo] Error fetching balance for agent ${agentId}:`, {
          error: errorMsg || 'unknown',
          agentId,
          signer: signerAddress || 'unknown',
          fullError: error?.toString(),
        })

        results.push({
          agent_id: agentId,
          agent_name: AGENTS[agentId]?.name || 'Unknown',
          agent_signer: AGENTS[agentId]?.aster_account_id || 'N/A',
          wallet_balance: 0,
          unrealized_pnl: 0,
          equity: 0,
          total_roi: 0,
          positions_count: 0,
          status: 'error',
          error: errorMsg,
          last_updated: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      total_equity: Math.round(totalEquity * 100) / 100,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Agent balances error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch agent balances',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}