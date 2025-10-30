/**
 * AI Agent Configuration
 * Each agent has a unique trading strategy designed to be profitable
 */

import { Agent } from "@/lib/types/trading"

export const AGENTS: Record<string, Omit<Agent, "id" | "created_at">> = {
  claude_arbitrage: {
    name: "Claude",
    model: "claude",
    strategy:
      "Cross-exchange spot-futures arbitrage. Identifies price discrepancies between perpetual futures and spot prices, executing low-risk arbitrage trades with 2-3x leverage. Focus on BTC, ETH with tight stops.",
    logo_url: "https://custom.typingmind.com/assets/models/claude.webp",
    aster_account_id: process.env.AGENT_1_SIGNER || "0x",
    initial_capital: 10,
  },

  chatgpt_openai: {
    name: "ChatGPT",
    model: "openai",
    strategy:
      "Advanced multi-timeframe trading combining momentum analysis with macro trend forecasting. Momentum-based swing trading on 4h and 1h timeframes for short-term breakouts, combined with macro analysis for long-term strategic positioning. Uses 2-5x adaptive leverage based on market conditions. Symbols: BTC, ETH, SOL.",
    logo_url: "https://custom.typingmind.com/assets/models/gpt-4.webp",
    aster_account_id: process.env.AGENT_2_SIGNER || "0x",
    initial_capital: 10,
  },

  gemini_grid: {
    name: "Gemini",
    model: "gemini",
    strategy:
      "Grid trading bot operating within defined price ranges. Deploys multiple buy/sell orders at 2% intervals, capturing profits from volatility. Optimized for ranging markets. Active on ALT pairs (SANDUSDT, FLOKIUSDT) with 1-2x leverage.",
    logo_url: "https://custom.typingmind.com/assets/models/gemini.png",
    aster_account_id: process.env.AGENT_3_SIGNER || "0x",
    initial_capital: 10,
  },

  deepseek_ml: {
    name: "DeepSeek",
    model: "deepseek",
    strategy:
      "Machine learning-based price prediction model. Analyzes order book depth, volume profile, and micro-structure patterns to predict 1-5m moves. Executes scalping trades with tight 0.5-1% profit targets. Low leverage (1-2x), high win rate strategy.",
    logo_url: "https://custom.typingmind.com/assets/models/deepseek.png",
    aster_account_id: process.env.AGENT_4_SIGNER || "0x",
    initial_capital: 10,
  },

  buy_and_hold: {
    name: "Buy & Hold",
    model: "grok",
    strategy:
      "Long-term buy and hold strategy powered by Grok sentiment analysis. Purchases and holds ASTER token with real-time X.com sentiment monitoring. No active trading, no stop losses, no take profits. Serves as baseline comparison for passive investment returns with AI-driven conviction monitoring.",
    logo_url: "https://img.icons8.com/color/96/grok--v2.jpg",
    aster_account_id: process.env.AGENT_5_SIGNER || "0x",
    initial_capital: 10,
  },
}

export const TRADING_SYMBOLS = [
  "BTCUSDT", // Bitcoin
  "ETHUSDT", // Ethereum
  "SOLUSDT", // Solana
  "BNBUSDT", // Binance Coin
  "DOGEUSDT", // Dogecoin
  "XRPUSDT", // Ripple
  "ADAUSDT", // Cardano
  "POLRUSDT", // Polygon
  "SANDUSDT", // The Sandbox
  "FLOKIUSDT", // Floki
  "ASTER", // Aster Network (for B&H agent)
]

export const PRIMARY_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT", "ASTERUSDT"]

/**
 * Get agent by ID
 */
export function getAgent(agentId: string): Agent | null {
  const agentConfig = AGENTS[agentId]
  if (!agentConfig) return null

  return {
    id: agentId,
    ...agentConfig,
    created_at: new Date().toISOString(),
  }
}

/**
 * Get all agents
 */
export function getAllAgents(): (Omit<Agent, "created_at"> & { created_at: string })[] {
  return Object.entries(AGENTS).map(([id, config]) => ({
    id,
    ...config,
    created_at: new Date().toISOString(),
  }))
}

/**
 * Map agent IDs to their trading symbols (used for sentiment analysis, market analysis, etc.)
 * These are the BASE symbols (BTC, ETH, SOL) not the full pair (BTCUSDT)
 */
export const AGENT_TRADING_SYMBOLS: Record<string, string[]> = {
  claude_arbitrage: ["BTC", "ETH"], // Arbitrage on BTC/ETH pairs
  chatgpt_openai: ["BTC", "ETH", "SOL"], // Multi-timeframe momentum on major pairs
  gemini_grid: ["SAND", "FLOKI"], // Grid trading on alt pairs (SANDUSDT, FLOKIUSDT)
  deepseek_ml: ["BTC", "ETH", "SOL", "BNB", "DOGE"], // Scalping across multiple symbols
  buy_and_hold: ["ASTER"], // Only holds ASTER token
}

/**
 * Map agent IDs to their environment variable numbers
 */
const AGENT_ID_TO_NUMBER: Record<string, number> = {
  claude_arbitrage: 1,
  chatgpt_openai: 2,
  gemini_grid: 3,
  deepseek_ml: 4,
  buy_and_hold: 5,
}

/**
 * Get agent Aster credentials
 */
export function getAgentCredentials(agentId: string) {
  const agent = AGENTS[agentId]
  if (!agent) return null

  const agentNumber = AGENT_ID_TO_NUMBER[agentId]
  
  // Validate that all required credentials are present and not "0x"
  const signer = agent.aster_account_id // Agent's wallet address
  const privateKey = process.env[`AGENT_${agentNumber}_PRIVATE_KEY`]
  
  // Get agent-specific API credentials first, fall back to main account credentials
  const userApiKey = process.env[`AGENT_${agentNumber}_API_KEY`] || process.env.ASTER_USER_API_KEY
  const userApiSecret = process.env[`AGENT_${agentNumber}_API_SECRET`] || process.env.ASTER_USER_SECRET_KEY
  
  // Return null if any credential is missing or invalid (0x placeholder)
  if (!signer || signer === "0x" || !privateKey || privateKey === "0x") {
    return null
  }
  
  // Return null if API credentials are missing
  if (!userApiKey || !userApiSecret) {
    return null
  }
  
  return {
    signer, // Agent's wallet address (used for trading)
    user: signer, // For REST API: use agent's wallet (not main user wallet)
    privateKey,
    userApiKey,
    userApiSecret,
  }
}