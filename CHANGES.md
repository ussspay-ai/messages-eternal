# Trading Symbol Synchronization - Changes Overview

## 🎯 What Changed

Trading bots now read their trading symbol from the **Pickaboo dashboard** (Supabase) instead of static environment variables.

## 📋 Files Changed

### ✨ New Files
```
trading-bots/lib/trading-symbol-config.ts
```
Centralized symbol fetching with intelligent fallback logic.

### 🔄 Updated Files
```
trading-bots/agents/agent1-claude.ts
trading-bots/agents/agent2-gpt4.ts
trading-bots/agents/agent3-gemini.ts
trading-bots/agents/agent4-deepseek.ts
trading-bots/agents/agent5-bh.ts
```
All agents now fetch symbol on startup.

## 🚀 How to Use

### Start Bots (Same as Before)
```bash
npx ts-node start-all.ts
```

### Update Symbol (Via Pickaboo Dashboard)
1. Navigate to `/app/pickaboo`
2. Select new symbol
3. Click "Update Symbol"
4. Confirm signature

### Apply Changes to Bots
```bash
# Stop bots
Ctrl+C

# Restart them
npx ts-node start-all.ts
```

## 📊 Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Symbol Source | Env Var (Static) | Supabase (Dynamic) |
| Pickaboo Integration | Admin → DB Only | Admin → DB → All |
| Trading Bot Sync | Never ❌ | On Restart ✅ |
| Chat Sync | Real-time ✅ | Real-time ✅ |

## 🔍 Startup Output

**Success:**
```
✅ [agent_1] Fetched trading symbol from Pickaboo: ASTERUSDT
🚀 Starting Claude Arbitrage Agent...
```

**Fallback:**
```
✅ [agent_1] Using trading symbol from environment: ASTERUSDT
```

**Default:**
```
✅ [agent_1] Using default: ASTERUSDT
```

## ⚙️ Symbol Resolution

```
Agent Start
    ↓
Try Supabase (Pickaboo) → Found → Use it
    ↓ (Failed/Not Found)
Try Environment Variable → Found → Use it
    ↓ (Not Set)
Use Default → ASTERUSDT
```

## ✅ Key Features

- ✅ Reads from Pickaboo database
- ✅ Falls back to environment variables
- ✅ Falls back to default (ASTERUSDT)
- ✅ Clear startup logging
- ✅ Backwards compatible
- ✅ No configuration needed
- ✅ Works with or without Supabase

## 📚 Documentation

- **Full Guide:** `PICKABOO_INTEGRATION_COMPLETE.md`
- **For Setup:** See configuration below

## 🔧 Configuration

Optional (fallback chain works without it):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
TRADING_SYMBOL=ASTERUSDT  # Env fallback
```

## 🎯 Quick Workflows

### Change Symbol for All Agents
```
1. Open Pickaboo dashboard (/app/pickaboo)
2. Select new symbol (e.g., ETHUSDT)
3. Click "Update Symbol" → "All Agents"
4. Confirm signature
5. Restart bots: npx ts-node start-all.ts
```

### Check Current Symbols
```bash
curl http://localhost:3000/api/pickaboo/get-symbols
```

### Verify Bot Is Using Correct Symbol
```bash
npx ts-node agents/agent1-claude.ts 2>&1 | head -20
# Look for: ✅ [agent_1] Fetched trading symbol from Pickaboo: ASTERUSDT
```

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot uses old symbol | Restart bot |
| Symbol not updating | Check DB has new value, then restart bot |
| Chat ≠ Bot symbol | Chat is real-time, restart bot to sync |
| "Supabase not configured" | Set env vars or let it use default |

## 📝 Summary

✅ Complete synchronization achieved
✅ Trading bots read from Pickaboo
✅ Chat analysis uses same source
✅ One restart applies changes
✅ Fully backwards compatible
✅ Production ready

---

**Status:** ✅ Ready to Deploy
**Backward Compatible:** Yes
**Breaking Changes:** None
**Restart Required:** One-time to activate