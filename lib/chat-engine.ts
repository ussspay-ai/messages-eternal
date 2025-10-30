/**
 * Chat Engine - AI Agent Response Generation
 * Generates intelligent trading-focused responses for each agent
 * Supports both mock responses and real API integration
 */

export interface ChatMessage {
  id: string
  agentId: string
  agentName: string
  timestamp: string
  content: string
  type: "analysis" | "trade_signal" | "market_update" | "risk_management"
  confidence?: number
}

export interface MarketContext {
  BTC: number
  ETH: number
  SOL: number
  BNB: number
  DOGE: number
  ASTER: number
  timestamp: string
  trending: {
    symbol: string
    direction: "up" | "down"
    change: number
  }[]
}

export interface AgentData {
  id: string
  name: string
  model: string
  pnl: number
  roi: number
  recentTrades: number
  accountValue?: number
}

// Agent-specific personalities and trading styles
const AGENT_PROFILES: Record<
  string,
  {
    name: string
    model: string
    personality: string
    tradingStyle: string
    responsePatterns: string[]
  }
> = {
  claude_arbitrage: {
    name: "Claude Arbitrage",
    model: "Claude 3.5 Sonnet",
    personality: "Analytical, risk-aware, methodical",
    tradingStyle: "Arbitrage opportunities between pairs",
    responsePatterns: [
      "Identified {symbol} arbitrage opportunity. Price discrepancy {value}% suggests {action}.",
      "Analyzing cross-pair correlation. {symbol1} showing divergence from {symbol2}. Initiating hedge.",
      "Risk assessment: Current volatility at {level}. Adjusting position sizing accordingly.",
      "Spotting inefficiency in {symbol} liquidity pool. Entry signal: {confidence}% confidence.",
    ],
  },
  chatgpt_openai: {
    name: "GPT-4 Momentum",
    model: "GPT-4 Turbo",
    personality: "Strategic, momentum-focused, trend-following",
    tradingStyle: "Momentum and trend-following strategies",
    responsePatterns: [
      "Momentum building on {symbol}. RSI approaching {level}. Strong {direction} signal emerging.",
      "Technical confluence alert: {symbol} showing {pattern}. Entry probability: {confidence}%.",
      "Market structure shift detected. {symbol} breaking {level} with volume confirmation. Going {direction}.",
      "Trend analysis: {symbol} in strong {trend}. Current bias: {direction} until {resistance}.",
    ],
  },
  gemini_grid: {
    name: "Gemini Grid",
    model: "Google Gemini Pro",
    personality: "Systematic, grid-based, systematic profit-taking",
    tradingStyle: "Grid trading across multiple price levels",
    responsePatterns: [
      "Grid initialized on {symbol} between ${level1} and ${level2}. Deploying {count} orders.",
      "Grid status: {filled}% filled, {profit} unrealized profit. Rebalancing grid levels.",
      "Range-bound trading: {symbol} consolidating. Optimal grid width: {width}%. Adjusting parameters.",
      "Grid execution: Captured {pips} pips this cycle. Profit target: ${target}.",
    ],
  },
  deepseek_ml: {
    name: "DeepSeek ML",
    model: "DeepSeek-V3",
    personality: "Data-driven, ML-powered, quantitative",
    tradingStyle: "Machine learning predictions and pattern recognition",
    responsePatterns: [
      "ML model prediction: {symbol} likely to move {direction} {distance}%. Confidence: {confidence}%.",
      "Pattern recognition flagged: {pattern} detected on {symbol}. Historical success rate: {rate}%.",
      "Feature importance analysis: Volume and volatility highest impact factors. Adjusting weights.",
      "Predictive signal strength: {score}/100 for {symbol}. Market conditions aligned with model assumptions.",
    ],
  },
  buy_and_hold: {
    name: "Buy & Hold",
    model: "Grok 2 (with X.com Sentiment)",
    personality: "Strategic, sentiment-aware, long-term focused with real-time X.com insights",
    tradingStyle: "Long-term buy and hold with X.com sentiment analysis",
    responsePatterns: [
      "X.com sentiment bullish on {symbol}: {value}% positive mentions. Long-term accumulation justified.",
      "Analyzing {symbol} news trends: {direction} momentum on social. Maintaining position strength.",
      "{symbol} community discussions trending {direction}. Conviction remains strong for Q{quarter} targets.",
      "Social sentiment supports fundamentals for {symbol}. Patient capital deployment strategy active.",
    ],
  },
}

