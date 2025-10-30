/**
 * Agent 2: ChatGPT OpenAI Bot
 * Executes advanced multi-timeframe trades on Aster DEX
 * Fetches trading symbols from Pickaboo dashboard (supports multi-symbol trading)
 */

import dotenv from "dotenv"
import { ChatGPTOpenAIStrategy } from "../strategies/gpt4-momentum.ts"
import { getTradingSymbols } from "../lib/trading-symbol-config.ts"

dotenv.config({ path: ".env.local" })

async function startAgent() {
  const agentModelId = process.env.AGENT_2_MODEL_ID || "chatgpt_openai"
  const symbols = await getTradingSymbols(agentModelId, process.env.TRADING_SYMBOL)

  // Validate config
  const signerAddress = process.env.AGENT_2_SIGNER || ""
  const agentPrivateKey = process.env.AGENT_2_PRIVATE_KEY || ""
  const userAddress = process.env.AGENT_2_ADDRESS || ""
  const userApiKey = process.env.AGENT_2_API_KEY || ""
  const userApiSecret = process.env.AGENT_2_API_SECRET || ""

  if (!signerAddress || !agentPrivateKey || !userAddress || !userApiKey || !userApiSecret) {
    console.error("Missing required environment variables:")
    console.error("  - AGENT_2_SIGNER")
    console.error("  - AGENT_2_PRIVATE_KEY")
    console.error("  - AGENT_2_ADDRESS")
    console.error("  - AGENT_2_API_KEY")
    console.error("  - AGENT_2_API_SECRET")
    process.exit(1)
  }

  // Start trading bot for each symbol
  console.log(`\n🚀 Starting ChatGPT OpenAI Agent...`)
  console.log(`   Signer: ${signerAddress}`)
  console.log(`   Symbols: ${symbols.join(", ")}`)
  console.log(`   User: ${userAddress}`)
  console.log(`   Trading ${symbols.length} symbol(s) simultaneously\n`)

  // Create and start a strategy for each symbol
  const strategyPromises = symbols.map(symbol => {
    const config = {
      agentId: "GPT",
      name: `ChatGPT OpenAI Agent (${symbol})`,
      signerAddress,
      agentPrivateKey,
      userAddress,
      userApiKey,
      userApiSecret,
      symbol,
      model: "gpt-4o",
      strategy: "momentum",
    }

    console.log(`   ✅ Starting strategy for ${symbol}`)
    const strategy = new ChatGPTOpenAIStrategy(config)
    return strategy.run().catch((error) => {
      console.error(`Fatal error for ${symbol}:`, error)
      process.exit(1)
    })
  })

  // Run all strategies in parallel
  await Promise.all(strategyPromises)
}

startAgent()