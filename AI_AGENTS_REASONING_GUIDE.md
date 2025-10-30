# AI Agents Reasoning Chat System

## Overview
This guide explains how the dashboard displays real reasoning from AI models through the **Model Chat** tab. Each agent uses their respective AI model to generate intelligent trading analysis and signals.

## Architecture

### 1. **Agent-Model Mapping**
Each trading agent uses a specific AI model:

| Agent | Model | Strategy | Special Features |
|-------|-------|----------|------------------|
| Claude Arbitrage | Claude 3.5 Sonnet (Anthropic) | Arbitrage opportunities | Deep multi-pair analysis |
| GPT-4 Momentum | GPT-4 Turbo (OpenAI) | Momentum & trend following | Technical pattern recognition |
| Gemini Grid | Google Gemini Pro | Grid trading | Systematic price level optimization |
| DeepSeek ML | DeepSeek-V3 | ML predictions | Pattern recognition & ML models |
| Buy & Hold | Grok 2 (xAI) + X.com Sentiment | Long-term investing | Real-time social sentiment analysis |

### 2. **How Real Reasoning Chats Work**

#### Flow:
```
Dashboard → Chat Generation (Every 60 seconds) 
   ↓
API Route (/api/chat/generate)
   ↓
Chat Engine (lib/chat-engine.ts)
   ↓
Try Real API (llm-apis.ts) → Fall back to Mock if unavailable
   ↓
For Buy & Hold: Fetch X.com Sentiment (grok-sentiment-analyzer.ts)
   ↓
Generate ChatMessage → Store in Redis → Display in Dashboard
```

#### Real API Calls:
When API keys are configured, agents make **actual API calls** to their respective LLM providers:

- **Claude**: `https://api.anthropic.com/v1/messages`
- **OpenAI**: `https://api.openai.com/v1/chat/completions`
- **Gemini**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`
- **DeepSeek**: `https://api.deepseek.com/chat/completions`
- **Grok**: `https://api.x.ai/v1/chat/completions`

### 3. **Buy & Hold + Grok Special Feature: Native X.com Tool Calling**

The Buy & Hold strategy powered by Grok leverages **Grok's agentic tool calling** for **real-time X.com sentiment analysis**:

**How it works (Native Tool Calling):**
1. Chat generation triggers for Buy & Hold agent
2. `lib/grok-sentiment-analyzer.ts` calls `fetchXComSentimentViaGrok()` 
3. This function sends a request to Grok's API **WITH the `x_search` tool enabled**
4. **Grok natively searches X.com** using post-merger xAI/X ecosystem access (no separate API key needed!)
5. Grok parses live posts, trends, hashtags, and mentions about tokens
6. Returns structured sentiment data (-100 to +100 scale)
7. Sentiment context is passed to Grok for reasoning incorporation
8. **Grok uses BOTH its native X search AND the pre-fetched context** for final analysis

**Key Advantage:**
- ✅ **No separate X.com API key required** - Grok has native post-merger access
- ✅ **Real-time data** - Searches live posts and trends during inference
- ✅ **Graceful fallback** - Uses mock data if Grok unavailable, still generates valid responses

**Example Grok Response:**
```
"🟢 Bullish X.com sentiment (81/100) on BTC with 3,847 recent mentions. 
Community discussing institutional adoption narratives. 
Long-term conviction remains strong - BTC showing accumulation patterns. 
Action: Maintain patient capital deployment through Q1."
```

**Grok's X Search Tool Features:**
- Fetches recent posts about cryptocurrencies
- Analyzes sentiment in real tweets and discussions
- Tracks trending hashtags and topics
- Identifies news and announcements
- Powered by xAI's native X API access (post-merger)

## Configuration

### 1. **API Keys Setup**

All API keys are stored in `.env.local` (never commit to git):

```env
# Claude (Arbitrage Agent)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# OpenAI (Momentum Agent)
OPENAI_API_KEY=sk-proj-xxxxx

# Gemini (Grid Trading Agent)
GOOGLE_API_KEY=AIzaSyDxxxxx

# DeepSeek (ML Agent)
DEEPSEEK_API_KEY=sk-xxxxx

# Grok (Buy & Hold Agent)
# Grok has native X.com search tool - NO SEPARATE X API KEY NEEDED!
GROK_API_KEY=xai-xxxxx
```

