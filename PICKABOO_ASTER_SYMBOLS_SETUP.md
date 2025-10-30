# Pickaboo Agent Trading Symbols Setup (Aster DEX Integration)

## Overview

The system now automatically fetches available trading symbols from Aster DEX and allows Pickaboo admins to configure which symbols each agent trades.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Aster DEX (/fapi/v1/exchangeInfo)                           │
│ Returns all available USDT perpetual futures symbols         │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ /api/pickaboo/supported-symbols                              │
│ Fetches real symbols from Aster DEX (cached client-side)    │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Pickaboo Admin Dashboard (app/pickaboo/page.tsx)            │
│ - Lists available symbols (from Aster DEX)                  │
│ - Admin selects agent and assigns symbols                   │
│ - Saves to Supabase: agent_trading_symbols table            │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ /api/pickaboo/agent-trading-symbols?agent_id=AGENT_ID       │
│ - Fetches symbols from Supabase (if configured)             │
│ - Falls back to default symbols if not configured           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Chat Engine / Agents                                         │
│ Uses configured symbols when generating responses           │
└─────────────────────────────────────────────────────────────┘
```

## How to Use

### Step 1: Access Pickaboo Admin Dashboard
1. Navigate to `/pickaboo`
2. Connect your wallet (must be whitelisted)
3. Navigate to the **Config** tab

### Step 2: Configure Agent Trading Symbols

In the Config tab, you'll see:

**Section 1: "Update All Agents" (optional)**
- Search for a single symbol
- Click "Update All Agents" to set all agents to trade that symbol
- **Note:** This is for simple global configuration

**Section 2: "Per-Agent Trading Symbols" (recommended)**
- Select an agent from the grid
- Search and add multiple symbols (e.g., BTCUSDT, ETHUSDT, SOLUSDT)
- Remove symbols by clicking the trash icon
- Click "Save Symbols" to persist configuration

### Step 3: Verify Configuration
After saving, the system will:
1. Store symbols in Supabase `agent_trading_symbols` table
2. When agents make trades, they'll use these configured symbols
3. Chat responses will reflect the agent's configured symbols
4. Logs will show: `✅ Loaded configured symbols for [agent_id] from Pickaboo`

## Database Schema

```sql
-- Table: agent_trading_symbols
CREATE TABLE agent_trading_symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) UNIQUE NOT NULL,
  symbols TEXT[] NOT NULL,              -- Array of symbols e.g., ['BTCUSDT', 'ETHUSDT']
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(66) NOT NULL       -- Admin wallet address
);

-- Example data:
INSERT INTO agent_trading_symbols (agent_id, symbols, updated_by) VALUES
('claude_arbitrage', ARRAY['BTCUSDT', 'ETHUSDT'], '0x7fBED03564F1E15654B774B3102Ed1fD23C75C5D'),
('chatgpt_openai', ARRAY['SOLUSDT', 'BNBUSDT', 'DOGEUSDT'], '0x7fBED03564F1E15654B774B3102Ed1fD23C75C5D'),
('gemini_grid', ARRAY['ASTERUSDT', 'SANDUSDT'], '0x7fBED03564F1E15654B774B3102Ed1fD23C75C5D');
```

## API Endpoints

### 1. Get Supported Symbols from Aster DEX
```
GET /api/pickaboo/supported-symbols

Response:
{
  "success": true,
  "symbols": ["ASTERUSDT", "ETHUSDT", "BTCUSDT", ...],
  "source": "aster_dex",
  "timestamp": "2024-01-XX..."
}
```

### 2. Get Agent's Configured Symbols
```
GET /api/pickaboo/agent-trading-symbols?agent_id=claude_arbitrage

Response:
{
  "success": true,
  "agent_id": "claude_arbitrage",
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "source": "pickaboo_config",  // or "default_config" if not configured
  "timestamp": "2024-01-XX..."
}
```

### 3. Update Agent Trading Symbols
```
PUT /api/pickaboo/update-agent-symbols

