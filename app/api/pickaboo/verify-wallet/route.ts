import { NextRequest, NextResponse } from 'next/server'
import { isPickabooAdminWhitelisted, getPickabooAdmins } from '@/lib/supabase-client'

// POST /api/pickaboo/verify-wallet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet_address } = body

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Check if wallet is whitelisted
    const isWhitelisted = await isPickabooAdminWhitelisted(wallet_address)

    if (!isWhitelisted) {
      return NextResponse.json(
        { authenticated: false, error: 'Wallet not authorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      wallet_address: wallet_address.toLowerCase(),
      message: 'Wallet verified successfully',
    })
  } catch (error: any) {
    console.error('Error verifying wallet:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to verify wallet' },
      { status: 500 }
    )
  }
}