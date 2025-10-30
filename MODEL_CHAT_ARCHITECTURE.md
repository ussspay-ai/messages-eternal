# NOF1 Model Chat System - Complete Architecture Guide

## Overview
The Model Chat system enables AI agents to display their real-time reasoning, market analysis, and trading signals. Each agent (Claude, GPT-4, Gemini, DeepSeek, Grok) connects to its respective LLM API and streams reasoning to a unified dashboard feed.

---

## System Architecture

### 1. **LLM API Integration Layer** (`lib/llm-apis.ts`)
Each agent has a dedicated API call function:

#### Claude Arbitrage (`callClaudeAPI`)
```typescript
// Uses: Anthropic API (claude-3-5-sonnet-20241022)
// Input: Market context (BTC, ETH, SOL prices) + Agent ROI
// Output: Brief arbitrage analysis (2-3 sentences, max 150 tokens)
// API: https://api.anthropic.com/v1/messages
```

#### GPT-4 Momentum (`callOpenAIAPI`)
```typescript
// Uses: OpenAI API (gpt-4-turbo)
// Input: Market prices + Performance metrics
// Output: Trend and momentum analysis
// API: https://api.openai.com/v1/chat/completions
```

#### Gemini Grid (`callGeminiAPI`)
```typescript
// Uses: Google Gemini API (gemini-1.5-pro)
// Input: Current market levels + Grid parameters
// Output: Grid trading and rebalancing signals
// API: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
```

#### DeepSeek ML (`callDeepSeekAPI`)
```typescript
// Uses: DeepSeek API (deepseek-chat)
// Input: Market data + Historical patterns
// Output: ML predictions and pattern recognition
// API: https://api.deepseek.com/chat/completions
```

#### Grok Buy & Hold (`callGrokAPI`)
```typescript
// Uses: Grok API (grok-2-latest) with X Search Tool Calling
// Input: Market context + Pre-fetched X.com sentiment data
// Output: Long-term strategy with social sentiment analysis
// API: https://api.x.ai/v1/chat/completions
// Special: Can call native X.com search tools for real-time sentiment
```

---

### 2. **Chat Engine** (`lib/chat-engine.ts`)

#### Key Functions:

**`callAgentAPI(agent, context, activity, sentiment?)`**
- Routes to appropriate LLM based on agent ID
- Passes real market context and recent activity
- For Grok: includes pre-fetched X.com sentiment

**`generateAgentResponse(agent, marketContext, recentActivity, tradingSymbol)`**
- Called when a real LLM API returns response
- Returns structured ChatMessage with:
  - `type`: "analysis" | "trade_signal" | "market_update" | "risk_management"
  - `content`: Agent's reasoning text
  - `confidence`: 60-95% (random or from LLM)
  - `timestamp`: ISO format

**`generateAllAgentResponses(agents, marketContext?)`**
- Generates responses for all 5 agents in parallel
- **Syncs with Pickaboo Dashboard**: Fetches current trading symbol
- Agents reason about the currently selected token (ASTERUSDT, BTCUSDT, etc.)

**Mock Fallback System**:
```typescript
// If API keys unavailable, uses AGENT_PROFILES with response patterns:
- claude_arbitrage: "Identified {symbol} arbitrage opportunity. Price discrepancy {value}%..."
- chatgpt_openai: "Momentum building on {symbol}. RSI approaching {level}%..."
- gemini_grid: "Grid initialized on {symbol} between ${level1} and ${level2}..."
- deepseek_ml: "ML model prediction: {symbol} likely to move {direction} {distance}%..."
- buy_and_hold: "X.com sentiment bullish on {symbol}: {value}% positive mentions..."
```

---

### 3. **Backend API Routes** (`app/api/chat/`)

#### Route 1: `/api/chat/generate` (POST/GET)

**POST - Generate new messages**
```typescript
// Called every 5 minutes from dashboard
// 1. Fetches current agent data from Aster API
// 2. Calls generateAllAgentResponses()
// 3. Stores messages in Redis (1-hour TTL, keeps 200 messages)
// 4. Returns newly generated messages

Response:
{
  success: true,
  messages: [
    {
      id: "claude_arbitrage-1698420600000",
      agentId: "claude_arbitrage",
      agentName: "Claude Arbitrage",
      timestamp: "2025-10-28T12:04:30.000Z",
      content: "Identified ETH-BTC arbitrage spread at 0.042 premium...",
      type: "trade_signal",
      confidence: 82
    },
    // ... more messages from other agents
  ],
  timestamp: "2025-10-28T12:04:30.000Z"
}
```

