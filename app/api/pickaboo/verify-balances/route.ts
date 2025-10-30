/**
 * GET /api/pickaboo/verify-balances?password=<password>
 * Get current USDT balances for all agents
 */

import { NextRequest, NextResponse } from 'next/server'
import { isPickabooAdminWhitelisted } from '@/lib/supabase-client'

interface BalanceCheckResult {
  agent_id: string
  agent_name: string
  balance: number
  status: 'funded' | 'underfunded' | 'error'
  error?: string
}

interface VerifyBalancesResponse {
  success: boolean
  results?: BalanceCheckResult[]
  total_balance?: number
  error?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<VerifyBalancesResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    // Verify wallet is whitelisted
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const isWhitelisted = await isPickabooAdminWhitelisted(wallet)
    if (!isWhitelisted) {
      return NextResponse.json(
        { success: false, error: 'Wallet not authorized' },
        { status: 403 }
      )
    }

    // Mock agent data - in real implementation, fetch from Aster DEX API
    const agents = [
      { id: 'agent_1', name: 'Claude Arbitrage' },
      { id: 'agent_2', name: 'GPT-4 Momentum' },
      { id: 'agent_3', name: 'Gemini Grid' },
      { id: 'agent_4', name: 'DeepSeek ML' },
      { id: 'agent_5', name: 'Buy & Hold' },
    ]

    const results: BalanceCheckResult[] = []
    let totalBalance = 0

    // Simulate balance checks
    for (const agent of agents) {
      // Mock balance (in real implementation, fetch from Aster DEX)
      const balance = Math.random() * 1000 + 50 // 50 - 1050 USDT

      const result: BalanceCheckResult = {
        agent_id: agent.id,
        agent_name: agent.name,
        balance: Math.round(balance * 100) / 100,
        status: balance >= 50 ? 'funded' : 'underfunded',
      }

      results.push(result)
      totalBalance += result.balance
    }

    return NextResponse.json({
      success: true,
      results,
      total_balance: Math.round(totalBalance * 100) / 100,
    })
  } catch (error: any) {
    console.error('Verify balances error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to verify balances' },
      { status: 500 }
    )
  }
}