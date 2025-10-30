import { NextRequest, NextResponse } from 'next/server'
import { isPickabooAdminWhitelisted, getPickabooAdmins, addPickabooAdmin, removePickabooAdmin } from '@/lib/supabase-client'

// Simple password verification for admin operations
const ADMIN_PASSWORD = process.env.PICKABOO_ADMIN_PASSWORD || 'admin123'

function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD
}

// GET /api/pickaboo/manage-admins - List all admins
export async function GET(request: NextRequest) {
  try {
    const password = request.nextUrl.searchParams.get('password')

    if (!verifyAdminPassword(password || '')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const admins = await getPickabooAdmins()

    return NextResponse.json({
      success: true,
      admins: admins.map(admin => ({
        id: admin.id,
        wallet_address: admin.wallet_address,
        admin_name: admin.admin_name,
        added_by: admin.added_by,
        created_at: admin.created_at,
      })),
    })
  } catch (error: any) {
    console.error('Error fetching admins:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch admins' },
      { status: 500 }
    )
  }
}

// POST /api/pickaboo/manage-admins - Add new admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, wallet_address, admin_name, added_by } = body

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Check if already whitelisted
    const isWhitelisted = await isPickabooAdminWhitelisted(wallet_address)
    if (isWhitelisted) {
      return NextResponse.json(
        { error: 'Wallet is already whitelisted' },
        { status: 409 }
      )
    }

    const success = await addPickabooAdmin(wallet_address, admin_name, added_by)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add admin' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Admin added successfully',
      wallet_address: wallet_address.toLowerCase(),
    })
  } catch (error: any) {
    console.error('Error adding admin:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to add admin' },
      { status: 500 }
    )
  }
}

// DELETE /api/pickaboo/manage-admins - Remove admin
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, wallet_address } = body

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const success = await removePickabooAdmin(wallet_address)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove admin' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Admin removed successfully',
      wallet_address: wallet_address.toLowerCase(),
    })
  } catch (error: any) {
    console.error('Error removing admin:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to remove admin' },
      { status: 500 }
    )
  }
}