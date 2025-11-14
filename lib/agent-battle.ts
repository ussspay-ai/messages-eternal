/**
 * Agent Battle Arena
 * Simulates 1v1 trading scenarios with real agent decisions
 */

import { AgentData, MarketContext } from "./chat-engine"
import { callAgentAPI } from "./llm-apis"

export type BattleScenario = "crash" | "pump" | "sideways" | "volatility" | "flash_crash"

export interface BattleContext {
  agent1Id: string
  agent2Id: string
  scenario: BattleScenario
  initialPrice: number
  scenarioDescription: string
}

export interface BattleResult {
  agent1Id: string
  agent1Name: string
  agent2Id: string
  agent2Name: string
  scenario: BattleScenario
  scenarioDescription: string
  
  // Agent 1 results
  agent1Decision: string
  agent1Reasoning: string
  agent1Confidence: number
  agent1StanceDirection: "bullish" | "neutral" | "bearish" // extracted from response
  
  // Agent 2 results
  agent2Decision: string
  agent2Reasoning: string
  agent2Confidence: number
  agent2StanceDirection: "bullish" | "neutral" | "bearish"
  
  // Battle outcome
  winnerId: string
  winnerName: string
  winReason: string
  consensusLevel: number // 0-100, how aligned they are
  timestamp: string
}

// All agents use the unified API handler that routes to the right LLM
const callLLM = (agent: AgentData, context: MarketContext, activity: string, customPrompt?: string) =>
  callAgentAPI(agent, context, activity, undefined, customPrompt)

/**
 * Generate market scenario with modified prices
 */
function generateScenarioContext(
  baseContext: MarketContext,
  scenario: BattleScenario
): { context: MarketContext; description: string } {
  const context = { ...baseContext }

  switch (scenario) {
    case "crash":
      // Sudden 15% crash
      context.BTC *= 0.85
      context.ETH *= 0.85
      context.SOL *= 0.85
      context.BNB *= 0.85
      context.DOGE *= 0.85
      return {
        context,
        description:
          "⚠️ MARKET CRASH: 15% sudden dump across all assets! Panic selling everywhere. What do you do?",
      }

    case "pump":
      // Massive 20% pump
      context.BTC *= 1.2
      context.ETH *= 1.2
      context.SOL *= 1.2
      context.BNB *= 1.2
      context.DOGE *= 1.2
      return {
        context,
        description:
          "🚀 MARKET PUMP: 20% explosive rally across the board! FOMO buying intensifying. Your move?",
      }

    case "sideways":
      // Slight random movements, mostly flat
      context.BTC *= 1 + (Math.random() - 0.5) * 0.02
      context.ETH *= 1 + (Math.random() - 0.5) * 0.02
      context.SOL *= 1 + (Math.random() - 0.5) * 0.02
      context.BNB *= 1 + (Math.random() - 0.5) * 0.02
      context.DOGE *= 1 + (Math.random() - 0.5) * 0.02
      return {
        context,
        description:
          "➡️ SIDEWAYS MARKET: 2% random noise, no clear trend. Which agent capitalizes on the chop?",
      }

    case "volatility":
      // Extreme swings
      context.BTC *= 1 + (Math.random() - 0.5) * 0.3
      context.ETH *= 1 + (Math.random() - 0.5) * 0.3
      context.SOL *= 1 + (Math.random() - 0.5) * 0.3
      context.BNB *= 1 + (Math.random() - 0.5) * 0.3
      context.DOGE *= 1 + (Math.random() - 0.5) * 0.3
      return {
        context,
        description:
          "⚡ EXTREME VOLATILITY: ±15% wild swings! Asset correlations breaking down. Risk vs reward battle!",
      }

    case "flash_crash":
      // Instant 25% drop then recovery
      context.BTC *= 0.75
      context.ETH *= 0.75
      context.SOL *= 0.75
      context.BNB *= 0.75
      context.DOGE *= 0.75
      return {
        context,
        description:
          "💥 FLASH CRASH: 25% instantaneous drop! Is this the opportunity of a lifetime or pure disaster?",
      }

    default:
      return { context, description: "Market scenario engaged" }
  }
}

/**
 * Extract decision stance from agent response
 */
function extractStance(text: string): "bullish" | "neutral" | "bearish" {
  const lower = text.toLowerCase()

  // Bullish signals
  if (
    lower.includes("buy") ||
    lower.includes("long") ||
    lower.includes("accumulate") ||
    lower.includes("opportunity") ||
    lower.includes("undervalued") ||
    lower.includes("going up")
  ) {
    return "bullish"
  }

  // Bearish signals
  if (
    lower.includes("sell") ||
    lower.includes("short") ||
    lower.includes("reduce") ||
    lower.includes("exit") ||
    lower.includes("risk") ||
    lower.includes("going down") ||
    lower.includes("crash")
  ) {
    return "bearish"
  }

  return "neutral"
}

/**
 * Extract confidence level from response (0-100)
 */
function extractConfidence(text: string): number {
  const percentMatch = text.match(/(\d+)%/)
  if (percentMatch) {
    const conf = parseInt(percentMatch[1])
    return Math.min(100, Math.max(0, conf))
  }

  // Heuristic: longer, more detailed responses = higher confidence
  if (text.length > 300) return 75
  if (text.length > 200) return 60
  if (text.length > 100) return 45
  return 30
}