/**
 * Fetch agent's configured trading symbols from Pickaboo dashboard
 * Falls back to default symbols from constants if not configured
 */
async function getAgentTradingSymbols(agentId: string): Promise<string[]> {
  try {
    const response = await fetch(`http://localhost:3000/api/pickaboo/agent-trading-symbols?agent_id=${agentId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch symbols: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success && data.symbols && Array.isArray(data.symbols)) {
      if (data.source === 'pickaboo_config') {
        console.log(`[Chat Engine] ✅ Loaded configured symbols for ${agentId} from Pickaboo: ${data.symbols.join(', ')}`)
      } else {
        console.log(`[Chat Engine] 📡 Loaded trading symbols for ${agentId} from ${data.source}: ${data.symbols.join(', ')}`)
      }
      return data.symbols
    }
    throw new Error("Invalid symbol data")
  } catch (error) {
    console.warn(`[Chat Engine] ⚠️ Could not fetch symbols for ${agentId}:`, error instanceof Error ? error.message : error)
    // Fallback to default symbols
    const { AGENT_TRADING_SYMBOLS } = await import("./constants/agents")
    const defaultSymbols = AGENT_TRADING_SYMBOLS[agentId] || AGENT_TRADING_SYMBOLS.claude_arbitrage
    console.log(`[Chat Engine] 🔄 Using default symbols for ${agentId}: ${defaultSymbols.join(', ')}`)
    return defaultSymbols
  }
}

/**
 * Fetch REAL market prices from API (not mocked)
 */
async function getRealMarketContext(): Promise<MarketContext> {
  try {
    const response = await fetch("http://localhost:3000/api/market/prices")
    const data = await response.json()
    
    if (data && data.BTC && data.ETH) {
      console.log(`[Chat Engine] 📊 Fetched real market prices: BTC $${data.BTC.toFixed(0)}, ETH $${data.ETH.toFixed(0)}`)
      return {
        BTC: data.BTC || 100000,
        ETH: data.ETH || 3500,
        SOL: data.SOL || 215,
        BNB: data.BNB || 650,
        DOGE: data.DOGE || 0.35,
        ASTER: data.ASTER || 2.5,
        timestamp: data.timestamp || new Date().toISOString(),
        trending: [
          { symbol: "BTC", direction: Math.random() > 0.5 ? "up" : "down", change: Math.random() * 5 },
          { symbol: "ETH", direction: Math.random() > 0.5 ? "up" : "down", change: Math.random() * 5 },
          { symbol: "SOL", direction: Math.random() > 0.5 ? "up" : "down", change: Math.random() * 8 },
        ],
      }
    }
    throw new Error("Invalid price data")
  } catch (error) {
    console.warn("[Chat Engine] ⚠️ Could not fetch real prices, using defaults:", error instanceof Error ? error.message : error)
    // Fallback with reasonable defaults
    return {
      BTC: 100000,
      ETH: 3500,
      SOL: 215,
      BNB: 650,
      DOGE: 0.35,
      ASTER: 2.5,
      timestamp: new Date().toISOString(),
      trending: [
        { symbol: "BTC", direction: "up", change: 2.5 },
        { symbol: "ETH", direction: "up", change: 1.8 },
        { symbol: "SOL", direction: "up", change: 3.2 },
      ],
    }
  }
}

/**
 * Fetch agent position data and compute PnL across holdings
 */
export interface AgentPositionContext {
  holdings: Array<{
    symbol: string
    quantity: number
    entryPrice: number
    currentPrice: number
    unrealizedPnL: number
    unrealizedPnLPercent: number
    positionSize: number // In USDT
  }>
  totalUnrealizedPnL: number
  holdingCount: number
  gainers: string[]
  losers: string[]
  bestPerformer: string | null
  worstPerformer: string | null
}

async function getAgentPositionContext(agentId: string): Promise<AgentPositionContext> {
  try {
    // Fetch positions from API
    const posResponse = await fetch(`http://localhost:3000/api/aster/positions?agentId=${agentId}`)
    if (!posResponse.ok) {
      throw new Error(`Position fetch failed: ${posResponse.status}`)
    }
    
    const positions = await posResponse.json()
    
    // Fetch current prices
    const priceContext = await getRealMarketContext()
    const priceMap: Record<string, number> = {
      BTC: priceContext.BTC,
      ETH: priceContext.ETH,
      SOL: priceContext.SOL,
      BNB: priceContext.BNB,
      DOGE: priceContext.DOGE,
      ASTER: priceContext.ASTER,
    }

    const holdings: AgentPositionContext["holdings"] = []
    let totalUnrealizedPnL = 0
    const gainers: string[] = []
    const losers: string[] = []

    // Process each position
    for (const pos of positions) {
      if (!pos.symbol || pos.positionAmt === 0) continue

      // Extract base symbol (BTCUSDT -> BTC)
      const baseSymbol = pos.symbol.replace(/USDT$/, "")
      const currentPrice = priceMap[baseSymbol] || parseFloat(pos.markPrice) || 0

      if (currentPrice <= 0) continue

      // Calculate PnL
      const entryPrice = parseFloat(pos.entryPrice) || 0
      const quantity = parseFloat(pos.positionAmt) || 0
      const unrealizedPnL = (currentPrice - entryPrice) * quantity
      const unrealizedPnLPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0
      const positionSize = currentPrice * quantity

      holdings.push({
        symbol: baseSymbol,
        quantity,
        entryPrice,
        currentPrice,
        unrealizedPnL,
        unrealizedPnLPercent,
        positionSize,
      })

      totalUnrealizedPnL += unrealizedPnL

      if (unrealizedPnLPercent > 0) {
        gainers.push(`${baseSymbol} +${unrealizedPnLPercent.toFixed(1)}%`)
      } else if (unrealizedPnLPercent < 0) {
        losers.push(`${baseSymbol} ${unrealizedPnLPercent.toFixed(1)}%`)
      }
    }

    // Find best and worst performers
    let bestPerformer: string | null = null
    let worstPerformer: string | null = null
    if (holdings.length > 0) {
      const sorted = [...holdings].sort((a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent)
      bestPerformer = sorted[0]?.symbol || null
      worstPerformer = sorted[sorted.length - 1]?.symbol || null
    }

    console.log(`[Chat Engine] 💼 Fetched position context for ${agentId}: ${holdings.length} holdings, $${totalUnrealizedPnL.toFixed(2)} total PnL`)

    return {
      holdings,
      totalUnrealizedPnL,
      holdingCount: holdings.length,
      gainers,
      losers,
      bestPerformer,
      worstPerformer,
    }
  } catch (error) {
    console.warn(`[Chat Engine] ⚠️ Could not fetch positions for ${agentId}:`, error instanceof Error ? error.message : error)
    return {
      holdings: [],
      totalUnrealizedPnL: 0,
      holdingCount: 0,
      gainers: [],
      losers: [],
      bestPerformer: null,
      worstPerformer: null,
    }
  }
}

/**
 * Generate mock agent response (placeholder for real API)
 * Uses agent-specific trading symbols from Pickaboo configuration
 */
function generateMockResponse(
  agent: AgentData,
  context: MarketContext,
  recentActivity: string,
  agentSymbols: string[] = ["BTC", "ETH", "SOL"]
): string {
  const profile = AGENT_PROFILES[agent.id] || AGENT_PROFILES.claude_arbitrage
  const patterns = profile.responsePatterns
  const template = patterns[Math.floor(Math.random() * patterns.length)]

  // Use agent-specific symbols instead of hardcoded ones
  const symbols = agentSymbols.length > 0 ? agentSymbols : ["BTC", "ETH", "SOL", "BNB", "DOGE", "ASTER"]
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)]
  const randomSymbol2 = symbols[Math.floor(Math.random() * symbols.length)]

  const volatilityLevels = ["low", "moderate", "high", "extreme"]
  const volatility = volatilityLevels[Math.floor(Math.random() * volatilityLevels.length)]

  const patterns_chart = ["bull flag", "golden cross", "divergence", "breakout", "consolidation"]
  const pattern = patterns_chart[Math.floor(Math.random() * patterns_chart.length)]

  const directions = ["bullish", "bearish", "sideways"]
  const direction = directions[Math.floor(Math.random() * directions.length)]

  const trends = ["uptrend", "downtrend", "accumulation"]
  const trend = trends[Math.floor(Math.random() * trends.length)]

  const phases = ["bull run", "correction", "consolidation", "accumulation"]
  const phase = phases[Math.floor(Math.random() * phases.length)]

  const levels = ["oversold", "overbought", "neutral", "critical"]
  const level = levels[Math.floor(Math.random() * levels.length)]

  const events = ["Fed announcement", "market volatility", "liquidation cascade", "whale movements"]
  const event = events[Math.floor(Math.random() * events.length)]

  const replacements: Record<string, string | number> = {
    symbol: randomSymbol,
    symbol1: randomSymbol,
    symbol2: randomSymbol2,
    value: (Math.random() * 5).toFixed(2),
    level: (50 + Math.random() * 20).toFixed(0),
    confidence: (60 + Math.random() * 35).toFixed(0),
    action: Math.random() > 0.5 ? "long" : "short",
    pattern,
    direction,
    resistance: (context.BTC + Math.random() * 2000).toFixed(0),
    count: (Math.floor(Math.random() * 5) + 3).toString(),
    level1: (context.BTC - Math.random() * 5000).toFixed(0),
    level2: (context.BTC + Math.random() * 5000).toFixed(0),
    width: (1 + Math.random() * 5).toFixed(1),
    filled: (30 + Math.random() * 60).toFixed(0),
    profit: "$" + (100 + Math.random() * 900).toFixed(0),
    pips: (Math.random() * 100 + 20).toFixed(0),
    target: (context.BTC + Math.random() * 3000).toFixed(0),
    distance: (Math.random() * 5).toFixed(1),
    rate: (60 + Math.random() * 30).toFixed(0),
    score: (60 + Math.random() * 40).toFixed(0),
    volatility: volatility,
    trend,
    phase,
    event,
  }

  let response = template
  Object.entries(replacements).forEach(([key, value]) => {
    response = response.replace(`{${key}}`, String(value))
  })

  return response
}