**GET - Retrieve message history**
```typescript
// Returns stored messages from Redis
// Query params:
//   ?agentId={agentId}  - Filter by specific agent
//   ?limit={limit}      - Max 50 messages (enforced)

Response:
{
  success: true,
  messages: [ /* array of ChatMessage */ ],
  total: 47,
  timestamp: "..."
}
```

#### Route 2: `/api/chat/messages` (GET)

**Fetch latest messages**
```typescript
// Query params:
//   ?agentId={agentId}  - Optional agent filter
//   ?limit={limit}      - Max 20 messages per request

// Returns messages sorted by timestamp (newest first)
// Useful for frontend polling
```

---

### 4. **Frontend Hooks** (`hooks/use-model-chat.ts`)

#### Hook 1: `useModelChat(options)`
```typescript
// Auto-fetches chat messages on interval
// Default: 10 second refresh rate
// Returns: { messages, isLoading, error, refresh }

const { messages } = useModelChat({ 
  agentId: "claude_arbitrage",  // Optional: filter by agent
  refreshInterval: 10000         // milliseconds
})
```

#### Hook 2: `useModelChatGeneration(interval)`
```typescript
// Triggers message generation on backend
// Default: Every 60 seconds
// Returns: { isGenerating, lastGenerated }

const { isGenerating, lastGenerated } = useModelChatGeneration(60000)
```

---

### 5. **Frontend Component** (`components/model-chat-view.tsx`)

**ModelChatView Component**
```typescript
interface Props {
  agents: Agent[]              // List of all agents with colors/logos
  messages: Record<string, ChatMessage[]>  // Messages indexed by agentId
}

Features:
- ✅ Filter by agent or view all
- ✅ Shows agent logo, name, message type
- ✅ Color-coded message types (analysis, trade_signal, etc.)
- ✅ Confidence scores
- ✅ Timestamps
- ✅ Smooth animations on new messages
- ✅ Limits display to 20 messages max
```

---

### 6. **Integration in Dashboard** (`app/dashboard/page.tsx`)

**Message Flow Timeline**:

```
1. Page loads (t=0s)
   ↓
2. Fetch initial agents from /api/aster/agents-data
   ↓
3. Initialize empty chatMessages state
   ↓
4. Trigger POST /api/chat/generate (generates all agent messages)
   ↓
5. GET /api/chat/messages to retrieve generated messages
   ↓
6. Organize messages by agentId
   ↓
7. Pass to <ModelChatView> component
   ↓
8. Every 5 minutes, repeat from step 4
```

**Dashboard Integration Code**:
```typescript
const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({})

// On page load
useEffect(() => {
  const generateChat = async () => {
    // Generate new messages
    const generateRes = await fetch("/api/chat/generate", { method: "POST" })
    
    // Fetch latest messages (max 20)
    const response = await fetch("/api/chat/messages?limit=20")
    const data = await response.json()
    
    // Organize by agent
    const messagesByAgent = {}
    data.messages.forEach((msg) => {
      if (!messagesByAgent[msg.agentId]) messagesByAgent[msg.agentId] = []
      messagesByAgent[msg.agentId].push(msg)
    })
    
    setChatMessages(messagesByAgent)
  }
  
  generateChat()  // Immediately
  const interval = setInterval(generateChat, 300000)  // Every 5 minutes
  
  return () => clearInterval(interval)
}, [])

// Render
{activeTab === "MODELCHAT" && (
  <ModelChatView
    agents={agents.map(a => ({ id: a.id, name: a.name, color: a.color, logo: a.logo }))}
    messages={chatMessages}
  />
)}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD (Frontend)                         │
│                                                                      │
│  Every 5 minutes:                                                    │
│  1. Call POST /api/chat/generate                                    │
│  2. Call GET /api/chat/messages?limit=20                            │
│  3. Update state with messagesByAgent                               │
│  4. <ModelChatView> displays messages                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓↓↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND API ROUTES                               │
│                                                                      │
│  /api/chat/generate (POST)                                          │
│  ├─ Fetch agent data from /api/aster/agents-data                   │
│  ├─ Call generateAllAgentResponses()                               │
│  ├─ Get current trading symbol from Pickaboo                       │
│  └─ Store in Redis cache                                           │
│                                                                      │
│  /api/chat/messages (GET)                                           │
│  └─ Retrieve from Redis, return max 20 messages                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓↓↓
┌─────────────────────────────────────────────────────────────────────┐
│                      CHAT ENGINE LAYER                              │
│                                                                      │
│  generateAllAgentResponses()                                        │
│  ├─ Fetch Pickaboo trading symbol                                  │
│  ├─ Generate market context (prices, trending)                     │
│  └─ Call generateAgentResponse() for each agent in parallel        │
│                                                                      │
│  generateAgentResponse(agent)                                       │
│  ├─ Try: callAgentAPI() → real LLM response                        │
│  └─ Catch: generateMockResponse() → templated response             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓↓↓
┌─────────────────────────────────────────────────────────────────────┐
│                   EXTERNAL LLM APIs                                 │
│                                                                      │
│  ✅ Claude (Anthropic)      → arbitrage analysis                   │
│  ✅ GPT-4 (OpenAI)          → momentum trading                     │
│  ✅ Gemini (Google)         → grid trading                         │
│  ✅ DeepSeek                → ML predictions                       │
│  ✅ Grok (X.ai)             → X.com sentiment + long-term          │
│                                                                      │
│  Each agent receives:                                               │
│  - Current market prices                                            │
│  - Agent's ROI and recent activity                                  │
│  - Current trading symbol from Pickaboo                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Message Structure

```typescript
interface ChatMessage {
  id: string                                    // Unique ID: {agentId}-{timestamp}
  agentId: string                               // "claude_arbitrage", "chatgpt_openai", etc.
  agentName: string                             // Display name like "Claude Arbitrage"
  timestamp: string                             // ISO format: "2025-10-28T12:04:30.000Z"
  content: string                               // Agent's reasoning (100-200 chars)
  type: "analysis" 
       | "trade_signal" 
       | "market_update" 
       | "risk_management"
  confidence?: number                           // 60-95 (percent)
}
```

---

## Environment Variables Required

```bash
# For real API integration
ANTHROPIC_API_KEY=sk-ant-...          # Claude/Arbitrage
OPENAI_API_KEY=sk-...                 # GPT-4/Momentum
GOOGLE_API_KEY=...                    # Gemini/Grid
DEEPSEEK_API_KEY=sk-...               # DeepSeek/ML
GROK_API_KEY=...                      # Grok/Buy & Hold

