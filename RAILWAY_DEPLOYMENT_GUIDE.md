# 🚀 Production Deployment Guide: Trading Bots to Railway

This guide walks you through deploying the NOF1 trading bots to Railway for 24/7 operation while your Vercel frontend queries the results.

## Architecture Overview

```
┌─────────────────────┐
│   Vercel Frontend   │
│  (nof1.vercel.app)  │
└──────────┬──────────┘
           │
           │ /api/aster/trades
           ▼
┌─────────────────────┐        ┌─────────────────────┐
│   Aster DEX API     │◄───────│  Railway Bots       │
│  (fapi.asterdex)    │        │  (Persistent)       │
└─────────────────────┘        └─────────────────────┘
                                        │
                                        ├─ Redis (caching)
                                        ├─ Supabase (config)
                                        └─ Agent Wallets
```

## Step 1: Prepare GitHub Repository

### 1a. Ensure your repo is on GitHub

```bash
cd /Users/yen/Downloads/nof1-trading-platform
git remote -v  # Check if GitHub remote exists

# If not set up:
git remote add origin https://github.com/YOUR-USERNAME/nof1-trading-platform.git
git push -u origin main
```

### 1b. Verify .gitignore excludes sensitive files

```bash
# Check .gitignore contains:
cat .gitignore | grep -E ".env|*.local"
```

Should include:
```
trading-bots/.env.local
trading-bots/.env.production
.env.local
.env.production
```

---

## Step 2: Create Railway Project

### 2a. Sign up / Log in to Railway

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (easiest)
3. Authorize Railway to access your GitHub account

### 2b. Create new project

1. Click **"New Project"** → **"Deploy from GitHub repo"**
2. Search and select `nof1-trading-platform`
3. Click **Connect**

### 2c. Add services

After connecting, you need **3 services**:

#### **Service 1: Redis (for caching)**

1. Click **"+ Add service"** → **"Redis"**
2. Railway auto-provisions Redis
3. **Save the connection string** (Railway sets `$REDIS_URL` automatically)

#### **Service 2: Bot Service (the main app)**

Railway will auto-detect from the GitHub repo. Configure:

1. **Build Command:**
   ```
   cd trading-bots && npm install
   ```

2. **Start Command:**
   ```
   cd trading-bots && npm run start:all
   ```

3. **Root Directory:** (leave empty - Railway detects `trading-bots/Dockerfile`)

#### Service 3: (Optional) Monitoring/Logs

You can set up datadog or use Railway's built-in logs.

---

## Step 3: Configure Environment Variables

### 3a. Add variables in Railway Dashboard

1. Go to your project → **"Variables"** tab
2. Copy all variables from `trading-bots/.env.production`

**Critical variables to add:**

```
ASTER_USER_ADDRESS=0x7fBED03564F1E15654B774B3102Ed1fD23C75C5D
ASTER_USER_API_KEY=e33a20cf7d948b9f032d89e35ff001e0840da45e5fabd573fa8fff3322a8ff1c
ASTER_USER_SECRET_KEY=13dc0a396854aed77595974e46e7259af3843b1821f5480c0e49078c5fd52d1b

AGENT_1_SIGNER=0x9E9aF55F0D1a40c05762a94B6620A7929329B37c
AGENT_1_PRIVATE_KEY=0x6fcf956a49d3536db8fb815c37f1741e0546cc82b6974974c7bff8e116aff060
AGENT_1_API_KEY=8ccc5e2e10f1bfdc494f245109d579ac9aac23a89393e54d161127eaa620c18a
AGENT_1_API_SECRET=fa21277222c58b09ba4bed9a7fb5bdda4770f8e63edac38453bf71e53a2b93b4

[... repeat for AGENT_2 through AGENT_5 ...]

SUPABASE_URL=https://ccnvewlpjwfvptsrwhko.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

REDIS_URL=${{ Redis.REDIS_URL }}
ASTER_API_URL=https://fapi.asterdex.com
NODE_ENV=production
```

### 3b. Link Redis automatically

Railway should auto-set `$REDIS_URL`. Verify:

1. Go to **Variables**
2. Should see `${{ Redis.REDIS_URL }}` or similar
3. If not, manually add your Redis connection

---

## Step 4: Fund Production Agents

Before starting the bots, fund the agent wallets:

### Option A: Manual Transfer (Recommended)

Send USDT to each agent wallet from your main wallet:
- Agent 1: `0x9E9aF55F0D1a40c05762a94B6620A7929329B37c`
- Agent 2: `0x1983fF92113Fe00BC99e042Ad800e794275b34dB`
- Agent 3: `0x20Feb3F1b023f45967D71308F94D8a6F7Ca05004`
- Agent 4: `0x01FE403480FCef403577c2B9a480D34b05c21747`
- Agent 5: `0xe9cc6524c4d304AF4C6698164Fdc2B527983f634`

**Send at least 50 USDT to each** (configurable via `AGENT_FUNDING_AMOUNT`)

### Option B: Auto-funding via Railway

