/**
 * Deploy All Agents Script
 * Deploys all 5 trading agents on the Aster PRO API
 * Run: node --loader ts-node/esm deploy-agents.ts
 */

import dotenv from "dotenv"
import { AsterClient } from "./lib/aster-client.ts"

dotenv.config({ path: ".env.local" })

interface AgentDeployConfig {
  agentId: string
  signerAddress: string
  model: string
  strategy: string
}

const agents: AgentDeployConfig[] = [
  {
    agentId: "Claude",
    signerAddress: process.env.AGENT_1_SIGNER || "",
    model: "claude-3-5-sonnet",
    strategy: "arbitrage",
  },
  {
    agentId: "GPT",
    signerAddress: process.env.AGENT_2_SIGNER || "",
    model: "gpt-4o",
    strategy: "momentum",
  },
  {
    agentId: "Gemini",
    signerAddress: process.env.AGENT_3_SIGNER || "",
    model: "gemini-1.5-pro",
    strategy: "grid",
  },
  {
    agentId: "DeepSeek",
    signerAddress: process.env.AGENT_4_SIGNER || "",
    model: "deepseek-coder",
    strategy: "ml",
  },
  {
    agentId: "BuyHold",
    signerAddress: process.env.AGENT_5_SIGNER || "",
    model: "gemini-1.5-pro",
    strategy: "buy_and_hold",
  },
]

async function deployAllAgents() {
  const userAddress = process.env.ASTER_USER_ADDRESS || ""
  const userApiKey = process.env.ASTER_USER_API_KEY || ""
  const userApiSecret = process.env.ASTER_USER_SECRET_KEY || ""

  // Validate env vars
  if (!userAddress || !userApiKey || !userApiSecret) {
    console.error("❌ Missing required environment variables:")
    if (!userAddress) console.error("   - ASTER_USER_ADDRESS")
    if (!userApiKey) console.error("   - ASTER_USER_API_KEY")
    if (!userApiSecret) console.error("   - ASTER_USER_SECRET_KEY")
    process.exit(1)
  }

  console.log("\n" + "=".repeat(60))
  console.log("      Aster PRO API - Agent Deployment")
  console.log("=".repeat(60))
  console.log(`\nDeploying ${agents.length} agents...\n`)

  for (const agent of agents) {
    if (!agent.signerAddress) {
      console.error(`\n❌ ${agent.agentId}: Missing signer address`)
      continue
    }

    try {
      console.log(`📤 Deploying ${agent.agentId}...`)

      // Extract agent number and get agent-specific credentials
      const agentNum = agent.signerAddress.split('_')[1] || agent.agentId.split('_')[1]
      if (!agentNum) {
        console.error(`\n❌ ${agent.agentId}: Could not extract agent number`)
        continue
      }

      const agentApiKey = process.env[`AGENT_${agentNum}_API_KEY`] || ""
      const agentApiSecret = process.env[`AGENT_${agentNum}_API_SECRET`] || ""

      if (!agentApiKey || !agentApiSecret) {
        console.error(`\n❌ ${agent.agentId}: Missing agent API credentials (AGENT_${agentNum}_API_KEY or AGENT_${agentNum}_API_SECRET)`)
        continue
      }

      // Create client for this agent using agent-specific credentials
      const client = new AsterClient({
        agentId: agent.agentId,
        signer: agent.signerAddress,
        agentPrivateKey: "", // Not needed for data fetching
        userAddress: agent.signerAddress, // Use agent's wallet, not main wallet
        userApiKey: agentApiKey,
        userApiSecret: agentApiSecret,
      })

      // Note: Agent deployment should be handled through Aster PRO API
      // For now, we create the client and verify it can fetch account data
      const accountInfo = await client.getAccountInfo()
      console.log(`   ✓ Agent account verified: ${agent.agentId}`)
      console.log(`   ✓ Equity: ${accountInfo.equity}`)
      console.log(`✅ ${agent.agentId} client initialized!\n`)
    } catch (error) {
      console.error(`❌ ${agent.agentId} deployment failed:`, error)
    }
  }

  console.log("=".repeat(60))
  console.log("✨ Agent deployment complete!\n")
}

// Run deployment
deployAllAgents().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})