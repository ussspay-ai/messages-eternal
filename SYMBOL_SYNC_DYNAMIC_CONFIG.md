# Dynamic Trading Symbol Configuration - Complete Fix

## Problem Solved

Trading bots were **not fetching dynamically configured symbols** from the Pickaboo dashboard because:

1. Agents were querying with wrong agent IDs (numbered vs model-named)
2. Database had entries under model-based names (`claude_arbitrage`, `chatgpt_openai`, etc.)
3. This mismatch prevented symbols configured in Pickaboo from reaching the bots

## Solution: Environment-Based Dynamic Configuration

Now symbols are **fully dynamic and configurable without code changes**:

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User configures symbols in Pickaboo Dashboard                │
│    - Sets Agent 1 (Claude) → ETHUSDT, ADAUSDT                   │
│    - Sets Agent 2 (GPT-4) → BTCUSDT                             │
│    - etc.                                                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Stores in agent_trading_symbols table
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Bot starts up                                                 │
│    - Reads AGENT_1_MODEL_ID=claude_arbitrage from env            │
│    - Queries: SELECT symbols FROM agent_trading_symbols          │
│      WHERE agent_id = 'claude_arbitrage'                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Gets ['ETHUSDT', 'ADAUSDT']
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Bot trades with configured symbols                            │
│    - Uses ETHUSDT from Pickaboo dashboard                        │
│    - On next restart, reads updated config again                 │
└──────────────────────────────────────────────────────────────────┘
```

### Configuration Flow

**No hardcoding** - Configuration path (with fallbacks):

```
1. ✅ AGENT_1_MODEL_ID env var (e.g., 'claude_arbitrage')
       ↓
2. ✅ Query agent_trading_symbols table for that agent_id
       ↓
3. ✅ If not found, try legacy trading_symbols table
       ↓
4. ✅ If still not found, try TRADING_SYMBOL env var
       ↓
5. ✅ Last resort: default to 'ASTERUSDT'
```

## Environment Variables

### Agent Model IDs (in `.env.local`)

```bash
# Maps each agent to its Pickaboo dashboard identifier
# Users can change symbol configuration in dashboard - 
# bots will pick it up on next restart
AGENT_1_MODEL_ID=claude_arbitrage
AGENT_2_MODEL_ID=chatgpt_openai
AGENT_3_MODEL_ID=gemini_grid
AGENT_4_MODEL_ID=deepseek_ml
AGENT_5_MODEL_ID=buy_and_hold
```

These map to database entries:

| Model ID | Trading Agent | Configured in Pickaboo |
|----------|--------------|----------------------|
| claude_arbitrage | Agent 1 | Yes ✓ |
| chatgpt_openai | Agent 2 | Yes ✓ |
| gemini_grid | Agent 3 | Yes ✓ |
| deepseek_ml | Agent 4 | Yes ✓ |
| buy_and_hold | Agent 5 | Yes ✓ |

## How Agents Fetch Symbols

### Before (Broken)
```typescript
// agent1-claude.ts
const symbol = await getTradingSymbol("agent_1")  // ❌ Wrong ID
// Database has entry under "claude_arbitrage" - not found!
```

### After (Fixed)
```typescript
// agent1-claude.ts
const agentModelId = process.env.AGENT_1_MODEL_ID || "claude_arbitrage"
const symbol = await getTradingSymbol(agentModelId)  // ✅ Correct ID
// Database entry found → returns configured symbols
```

## Using Pickaboo Dashboard

### To Update Agent Symbols:

1. **Access Pickaboo Admin Dashboard**
   ```
   http://localhost:3000/pickaboo
   ```

2. **Click on an Agent** (e.g., "Claude Arbitrage")

3. **Update Trading Symbols**
   - Add: ETHUSDT, ADAUSDT
   - Remove: Old symbols
   - Save

4. **Symbols are stored in `agent_trading_symbols` table**
   ```sql
   SELECT * FROM agent_trading_symbols 
   WHERE agent_id = 'claude_arbitrage';
   -- Returns: ['ETHUSDT', 'ADAUSDT']
   ```

5. **Restart the bot to pick up new configuration**
   ```bash
   npm run agent1
   # or
   npm run start-all
   ```

6. **Bot logs confirmation**
   ```
   ✅ [claude_arbitrage] Fetched trading symbol from agent_trading_symbols: ETHUSDT
   ```

## Environment Variable Override

If you need to override dashboard configuration temporarily:

```bash
# Override for all agents
TRADING_SYMBOL=BTCUSDT npm run start-all

