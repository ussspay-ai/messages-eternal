/**
 * Test script to verify Aster API connection
 * Usage: npx ts-node test-connection.ts
 */

import dotenv from "dotenv"
import { AsterClient } from "./lib/aster-client.ts"

dotenv.config({ path: ".env.local" })

async function testConnection() {
  console.log("🔍 Testing Aster DEX Connection...\n")

  // First, test basic connectivity
  try {
    console.log("📡 Testing basic connectivity to fapi.asterdex.com...")
    const pingResponse = await fetch("https://fapi.asterdex.com/fapi/v1/ping")
    if (!pingResponse.ok) {
      console.warn(`   ⚠️  Ping response: ${pingResponse.status} ${pingResponse.statusText}`)
    } else {
      console.log("   ✅ Basic connectivity OK")
    }
  } catch (err) {
    console.warn(`   ⚠️  Basic connectivity test failed: ${err instanceof Error ? err.message : String(err)}`)
    console.log("   This may indicate network restrictions or DNS issues.\n")
  }

  // Verify environment variables
  const required = [
    "ASTER_USER_ADDRESS",
    "ASTER_USER_API_KEY",
    "ASTER_USER_SECRET_KEY",
    "AGENT_1_SIGNER",
    "AGENT_1_PRIVATE_KEY",
  ]

  const missing = required.filter((v) => !process.env[v])
  if (missing.length > 0) {
    console.error("❌ Missing environment variables:")
    missing.forEach((v) => console.error(`   - ${v}`))
    process.exit(1)
  }

  console.log("✅ Environment variables loaded")
  console.log(`   User Address: ${process.env.ASTER_USER_ADDRESS}`)
  console.log(`   Agent Signer: ${process.env.AGENT_1_SIGNER}`)
  console.log(`   API URL: ${process.env.ASTER_API_URL}\n`)

  // Initialize client
  const client = new AsterClient({
    agentId: "Claude",
    signer: process.env.AGENT_1_SIGNER || "",
    agentPrivateKey: process.env.AGENT_1_PRIVATE_KEY || "",
    userAddress: process.env.ASTER_USER_ADDRESS || "",
    userApiKey: process.env.ASTER_USER_API_KEY || "",
    userApiSecret: process.env.ASTER_USER_SECRET_KEY || "",
  })

  try {
    console.log("📡 Fetching account information...")
    const stats = await client.getAccountInfo()

    console.log("\n✅ Connection Successful!\n")
    console.log("Account Stats:")
    
    const equity = typeof stats.equity === 'number' ? stats.equity : 0
    const pnl = typeof stats.total_pnl === 'number' ? stats.total_pnl : 0
    const roi = typeof stats.total_roi === 'number' ? stats.total_roi : 0
    
    console.log(`   Equity: $${equity.toFixed(2)}`)
    console.log(`   Total PnL: $${pnl.toFixed(2)}`)
    console.log(`   ROI: ${(roi * 100).toFixed(2)}%`)
    console.log(`   Open Positions: ${stats.positions?.length || 0}`)

    if (stats.total_trades && stats.win_rate) {
      console.log(`   Total Trades: ${stats.total_trades}`)
      console.log(`   Win Rate: ${(stats.win_rate * 100).toFixed(1)}%`)
    }

    if (stats.positions && stats.positions.length > 0) {
      console.log("\n📊 Current Positions:")
      const positionsToShow = stats.positions.slice(0, 5) // Show first 5 positions
      positionsToShow.forEach((pos: any) => {
        const pnl = typeof pos.unrealizedProfit === 'number' ? pos.unrealizedProfit : 0
        const price = typeof pos.entryPrice === 'number' ? pos.entryPrice : 0
        const amt = typeof pos.positionAmt === 'number' ? pos.positionAmt : 0
        if (amt !== 0) { // Only show non-zero positions
          console.log(`   ${pos.symbol}: ${amt} @ $${price.toFixed(2)} (PnL: $${pnl.toFixed(2)})`)
        }
      })
      if (stats.positions.length > 5) {
        const nonZeroCount = stats.positions.filter((p: any) => p.positionAmt !== 0).length
        console.log(`   ... and ${nonZeroCount - positionsToShow.filter((p: any) => p.positionAmt !== 0).length} more positions`)
      }
    } else {
      console.log("\n📊 No open positions")
    }

    console.log("\n🎉 Ready to trade!")
  } catch (error) {
    console.error("\n❌ Connection Failed!")
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

testConnection()