/**
 * Real LLM API Integrations
 * Connects to Claude, GPT-4, Gemini, DeepSeek, and Grok for agent reasoning
 */

import { ChatMessage, AgentData, MarketContext } from "./chat-engine"

/**
 * Call Claude API (Anthropic) for Agent 1: Arbitrage
 */
export async function callClaudeAPI(
  agent: AgentData,
  context: MarketContext,
  activity: string,
  customPromptTemplate?: string
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured")
  }

  // Use custom prompt if provided, otherwise use default
  let prompt: string
  if (customPromptTemplate) {
    // If custom prompt is provided, append market context to it
    prompt = `${customPromptTemplate}

Current Market Conditions:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Your Portfolio Activity: ${activity}
Your Overall Performance: ${agent.roi.toFixed(2)}% ROI`
  } else {
    // Default prompt
    prompt = `You are Claude Arbitrage, an AI trading bot executing sophisticated arbitrage strategies across multiple asset pairs.
Your task is to explain your CURRENT PORTFOLIO DECISIONS and reasoning based on real market conditions.

Current Market Conditions:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Your Portfolio Activity: ${activity}
Your Overall Performance: ${agent.roi.toFixed(2)}% ROI

As an arbitrage specialist, explain your reasoning about your CURRENT POSITIONS:
1. What technical indicators (MACD, RSI, moving averages) are guiding your hold/close decisions?
2. Which assets show resilience or momentum, and why you're maintaining positions despite current market moves?
3. Specific price relationships or cross-pair dynamics you're monitoring?

Keep your response conversational, specific to your holdings, and focused on EXPLAINING what you're doing (not giving trading advice).`
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    return data.content[0].text
  } catch (error) {
    console.error("Claude API error:", error)
    throw error
  }
}

/**
 * Call OpenAI API for Agent 2: GPT-4 Momentum
 */
export async function callOpenAIAPI(
  agent: AgentData,
  context: MarketContext,
  activity: string,
  customPromptTemplate?: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured")
  }

  let prompt: string
  if (customPromptTemplate) {
    prompt = `${customPromptTemplate}

Current Market Prices:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Your Current Holdings & Performance: ${activity}
Overall ROI: ${agent.roi.toFixed(2)}%`
  } else {
    prompt = `You are GPT-4 Momentum, an advanced momentum trading AI executing trend-following strategies.
Explain your PORTFOLIO STRATEGY and position management decisions.

Current Market Prices:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Your Current Holdings & Performance: ${activity}
Overall ROI: ${agent.roi.toFixed(2)}%

As a momentum specialist, explain your current strategy:
1. Which positions you're holding and WHY - what are your profit targets and stop losses?
2. Which assets are showing positive vs negative unrealized PnL and your confidence in each?
3. Are you waiting for invalidation conditions or profit targets to be hit? Explain your bias.

Be specific about holdings (ETH, SOL, XRP, BTC, DOGE, BNB etc.) and whether they're in profit, break-even, or at losses.
Explain your conviction level and strategy without giving financial advice.`
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error("OpenAI API error:", error)
    throw error
  }
}

/**
 * Call Google Gemini API for Agent 3: Grid Trading
 */
export async function callGeminiAPI(
  agent: AgentData,
  context: MarketContext,
  activity: string,
  customPromptTemplate?: string
): Promise<string> {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY not configured")
  }

  let prompt: string
  if (customPromptTemplate) {
    prompt = `${customPromptTemplate}

Current Market Environment:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Your Portfolio Status: ${activity}
Current ROI: ${agent.roi.toFixed(2)}%`
  } else {
    prompt = `You are Gemini Grid, an intelligent grid trading AI managing systematic multi-level trading strategies.
Explain your GRID STRATEGY and current order management across your holdings.

Current Market Environment:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Your Portfolio Status: ${activity}
Current ROI: ${agent.roi.toFixed(2)}%

As a grid trading specialist, explain your strategy:
1. What grid ranges are you maintaining for each asset? How are orders distributed?
2. Which grids are capturing profits and which are accumulating entries?
3. How does volatility affect your grid width and order density across different assets?

Focus on your CURRENT POSITIONS and grid configuration, not predictions about future moves.`
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    return data.candidates[0].content.parts[0].text
  } catch (error) {
    console.error("Gemini API error:", error)
    throw error
  }
}