If using `fund-agents.ts`:
- Ensure `ENABLE_AGENT_FUNDING=true` in environment
- Bot will auto-fund agents on startup from `ASTER_USER_ADDRESS`

---

## Step 5: Deploy and Start Bots

### 5a. Trigger deployment

1. Go to Railway project → **Deployments**
2. Click **"Trigger Deploy"** or **"Deploy from GitHub"**
3. Wait for build to complete (~2-3 minutes)

Railway will:
- Pull latest code from GitHub
- Install dependencies
- Build Docker image
- Start the bot service

### 5b. Monitor startup

1. Click **Deployments** → Active deployment
2. View **Logs**:
   - ✅ Should see: `Starting 5 trading agents...`
   - ✅ Should see: `✓ Launched: Agent 1: Claude Arbitrage`
   - ✅ Should see: `All agents running`

3. If errors occur, check:
   - Redis connection
   - Environment variables set correctly
   - Agent wallets have USDT balance

---

## Step 6: Verify Frontend Can Access Bots

### 6a. Check frontend environment variables

Ensure your Vercel frontend has these set:

**Vercel Dashboard** → Project → Settings → Environment Variables

```
NEXT_PUBLIC_ASTER_API_URL=https://fapi.asterdex.com
SUPABASE_URL=https://ccnvewlpjwfvptsrwhko.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

### 6b. Test API endpoints

Frontend already queries:
- `/api/aster/trades` - Fetches trades (uses agent credentials from `.env.local`)
- `/api/aster/positions` - Fetches open positions
- `/api/aster/balance` - Fetches wallet balance

These **API routes run on Vercel**, not Railway. They query the Aster DEX API directly using agent credentials. The Railway bots just execute trades on Aster, which the Vercel API then reads from.

### 6c. Verify on dashboard

1. Visit `https://nof1.vercel.app/dashboard`
2. Should show:
   - ✅ Live agent positions (from Aster)
   - ✅ Recent trades (updated in real-time)
   - ✅ Performance metrics
   - ✅ Agent status (Online/Active)

---

## Step 7: Monitor and Maintain

### Monitor Logs

```bash
# Railway CLI (if installed)
railway logs -f

# Or via Dashboard:
# Project → Logs tab → Stream logs
```

**Look for:**
- Bot startup messages
- Trade execution confirmations
- Any error messages

### Handle Bot Restarts

Railway automatically restarts crashed bots. Logs show:

```
[Agent 1: Claude Arbitrage] Process error: Network timeout
[Agent 1: Claude Arbitrage] Exited with code 1
Railway restarting...
✓ Launched: Agent 1: Claude Arbitrage
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Bots stuck on startup | Check Redis connectivity, environment vars |
| No trades appearing | Verify agent wallets have USDT balance |
| `Cannot read property 'REDIS_URL'` | Redis service not linked, add it |
| `Agent not found` error | Check agent credentials in environment |
| Bots disconnect after 30min | Railway might be rate-limiting, normal behavior |

---

## Step 8: Update Tradable Symbols (Pickaboo)

To change which symbols agents trade:

1. Open Pickaboo dashboard: `http://localhost:3000/pickaboo`
2. Configure symbols for each agent
3. Data saves to Supabase `agent_trading_symbols` table
4. Restart Railway bots (they load fresh config):
   ```
   # Railway Dashboard → Settings → Restart Service
   ```

---

## Step 9: Future Updates

To update bots code:

```bash
cd /Users/yen/Downloads/nof1-trading-platform
git add .
git commit -m "Update bot strategy"
git push origin main
```

Railway auto-deploys when you push to main! (if auto-deploy is enabled)

---

## 🎯 Final Checklist

- [ ] GitHub repo connected to Railway
- [ ] Redis service added and linked
- [ ] All environment variables in Railway dashboard
- [ ] Bot service running (view in Deployments)
- [ ] Agent wallets funded with USDT
- [ ] Frontend dashboard showing live trades
- [ ] Logs streaming without errors
- [ ] At least one trade visible in recent 25 trades

---

## 📊 Expected Behavior After Deployment

**First 5 minutes:**
- Bots start and load agent configurations
- Auto-connect to Aster DEX
- Begin trading based on strategy

**Then:**
- Claude: Places arbitrage trades
- GPT-4: Waits for momentum signals
- Gemini: Opens grid positions
- DeepSeek: Analyzes and predicts
- Buy & Hold: Holds positions

**Dashboard:**
- Shows live positions for all agents
- Updates trades in real-time
- Displays P&L performance
- Agent status shows "Active"

---

## 💬 Need Help?

- Railway Docs: https://docs.railway.app
- Trading Bots Logs: Railway Dashboard → Logs
- Frontend Issues: Check Vercel dashboard → Deployments → Logs
- Aster API Docs: https://www.asterdex.com/api

---

## 🔐 Security Notes

- ✅ Never commit `.env.local` files to GitHub
- ✅ Use Railway's encrypted environment variables
- ✅ Rotate agent private keys regularly
- ✅ Monitor wallet balances for unusual activity
- ✅ Keep dependencies updated: `npm audit --fix`

Good luck with production! 🚀