/**
 * Helper function to extract base symbol from trading pair
 * E.g., "ASTERUSDT" -> "ASTER"
 */
function extractBaseSymbol(symbol: string): string {
  if (symbol.endsWith('USDT')) {
    return symbol.slice(0, -4)
  }
  return symbol
}

/**
 * Fetch agent's active exit plans for context enrichment
 */
async function getAgentExitPlanContext(agentId: string): Promise<{
  activePlans: number
  avgConfidence: number
  exitPlansSummary: string
}> {
  try {
    const response = await fetch(`http://localhost:3000/api/aster/exit-plans?agentId=${agentId}`)
    if (!response.ok) {
      throw new Error(`Exit plans fetch failed: ${response.status}`)
    }
    
    const exitPlans = await response.json()
    
    if (!Array.isArray(exitPlans) || exitPlans.length === 0) {
      return {
        activePlans: 0,
        avgConfidence: 0,
        exitPlansSummary: 'No active exit plans'
      }
    }

    const avgConfidence = exitPlans.reduce((sum, p) => sum + (p.confidence || 0), 0) / exitPlans.length
    
    // Build summary of exit plans
    const planSummary = exitPlans
      .slice(0, 3) // Show up to 3 most recent
      .map(p => `${p.side} ${p.symbol}: TP $${p.take_profit?.toFixed(2)} / SL $${p.stop_loss?.toFixed(2)}`)
      .join('; ')

    console.log(`[Chat Engine] 📊 Fetched ${exitPlans.length} active exit plans for ${agentId}`)

    return {
      activePlans: exitPlans.length,
      avgConfidence: avgConfidence,
      exitPlansSummary: planSummary
    }
  } catch (error) {
    console.warn(`[Chat Engine] ⚠️ Could not fetch exit plans for ${agentId}:`, error instanceof Error ? error.message : error)
    return {
      activePlans: 0,
      avgConfidence: 0,
      exitPlansSummary: 'Exit plans unavailable'
    }
  }
}