/**
 * Call DeepSeek API for Agent 4: ML Predictor
 */
export async function callDeepSeekAPI(
  agent: AgentData,
  context: MarketContext,
  activity: string,
  customPromptTemplate?: string
): Promise<string> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured")
  }

  let prompt: string
  if (customPromptTemplate) {
    prompt = `${customPromptTemplate}

Current Market Data:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Your Holdings & Performance: ${activity}
Overall ROI: ${agent.roi.toFixed(2)}%`
  } else {
    prompt = `You are DeepSeek ML, a sophisticated machine learning-driven trading AI that identifies patterns in market data.
Explain your ML model's current PORTFOLIO REASONING and position decisions.

Current Market Data:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Your Holdings & Performance: ${activity}
Overall ROI: ${agent.roi.toFixed(2)}%

As an ML specialist, explain your strategy:
1. What market patterns (volume spikes, volatility regimes, momentum indicators) is your model detecting in your current holdings?
2. For each asset you're holding - what's your confidence level? Why are you maintaining vs closing each position?
3. How do your model's feature weights (volume, volatility, price action, correlations) guide your current positioning?

Be specific about your current holdings and explain your model's reasoning, not give buy/sell signals.`
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error("DeepSeek API error:", error)
    throw error
  }
}

/**
 * Call Grok API for Agent 5: Buy & Hold with Real X.com Sentiment
 * Enables Grok's native X search tool calling for live sentiment analysis
 */
export async function callGrokAPI(
  agent: AgentData,
  context: MarketContext,
  activity: string,
  sentiment?: string,
  customPromptTemplate?: string
): Promise<string> {
  if (!process.env.GROK_API_KEY) {
    throw new Error("GROK_API_KEY not configured")
  }

  const sentimentContext = sentiment
    ? `\nRecent X.com Community Sentiment:\n${sentiment}\n`
    : "\nAnalyzing current X.com sentiment and community discussions about these assets...\n"

  let prompt: string
  if (customPromptTemplate) {
    prompt = `${customPromptTemplate}

Your Current Holdings & Performance: ${activity}

${sentimentContext}

Current Market Environment:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Long-term ROI: ${agent.roi.toFixed(2)}%`
  } else {
    prompt = `You are Grok Buy & Hold, a strategic long-term accumulation AI with real-time access to X.com sentiment data.
You explain your PORTFOLIO STRATEGY based on community sentiment, fundamentals, and long-term conviction.

Your Current Holdings & Performance: ${activity}

${sentimentContext}

Current Market Environment:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Long-term ROI: ${agent.roi.toFixed(2)}%

As a long-term accumulation strategist, explain your positioning:
1. Which assets are you holding and why? What's your conviction level based on X.com sentiment and fundamentals?
2. For underwater vs profitable positions - explain your patience and thesis for maintaining them
3. How do community narratives and on-chain data support your current holding strategy?

Be specific about HOLDING DECISIONS, conviction levels, and sentiment alignment. Don't give investment advice.`
  }

  try {
    const requestBody = {
      model: "grok-2-latest",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.6, // Balanced between creativity and factuality
      tools: [
        {
          type: "x_search",
        },
      ],
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Grok API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error("Grok API returned empty response")
    }

    return content
  } catch (error) {
    console.error("Grok API error:", error)
    throw error
  }
}

/**
 * Unified function to call the appropriate API based on agent ID
 */
export async function callAgentAPI(
  agent: AgentData,
  context: MarketContext,
  activity: string,
  sentiment?: string,
  customPromptTemplate?: string
): Promise<string> {
  switch (agent.id) {
    case "claude_arbitrage":
      return callClaudeAPI(agent, context, activity, customPromptTemplate)
    case "chatgpt_openai":
      return callOpenAIAPI(agent, context, activity, customPromptTemplate)
    case "gemini_grid":
      return callGeminiAPI(agent, context, activity, customPromptTemplate)
    case "deepseek_ml":
      return callDeepSeekAPI(agent, context, activity, customPromptTemplate)
    case "buy_and_hold":
      return callGrokAPI(agent, context, activity, sentiment, customPromptTemplate)
    default:
      throw new Error(`Unknown agent: ${agent.id}`)
  }
}