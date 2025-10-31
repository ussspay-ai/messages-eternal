# 📊 Deployment Architecture Diagram

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET / WEB                              │
└─────────────────────────────────────────────────────────────────────┘
         │                          │                          │
         │                          │                          │
    ┌────▼────┐              ┌─────▼──────┐         ┌────────▼────────┐
    │  GitHub │              │   Vercel   │         │   Railway.app   │
    │ (Repo)  │              │ (Frontend) │         │   (Bots)        │
    └─────────┘              └─────┬──────┘         └────────┬────────┘
         ▲                          │                         │
         │                          │                         │
         │                   ┌──────▼─────────┐      ┌────────▼──────────┐
         │                   │  Vercel API    │      │   5 Trading       │
         │                   │  Routes        │      │   Agents          │
         │                   │                │      │  (Running)        │
         │                   │ /api/aster/*   │      │                   │
         │                   └──────┬─────────┘      │ • Claude          │
         │                          │                │ • GPT-4           │
         │                          │                │ • Gemini          │
         │                   ┌──────▼──────────┐    │ • DeepSeek        │
         │                   │  Agent          │    │ • Buy & Hold      │
         │                   │  Credentials    │    └────────┬──────────┘
         │                   │  from .env      │             │
         │                   └──────┬──────────┘    ┌────────▼──────────┐
         │                          │              │ Redis Cache       │
         │                          │              │ (Railway service) │
         │                    ┌─────▼─────────┐    └────────┬──────────┘
         │                    │               │             │
         │            ┌───────▼────────┐      │             │
         │            │  Aster DEX API │◄──┬──┴─────────────┘
         │            │ (fapi.asterdex.│  │
         │            │ com)           │  │
         │            │                │  │
         │            │ • Get trades   │  │
         │            │ • Get balance  │  │
         │            │ • Place order  │  │
         │            └───────┬────────┘  │
         │                    │           │
         │            ┌───────▼────────┐  │
         │            │  Blockchain    │  │
         │            │  (Aster Chain) │  │
         │            │  • Wallets     │  │
         │            │  • Trades      │  │
         │            │  • Balances    │  │
         │            └────────────────┘  │
         │                                 │
         │                        ┌────────▼──────────┐
         │                        │   Supabase        │
         │                        │  (PostgreSQL)     │
         │                        │                   │
         │                        │ Tables:           │
         │                        │ • agent_config    │
         │                        │ • trading_symbols │
         │                        │ • user_settings   │
         │                        └───────────────────┘
         │
    ┌────┴────────────────────────┐
    │ User pushes code via git    │
    │ GitHub auto-notifies Railway│
    │ Railway rebuilds & deploys  │
    └─────────────────────────────┘
```

---

## Data Flow: How Trading Happens

### 1️⃣ **Startup Phase** (When Railway service starts)

```
Railway Container Starts
        │
        ├─► Load Docker image
        │
        ├─► Run: npm run start:all
        │
        ├─► start-all.ts spawns 5 agent processes
        │
        └─► Each agent:
            ├─► Connect to Supabase
            │   └─► Fetch configured trading symbols
            │       (e.g., ASTERUSDT, ETHUSDT, etc.)
            │
            ├─► Connect to Aster DEX API
            │   └─► Use agent credentials (from .env)
            │
            ├─► Initialize trading strategy
            │   └─► Load initial price data
            │
            └─► Ready to trade! ✅
```

### 2️⃣ **Trading Phase** (Continuous, 24/7)

```
Each Agent runs strategy loop (e.g., every 5 seconds):

Agent Decision Loop:
    │
    ├─► Fetch current price from Aster API
    │
    ├─► Analyze market (using AI model)
    │   ├─► Claude: Run arbitrage analysis
    │   ├─► GPT-4: Detect momentum
    │   ├─► Gemini: Calculate grid points
    │   ├─► DeepSeek: Predict movement
    │   └─► Buy & Hold: Check if hold position
    │
    ├─► Decision: BUY / SELL / HOLD?
    │
    ├─► If BUY/SELL:
    │   ├─► Place order on Aster DEX
    │   ├─► Wait for confirmation
    │   └─► Record trade in Supabase (via event)
    │
    ├─► Update Redis cache with trade data
    │
    └─► Wait 5 seconds, loop again
```

### 3️⃣ **Frontend Phase** (User views dashboard)

```
User visits: https://nof1.vercel.app/dashboard

Dashboard Component:
    │
    ├─► Call: /api/aster/trades?agentId=claude
    │   │
    │   └─► Vercel API Route:
    │       ├─► Check Redis cache
    │       │   └─► If cached: return immediately ⚡
    │       │
    │       └─► If not cached:
    │           ├─► Get agent credentials from .env
    │           ├─► Connect to Aster API
    │           ├─► Query: "Get trades for this agent"
    │           ├─► Cache in Redis (TTL: 10 seconds)
    │           └─► Return to frontend
    │
    ├─► Display in "Last 25 Trades" section
    │   ├─► Symbol
    │   ├─► Buy/Sell
    │   ├─► Price
    │   ├─► Quantity
    │   └─► Realized P&L
    │
    └─► Repeat every 5 seconds (auto-refresh)
```

---

## Environment Variable Flow

```
                    .env.production (template)
                            │
                            ├─ Copy all values
                            │
                            ▼
                    Railway Dashboard
                    (Variables tab)
                            │
    ┌───────────┬───────────┬────────────┬──────────┐
    │           │           │            │          │
    ▼           ▼           ▼            ▼          ▼
Railway       Bot         Supabase    Aster      Redis
Env           Agent      Credentials  API        URL
Vars          Login      Keys         Keys

    │           │           │            │          │
    ├─────┬─────┴─────┬─────┴────────┬───┴──────────┤
    │     │           │              │              │
    ▼     ▼           ▼              ▼              ▼
  Bot    Supabase   Aster API    Cache         Connection
 Starts  Connects  Authenticates  Layer         Active
```

---

## Technology Stack

### Backend/Bots (Railway)
```
Runtime Environment:
├─ Node.js 20 (Alpine Linux)
├─ TypeScript 5
└─ ts-node (TS execution)

Core Libraries:
├─ ethers.js 6 (Blockchain interaction)
├─ dotenv (Env vars)
└─ child_process (Multi-agent spawning)

AI Models (via external APIs):
├─ Claude (Anthropic)
├─ GPT-4 (OpenAI)
├─ Gemini (Google)
├─ DeepSeek (DeepSeek)
└─ Buy & Hold (No API, algorithmic)
```

### Frontend (Vercel)
```
Framework:
├─ Next.js 14 (React framework)
├─ React 18 (UI components)
└─ TypeScript

Libraries:
├─ Supabase JS client (Database)
├─ Recharts (Charts)
├─ shadcn/ui (UI components)
└─ TailwindCSS (Styling)

Deployment:
└─ Vercel Edge Functions (API routes)
```

### Infrastructure
```
Databases:
├─ Supabase (PostgreSQL + Auth)
│  └─ Tables: agents, trades, config, etc.
│
Cache Layer:
├─ Redis (Railway service)
│  └─ TTLs: 10s (trades), 1h (symbols)
│
Blockchain:
├─ Aster DEX API
│  ├─ Futures trading
│  ├─ Multi-symbol
│  └─ USDT-based pairs
│
Version Control:
└─ GitHub (source code)
   └─ Auto-deploy to Railway on push
```

---

## Request/Response Flow: Get Trades

```
User clicks "Dashboard" → Refresh trades

Frontend Component (React):
    │
    ├─► useEffect(() => {
    │       fetch('/api/aster/trades?agentId=claude&limit=25')
    │   })
    │
    └─► Returns Promise

    │
    ▼

API Route: /api/aster/trades (Vercel)
    │
    ├─► Parse query params:
    │   ├─ agentId: "claude"
    │   └─ limit: 25
    │
    ├─► Call: getAgentCredentials("claude")
    │   └─► Returns API keys from .env
    │
    ├─► Create AsterClient with credentials
    │
    ├─► Fetch trading symbols:
    │   ├─► Check Redis cache
    │   └─► If miss: Query Supabase agent_trading_symbols
    │
    ├─► For each symbol (e.g., ASTERUSDT, ETHUSDT):
    │   ├─► Call: client.getTrades(symbol, 50)
    │   ├─► Query Aster API
    │   └─► Aggregate results
    │
    ├─► Sort trades by timestamp (newest first)
    │
    ├─► Cache in Redis (TTL: 10s)
    │
    └─► Return: [Trade[], Trade[], ...]

    │
    ▼

Frontend receives data:

[
  {
    symbol: "ASTERUSDT",
    side: "BUY",
    price: 0.15234,
    quantity: 100,
    time: 1704067200,
    realizedPnL: 0.5234
  },
  ...
]

    │
    ▼

Component renders:

Last 25 Trades Table:
┌────────┬─────┬───────┬──────────┬─────────┐
│ Symbol │ Buy │ Price │ Qty      │ P&L     │
├────────┼─────┼───────┼──────────┼─────────┤
│ASTERUS │ BUY │ 0.152 │ 100      │ +0.52   │
│ETHUSDT │SELL │15.23  │ 0.5      │ -0.23   │
└────────┴─────┴───────┴──────────┴─────────┘
```

---

## Deployment Sequence

```
Day 0 - Preparation:
├─ [ ] Fund agent wallets
└─ [ ] Verify environment variables

Day 1 - Deployment:
├─ git push origin main
│  │
│  └─► GitHub detects change
│      │
│      └─► Webhook → Railway
│          │
│          ├─► Pull latest code
│          │
│          ├─► Build Docker image
│          │   ├─ npm install
│          │   ├─ Copy source
│          │   └─ Create image (~2-3 min)
│          │
│          ├─► Start container
│          │   │
│          │   ├─► Load env vars from Railway dashboard
│          │   │
│          │   ├─► Run: npm run start:all
│          │   │
│          │   └─► Spawn 5 agent processes
│          │
│          └─► Logs show: "All agents running" ✅

Day 1+ - Operation:
├─► Bots run 24/7
│   └─► Execute trades automatically
│
├─► Frontend queries /api/aster/trades
│   └─► Shows live data on dashboard
│
└─► If bot crashes:
    └─► Auto-restart with backoff (5s, 10s, 20s, etc.)
```

---

## Error Handling & Recovery

```
Agent Process:

Normal Flow:
    Trading Loop
        ↓
    Trade placed
        ↓
    Sleep 5s
        ↓
    Repeat

Error Flow:
    Error occurs
        ↓
    Log error to console + file
        ↓
    Continue or crash?
        │
        ├─► Minor error (rate limit)
        │   └─► Backoff & retry
        │
        └─► Fatal error (credentials invalid)
            └─► Process exits with code 1

Exit Handler:
    Process exits
        ↓
    start-all-production.ts detects
        ↓
    Increment crash counter
        ↓
    Calculate backoff: 5s * 2^(crashes-1)
        ↓
    Wait & restart
        ↓
    Back to normal if successful
```

---

## Monitoring & Observability

```
                    Railway Logs
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    ▼                    ▼                    ▼
stdout               stderr              Process Events
(Info, Success)      (Errors)            (Crashes, Exits)

    │                    │                    │
    │                    │                    │
    ├─► [Agent 1]        ├─► ERROR:           ├─► Exited: code 0
    │   BUY 100 ASTER    │   Failed order     │   (Normal)
    │                    │                    │
    ├─► [Agent 2]        ├─► Warning:         ├─► Exited: code 1
    │   Current price    │   Rate limited     │   (Restart)
    │   $0.15234         │                    │
    │                    │                    │
    └─► All agents       └─► Debug:           └─► Every 5 min:
        running              Connection init      Health check


        Local Development:
        ├─► View in terminal real-time
        └─► Logs persist: trading-bots/bots.log

        Production (Railway):
        ├─► View in Railway Dashboard → Logs
        ├─► Stream: railway logs -f
        ├─► Search logs in dashboard
        └─► Set up Sentry/Datadog alerts (optional)
```

---

## Performance Considerations

```
Rate Limiting (Per Strategy):
├─ Claude: Every 30 seconds (analyze, decide, execute)
├─ GPT-4: Every 5 seconds (high-frequency momentum)
├─ Gemini: Every 10 seconds (grid management)
├─ DeepSeek: Every 60 seconds (ML prediction cycle)
└─ Buy & Hold: Every 24 hours (passive check)

Caching Strategy (Redis):
├─ Trades: 10 seconds (TTL)
├─ Symbols: 1 hour (TTL)
├─ Prices: 2 seconds (TTL)
└─ Balances: 30 seconds (TTL)

Resource Usage (Per Agent):
├─ CPU: ~5-10% (minimal, mostly waiting)
├─ Memory: ~50-100 MB
├─ Network: ~2-5 API calls/second
└─ Total (5 agents): ~30-50% CPU, 500MB RAM
```

---

## Security Model

```
Secrets & Credentials:

.env.local (Never committed)
├─ Agent private keys
├─ API keys & secrets
└─ Database auth

        │
        ├─► Never stored in GitHub
        │   (excluded by .gitignore)
        │
        └─► Local development only

Railway Encrypted Vault:

Dashboard → Variables (encrypted at rest)
├─ All credentials encrypted
├─ Only visible to project members
├─ Auto-injected at runtime
└─ Logs never show full secrets

Network:
├─ HTTPS/TLS for all APIs
├─ Redis in private Railway network
├─ Supabase via HTTPS
├─ Agent wallets: private keys never shared
└─ Public keys only in blockchain

Blockchain:
├─ Agent wallets: separate from main account
├─ Transactions: signed on-chain
├─ Balance: isolated per agent
└─ Auditable on Aster chain
```

---

## Deployment Diagram: From Code to Live

```
┌─────────────────────────────────────────────────────────┐
│  Developer Machine                                       │
│  /Users/yen/Downloads/nof1-trading-platform             │
│                                                         │
│  ├─ trading-bots/                                       │
│  │  ├─ Dockerfile          ← Production config          │
│  │  ├─ .env.local          ← Local env (not committed) │
│  │  ├─ .env.production     ← Template (reference)       │
│  │  ├─ start-all.ts        ← Local launcher             │
│  │  ├─ start-all-prod.ts   ← Production launcher        │
│  │  └─ agents/             ← 5 trading strategies       │
│  │                                                       │
│  └─ package.json           ← Updated: add prod script   │
│                                                         │
│  git add .                                              │
│  git commit -m "Deploy to Railway"                      │
│  git push origin main                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
                    GitHub Repository
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
        Commit Detected         Webhook Triggered
        (main branch)           → Railway API
                                        │
                                        ▼
                    ┌───────────────────────────────────┐
                    │  Railway Container                │
                    │                                   │
                    │  1. Pull latest code from GitHub  │
                    │  2. Read Dockerfile               │
                    │  3. npm install                   │
                    │  4. Build Docker image            │
                    │  5. Start container               │
                    │  6. npm run start:all             │
                    │  7. Spawn 5 agents                │
                    │  8. Connect to services:          │
                    │     - Redis (caching)             │
                    │     - Supabase (config)           │
                    │     - Aster API (trading)         │
                    │  9. Status: RUNNING ✅            │
                    │                                   │
                    └───────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            Redis Cache       Supabase DB       Aster DEX
            (in Railway)      (config, logs)    (trading)
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                                    ▼
                    Frontend queries /api/aster/trades
                    ├─ Vercel gets cached data
                    ├─ Falls back to Aster if needed
                    └─ Returns to React component
                                    │
                                    ▼
                    Dashboard displays:
                    ├─ Agent positions (live)
                    ├─ Recent trades (updated)
                    ├─ P&L metrics (real-time)
                    └─ All 5 agents active
```

---

## Summary

This complete architecture ensures:

✅ **24/7 Operation** - Railway runs bots continuously  
✅ **Auto-Recovery** - Crashes auto-restart with backoff  
✅ **Real-Time Data** - Frontend queries live Aster data  
✅ **Configuration** - Symbols from Supabase Pickaboo table  
✅ **Performance** - Redis caching reduces API calls  
✅ **Security** - Encrypted env vars, isolated wallets  
✅ **Scalability** - Add agents/symbols without changes  
✅ **Monitoring** - Logs in Railway dashboard  

**Ready to deploy?** Start here: `RAILWAY_DEPLOYMENT_GUIDE.md`