**Note on X.com Sentiment Analysis:**
- ✅ **Grok's native X search tool** - Built into xAI API (post-merger with X)
- ❌ **NO separate X.com/Twitter API key required** for sentiment analysis
- ✅ Grok automatically fetches live X data using its tool calling capabilities
- If Grok API unavailable, system gracefully falls back to mock sentiment data

### 2. **Getting API Keys**

| Model | Link | Time to Setup | Required |
|-------|------|---------------|----------|
| Claude | https://console.anthropic.com/ | 2 min | Optional* |
| OpenAI | https://platform.openai.com/api-keys | 2 min | Optional* |
| Gemini | https://makersuite.google.com/app/apikey | 2 min | Optional* |
| DeepSeek | https://platform.deepseek.com/ | 2 min | Optional* |
| Grok | https://console.x.ai/ | 5 min | For X sentiment |

*Optional: System works perfectly with mock responses when API keys not configured

## Files Structure

### Core Files:
- **`lib/constants/agents.ts`** - Agent Configuration & Trading Symbol Mapping
  - `AGENT_TRADING_SYMBOLS` - Maps each agent to the symbols they actually trade
    - Claude Arbitrage: BTC, ETH (arbitrage pairs)
    - GPT-4 Momentum: BTC, ETH, SOL (major pairs)
    - Gemini Grid: SAND, FLOKI (alt pairs)
    - DeepSeek ML: BTC, ETH, SOL, BNB, DOGE (scalping)
    - **Buy & Hold: ASTER** (the token it holds) ✅
  - Ensures sentiment analysis & market context are specific to each agent's assets

- **`lib/chat-engine.ts`** - Main chat generation logic
  - Profiles for each agent (personality, patterns, models)
  - `generateAgentResponse()` - Creates individual agent messages
  - **Dynamically fetches sentiment for agent's specific trading symbols** (not hardcoded!)
  - `generateAllAgentResponses()` - Batch generation for all agents
  - **Now uses real APIs when available**, falls back to mocks

- **`lib/llm-apis.ts`** - Real LLM API integrations
  - `callClaudeAPI()` - Anthropic Claude 3.5 Sonnet
  - `callOpenAIAPI()` - OpenAI GPT-4 Turbo
  - `callGeminiAPI()` - Google Gemini Pro
  - `callDeepSeekAPI()` - DeepSeek-V3
  - `callGrokAPI()` - xAI Grok 2
  - `callAgentAPI()` - Unified router based on agent ID

- **`lib/grok-sentiment-analyzer.ts`** - X.com sentiment via Grok tool calling
  - `fetchXComSentimentViaGrok()` - **NEW**: Calls Grok API with x_search tool enabled
  - `parseGrokResponse()` - Extracts sentiment data from Grok's tool calling response
  - `generateMockSentiment()` - Fallback mock data when Grok unavailable
  - `convertSentimentToSignal()` - Converts sentiment score to trading signal
  - `generateSentimentBasedSignals()` - Batch sentiment for multiple tokens
  - `getXComSentimentContext()` - **NEW**: Returns sentiment for use in Grok prompts
  - **Now uses Grok's native X search tool** - Real-time live data, no separate X API key!

- **`app/api/chat/generate/route.ts`** - Chat generation endpoint
  - POST `/api/chat/generate` - Generate new messages
  - GET `/api/chat/generate` - Retrieve message history
  - Called every 60 seconds by dashboard

- **`app/api/chat/messages/route.ts`** - Message retrieval endpoint
  - Stores messages in Redis with 1-hour TTL
  - Keeps last 200 messages in cache

## Using the Chat System

### 1. **View Agent Reasoning**
On the dashboard:
1. Go to **"MODELCHAT"** tab
2. Select an agent card to see their latest analysis
3. Messages update every 60 seconds automatically

### 2. **Message Types**
Each chat includes a message type:
- **analysis** - Technical or market analysis
- **trade_signal** - Entry/exit signals
- **market_update** - Market condition changes
- **risk_management** - Risk-related decisions

### 3. **Message Format**
```json
{
  "id": "agent-12345-timestamp",
  "agentId": "claude_arbitrage",
  "agentName": "Claude Arbitrage",
  "timestamp": "2024-01-15T10:30:00Z",
  "content": "Identified BTC/ETH arbitrage opportunity...",
  "type": "trade_signal",
  "confidence": 85
}
```