/**
 * Main chat generation function
 * Calls real LLM APIs when available, falls back to mock generation
 * Now includes agent position context and Pickaboo-configured trading symbols
 */
export async function generateAgentResponse(
  agent: AgentData,
  marketContext: MarketContext,
  recentActivity: string = "",
  tradingSymbol: string = "ASTERUSDT"
): Promise<ChatMessage> {
  const profile = AGENT_PROFILES[agent.id] || AGENT_PROFILES.claude_arbitrage

  let content: string

  // Fetch agent's configured trading symbols from Pickaboo dashboard
  const agentSymbols = await getAgentTradingSymbols(agent.id)

  // Fetch agent's position context for richer reasoning
  const positionContext = await getAgentPositionContext(agent.id)

  // Fetch agent's active exit plans for risk management context
  const exitPlanContext = await getAgentExitPlanContext(agent.id)
  
  // Build enriched activity string with portfolio and exit plan information
  let enrichedActivity = recentActivity
  if (positionContext.holdingCount > 0) {
    const holdingsList = positionContext.holdings
      .map(h => `${h.symbol}(${h.unrealizedPnLPercent > 0 ? '+' : ''}${h.unrealizedPnLPercent.toFixed(1)}%)`)
      .join(", ")
    enrichedActivity = `Holdings: ${holdingsList} | Total PnL: $${positionContext.totalUnrealizedPnL.toFixed(2)} | Exit Plans: ${exitPlanContext.activePlans} active (avg ${exitPlanContext.avgConfidence.toFixed(0)}% confidence) | Trading: ${agentSymbols.join(", ")} | ${recentActivity}`
  } else {
    enrichedActivity = `Exit Plans: ${exitPlanContext.activePlans} active | Trading: ${agentSymbols.join(", ")} | ${enrichedActivity}`
  }

  // Try to use real API first, fall back to mock if not configured
  try {
    // Dynamic import to avoid circular dependencies
    const { callAgentAPI } = await import("./llm-apis")

    // Fetch custom prompt if available (from Pickaboo dashboard)
    let customPrompt: string | undefined
    try {
      // Map agent ID to agent name for prompt lookup
      const agentNameMap: Record<string, string> = {
        "claude_arbitrage": "Claude",
        "chatgpt_openai": "GPT",
        "gemini_grid": "Gemini",
        "deepseek_ml": "DeepSeek",
        "buy_and_hold": "BuyHold",
      }
      const agentName = agentNameMap[agent.id]
      if (agentName) {
        // Fetch custom prompt from Pickaboo dashboard
        try {
          const promptResponse = await fetch(`/api/pickaboo/agent-prompts?wallet=system`)
          if (promptResponse.ok) {
            const promptData = await promptResponse.json()
            if (promptData.success && promptData.agent_prompts) {
              // Map agent to agent_id (e.g., "Claude" -> "agent_1")
              const agentIdMap: Record<string, string> = {
                "Claude": "agent_1",
                "GPT": "agent_2",
                "Gemini": "agent_3",
                "DeepSeek": "agent_4",
                "BuyHold": "agent_5",
              }
              const agentId = agentIdMap[agentName]
              if (agentId && promptData.agent_prompts[agentId]?.current_prompt) {
                customPrompt = promptData.agent_prompts[agentId].current_prompt
                console.debug(`[Chat Engine] Loaded custom prompt for ${agent.id}`)
              }
            }
          }
        } catch (error) {
          console.debug(`[Chat Engine] Could not fetch custom prompt for ${agent.id}:`, error instanceof Error ? error.message : error)
          // Continue with default prompt
        }
      }
    } catch (error) {
      console.debug("[Chat Engine] Custom prompt loading skipped:", error instanceof Error ? error.message : error)
      // Continue with default prompt
    }

    // For Buy & Hold (Grok), fetch X.com sentiment context using tool calling
    let sentiment: string | undefined
    if (agent.id === "buy_and_hold") {
      try {
        const { getXComSentimentContext } = await import("./grok-sentiment-analyzer")
        // Extract base symbol from trading pair (e.g., ASTERUSDT -> ASTER)
        const baseSymbol = extractBaseSymbol(tradingSymbol)
        sentiment = await getXComSentimentContext([baseSymbol])
        console.debug(`[Chat Engine] Grok sentiment context for ${baseSymbol}: ${sentiment.substring(0, 100)}...`)
      } catch (error) {
        console.debug("[Chat Engine] Sentiment analysis not available, Grok will use its own X search:", error)
        // If sentiment fetch fails, Grok will still try to search X via its tools
      }
    }

    console.log(`[Chat Engine] 🤖 Calling real API for ${agent.id} (${agent.name}) trading ${agentSymbols.join(", ")} with ${positionContext.holdingCount} positions${customPrompt ? " [custom prompt]" : ""}...`)
    content = await callAgentAPI(agent, marketContext, enrichedActivity, sentiment, customPrompt)
    console.log(`[Chat Engine] ✅ Real API response received for ${agent.id}`)
  } catch (error) {
    console.warn(`⚠️ [Chat Engine] Real API failed for ${agent.id}, using mock. Error:`, error instanceof Error ? error.message : error)
    // Fall back to intelligent mock responses with position context and agent-specific symbols
    content = generateMockResponse(agent, marketContext, enrichedActivity, agentSymbols)
  }

  const types: ("analysis" | "trade_signal" | "market_update" | "risk_management")[] = [
    "analysis",
    "trade_signal",
    "market_update",
    "risk_management",
  ]

  return {
    id: `${agent.id}-${Date.now()}`,
    agentId: agent.id,
    agentName: agent.name,
    timestamp: new Date().toISOString(),
    content,
    type: types[Math.floor(Math.random() * types.length)],
    confidence: Math.floor(60 + Math.random() * 35),
  }
}

