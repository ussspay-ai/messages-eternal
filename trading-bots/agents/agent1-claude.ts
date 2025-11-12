/**
 * Agent 1: Claude Arbitrage Bot
 * Executes arbitrage trades on Aster DEX
 * Fetches trading symbols from Pickaboo dashboard (supports multi-symbol trading)
 */

import dotenv from "dotenv"
import { ClaudeArbitrageStrategy } from "../strategies/claude-arbitrage.ts"
import { getTradingSymbols } from "../lib/trading-symbol-config.ts"

dotenv.config({ path: ".env.local" })

async function startAgent() {
  try {
    const agentModelId = process.env.AGENT_1_MODEL_ID || "claude_arbitrage"
    // Fetch symbols from Pickaboo dashboard (Supabase), don't override with env var
    const symbols = await getTradingSymbols(agentModelId)

    // Validate config
    const signerAddress = process.env.AGENT_1_SIGNER || ""
    const agentPrivateKey = process.env.AGENT_1_PRIVATE_KEY || ""
    const userAddress = process.env.AGENT_1_ADDRESS || ""
    const userApiKey = process.env.AGENT_1_API_KEY || ""
    const userApiSecret = process.env.AGENT_1_API_SECRET || ""

    if (!signerAddress || !agentPrivateKey || !userAddress || !userApiKey || !userApiSecret) {
      console.error("Missing required environment variables:")
      console.error("  - AGENT_1_SIGNER")
      console.error("  - AGENT_1_PRIVATE_KEY")
      console.error("  - AGENT_1_ADDRESS")
      console.error("  - AGENT_1_API_KEY")
      console.error("  - AGENT_1_API_SECRET")
      process.exit(1)
    }

    // Start trading bot for each symbol
    console.log(`\n🚀 Starting Claude Arbitrage Agent...`)
    console.log(`   Signer: ${signerAddress}`)
    console.log(`   Symbols: ${symbols.join(", ")}`)
    console.log(`   User: ${userAddress}`)
    console.log(`   Trading ${symbols.length} symbol(s) simultaneously\n`)

    // Create and start a strategy for each symbol
    const strategyPromises = symbols.map(symbol => {
      const config = {
        agentId: "Claude",
        name: `Claude Arbitrage Agent (${symbol})`,
        signerAddress,
        agentPrivateKey,
        userAddress,
        userApiKey,
        userApiSecret,
        symbol,
        model: "claude-3-5-sonnet",
        strategy: "arbitrage",
      }

      console.log(`   ✅ Starting strategy for ${symbol}`)
      const strategy = new ClaudeArbitrageStrategy(config)
      return strategy.run().catch((error) => {
        console.error(`Fatal error for ${symbol}:`, error)
        process.exit(1)
      })
    })

    // Run all strategies in parallel
    await Promise.all(strategyPromises)
  } catch (error) {
    console.error("Fatal error:", error instanceof Error ? error.message : String(error))
    console.error("Stack trace:", error instanceof Error ? error.stack : "")
    process.exit(1)
  }
}

startAgent().catch((error) => {
  console.error("Uncaught error:", error instanceof Error ? error.message : String(error))
  process.exit(1)
})