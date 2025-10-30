import { NextResponse } from 'next/server'
import { getWaitlistEntries, getWaitlistStats, removeFromWaitlist, isPickabooAdminWhitelisted } from '@/lib/supabase-client'

/**
 * GET /api/pickaboo/waitlist
 * Retrieve waitlist entries (admin only)
 * Query params:
 *   - limit: number of entries to fetch (default: 100)
 *   - offset: pagination offset (default: 0)
 *   - interest: filter by interest category (optional)
 *   - stats: if true, return statistics instead
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    const stats = searchParams.get('stats') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const offset = parseInt(searchParams.get('offset') || '0')
    const interest = searchParams.get('interest')

    // Verify admin access
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    const isAdmin = await isPickabooAdminWhitelisted(wallet)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    if (stats) {
      const stats_data = await getWaitlistStats()
      return NextResponse.json({
        success: true,
        stats: stats_data,
      })
    }

    const entries = await getWaitlistEntries(limit, offset, interest ?? undefined)
    return NextResponse.json({
      success: true,
      entries,
      count: entries.length,
    })
  } catch (error) {
    console.error('[Pickaboo] Waitlist GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 })
  }
}

/**
 * DELETE /api/pickaboo/waitlist
 * Remove a waitlist entry (admin only)
 * Query params:
 *   - email: email address to remove
 *   - wallet: admin wallet address
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const wallet = searchParams.get('wallet')

    // Validate inputs
    if (!email || !wallet) {
      return NextResponse.json({ error: 'Email and wallet address required' }, { status: 400 })
    }

    // Verify admin access
    const isAdmin = await isPickabooAdminWhitelisted(wallet)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Remove from waitlist
    const success = await removeFromWaitlist(email)

    if (!success) {
      return NextResponse.json({ error: 'Failed to remove from waitlist' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${email} from waitlist`,
    })
  } catch (error) {
    console.error('[Pickaboo] Waitlist DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove from waitlist' }, { status: 500 })
  }
}