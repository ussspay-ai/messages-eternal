# Multi-Symbol Trading Implementation & Debugging Guide

## ✅ What Was Implemented

### 1. **Multi-Symbol Support** 
All 5 trading agents now support simultaneous trading across multiple symbols:
- **Agent 1 (Claude Arbitrage)**: ASTERUSDT, HYPEUSDT
- **Agent 2 (ChatGPT Momentum)**: ETHUSDT, ADAUSDT  
- **Agent 3 (Gemini Grid)**: AAVEUSDT, SUIUSDT
- **Agent 4 (DeepSeek ML)**: 4USDT, 1000FLOKIUSDT
- **Agent 5 (Buy & Hold)**: SOLANAUSDT, BNBUSDT

### 2. **Parallel Trading Strategy**
Each agent now:
- Fetches **ALL configured symbols** from the database (not just the first one)
- Creates a **separate strategy instance per symbol**
- Runs them **simultaneously** using `Promise.all()`

### 3. **New Functions**
- `getTradingSymbols()` - Returns **all symbols** for an agent (returns array)
- `getTradingSymbol()` - Returns **first symbol only** (backward compatible, returns string)

### 4. **Enhanced Debugging**
Added console logging to show:
- ✅ Symbols being traded
- 📊 Why trades are on HOLD
- 🚀 When trades are actually placed

---

## 🔍 Troubleshooting: Why Aren't Trades Showing Up on Aster DEX?

### Common Reasons Orders Aren't Placed

#### 1. **Strategy Returning HOLD** (Most Common)
The strategy runs every 15 seconds but returns `HOLD` instead of `BUY`/`SELL`:

```
[Gemini Grid Trading Agent (AAVEUSDT)] 📊 Signal: HOLD - Reason: Grid active - next update in 85s
```

**Why this happens:**
- **Grid Update Interval**: Grid strategy only updates every 2 minutes (120s)
- **Circuit Breaker**: Risk manager may have triggered stop
- **Invalid Equity**: Account has $0 balance
- **Insufficient Notional**: Order size doesn't meet $5 USDT minimum
- **Invalid Price**: Market data unavailable

**How to fix:**
1. Check account balance: `npm run verify-funding`
2. Check logs for "Insufficient equity" messages
3. Ensure account has trading capital

---

#### 2. **Account Configuration Issues**

Check that all environment variables are set correctly:

```bash
# In trading-bots/.env.local, verify these are set:
AGENT_3_SIGNER=0x...          # Agent's wallet address
AGENT_3_PRIVATE_KEY=0x...     # Agent's private key
AGENT_3_ADDRESS=0x...         # Main trading account
AGENT_3_API_KEY=...           # Aster API key
AGENT_3_API_SECRET=...        # Aster API secret
```

**Validation command:**
```bash
npm run validate-setup
```

---

#### 3. **Aster API Connection Failed**

Orders may be silently failing if the API call fails. Check logs for:

```
[AsterClient] Error: Aster API Error: ...
```

**Common Aster API errors:**
- `401 Unauthorized` - Invalid API key/secret
- `400 Bad Request` - Invalid order parameters (price, quantity, etc.)
- `429 Too Many Requests` - Rate limiting
- `Timestamp recvWindow` - Server time out of sync

**Fix**: The client automatically syncs server time. If you see timestamp errors, restart the agent.

---

#### 4. **Order Validation Failures**

Aster API has strict validation:

```
Insufficient equity for minimum notional. Current: $2.34, Required: $5.00
```

**Minimum order requirements:**
- **Notional value**: Minimum $5 USDT per order
- **Grid strategy** with 5 levels at 25% position size needs: `$5 × 5 × 2.4 = $60` total

**Equity needed:**
- Grid strategy: Minimum ~$80 USDT in account
- Arbitrage/Momentum: Minimum ~$50 USDT

---

### 🚀 How to Debug & Test

#### **1. Run a Single Agent with Verbose Logging**

```bash
cd trading-bots
npm run start:agent3
```

**Watch for these log lines:**

```
✅ [Gemini] Fetched 2 symbols from agent_trading_symbols: AAVEUSDT, SUIUSDT
   ✅ Starting strategy for AAVEUSDT
   ✅ Starting strategy for SUIUSDT
```

Then every 15 seconds:
```
[Gemini Grid Trading Agent (AAVEUSDT)] 📊 Signal: HOLD - Reason: ...
[Gemini Grid Trading Agent (SUIUSDT)] 🚀 Signal: BUY - Qty: 100, Confidence: 85%
```

#### **2. Check Account Balance**

