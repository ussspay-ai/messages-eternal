/**
 * Agent 4: DeepSeek ML Predictor Bot
 * Executes ML-based prediction trades on Aster DEX
 * Fetches trading symbols from Pickaboo dashboard (supports multi-symbol trading)
 */

import dotenv from "dotenv"
import { DeepseekMLStrategy } from "../strategies/deepseek-ml.ts"
import { getTradingSymbols } from "../lib/trading-symbol-config.ts"

dotenv.config({ path: ".env.local" })

async function startAgent() {
  const agentModelId = process.env.AGENT_4_MODEL_ID || "deepseek_ml"
  // Fetch symbols from Pickaboo dashboard (Supabase), don't override with env var
  const symbols = await getTradingSymbols(agentModelId)

  // Validate config
  const signerAddress = process.env.AGENT_4_SIGNER || ""
  const agentPrivateKey = process.env.AGENT_4_PRIVATE_KEY || ""
  const userAddress = process.env.AGENT_4_ADDRESS || ""
  const userApiKey = process.env.AGENT_4_API_KEY || ""
  const userApiSecret = process.env.AGENT_4_API_SECRET || ""

  if (!signerAddress || !agentPrivateKey || !userAddress || !userApiKey || !userApiSecret) {
    console.error("Missing required environment variables:")
    console.error("  - AGENT_4_SIGNER")
    console.error("  - AGENT_4_PRIVATE_KEY")
    console.error("  - AGENT_4_ADDRESS")
    console.error("  - AGENT_4_API_KEY")
    console.error("  - AGENT_4_API_SECRET")
    process.exit(1)
  }

  // Start trading bot for each symbol
  console.log(`\n🚀 Starting DeepSeek ML Predictor Agent...`)
  console.log(`   Signer: ${signerAddress}`)
  console.log(`   Symbols: ${symbols.join(", ")}`)
  console.log(`   User: ${userAddress}`)
  console.log(`   Trading ${symbols.length} symbol(s) simultaneously\n`)

  // Create and start a strategy for each symbol
  const strategyPromises = symbols.map(symbol => {
    const config = {
      agentId: "DeepSeek",
      name: `DeepSeek ML Predictor Agent (${symbol})`,
      signerAddress,
      agentPrivateKey,
      userAddress,
      userApiKey,
      userApiSecret,
      symbol,
      model: "deepseek-coder",
      strategy: "ml",
    }

    console.log(`   ✅ Starting strategy for ${symbol}`)
    const strategy = new DeepseekMLStrategy(config)
    return strategy.run().catch((error) => {
      console.error(`Fatal error for ${symbol}:`, error)
      process.exit(1)
    })
  })

  // Run all strategies in parallel
  await Promise.all(strategyPromises)
}

startAgent()