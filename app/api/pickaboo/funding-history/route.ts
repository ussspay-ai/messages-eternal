/**
 * GET /api/pickaboo/funding-history?password=<password>&limit=<limit>&offset=<offset>
 * Fetch funding history from database
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase, isPickabooAdminWhitelisted } from '@/lib/supabase-client'

interface FundingHistoryEntry {
  id: string
  agent_id: string
  agent_name?: string
  amount: number
  status: 'success' | 'failed' | 'pending'
  tx_hash?: string
  error_message?: string
  dry_run: boolean
  created_at: string
  updated_at: string
}

interface FundingHistoryResponse {
  success: boolean
  history?: FundingHistoryEntry[]
  total_count?: number
  error?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<FundingHistoryResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    if (!supabase) {
      return NextResponse.json({
        success: true,
        history: [],
        total_count: 0,
      })
    }

    // Fetch funding history
    const { data, error, count } = await supabase
      .from('funding_history')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching funding history:', error)
      return NextResponse.json({
        success: true,
        history: [],
        total_count: 0,
      })
    }

    return NextResponse.json({
      success: true,
      history: data || [],
      total_count: count || 0,
    })
  } catch (error: any) {
    console.error('Funding history error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch funding history' },
      { status: 500 }
    )
  }
}