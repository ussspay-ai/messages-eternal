/**
 * Agent 5: Buy & Hold Agent
 * Simple long-term hold strategy - buys tokens and holds
 * Fetches trading symbols from Pickaboo dashboard (supports multi-symbol trading)
 */

import dotenv from "dotenv"
import { BuyAndHoldStrategy } from "../strategies/bh-buy-and-hold.ts"
import { getTradingSymbols } from "../lib/trading-symbol-config.ts"

dotenv.config({ path: ".env.local" })

async function startAgent() {
  const agentModelId = process.env.AGENT_5_MODEL_ID || "buy_and_hold"
  const symbols = await getTradingSymbols(agentModelId, process.env.TRADING_SYMBOL)

  // Validate config
  const signerAddress = process.env.AGENT_5_SIGNER || ""
  const agentPrivateKey = process.env.AGENT_5_PRIVATE_KEY || ""
  const userAddress = process.env.AGENT_5_ADDRESS || ""
  const userApiKey = process.env.AGENT_5_API_KEY || ""
  const userApiSecret = process.env.AGENT_5_API_SECRET || ""

  if (!signerAddress || !agentPrivateKey || !userAddress || !userApiKey || !userApiSecret) {
    console.error("Missing required environment variables:")
    console.error("  - AGENT_5_SIGNER")
    console.error("  - AGENT_5_PRIVATE_KEY")
    console.error("  - AGENT_5_ADDRESS")
    console.error("  - AGENT_5_API_KEY")
    console.error("  - AGENT_5_API_SECRET")
    process.exit(1)
  }

  // Start trading bot for each symbol
  console.log(`\n🚀 Starting Buy & Hold Agent...`)
  console.log(`   Signer: ${signerAddress}`)
  console.log(`   Symbols: ${symbols.join(", ")}`)
  console.log(`   User: ${userAddress}`)
  console.log(`   Trading ${symbols.length} symbol(s) simultaneously\n`)

  // Create and start a strategy for each symbol
  const strategyPromises = symbols.map(symbol => {
    const config = {
      agentId: "BuyHold",
      name: `Buy & Hold Agent (${symbol})`,
      signerAddress,
      agentPrivateKey,
      userAddress,
      userApiKey,
      userApiSecret,
      symbol,
      model: "gemini-1.5-pro",
      strategy: "buy_and_hold",
    }

    console.log(`   ✅ Starting strategy for ${symbol}`)
    const strategy = new BuyAndHoldStrategy(config)
    return strategy.run().catch((error) => {
      console.error(`Fatal error for ${symbol}:`, error)
      process.exit(1)
    })
  })

  // Run all strategies in parallel
  await Promise.all(strategyPromises)
}

startAgent()