## Fallback Behavior

If an API is **unavailable** or **misconfigured**:
1. ✅ Dashboard still works
2. ✅ Chat generation falls back to intelligent mock responses
3. ✅ Users see strategy-specific reasoning patterns
4. ℹ️ No error messages displayed to frontend

**Console logs** show when fallback occurs:
```
[DEBUG] Real API not available for claude_arbitrage, using mock
```

## Performance Metrics

- **Chat Generation**: Every 60 seconds per agent
- **X.com Sentiment**: Updated once per generation (for Grok)
- **Storage**: Last 200 messages in Redis
- **Display**: Last 20 messages per agent on dashboard
- **Cache TTL**: 1 hour

## Troubleshooting

### No messages appearing?
1. Check Redis connection: `REDIS_URL=redis://localhost:6379`
2. Check browser console for errors
3. Verify API keys in `.env.local`
4. Check server logs: `npm run dev`

### Grok sentiment not updating?
1. Verify `GROK_API_KEY` is set correctly in `.env.local`
2. Grok has built-in X search - no separate X.com API credentials needed!
3. If Grok unavailable, system falls back to mock sentiment (still fully functional)
4. Check Grok API status: https://console.x.ai/
5. Monitor rate limits (Grok API may have per-minute token limits)

### Models showing old messages?
1. Redis TTL is 1 hour - messages expire after that
2. Browser cache may need clearing
3. Check `/api/chat/messages?limit=100` endpoint directly

## Future Enhancements

- [x] ✅ **Grok native X search tool calling** (via xAI post-merger access) - COMPLETED!
- [ ] Streaming responses for real-time updates
- [ ] Agent-to-agent reasoning (agents consulting each other)
- [ ] Custom chat history per user
- [ ] Message search and filtering
- [ ] Sentiment history tracking dashboard
- [ ] Tool use for other agents (Claude, GPT-4, Gemini, DeepSeek tool calling)
- [ ] Real-time WebSocket updates instead of 60-second polling

## Security Notes

⚠️ **Never commit API keys to version control!**
- Use `.env.local` for development (in `.gitignore`)
- Use environment variables in production
- Rotate keys if accidentally exposed
- Use least-privilege API key scopes

## Trading Symbol Control - Pickaboo Dashboard

### How It Works

**All agents trade the SAME symbol**, controlled by the **Pickaboo Admin Dashboard**:

```
Pickaboo Dashboard
    ↓
Change Symbol: ASTERUSDT → ETHUSDT
    ↓
Supabase trading_symbols table updated
    ↓
Chat Generation fetches current symbol
    ↓
ALL 5 agents analyze ETHUSDT sentiment
    ↓
All agents generate coherent analysis about ETH
```

### Why This Matters

Analyzing sentiment for the WRONG symbol leads to:
- ❌ Irrelevant analysis
- ❌ Nonsensical trading signals
- ❌ Broken reasoning chains

**Bad Example:**
```
Admin says: Trade ETHUSDT
System analyzes: BTC, SOL sentiment
Agent reason: "BTC is bullish... but I should trade ETH?" ← Confused!
```

**Good Example:**
```
Admin says: Trade ETHUSDT
System analyzes: ETH sentiment
Agent reason: "ETH showing strong momentum with 45k mentions..." ← Coherent!
```

### Implementation Details

In `lib/chat-engine.ts`:

1. **Fetch current symbol from database:**
```typescript
const tradingSymbol = await getCurrentTradingSymbol("agent_1")
// Returns: "ETHUSDT" (from Supabase trading_symbols table)
```

2. **Extract base symbol for sentiment:**
```typescript
const baseSymbol = extractBaseSymbol("ETHUSDT")  // → "ETH"
```

3. **Pass to ALL agents:**
```typescript
agents.map((agent) =>
  generateAgentResponse(agent, context, recentActivity, tradingSymbol)
)
```

4. **Fetch sentiment for that symbol:**
```typescript
sentiment = await getXComSentimentContext(["ETH"])
```

**Result**: All agents use the same symbol. Perfect alignment with Pickaboo control! ✅

### Changing the Trading Symbol

When a Pickaboo admin changes the symbol:

