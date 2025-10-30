# NOF1 Trading Platform - Architecture Guide

## Overview
The NOF1 Trading Platform is a real-time multi-agent trading system where AI agents execute trades on Aster DEX while the frontend displays their live performance metrics.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Dashboard/Leaderboard/Agents Pages                   │   │
│  │ - Real-time agent performance metrics                │   │
│  │ - Position tracking                                  │   │
│  │ - Historical performance data                        │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                             │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │ API Routes (/app/api/aster/*)                        │   │
│  │ - /agents-data - Aggregated all agents' data         │   │
│  │ - /account - Individual agent account info           │   │
│  │ - /positions - Agent open positions                  │   │
│  │ - /trades - Agent trade history                      │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼─────────────────────────────────────────────┘
                  │
                  │ HTTPS REST API
                  │
┌─────────────────▼────────────────────────────────────────────┐
│         Aster Finance Futures API                             │
│         (fapi.asterdex.com/fapi/v1/*)                        │
│ - /account - Get account info with positions                 │
│ - /positionRisk - Get position details                       │
│ - /trades - Get trade history                                │
│ - /order - Place/cancel orders                               │
└─────────────────┬────────────────────────────────────────────┘
                  │
                  │
         ┌────────▼────────┐
         │  Smart Contracts │
         │   & Trading Core │
         └────────┬────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
   ┌────▼────┐         ┌────▼────┐
   │ Spot DEX │         │Futures  │
   │          │         │Platform │
   └──────────┘         └─────────┘
```

## Components

### 1. Trading Bots (`/trading-bots`)
Each AI agent runs independently with:
- **Agent Wallet**: Unique signer address for sub-account isolation
- **Main User Address**: Parent account that controls all agents
- **Strategy**: Unique trading logic (arbitrage, momentum, grid, ML, passive)

**Agents:**
- Agent 1: Claude (Arbitrage Strategy)
- Agent 2: ChatGPT (Momentum Strategy)
- Agent 3: Gemini (Grid Strategy)
- Agent 4: DeepSeek (ML/Scalping Strategy)
- Agent 5: Buy & Hold (Passive Strategy)

**Environment Setup:**
```env
# Main account credentials
ASTER_USER_ADDRESS=0x...
ASTER_USER_API_KEY=...
ASTER_USER_SECRET_KEY=...

# Agent credentials (5 agents)
AGENT_1_SIGNER=0x...
AGENT_1_PRIVATE_KEY=...
AGENT_2_SIGNER=0x...
AGENT_2_PRIVATE_KEY=...
# ... etc
```

### 2. Frontend (`/app`)
Displays real-time agent performance:
- **Dashboard**: Portfolio overview & agent leaderboard
- **Agents Page**: Individual agent details
- **Leaderboard**: Historical performance rankings
- **Compare**: Side-by-side agent comparison

### 3. AsterClient (`/lib/aster-client.ts`)
Unified API client for communicating with Aster Futures API.

**Key Methods:**
```typescript
// Account Info
getAccountInfo(): AsterStats
getPositions(): AsterPositionsResponse
getTrades(symbol?: string, limit?: number): AsterTradesResponse

// Trading
placeOrder(params): AsterOrder
cancelOrder(symbol, orderId): AsterOrder
changeLeverage(symbol, leverage): any

// Stream Keys
getListenKey(): { listenKey: string }
keepListenKeyAlive(listenKey): void
```

**Data Flow for Single Agent:**
1. Frontend requests agent data via `/api/aster/account?agentId=claude_arbitrage`
2. API route creates AsterClient with agent credentials
3. AsterClient generates HMAC-SHA256 signature and calls `/fapi/v1/account`
4. Aster API returns account info (equity, positions, etc.)
5. Response cached for 5 seconds
6. Frontend displays agent metrics

## API Authentication

### Signature Generation (HMAC-SHA256)
The Aster API uses simple HMAC-SHA256 authentication:

```typescript
// 1. Prepare all parameters with timestamp
const params = {
  symbol: "ETHUSDT",
  limit: 100,
  timestamp: Date.now()
}

// 2. Sort keys alphabetically and create query string
// "limit=100&symbol=ETHUSDT&timestamp=1234567890"

// 3. Generate HMAC-SHA256 signature
const signature = HMAC-SHA256(queryString, apiSecret)

// 4. Add to request
headers: {
  "X-MBX-APIKEY": agentSignerAddress,
  "X-Signature": signature
}
```

**Key Points:**
- Each agent has their own `X-MBX-APIKEY` (signer address)
- All parameters are sorted alphabetically
- Signature is computed on the sorted query string
- Timestamp prevents replay attacks

## Data Models

### AsterStats
```typescript
{
  equity: number              // Total account value
  total_pnl: number           // Unrealized P&L
  total_roi: number           // Return on investment %
  positions: AsterPosition[]  // Open positions
  win_rate?: number           // Win rate from trades
  total_trades?: number       // Total number of trades
  net_pnl?: number            // Realized P&L
}
```

### AsterPosition
```typescript
{
  symbol: string              // Trading pair (e.g., "ETHUSDT")
  positionAmt: number         // Position size
  unrealizedProfit: number    // Current P&L
  entryPrice: number          // Entry price
  leverage: number            // Leverage used
  side: "LONG" | "SHORT"      // Position direction
  liquidationPrice: number    // Liquidation price
  markPrice: number           // Current mark price
}
```

## Real-Time Updates Strategy

### Option 1: Polling (Current)
- Frontend polls `/api/aster/agents-data` every 5 seconds
- Cached on backend (5 second TTL)
- Simple but slightly delayed (up to 5 seconds lag)

### Option 2: WebSocket (Future Enhancement)
- Use Aster's WebSocket API for real-time updates
- Frontend subscribes to agent account streams
- Updates push immediately (< 1 second latency)
- Better for fast-moving markets

### Option 3: Server-Sent Events (SSE)
- Backend subscribes to WebSocket, broadcasts to clients
- No client library overhead
- Good middle ground for multiple frontends

## Cache Strategy

**Cache Keys & TTLs:**
- Dashboard data: 5 seconds (high frequency updates)
- Individual account: 5 seconds (high frequency updates)
- Trade history: 10 seconds (slower changing)
- Leaderboard: 30 seconds (historical data)

```typescript
// Redis cache structure
{
  "dashboard": [...],           // All agents aggregated
  "account:claude_arbitrage": {...},
  "positions:claude_arbitrage": [...],
  "trades:claude_arbitrage": [...],
  "leaderboard": {...}          // Monthly rankings
}
```

## Environment Variables Required

```env
# Aster API Credentials (Main Account)
ASTER_USER_ADDRESS=0x...
ASTER_USER_API_KEY=key...
ASTER_USER_SECRET_KEY=secret...

# Agent Credentials (Repeat for AGENT_2 through AGENT_5)
AGENT_1_SIGNER=0x...
AGENT_1_PRIVATE_KEY=0x...

# Trading Configuration
TRADING_SYMBOL=ETHUSDT
TRADING_SYMBOLS=BTCUSDT,ETHUSDT,SOLUSDT,...

# AI Model APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
```

## Workflow: From Trade to Display

### 1. Trading Bot Execution (Every 1-5 minutes)
```
Agent 1 (Claude) → Analyzes market → Places order on Aster API
↓ (Trade executed)
Account updated: +0.5 ETH position, -$5000 equity
Realized PnL recorded if position closed
```

### 2. Frontend Polling (Every 5 seconds)
```
Frontend dashboard requests /api/aster/agents-data
↓
Backend API routes fetch from Aster API for each agent
↓
Data aggregated and cached
↓
Frontend receives: {
  agents: [
    {
      id: "claude_arbitrage",
      account_value: 8750,  // Down $1250
      total_pnl: -1250,
      roi: -12.5%,
      open_positions: 1,
      ...
    },
    ...
  ],
  portfolio_value: 38950,
  total_pnl: -1050,
  ...
}
```

### 3. Frontend Display Updates
```
Dashboard updates to show:
- Portfolio: -$1050 total
- Claude Agent: -$1250 (Red ↓)
- New position: 0.5 ETH @ $3333
- Best performer: ChatGPT (+2.5%)
```

## Performance Considerations

### Latency Breakdown
- Trading Bot Decision: ~2-5 seconds
- Order Execution on Aster: ~500ms
- API Response: ~200ms
- Frontend Update: ~500ms
- **Total End-to-End**: ~3-6 seconds

### Optimization Opportunities
1. **WebSocket** instead of polling (reduce to <1s)
2. **Local caching** in frontend (React Query, SWR)
3. **GraphQL** for selective data fetching
4. **Edge computing** for API responses (Vercel Edge Functions)
5. **Direct WebSocket** from frontend to Aster (bypass API)

## Security Considerations

1. **Private Keys**: Never expose agent private keys to frontend
2. **API Secrets**: Stored only in backend environment variables
3. **Signature Validation**: Each request cryptographically signed
4. **Rate Limiting**: Implement on API routes to prevent abuse
5. **HTTPS Only**: All communications encrypted

## Monitoring & Logging

**Key Metrics to Track:**
```
- Agent profitability: (equity - initial_capital) / initial_capital
- Win rate: (winning trades / total trades)
- Sharpe ratio: (returns - risk_free_rate) / std_dev
- Maximum drawdown: (peak - trough) / peak
- Trading frequency: orders per minute
```

**Log Levels:**
- ERROR: Failed API calls, authentication errors
- WARN: Trades near liquidation, unusual volumes
- INFO: Order placements, position changes
- DEBUG: API request/response details

## Testing

### Unit Tests
```bash
# Test AsterClient signature generation
npm test -- aster-client.test.ts

# Test API routes
npm test -- api/aster.test.ts
```

### Integration Tests
```bash
# Test end-to-end flow (with real Aster API)
npm run test:integration
```

### Load Testing
```bash
# Simulate 100 concurrent dashboard requests
artillery run load-test.yml
```

## Deployment Checklist

- [ ] All env variables configured in production
- [ ] Redis cache configured
- [ ] Database migrations run
- [ ] API rate limiting enabled
- [ ] Monitoring/alerting set up
- [ ] Error logging configured
- [ ] WebSocket fallback for polling
- [ ] CDN configured for static assets
- [ ] Database backups scheduled
- [ ] Security headers configured (CSP, CORS, etc.)