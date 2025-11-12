/**
 * Cleanup Script - Cancel All Orders & Close All Positions
 * Run this BEFORE restarting agents to clean up stale trades
 * 
 * Usage: npm run cleanup
 */

import { AsterClient } from "./lib/aster-client.ts"
import { getTradingSymbols } from "./lib/trading-symbol-config.ts"
import dotenv from "dotenv"

dotenv.config({ path: ".env.production" })

interface AgentConfig {
  id: string
  name: string
  signerAddress: string
  agentPrivateKey: string
  userAddress: string
  userApiKey: string
  userApiSecret: string
}

const agents: AgentConfig[] = [
  {
    id: "agent1",
    name: "Claude Arbitrage",
    signerAddress: process.env.AGENT1_SIGNER_ADDRESS || "",
    agentPrivateKey: process.env.AGENT1_PRIVATE_KEY || "",
    userAddress: process.env.AGENT1_ADDRESS || "",
    userApiKey: process.env.AGENT1_API_KEY || "",
    userApiSecret: process.env.AGENT1_API_SECRET || "",
  },
  {
    id: "agent2",
    name: "GPT-4 Momentum",
    signerAddress: process.env.AGENT2_SIGNER_ADDRESS || "",
    agentPrivateKey: process.env.AGENT2_PRIVATE_KEY || "",
    userAddress: process.env.AGENT2_ADDRESS || "",
    userApiKey: process.env.AGENT2_API_KEY || "",
    userApiSecret: process.env.AGENT2_API_SECRET || "",
  },
  {
    id: "agent3",
    name: "Gemini Grid",
    signerAddress: process.env.AGENT3_SIGNER_ADDRESS || "",
    agentPrivateKey: process.env.AGENT3_PRIVATE_KEY || "",
    userAddress: process.env.AGENT3_ADDRESS || "",
    userApiKey: process.env.AGENT3_API_KEY || "",
    userApiSecret: process.env.AGENT3_API_SECRET || "",
  },
  {
    id: "agent4",
    name: "DeepSeek ML",
    signerAddress: process.env.AGENT4_SIGNER_ADDRESS || "",
    agentPrivateKey: process.env.AGENT4_PRIVATE_KEY || "",
    userAddress: process.env.AGENT4_ADDRESS || "",
    userApiKey: process.env.AGENT4_API_KEY || "",
    userApiSecret: process.env.AGENT4_API_SECRET || "",
  },
  {
    id: "agent5",
    name: "Buy & Hold",
    signerAddress: process.env.AGENT5_SIGNER_ADDRESS || "",
    agentPrivateKey: process.env.AGENT5_PRIVATE_KEY || "",
    userAddress: process.env.AGENT5_ADDRESS || "",
    userApiKey: process.env.AGENT5_API_KEY || "",
    userApiSecret: process.env.AGENT5_API_SECRET || "",
  },
]

async function cleanupAgent(agent: AgentConfig) {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`🧹 Cleaning up: ${agent.name}`)
  console.log(`${"=".repeat(60)}`)

  try {
    const client = new AsterClient({
      agentId: agent.id,
      signer: agent.signerAddress,
      agentPrivateKey: agent.agentPrivateKey,
      userAddress: agent.userAddress,
      userApiKey: agent.userApiKey,
      userApiSecret: agent.userApiSecret,
    })

    // Sync server time
    await client.syncServerTime()

    // Get trading symbols for this agent
    const symbols = await getTradingSymbols(agent.id)
    console.log(`    📊 Trading symbols: ${symbols.join(", ")}`)

    // Cancel all open orders for each symbol
    for (const symbol of symbols) {
      console.log(`\n  📋 Checking ${symbol}...`)

      try {
        // Get open orders
        const openOrders = await client.getOpenOrders(symbol)
        console.log(`    Found ${openOrders.length} open orders`)

        // Cancel each order
        for (const order of openOrders) {
          console.log(`    ❌ Cancelling order ${order.orderId}...`)
          await client.cancelOrder(symbol, order.orderId)
          console.log(`    ✓ Cancelled`)
        }

        // Close any open positions
        try {
          await client.closePosition(symbol, "LONG")
          console.log(`    ✓ Closed LONG position`)
        } catch (e: any) {
          if (!e.message?.includes("No position")) {
            console.log(`    Note: No LONG position or already closed`)
          }
        }

        try {
          await client.closePosition(symbol, "SHORT")
          console.log(`    ✓ Closed SHORT position`)
        } catch (e: any) {
          if (!e.message?.includes("No position")) {
            console.log(`    Note: No SHORT position or already closed`)
          }
        }
      } catch (error: any) {
        console.log(`    ⚠️  Error with ${symbol}: ${error.message}`)
      }
    }

    console.log(`✅ ${agent.name} cleanup complete!\n`)
  } catch (error: any) {
    console.error(`❌ Cleanup failed for ${agent.name}: ${error.message}`)
  }
}

async function main() {
  console.log("\n" + "=".repeat(60))
  console.log("🧹 NOF1 Trading Bots - Cleanup All Positions")
  console.log("=".repeat(60))
  console.log("This will:")
  console.log("  • Cancel all open orders")
  console.log("  • Close all open positions")
  console.log("  • For all 5 agents")
  console.log("=".repeat(60))

  // Cleanup all agents sequentially
  for (const agent of agents) {
    await cleanupAgent(agent)
    // Add delay between agents to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  console.log("\n" + "=".repeat(60))
  console.log("🎉 All agents cleaned up!")
  console.log("Safe to restart agents now.")
  console.log("=".repeat(60) + "\n")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})