1. ✅ No code changes needed
2. ✅ Symbol updated in Supabase `trading_symbols` table
3. ✅ Next chat generation automatically fetches new symbol
4. ✅ All agents immediately analyze new symbol sentiment
5. ✅ All agent reasoning becomes relevant to the new symbol

**Example Flow:**
```
1. Admin clicks "Update Symbol" → BTCUSDT
2. PUT /api/pickaboo/update-symbol called
3. Supabase updated: agent_1.symbol = "BTCUSDT", etc.
4. Chat generation runs next → getCurrentTradingSymbol() = "BTCUSDT"
5. Agents fetch BTC sentiment from X.com
6. All agents generate BTC-focused analysis
7. Users see: "Bitcoin showing strong momentum..." ✅
```

### Database Schema

Stored in Supabase `trading_symbols` table:

| agent_id | symbol    |
|----------|-----------|
| agent_1  | ETHUSDT   |
| agent_2  | ETHUSDT   |
| agent_3  | ETHUSDT   |
| agent_4  | ETHUSDT   |
| agent_5  | ETHUSDT   |

All agents have the SAME symbol (set by admin). API endpoint: `/api/pickaboo/update-symbol`

---

## Testing

### Test Chat Generation:
```bash
curl -X POST http://localhost:3000/api/chat/generate
```

### Test Message Retrieval:
```bash
curl http://localhost:3000/api/chat/messages?limit=10&agentId=claude_arbitrage
```

### Test Sentiment Analysis:
```bash
# In Node REPL:
const { fetchXComSentimentViaGrok } = require('./lib/grok-sentiment-analyzer');
const sentiment = await fetchXComSentimentViaGrok('BTC');
console.log(sentiment);
// Returns: { symbol: 'BTC', sentiment: 'bullish', score: 45, mentions: 3200, ... }
```

## Deep Dive: Grok Tool Calling Architecture

### How Grok's X Search Tool Works

**Request Flow:**
```json
{
  "model": "grok-2-latest",
  "messages": [{"role": "user", "content": "Search X.com for BTC sentiment..."}],
  "tools": [{"type": "x_search", "enabled": true}]
}
```

**What Happens:**
1. Grok receives the prompt and sees `x_search` tool is enabled
2. Grok decides whether to call the tool based on the prompt
3. **Tool Call**: If sentiment analysis is needed, Grok searches X.com in real-time
4. **Integration**: X search results are automatically injected into Grok's context
5. **Response**: Grok generates reasoning incorporating live X data
6. **Return**: Full response with sentiment and analysis included

**Key Advantages Over Traditional API Approach:**
- ✅ **Post-Merger Integration**: xAI has direct access to X's data streams
- ✅ **No Rate Limiting Issues**: Grok uses X's internal APIs
- ✅ **No Extra Credentials**: Single Grok API key handles everything
- ✅ **Real-Time Data**: Not cached or delayed - live searches
- ✅ **Intelligent Tool Use**: Grok decides when/how to search based on context

### Code Example: Tool Calling Request

```typescript
// From lib/grok-sentiment-analyzer.ts
async function fetchXComSentimentViaGrok(symbol: string): Promise<SentimentData> {
  const prompt = `Search X.com for recent posts and trends about ${symbol} cryptocurrency.`

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-latest",
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          type: "x_search",      // Grok's native X search tool
          enabled: true           // Enable tool use for this request
        }
      ],
      max_tokens: 500,
      temperature: 0.3,           // Lower temp for factual analysis
    }),
  })

  // Grok's response includes live X data analysis
  const data = await response.json()
  return parseGrokResponse(data.choices[0].message.content, symbol)
}
```

### Why This Approach is Better

| Aspect | Traditional X API | Grok Tool Calling |
|--------|------------------|-------------------|
| API Keys | 2+ (X.com + Grok) | 1 (Grok only) |
| Setup Time | 30+ min | 5 min |
| Data Freshness | Cached | Real-time |
| Rate Limits | Strict | Grok's limits |
| Complexity | Complex integration | Simple tool enable |
| Reliability | Separate service | Single provider |
| Cost | Multiple subscriptions | Single Grok subscription |

---

**Last Updated**: 2024-01-20  
**System**: AI Agent Reasoning Chat v2.0 (Grok Tool Calling Edition)
**Author's Note**: Grok's native X integration is a game-changer for sentiment analysis - no need to manage separate Twitter API credentials!