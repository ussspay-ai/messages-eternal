# Deployment Workflow with Fee Calculation & Cleanup

## 🚀 Complete Deployment Steps

### Step 1: Cancel All Trades & Close Positions (MANDATORY)

Before deploying, clean up all active orders and positions:

**Option A: Local Cleanup (if you have .env.production)**
```bash
cd trading-bots
npm run cleanup
```

This will:
- ✅ Connect to all 5 agents
- ✅ Cancel all open orders for each trading symbol
- ✅ Close all open positions (LONG & SHORT)
- ✅ Add 2-second delays between agents to avoid rate limits

**Option B: Manual Cleanup via Aster Dashboard**
1. Go to Aster Exchange Dashboard
2. For each agent wallet:
   - Cancel all open orders
   - Close all positions
   - Verify account shows 0 open orders

### Step 2: Push to Main (includes fee calculation)

```bash
# From root directory
git add -A
git commit -m "feat: integrate fee calculation into aster-client and leaderboard - automatic fee enrichment for all trades"
git push origin main
```

**Files being pushed:**
- ✅ `lib/aster-client.ts` - Fee calculation engine
- ✅ `app/api/leaderboard/route.ts` - Leaderboard integration (minor update)
- ✅ `trading-bots/package.json` - Added cleanup script
- ✅ `trading-bots/railway.json` - Updated to run all agents
- ✅ `trading-bots/cleanup-all-positions.ts` - New cleanup utility
- ✅ `FEE_CALCULATION_INTEGRATION.md` - Documentation

### Step 3: Railway Auto-Deploy

Railway will automatically detect the push and:
1. Build the Docker container
2. Start all agents using `npm run start:all:prod` (now in railway.json)
3. All agents running with fee calculation enabled

**Monitor the deployment:**
- Go to Railway Dashboard
- Select trading-bots service
- Watch the "Deploy" tab for build progress
- Check "Logs" tab once running

### Step 4: Verify Deployment

Once agents are running on Railway:

```bash
# Check leaderboard shows fees
curl https://your-app.vercel.app/api/leaderboard

# Look for "fees" field in each agent's data:
{
  "agents": [
    {
      "agentId": "agent1",
      "name": "Claude Arbitrage",
      "trades": 150,
      "fees": 8.05,  # ✅ Should have fees
      ...
    }
  ]
}
```

## 📋 Data Flow with Fee Calculation

```
┌─────────────────────────────────────────┐
│  Step 1: Cleanup                        │
│  - Cancel all orders                    │
│  - Close all positions                  │
│  - Fresh start guaranteed               │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  Step 2: Push to Main                   │
│  - Includes fee calculation code        │
│  - Updates railway.json (all agents)    │
│  - Railway auto-deploys                 │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  Step 3: Agents Start                   │
│  - All 5 agents running                 │
│  - Fee calculation enabled              │
│  - Fresh trading session                │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  Step 4: Trade & Calculate Fees         │
│  - Agents execute trades                │
│  - getTrades() calculates fees          │
│  - Enriched with commission data        │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  Step 5: Leaderboard Accumulates        │
│  - Reads trade.commission               │
│  - Accumulates fees += trade.commission │
│  - Dashboard displays accurate fees     │
└─────────────────────────────────────────┘
```

## ⚙️ Configuration Updates

### railway.json (✅ Updated)
**Before:**
```json
"startCommand": "npm run start:agent5"
```

**After:**
```json
"startCommand": "npm run start:all:prod"
```

Now Railway will run all 5 agents instead of just agent5.

### package.json (✅ Updated)
**New script added:**
```json
"cleanup": "node --loader ts-node/esm cleanup-all-positions.ts"
```

## 🔍 Cleanup Script Details

**Location:** `trading-bots/cleanup-all-positions.ts`

**What it does:**
1. Connects to all 5 agents using .env.production credentials
2. For each agent:
   - Gets all open orders for each trading symbol
   - Cancels each open order
   - Closes LONG positions
   - Closes SHORT positions
3. Adds 2-second delays between agents (rate limit safety)

**Run with:**
```bash
cd trading-bots
npm run cleanup
```

## 📊 Fee Calculation Integration

All trades are automatically enriched with fees:

```typescript
// Example enriched trade from AsterClient.getTrades()
{
  symbol: "ASTERUSDT",
  orderId: "123456",
  price: "1.09530",
  qty: "77.86",
  commission: 0.02985,  // ✅ Auto-calculated
  maker: false,
  isBuyerMaker: false,
  transactTime: 1735730400000,
  ...
}
```

**Fee Rates:**
- Maker: 0.01% (0.0001)
- Taker: 0.035% (0.00035)

## ✅ Verification Checklist

Before pushing to production:
- [ ] Cleanup script runs successfully locally
- [ ] All positions closed and orders cancelled
- [ ] Git status is clean
- [ ] Changes include lib/aster-client.ts with fee calculation
- [ ] railway.json updated to `npm run start:all:prod`
- [ ] FEE_CALCULATION_INTEGRATION.md present for reference

After deployment on Railway:
- [ ] All 5 agents visible in Railway logs
- [ ] Leaderboard endpoint returns fees for all agents
- [ ] No errors in agent logs
- [ ] Trading is active and fees accumulating

## 🚨 Troubleshooting

### Cleanup script fails to connect
**Solution:** Check .env.production file in trading-bots directory has all AGENT*_* credentials

### Railway shows only 1 agent running
**Solution:** Verify railway.json has `"startCommand": "npm run start:all:prod"`

### No fees showing in leaderboard
**Solution:** 
1. Wait for agents to execute trades (fees accumulate as trades execute)
2. Verify AsterClient.getTrades() is being called
3. Check /api/leaderboard endpoint directly

### Cleanup takes too long
**Solution:** This is normal. 2-second delays between agents prevent rate limiting.

## 📝 Notes

- Cleanup is optional but **strongly recommended** for fresh restarts
- Fee calculation happens transparently - no changes needed to agent code
- All agents automatically get fee data in leaderboard
- Fee integration is backward compatible - no breaking changes

## Next Steps

1. Run cleanup locally
2. Push to main
3. Monitor Railway deployment
4. Verify fees in leaderboard
5. Enjoy accurate fee tracking! 🎉