```bash
npm run verify-funding
```

Expected output:
```
Agent 3 Account:
  Equity: $500.00
  Available: $450.00
  Positions: 2
```

If equity is $0, fund the account via the Aster DEX dashboard.

#### **3. Test a Single Market Price**

```bash
npm run test-connection
```

This verifies API connectivity and market data availability.

#### **4. Check Supabase Configuration**

Verify symbols are stored correctly:

```bash
npx supabase functions deploy  # If needed
```

Query Supabase:
```sql
SELECT agent_id, symbols FROM agent_trading_symbols WHERE agent_id = 'gemini_grid';
```

Should return:
```
agent_id       | symbols
gemini_grid    | ["AAVEUSDT", "SUIUSDT"]
```

---

## 📊 Monitoring Multi-Symbol Trading

### **Real-Time Status**

Each agent logs its status every cycle:

```
🚀 Starting Gemini Grid Trading Agent...
   Symbols: AAVEUSDT, SUIUSDT
   Trading 2 symbol(s) simultaneously

   ✅ Starting strategy for AAVEUSDT
   ✅ Starting strategy for SUIUSDT

[Gemini Grid Trading Agent (AAVEUSDT)] Starting trading loop...
[Gemini Grid Trading Agent (SUIUSDT)] Starting trading loop...

[Gemini Grid Trading Agent (AAVEUSDT)] 📊 Signal: HOLD - Reason: Grid active - next update in 85s
[Gemini Grid Trading Agent (SUIUSDT)] 📊 Signal: HOLD - Reason: Invalid equity: 0
```

### **Expected Behavior After 2 Minutes**

Grid strategy updates every 2 minutes. You should see:

```
[Gemini Grid Trading Agent (AAVEUSDT)] Grid (5x2.34%): 5 BUY + 5 SELL placed (notional: $8.50, vol: 1.2%)
[Gemini Grid Trading Agent (AAVEUSDT)] BUY Order placed: 1234567890
[Gemini Grid Trading Agent (AAVEUSDT)] SELL Order placed: 1234567891
```

---

## 🔧 Configuration Changes

### **Before (Single Symbol)**
```typescript
const symbol = await getTradingSymbol(agentModelId)
const strategy = new GeminiGridStrategy({...config, symbol})
```

### **After (Multi-Symbol)**
```typescript
const symbols = await getTradingSymbols(agentModelId)  // Returns array
const strategyPromises = symbols.map(symbol => {
  const strategy = new GeminiGridStrategy({...config, symbol})
  return strategy.run()
})
await Promise.all(strategyPromises)
```

---

## 📈 Performance Considerations

### **Resource Usage per Agent**
- Each symbol = 1 strategy instance
- Each strategy = 1 HTTP client connection
- Default poll interval: 15 seconds per symbol

### **For 5 Agents × 2 Symbols Each**
- Total running instances: 10
- API calls per minute: ~40 (market data + status checks)
- Memory per instance: ~10-15 MB
- **Total memory**: ~100-150 MB

### **Aster API Rate Limits**
- Free tier: 60 requests/minute
- Your current usage: ~40 req/min (safe)
- With 5 agents: If each has >3 symbols, may hit limits

---

## ✅ Verification Checklist

Before troubleshooting further, verify:

- [ ] Account has USDT balance (checked via `npm run verify-funding`)
- [ ] Environment variables all set (checked via `npm run validate-setup`)
- [ ] Supabase symbols configured (`agent_trading_symbols` table)
- [ ] Aster API credentials are correct (valid key/secret pairs)
- [ ] Agent signer addresses are funded on Aster
- [ ] Market prices are available (checked via `npm run test-connection`)
- [ ] Logs show "Fetched X symbols" message on startup

---

## 🆘 Still Not Working?

1. **Restart agent and capture first 30 seconds of logs:**
   ```bash
   npm run start:agent3 2>&1 | head -100
   ```

2. **Check Aster DEX dashboard directly:**
   - Log in with agent wallet
   - Verify account balance exists
   - Check if any open orders appear (manually placed)

3. **Run diagnostic:**
   ```bash
   npm run debug-startup 2>&1 | tee debug.log
   ```

4. **Share logs showing:**
   - Startup messages
   - First signal generation
   - Any error messages

---

## 📚 Related Files

- **Core Changes**: `trading-symbol-config.ts` - New `getTradingSymbols()` function
- **Agents Updated**: `agent1-5.ts` - All use new multi-symbol pattern
- **Debugging**: `base-strategy.ts` - Enhanced console logging
- **Strategies**: Unchanged - Still work with single symbol per instance
