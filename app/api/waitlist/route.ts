import { NextResponse } from "next/server"
import { addToWaitlist, getWaitlistCount } from "@/lib/supabase-client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, interest } = body

    // Validate required fields
    if (!email || !name || !interest) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    // Add to waitlist using Supabase
    const result = await addToWaitlist({
      email: email.toLowerCase(),
      name,
      interest,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to join waitlist" }, { status: 400 })
    }

    // TODO: In a real app, you would also:
    // 1. Send confirmation email
    // 2. Add to email marketing platform (e.g., Mailchimp, SendGrid)
    // 3. Log analytics event

    console.log(`[Waitlist] New entry: ${email} (interest: ${interest})`)

    return NextResponse.json(
      {
        success: true,
        message: "Successfully joined the waitlist",
        position: result.position,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[Waitlist] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to retrieve waitlist count (for admin purposes)
export async function GET() {
  try {
    const count = await getWaitlistCount()
    return NextResponse.json({
      success: true,
      count,
      message: "Waitlist count retrieved successfully",
    })
  } catch (error) {
    console.error("[Waitlist] GET error:", error)
    return NextResponse.json({ error: "Failed to retrieve waitlist count" }, { status: 500 })
  }
}