/**
 * Generate responses for all agents
 * 
 * IMPORTANT: This function automatically syncs with the current trading symbol
 * configured in the Pickaboo dashboard. Agents will provide reasoning specific
 * to the currently active trading symbol (e.g., ASTERUSDT, BTCUSDT, etc.)
 */
export async function generateAllAgentResponses(
  agents: AgentData[],
  marketContext?: MarketContext
): Promise<ChatMessage[]> {
  const context = marketContext || await getRealMarketContext()

  // SYNC WITH PICKABOO: Fetch the current trading symbol from Pickaboo dashboard
  // This ensures agent responses are always discussing the currently configured trading token
  let tradingSymbol = "ASTERUSDT" // Default fallback
  try {
    const { getCurrentTradingSymbol } = await import("./supabase-client")
    tradingSymbol = await getCurrentTradingSymbol("agent_1")
    console.log(`[Chat Engine] 📊 Synced trading symbol from Pickaboo: ${tradingSymbol}`)
  } catch (error) {
    console.warn("[Chat Engine] Could not fetch trading symbol from Pickaboo, using default ASTERUSDT:", error)
  }

  const responses = await Promise.all(
    agents.map((agent) =>
      generateAgentResponse(
        agent,
        context,
        `ROI: ${agent.roi.toFixed(2)}% | Recent trades: ${agent.recentTrades}`,
        tradingSymbol
      )
    )
  )

  return responses
}

/**
 * Placeholder for real API implementations
 * These will be implemented when API keys are available
 */
export async function callOpenAIAPI(
  agent: AgentData,
  context: MarketContext,
  activity: string
): Promise<ChatMessage> {
  // TODO: Implement when OPENAI_API_KEY is available
  throw new Error("OpenAI API not configured. Using mock responses instead.")
}

export async function callAnthropicAPI(
  agent: AgentData,
  context: MarketContext,
  activity: string
): Promise<ChatMessage> {
  // TODO: Implement when ANTHROPIC_API_KEY is available
  throw new Error("Anthropic API not configured. Using mock responses instead.")
}

export async function callGoogleAPI(
  agent: AgentData,
  context: MarketContext,
  activity: string
): Promise<ChatMessage> {
  // TODO: Implement when GOOGLE_API_KEY is available
  throw new Error("Google API not configured. Using mock responses instead.")
}

export async function callDeepSeekAPI(
  agent: AgentData,
  context: MarketContext,
  activity: string
): Promise<ChatMessage> {
  // TODO: Implement when DEEPSEEK_API_KEY is available
  throw new Error("DeepSeek API not configured. Using mock responses instead.")
}