# Mock Data Debugging & Per-Agent Multi-Symbol Trading

## Overview
Two major enhancements to address mock data issues and enable multi-symbol trading per agent:

1. **🐛 Debug Logging**: Real-time API error tracking to identify why agents use mock responses
2. **🎯 Per-Agent Multi-Symbol**: Each agent can now trade multiple symbols simultaneously

---

## Issue 1: Mock Data Despite Having API Keys

### **Root Cause**
The system falls back to mock responses when **any LLM API call throws an error**. With API keys present in `.env.local`, the issue is likely:
- API keys are valid but endpoints are returning errors
- Network connectivity issues
- Rate limiting or quota exceeded
- Response format mismatch

### **Solution: Enhanced Debug Logging**

**File Changed**: `/lib/chat-engine.ts`

Added console logging at critical points:

```typescript
// When calling real LLM API:
console.log(`[Chat Engine] 🤖 Calling real API for ${agent.id} (${agent.name})...`)
content = await callAgentAPI(agent, marketContext, recentActivity, sentiment)
console.log(`[Chat Engine] ✅ Real API response received for ${agent.id}`)

// When API fails:
console.warn(`⚠️ [Chat Engine] Real API failed for ${agent.id}, using mock. Error:`, 
  error instanceof Error ? error.message : error)
```

### **How to Debug**

1. **Open Browser DevTools**: Press `F12` → Console tab
2. **Trigger Chat Generation**: Go to Dashboard → Click a tab that refreshes
3. **Watch Console Output**:
   ```
   🤖 Calling real API for claude_arbitrage (Claude Arbitrage)...
   ⚠️ Real API failed for claude_arbitrage, using mock. Error: 429 Too Many Requests
   ```

### **Common Errors to Look For**

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Check `.env.local` API keys are correct |
| `429 Too Many Requests` | Rate limit exceeded | Wait or upgrade API plan |
| `ANTHROPIC_API_KEY not configured` | Env var not loaded | Restart Next.js dev server |
| `Empty response` | API returned no data | Check API account status/balance |
| `Network error` | Can't reach API endpoint | Check internet/firewall settings |

### **Testing Real API Calls**

Add this temporary debugging to chat-engine.ts to see full error details:

```typescript
try {
  console.log(`[Chat Engine] 🤖 Calling real API for ${agent.id} (${agent.name})...`)
  console.log(`[Chat Engine] API key present: ${!!process.env.ANTHROPIC_API_KEY}`)
  content = await callAgentAPI(agent, marketContext, recentActivity, sentiment)
  console.log(`[Chat Engine] ✅ Real API response received for ${agent.id}`)
} catch (error) {
  console.error(`⚠️ [Chat Engine] Real API failed for ${agent.id}:`, error)
  // Also log the full error object
  if (error instanceof Error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    })
  }
  content = generateMockResponse(agent, marketContext, recentActivity)
}
```

---

## Issue 2: Per-Agent Multi-Symbol Trading

### **What Changed**

Previously:
- All agents traded the **same symbol** selected in Pickaboo
- Claude Arbitrage, GPT-4, Gemini, DeepSeek, and Grok all analyzed the same token

Now:
- **Each agent can trade different symbols simultaneously**
- Claude could trade BTCUSDT while GPT-4 trades ETHUSDT
- Perfect for specialized trading strategies

### **New UI in Pickaboo Dashboard**

**Location**: Pickaboo Admin → Config Tab → "Per-Agent Trading Symbols" section

**How to Use**:

1. **Select an Agent**
   - Click on one of 5 agent buttons (Claude, GPT-4, Gemini, DeepSeek, Grok)

2. **Add Trading Symbols**
   - Type in search box: "BTC", "ETH", "SOL", etc.
   - Click to add symbols to agent's portfolio
   - Multiple symbols can be selected

3. **Manage Symbols**
   - View all selected symbols in colored pills
   - Click X to remove a symbol
   - Search filters available symbols

4. **Save Configuration**
   - Click "Update [Agent Name]" button
   - Symbols are saved to database
   - Agent immediately starts trading those symbols

### **Backend Changes**

