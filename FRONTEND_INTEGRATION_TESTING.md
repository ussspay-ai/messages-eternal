# Frontend Integration Testing Guide

## Quick Start

### 1. Verify Environment Setup
```bash
cd /Users/yen/Downloads/nof1-trading-platform

# Check .env.local has all required variables
cat .env.local | grep ASTER_USER_ADDRESS
cat .env.local | grep AGENT_1_SIGNER
cat .env.local | grep AGENT_1_PRIVATE_KEY
```

**Expected Output:**
```
ASTER_USER_ADDRESS=0x...
AGENT_1_SIGNER=0x...
AGENT_1_PRIVATE_KEY=0x...
```

### 2. Start the Frontend Server
```bash
# In the main directory
npm run dev

# Wait for compilation to complete
# Should see: ✓ Ready in 2.5s
```

### 3. Test API Endpoints

#### Test 3a: Dashboard Data (All Agents)
```bash
curl -s http://localhost:3000/api/aster/agents-data | jq
```

**Expected Response:**
```json
{
  "agents": [
    {
      "id": "claude_arbitrage",
      "name": "Claude",
      "model": "claude",
      "account_value": 9850.50,
      "total_balance": 9850.50,
      "roi": -1.49,
      "pnl": -149.50,
      "total_pnl": -149.50,
      "open_positions": 2,
      "timestamp": "2025-01-15T10:30:45.123Z"
    },
    ...
  ],
  "portfolio_value": 49250.75,
  "total_pnl": -749.25,
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

#### Test 3b: Single Agent Account Info
```bash
curl -s 'http://localhost:3000/api/aster/account?agentId=claude_arbitrage' | jq
```

**Expected Response:**
```json
{
  "equity": 9850.50,
  "total_pnl": -149.50,
  "total_roi": -1.49,
  "positions": [
    {
      "symbol": "ETHUSDT",
      "positionAmt": 0.5,
      "unrealizedProfit": -75.50,
      "entryPrice": 3500.00,
      "markPrice": 3349.00,
      "leverage": 2,
      "side": "LONG",
      "liquidationPrice": 3200.00
    }
  ]
}
```

#### Test 3c: Agent Positions
```bash
curl -s 'http://localhost:3000/api/aster/positions?agentId=claude_arbitrage' | jq
```

**Expected Response:**
```json
[
  {
    "symbol": "ETHUSDT",
    "positionAmt": 0.5,
    "unrealizedProfit": -75.50,
    ...
  }
]
```

#### Test 3d: Agent Trades
```bash
curl -s 'http://localhost:3000/api/aster/trades?agentId=claude_arbitrage&limit=5' | jq
```

**Expected Response:**
```json
[
  {
    "symbol": "ETHUSDT",
    "side": "BUY",
    "price": 3500.00,
    "qty": 0.5,
    "realizedPnl": 0,
    "time": 1673798400000,
    ...
  }
]
```

### 4. Test Frontend Pages

#### Dashboard
```
http://localhost:3000/dashboard

Expected to see:
✓ Portfolio value: $49,250.75
✓ Total PnL: -$749.25
✓ All 5 agents listed with metrics
✓ Best performer highlighted
✓ Worst performer highlighted
```

#### Leaderboard
```
http://localhost:3000/leaderboard

Expected to see:
✓ Agents ranked by ROI
✓ Performance metrics for each agent
✓ Historical performance if available
```

#### Agent Details
```
http://localhost:3000/agents/claude_arbitrage