Request Body:
{
  "wallet": "0x...",
  "agent_id": "claude_arbitrage",
  "symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
}

Response:
{
  "success": true,
  "message": "Agent claude_arbitrage now trading: BTCUSDT, ETHUSDT, SOLUSDT",
  "agent_id": "claude_arbitrage",
  "symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
  "primary_symbol": "BTCUSDT"
}
```

## Logging

Watch the browser console and server logs for:

```
[Pickaboo] Loaded 150 supported symbols from aster_dex
[Pickaboo] Loaded agent symbols from database: { 
  claude_arbitrage: ['BTCUSDT', 'ETHUSDT'],
  chatgpt_openai: ['SOLUSDT'],
  ... 
}
```

When agents use symbols:
```
[Chat Engine] ✅ Loaded configured symbols for claude_arbitrage from Pickaboo: BTCUSDT, ETHUSDT
```

Or if falling back to defaults:
```
[Chat Engine] 🔄 Using default symbols for claude_arbitrage: BTC, ETH
```

## Configuration Examples

### Conservative Approach
```
claude_arbitrage:  [BTCUSDT, ETHUSDT]
chatgpt_openai:    [BTCUSDT, ETHUSDT, SOLUSDT]
gemini_grid:       [ASTERUSDT]
deepseek_ml:       [BNBUSDT, DOGEUSDT]
buy_and_hold:      [ETHUSDT]
```

### Diversified Approach
```
claude_arbitrage:  [BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT]
chatgpt_openai:    [SOLUSDT, BNBUSDT, DOGEUSDT]
gemini_grid:       [ASTERUSDT, SANDUSDT, FLOKIUSDT]
deepseek_ml:       [BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, DOGEUSDT]
buy_and_hold:      [BTCUSDT, ETHUSDT]
```

### Individual Focus
```
claude_arbitrage:  [BTCUSDT]
chatgpt_openai:    [ETHUSDT]
gemini_grid:       [ASTERUSDT]
deepseek_ml:       [SOLUSDT]
buy_and_hold:      [BNBUSDT]
```

## Troubleshooting

### Issue: "Using default symbols for agent X"
**Cause:** Symbols not configured in Pickaboo, or database query failed

**Solution:**
1. Log into Pickaboo admin
2. Go to Config tab
3. Select the agent
4. Add symbols from the available list
5. Click "Save Symbols"
6. Restart the app or wait for next symbol fetch

### Issue: Symbol list is empty
**Cause:** Aster DEX API is not reachable or not configured

**Solution:**
1. Check that `ASTER_API_URL` is set in `.env.local`
2. Verify Aster DEX API endpoint: `https://fapi.asterdex.com/fapi/v1/exchangeInfo`
3. Check browser console for API errors
4. Falls back to default symbols: `['ASTERUSDT', 'ETHUSDT', 'BTCUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT']`

### Issue: Changes don't take effect immediately
**Cause:** Browser cache or client-side caching

**Solution:**
1. Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Wait ~5 seconds for Supabase to sync
3. Check server logs for confirmation: `Agent [ID] now trading: ...`

## Files Modified

1. **New:** `/app/api/pickaboo/supported-symbols/route.ts` - Fetches real symbols from Aster DEX
2. **Modified:** `/app/pickaboo/page.tsx` - Added symbol loading on mount
3. **Modified:** `/lib/chat-engine.ts` - Improved logging for symbol source

## Related Files

- **Existing UI:** `/app/pickaboo/page.tsx` (Config tab, lines ~1086-1204)
- **API Endpoint:** `/app/api/pickaboo/agent-trading-symbols/route.ts`
- **Update Endpoint:** `/app/api/pickaboo/update-agent-symbols/route.ts`
- **Database Table:** Supabase `agent_trading_symbols`
- **Aster Client:** `/lib/aster-client.ts` (getSupportedSymbols method)