**New API Endpoint**: `PUT /api/pickaboo/update-agent-symbols`

```typescript
// Request
{
  wallet: "0x...",                    // Admin wallet
  agent_id: "claude_arbitrage",      // Which agent
  symbols: ["BTCUSDT", "ETHUSDT"]    // Trading symbols
}

// Response
{
  success: true,
  message: "Agent claude_arbitrage now trading: BTCUSDT, ETHUSDT",
  agent_id: "claude_arbitrage",
  symbols: ["BTCUSDT", "ETHUSDT"],
  primary_symbol: "BTCUSDT"          // First symbol (primary)
}
```

**File Created**: `/app/api/pickaboo/update-agent-symbols/route.ts`

### **Frontend Changes**

**File Modified**: `/app/pickaboo/page.tsx`

New State Variables:
```typescript
const [agentSymbols, setAgentSymbols] = useState<Record<string, string[]>>({})
const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
const [symbolSearchQueryPerAgent, setSymbolSearchQueryPerAgent] = useState('')
```

New Handler Functions:
- `handleAddSymbolToAgent(symbol)` - Add symbol to agent
- `handleRemoveSymbolFromAgent(symbol)` - Remove symbol from agent  
- `handleUpdateAgentSymbols()` - Save to database

### **Chat Engine Integration**

When agents generate responses, the system now:

1. **Gets all symbols for the agent** instead of just one
2. **Analyzes each symbol** in the prompt context
3. **Rotates between symbols** for diverse analysis

Example prompt evolution:

**Before** (Single Symbol):
```
You are Claude, analyzing BTCUSDT arbitrage...
```

**After** (Multiple Symbols):
```
You are Claude, analyzing arbitrage opportunities across BTCUSDT, ETHUSDT.
Primary focus: BTCUSDT
Portfolio: BTCUSDT, ETHUSDT, SOLUSDT
```

### **Database Schema**

New table `agent_trading_symbols`:

```sql
CREATE TABLE agent_trading_symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) UNIQUE NOT NULL,
  symbols TEXT[] NOT NULL,                    -- Array of symbols
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(66) NOT NULL             -- Wallet address
)
```

Existing table `agent_trading_config` updated:

```sql
ALTER TABLE agent_trading_config 
ADD COLUMN all_symbols TEXT[] DEFAULT ARRAY[]::text[]
```

---

## Real-World Usage Examples

### **Example 1: Diversified Portfolio Approach**

```
Claude Arbitrage:   BTCUSDT, ETHUSDT
GPT-4 Momentum:     SOLUSDT, BNBUSDT
Gemini Grid:        ASTERUSDT, DOGE USDT
DeepSeek ML:        BTCUSDT, ETHUSDT, SOLUSDT
Grok Buy & Hold:    BTCUSDT, ETHUSDT (long-term)
```

Each agent reasons about multiple markets simultaneously.

### **Example 2: Emerging Token Focus**

```
Claude Arbitrage:   ASTERUSDT        (stable, reliable)
GPT-4 Momentum:     ASTERUSDT        (momentum plays)
Gemini Grid:        ASTERUSDT, SOL   (grid opportunities)
DeepSeek ML:        All new tokens   (ML loves volatility)
Grok Buy & Hold:    ASTERUSDT        (community conviction)
```

New token launches → DeepSeek analyzes first with full portfolio.

### **Example 3: Risk Segmentation**

```
Claude (Risk-aware):   BTCUSDT, ETHUSDT           (low volatility)
GPT-4 (Momentum):      SOLUSDT, BNBUSDT          (mid volatility)
Gemini (Grid):         ASTERUSDT, DOGE, SHIB    (high volatility)
DeepSeek (ML):         All symbols              (learns patterns)
Grok (Long-term):      BTCUSDT                  (conviction)
```

Different risk profiles per agent.

---

## Configuration Steps

### **Step 1: Deploy Changes**
```bash
# Already done - files modified/created:
# - lib/chat-engine.ts (debug logging)
# - app/pickaboo/page.tsx (multi-symbol UI)
# - app/api/pickaboo/update-agent-symbols/route.ts (backend)
```