/**
 * Determine winner based on response quality and scenario fit
 */
function determineWinner(
  scenario: BattleScenario,
  agent1Stance: "bullish" | "neutral" | "bearish",
  agent1Conf: number,
  agent2Stance: "bullish" | "neutral" | "bearish",
  agent2Conf: number
): { winnerId: 1 | 2; reason: string; consensusLevel: number } {
  // For crash scenarios, being bearish/cautious is smart
  if (scenario === "crash" || scenario === "flash_crash") {
    if (agent1Stance === "bearish" && agent2Stance !== "bearish") {
      return {
        winnerId: 1,
        reason: "✅ Correctly defensive in crash scenario",
        consensusLevel: 20,
      }
    }
    if (agent2Stance === "bearish" && agent1Stance !== "bearish") {
      return {
        winnerId: 2,
        reason: "✅ Correctly defensive in crash scenario",
        consensusLevel: 20,
      }
    }
  }

  // For pump scenarios, being bullish and capturing it is smart
  if (scenario === "pump") {
    if (agent1Stance === "bullish" && agent2Stance !== "bullish") {
      return {
        winnerId: 1,
        reason: "🚀 Captured the pump momentum",
        consensusLevel: 20,
      }
    }
    if (agent2Stance === "bullish" && agent1Stance !== "bullish") {
      return {
        winnerId: 2,
        reason: "🚀 Captured the pump momentum",
        consensusLevel: 20,
      }
    }
  }

  // For sideways/volatility, confidence matters more
  if (scenario === "sideways" || scenario === "volatility") {
    if (agent1Conf > agent2Conf + 15) {
      return {
        winnerId: 1,
        reason: "📊 Superior confidence in choppy market",
        consensusLevel: 50,
      }
    }
    if (agent2Conf > agent1Conf + 15) {
      return {
        winnerId: 2,
        reason: "📊 Superior confidence in choppy market",
        consensusLevel: 50,
      }
    }
  }

  // Default: higher confidence wins
  if (agent1Conf > agent2Conf) {
    return {
      winnerId: 1,
      reason: "💪 Higher conviction decision",
      consensusLevel:
        agent1Stance === agent2Stance
          ? Math.min(agent1Conf, agent2Conf)
          : Math.abs(agent1Conf - agent2Conf),
    }
  }

  return {
    winnerId: 2,
    reason: "💪 Higher conviction decision",
    consensusLevel:
      agent1Stance === agent2Stance
        ? Math.min(agent1Conf, agent2Conf)
        : Math.abs(agent1Conf - agent2Conf),
  }
}

/**
 * Simulate a 1v1 agent battle
 */
export async function simulateAgentBattle(
  agent1: AgentData,
  agent2: AgentData,
  baseContext: MarketContext,
  scenario: BattleScenario
): Promise<BattleResult> {
  // Generate scenario
  const { context, description } = generateScenarioContext(baseContext, scenario)

  // Create battle context for agents
  const battlePrompt = `BATTLE SCENARIO: ${description}

You are in a competitive trading scenario against another AI agent. Respond CONCISELY with your strategy. Focus on what you'd do RIGHT NOW based on these market conditions. Be specific and confident.`

  // Get decisions from both agents (parallel)
  let agent1Decision = ""
  let agent2Decision = ""

  const [result1, result2] = await Promise.allSettled([
    callLLM(agent1, context, "In battle scenario", battlePrompt),
    callLLM(agent2, context, "In battle scenario", battlePrompt),
  ])

  agent1Decision =
    result1.status === "fulfilled"
      ? result1.value
      : `Unable to generate decision: ${result1.reason instanceof Error ? result1.reason.message : "Unknown error"}`

  agent2Decision =
    result2.status === "fulfilled"
      ? result2.value
      : `Unable to generate decision: ${result2.reason instanceof Error ? result2.reason.message : "Unknown error"}`

  // Extract insights
  const agent1Stance = extractStance(agent1Decision)
  const agent1Conf = extractConfidence(agent1Decision)
  const agent2Stance = extractStance(agent2Decision)
  const agent2Conf = extractConfidence(agent2Decision)

  // Determine winner
  const { winnerId, reason, consensusLevel } = determineWinner(
    scenario,
    agent1Stance,
    agent1Conf,
    agent2Stance,
    agent2Conf
  )

  const winnerName = winnerId === 1 ? agent1.name : agent2.name

  return {
    agent1Id: agent1.id,
    agent1Name: agent1.name,
    agent2Id: agent2.id,
    agent2Name: agent2.name,
    scenario,
    scenarioDescription: description,

    agent1Decision,
    agent1Reasoning: agent1Decision.substring(0, 150) + "...",
    agent1Confidence: agent1Conf,
    agent1StanceDirection: agent1Stance,

    agent2Decision,
    agent2Reasoning: agent2Decision.substring(0, 150) + "...",
    agent2Confidence: agent2Conf,
    agent2StanceDirection: agent2Stance,

    winnerId: winnerId === 1 ? agent1.id : agent2.id,
    winnerName,
    winReason: reason,
    consensusLevel,
    timestamp: new Date().toISOString(),
  }
}