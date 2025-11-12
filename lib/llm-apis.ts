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
    const error = "ANTHROPIC_API_KEY not configured"
    console.error(`[LLM-APIs] ❌ Claude API Error for ${agent.id}:`, error)
    throw new Error(error)
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
        model: process.env.CLAUDE_MODEL || "claude-3-sonnet-20240229",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!response.ok) {
      const errorData = await response.text().catch(() => "")
      const error = `Claude API error: ${response.status} ${response.statusText}. Response: ${errorData.substring(0, 200)}`
      console.error(`[LLM-APIs] ❌ Claude API HTTP Error:`, error)
      throw new Error(error)
    }

    const data = await response.json()
    if (!data.content || !data.content[0] || !data.content[0].text) {
      const error = `Claude API returned invalid response: ${JSON.stringify(data).substring(0, 200)}`
      console.error(`[LLM-APIs] ❌ Claude API Response Error:`, error)
      throw new Error(error)
    }
    console.log(`[LLM-APIs] ✅ Claude API success for ${agent.id}`)
    return data.content[0].text
  } catch (error) {
    console.error("[LLM-APIs] ❌ Claude API error:", {
      message: error instanceof Error ? error.message : String(error),
      agentId: agent.id,
    })
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
    const error = "OPENAI_API_KEY not configured"
    console.error(`[LLM-APIs] ❌ OpenAI API Error for ${agent.id}:`, error)
    throw new Error(error)
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
        model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text().catch(() => "")
      const error = `OpenAI API error: ${response.status} ${response.statusText}. Response: ${errorData.substring(0, 200)}`
      console.error(`[LLM-APIs] ❌ OpenAI API HTTP Error:`, error)
      throw new Error(error)
    }

    const data = await response.json()
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      const error = `OpenAI API returned invalid response: ${JSON.stringify(data).substring(0, 200)}`
      console.error(`[LLM-APIs] ❌ OpenAI API Response Error:`, error)
      throw new Error(error)
    }
    console.log(`[LLM-APIs] ✅ OpenAI API success for ${agent.id}`)
    return data.choices[0].message.content
  } catch (error) {
    console.error("[LLM-APIs] ❌ OpenAI API error:", {
      message: error instanceof Error ? error.message : String(error),
      agentId: agent.id,
    })
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
    const error = "GOOGLE_API_KEY not configured"
    console.error(`[LLM-APIs] ❌ Gemini API Error for ${agent.id}:`, error)
    throw new Error(error)
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
    prompt = `You are Gemini Grid, an intelligent accumulation AI executing systematic dollar-cost averaging strategies.
Explain your ACCUMULATION STRATEGY and current position-building approach across your holdings.

Current Market Environment:
- BTC: $${context.BTC.toFixed(0)}
- ETH: $${context.ETH.toFixed(0)}
- SOL: $${context.SOL.toFixed(2)}
- BNB: $${context.BNB.toFixed(2)}
- DOGE: $${context.DOGE.toFixed(4)}

Your Portfolio Status: ${activity}
Current ROI: ${agent.roi.toFixed(2)}%

As an accumulation specialist, explain your strategy:
1. What accumulation targets are you pursuing for each asset? What's your average cost basis?
2. Which assets are you actively accumulating and which are waiting for better entry points?
3. How do price dips and market volatility trigger your accumulation orders?

Focus on your CURRENT ACCUMULATION PLAN and entry strategy, not predictions about future moves.`
  }

  try {
    const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash"
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
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
      const errorData = await response.text().catch(() => "")
      const error = `Gemini API error: ${response.status} ${response.statusText}. Response: ${errorData.substring(0, 200)}`
      console.error(`[LLM-APIs] ❌ Gemini API HTTP Error:`, error)
      throw new Error(error)
    }

    const data = await response.json()
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      const error = `Gemini API returned invalid response: ${JSON.stringify(data).substring(0, 200)}`
      console.error(`[LLM-APIs] ❌ Gemini API Response Error:`, error)
      throw new Error(error)
    }
    console.log(`[LLM-APIs] ✅ Gemini API success for ${agent.id}`)
    return data.candidates[0].content.parts[0].text
  } catch (error) {
    console.error("[LLM-APIs] ❌ Gemini API error:", {
      message: error instanceof Error ? error.message : String(error),
      agentId: agent.id,
    })
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
    const error = "DEEPSEEK_API_KEY not configured"
    console.error(`[LLM-APIs] ❌ DeepSeek API Error for ${agent.id}:`, error)
    throw new Error(error)
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
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text().catch(() => "")
      const error = `DeepSeek API error: ${response.status} ${response.statusText}. Response: ${errorData.substring(0, 200)}`
      console.error(`[LLM-APIs] ❌ DeepSeek API HTTP Error:`, error)
      throw new Error(error)
    }

    const data = await response.json()
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      const error = `DeepSeek API returned invalid response: ${JSON.stringify(data).substring(0, 200)}`
      console.error(`[LLM-APIs] ❌ DeepSeek API Response Error:`, error)
      throw new Error(error)
    }
    console.log(`[LLM-APIs] ✅ DeepSeek API success for ${agent.id}`)
    return data.choices[0].message.content
  } catch (error) {
    console.error("[LLM-APIs] ❌ DeepSeek API error:", {
      message: error instanceof Error ? error.message : String(error),
      agentId: agent.id,
    })
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
    const error = "GROK_API_KEY not configured"
    console.error(`[LLM-APIs] ❌ Grok API Error for ${agent.id}:`, error)
    throw new Error(error)
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
      model: process.env.GROK_MODEL || "grok-2-1212",
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