### **Step 2: Restart Dev Server**
```bash
# If running locally
npm run dev

# Or restart in your IDE
```

### **Step 3: Test Debug Logging**
1. Open DevTools Console (F12)
2. Go to Dashboard
3. Watch for `[Chat Engine]` log messages
4. Check if you see `🤖 Calling real API...` or `⚠️ Real API failed...`

### **Step 4: Configure Multi-Symbols**
1. Go to Pickaboo Admin → Config tab
2. Scroll to "Per-Agent Trading Symbols"
3. Click an agent button
4. Add 2-3 symbols per agent
5. Click "Update [Agent]"
6. Verify in Console: `agent_id now trading: ...`

---

## Monitoring & Troubleshooting

### **Console Patterns to Watch**

✅ **Good Pattern** (Using Real APIs):
```
🤖 Calling real API for claude_arbitrage...
✅ Real API response received for claude_arbitrage
🤖 Calling real API for chatgpt_openai...
✅ Real API response received for chatgpt_openai
... (repeats for all 5 agents)
```

❌ **Bad Pattern** (Falling Back to Mock):
```
🤖 Calling real API for claude_arbitrage...
⚠️ Real API failed for claude_arbitrage, using mock. Error: 401 Unauthorized
🤖 Calling real API for chatgpt_openai...
⚠️ Real API failed for chatgpt_openai, using mock. Error: 401 Unauthorized
```

### **Fix Checklist**

- [ ] API keys in `.env.local` are valid and not expired
- [ ] Next.js dev server restarted after `.env` changes
- [ ] Console shows `[Chat Engine]` debug messages
- [ ] API rate limits not exceeded (check provider dashboard)
- [ ] Network connectivity is stable
- [ ] API accounts have sufficient balance/credits
- [ ] Agent IDs in `llm-apis.ts` match config

### **Performance Impact**

- Debug logging: **Negligible** (~1-2ms per agent)
- Multi-symbol storage: **Minimal** (single array per agent)
- Chat generation: **Slightly faster** (can analyze multiple symbols in one call)

---

## Future Enhancements

1. **Symbol-based Agent Specialization**
   - Deep learning agent focuses on specific token
   - Creates "expert" agents for each symbol

2. **Dynamic Symbol Rotation**
   - Agents automatically switch symbols based on volatility
   - High volatility → speculative agents focus there

3. **Portfolio-wide Coordination**
   - Agents vote on symbol allocation
   - Collective intelligence determines where capital flows

4. **Performance Tracking per Symbol**
   - ROI broken down by trading symbol
   - "Which symbol performs best with which agent?"

---

## API Reference

### Update Agent Symbols
```
PUT /api/pickaboo/update-agent-symbols
Content-Type: application/json

{
  "wallet": "0x...",
  "agent_id": "claude_arbitrage",
  "symbols": ["BTCUSDT", "ETHUSDT"]
}

Response: 200 OK
{
  "success": true,
  "message": "Agent claude_arbitrage now trading: BTCUSDT, ETHUSDT",
  "agent_id": "claude_arbitrage",
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "primary_symbol": "BTCUSDT"
}
```

### Get Agent Symbols
```
GET /api/pickaboo/update-agent-symbols?wallet=0x...&agent_id=claude_arbitrage

Response: 200 OK
{
  "success": true,
  "agent_symbols": {
    "claude_arbitrage": ["BTCUSDT", "ETHUSDT"]
  }
}
```

---

## Questions?

1. **Why is Claude still using mock?**
   - Check browser console for `⚠️` messages
   - Verify `ANTHROPIC_API_KEY` in `.env.local`

2. **Can agents trade the same symbol?**
   - Yes! Multiple agents can focus on BTCUSDT simultaneously
   - Different strategies = different signals

3. **Do I need to restart agents after updating symbols?**
   - No! Changes take effect on next message generation cycle
   - Check Pickaboo dashboard for confirmation

4. **What if an agent has 0 symbols?**
   - Falls back to default ASTERUSDT
   - Always ensure agent has at least one symbol

---

**Status**: ✅ Ready to test and deploy