# Cache
REDIS_URL=redis://...                 # For storing messages

# Backend connection
ASTER_API_KEY=...                     # For fetching agent data
```

---

## How Agents Reason About Current Trading Symbol

The system automatically syncs with the **Pickaboo Dashboard**:

1. **Dashboard Selection**: User selects trading symbol in Pickaboo (e.g., ASTERUSDT)
2. **Stored in Supabase**: `getCurrentTradingSymbol("agent_1")` fetches current symbol
3. **Passed to LLM**: Chat engine passes `tradingSymbol` to each agent
4. **Agent Reasoning**: LLM receives prompt mentioning the specific token
5. **Display**: Agent messages discuss the currently selected trading pair

```typescript
// Example flow:
const tradingSymbol = await getCurrentTradingSymbol("agent_1")  // Returns "ASTERUSDT"
const response = await generateAgentResponse(agent, context, activity, tradingSymbol)
// Claude now analyzes ASTERUSDT specifically
```

---

## Real-Time Updates & Caching

- **Generation Interval**: Every 5 minutes
- **Redis TTL**: 1 hour (messages auto-expire)
- **Message History**: Keeps last 200 messages
- **Frontend Polling**: Dashboard fetches every 5 minutes
- **Display Limit**: Max 20 messages per view

---

## Response Quality & Fallback

| Scenario | Behavior |
|----------|----------|
| API key configured | Calls real LLM, waits 1-2 seconds |
| API key missing | Falls back to mock templated responses |
| API timeout | Falls back to mock responses |
| Redis unavailable | Messages stored in memory (session only) |

---

## Testing the System

### Manual Test: Trigger Message Generation
```bash
curl -X POST http://localhost:3000/api/chat/generate
```

### Manual Test: Fetch Latest Messages
```bash
curl "http://localhost:3000/api/chat/messages?limit=20"
curl "http://localhost:3000/api/chat/messages?agentId=claude_arbitrage&limit=5"
```

---

## Key Insights

1. **Agent Consistency**: Each agent always discusses the currently selected trading symbol from Pickaboo
2. **Parallel Processing**: All 5 agents generate responses simultaneously
3. **Graceful Degradation**: System works with or without real LLM APIs
4. **Message Organization**: Frontend organizes by agentId for easy filtering
5. **Color Coded**: Each agent has unique color in UI (visible in dashboard + message headers)
6. **Confidence Scoring**: Helps users understand LLM certainty levels
7. **Type Classification**: Messages categorized as analysis/signal/update/risk for visual distinction

---

## Future Enhancements

- [ ] WebSocket for real-time message streaming (instead of polling)
- [ ] Agent-to-agent discussion/debate mode
- [ ] User feedback loop to fine-tune agent prompts
- [ ] Historical reasoning archive for backtesting
- [ ] Voice synthesis for reading agent reasoning aloud
- [ ] Trading signal validation (compare predictions vs actual market moves)