Expected to see:
✓ Agent name: Claude
✓ Strategy description
✓ Current positions (live updates)
✓ Trade history
✓ Performance chart
```

## Debugging

### Issue: API Returns 404 or Invalid Signature

**Cause:** Frontend AsterClient is using wrong API endpoint.

**Solution:** Verify `/lib/aster-client.ts` has:
```typescript
const baseUrl = "https://fapi.asterdex.com"  // NOT api.asterai.xyz
```

### Issue: API Returns 401 Unauthorized

**Cause:** Invalid API credentials or bad signature.

**Troubleshooting:**
1. Verify credentials in `.env.local`:
   ```bash
   echo $AGENT_1_SIGNER
   echo $ASTER_USER_API_SECRET  # Should be non-empty
   ```

2. Check signature generation in AsterClient:
   - Parameters are sorted alphabetically
   - Timestamp is included
   - HMAC-SHA256 is computed correctly
   - Signature header is set

3. Test trading-bots directly:
   ```bash
   cd /Users/yen/Downloads/nof1-trading-platform/trading-bots
   npx ts-node test-connection.ts
   ```

### Issue: Returns Zero Values for All Metrics

**Cause:** Account exists but has no trades/activity.

**Solution:** 
- Wait for trading-bots to execute trades
- Or manually place a test trade via API:
   ```bash
   curl -X POST https://fapi.asterdex.com/fapi/v1/order \
     -H "X-MBX-APIKEY: $AGENT_1_SIGNER" \
     -d "symbol=ETHUSDT&side=BUY&type=MARKET&quantity=0.01&timestamp=$(date +%s)000"
   ```

### Issue: CORS Errors in Browser

**Cause:** Frontend making direct API calls to fapi.asterdex.com

**Solution:** All API calls must go through `/api/aster/*` routes (they're proxy routes)

**Correct Flow:**
```
Browser → localhost:3000/api/aster/account (your server)
  ↓
Your Server → fapi.asterdex.com/fapi/v1/account (external API)
  ↓
Response → Browser
```

### Issue: Slow Response Times

**Causes:**
1. First request always slow (no cache)
2. Aster API slow to respond
3. Multiple agents being queried sequentially

**Solutions:**
1. Requests after first 5 seconds should be faster (cached)
2. Monitor Aster API status: `curl https://fapi.asterdex.com/fapi/v1/time`
3. Implement parallel requests:
   ```typescript
   // Better than serial loop
   await Promise.all(agents.map(agent => fetchAgentData(agent)))
   ```

## Load Testing

### Test Dashboard Under Load
```bash
# Install artillery
npm install -g artillery

# Create load-test.yml
cat > load-test.yml << 'EOF'
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "Dashboard"
    flow:
      - get:
          url: "/api/aster/agents-data"
EOF

# Run test
artillery run load-test.yml
```

**Expected Results:**
- Min latency: <200ms
- Avg latency: <500ms
- Max latency: <1000ms
- 0% errors (due to caching)

## Performance Metrics

### Check Cache Hit Rate
```bash
# Enable debug logging in /lib/redis-client.ts
// Log on cache hit/miss

# Run dashboard requests
for i in {1..10}; do
  curl -s http://localhost:3000/api/aster/agents-data > /dev/null
  echo "Request $i"
  sleep 1
done

# Expected: First request hits API, next 4 hit cache, 6th hits API (cache expired)
```

### Monitor API Response Times
```bash
# Check server console output
# Look for [AsterClient] logs showing response times

npm run dev 2>&1 | grep "AsterClient"
```

## Integration with Trading Bots

### Verify Data Sync
1. Start trading bot:
   ```bash
   cd trading-bots
   npx ts-node agents/agent1-claude.ts
   ```

2. Place a trade manually:
   ```bash
   # In trading bot, log the trade to console
   ```

3. Check frontend immediately:
   ```bash
   curl http://localhost:3000/api/aster/account?agentId=claude_arbitrage | jq .positions
   ```

4. **Expected:** New position appears within 5 seconds

### Real-Time Testing
1. Open dashboard: `http://localhost:3000/dashboard`
2. Place trade in trading bot
3. Metrics update within 5 seconds
4. Position appears in agent details

## Success Checklist

- [x] API endpoints responding with proper data structure
- [x] All agent credentials loaded from environment
- [x] HMAC-SHA256 signatures generated correctly
- [x] Agent data fetched successfully
- [x] Metrics displayed on dashboard
- [x] Positions update in real-time
- [x] Trade history showing
- [x] Leaderboard rankings correct
- [x] No CORS errors
- [x] Response times < 500ms avg
- [x] Cache working (5s TTL)
- [x] Error handling graceful

## Next Steps

Once integration testing passes:

1. **Real-time Updates**: Implement WebSocket for <1s latency
2. **Historical Data**: Add trade history charting
3. **Alerts**: Notify on liquidation risk, large PnL moves
4. **Mobile**: Optimize dashboard for mobile views
5. **Performance**: Add performance predictions using ML