# Or set in .env.local to make it permanent
TRADING_SYMBOL=BTCUSDT
```

Priority when both are set:
1. `AGENT_*_MODEL_ID` → queries database (Pickaboo dashboard)
2. Falls back to `TRADING_SYMBOL` env var if not in database

## Database Schema

The `agent_trading_symbols` table:

```sql
SELECT * FROM agent_trading_symbols;

agent_id           | symbols                      | updated_at
-------------------|------------------------------|-------------
claude_arbitrage   | ["ASTERUSDT", "HYPEUSDT"]   | 2025-01-01
chatgpt_openai     | ["ETHUSDT", "ADAUSDT"]      | 2025-01-01
gemini_grid        | ["AAVEUSDT", "SUIUSDT"]     | 2025-01-01
deepseek_ml        | ["4USDT", "1000FLOKIUSDT"]  | 2025-01-01
buy_and_hold       | ["SOLUSDT", "BNBUSDT"]      | 2025-01-01
```

## Deployment & Restart

### To apply new symbol configuration:

```bash
# From trading-bots directory
cd trading-bots

# Restart all agents
npm run start-all

# Or restart individual agents
npm run agent1  # Claude
npm run agent2  # GPT-4
npm run agent3  # Gemini
npm run agent4  # DeepSeek
npm run agent5  # Buy & Hold
```

Logs will confirm symbols were fetched:
```
✅ [claude_arbitrage] Fetched trading symbol from agent_trading_symbols: ASTERUSDT
✅ [chatgpt_openai] Fetched trading symbol from agent_trading_symbols: ETHUSDT
✅ [gemini_grid] Fetched trading symbol from agent_trading_symbols: AAVEUSDT
✅ [deepseek_ml] Fetched trading symbol from agent_trading_symbols: 4USDT
✅ [buy_and_hold] Fetched trading symbol from agent_trading_symbols: SOLUSDT
```

## Key Features

✅ **Fully Dynamic** - Update symbols in Pickaboo anytime
✅ **No Code Changes** - Environment variables handle mapping
✅ **Backward Compatible** - Falls back to legacy tables/env vars
✅ **Easy to Debug** - Clear logging shows which source symbols came from
✅ **Per-Agent Config** - Each agent can have different symbols
✅ **Multi-Symbol Support** - Array of symbols stored, first one used

## Troubleshooting

### Symbols not updating after dashboard changes?
```bash
# Restart the bots to pick up new configuration
npm run start-all
```

### Bot using default ASTERUSDT instead of configured symbol?
```sql
-- Check database entry exists
SELECT * FROM agent_trading_symbols 
WHERE agent_id = 'claude_arbitrage';

-- If empty, update via Pickaboo dashboard or SQL:
UPDATE agent_trading_symbols 
SET symbols = '["ETHUSDT", "ADAUSDT"]'
WHERE agent_id = 'claude_arbitrage';
```

### Wrong agent_id being queried?
```bash
# Check env vars are set
cat .env.local | grep AGENT_.*_MODEL_ID

# Should show:
# AGENT_1_MODEL_ID=claude_arbitrage
# AGENT_2_MODEL_ID=chatgpt_openai
# etc.
```

### Logs show deprecated agent IDs?
```bash
# Update .env.local with new model IDs and restart
AGENT_1_MODEL_ID=claude_arbitrage
AGENT_2_MODEL_ID=chatgpt_openai
AGENT_3_MODEL_ID=gemini_grid
AGENT_4_MODEL_ID=deepseek_ml
AGENT_5_MODEL_ID=buy_and_hold
```

---

**Summary:** Symbols are now **fully configurable via Pickaboo dashboard** without any code changes. Just update the dashboard, restart bots, and they'll fetch the new configuration! 🚀