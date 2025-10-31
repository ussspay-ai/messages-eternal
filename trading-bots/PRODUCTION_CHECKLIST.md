# ✅ Production Deployment Checklist

Use this before deploying to Railway to ensure everything is configured correctly.

## Pre-Deployment (Local Testing)

- [ ] All dependencies installed: `npm install`
- [ ] Bots run locally: `npm run start:all`
- [ ] No errors in bot startup
- [ ] Redis is running locally: `redis-cli ping` returns PONG
- [ ] Can see "All agents running" message
- [ ] Agents executing trades (check logs)
- [ ] Trades appear in frontend dashboard

## GitHub Setup

- [ ] Repository pushed to GitHub
- [ ] `.env.local` is in `.gitignore` (never commit!)
- [ ] `.env.production` is available (can be in `.gitignore` too)
- [ ] No sensitive files in git history: `git log --all -- .env*`
- [ ] GitHub personal access token created (if needed for Railway)

## Railway Project Setup

### Basic Configuration
- [ ] Created Railway account at railway.app
- [ ] Connected GitHub repository
- [ ] Project created in Railway

### Services
- [ ] **Redis Service** added
  - [ ] Status shows "Running" ✅
  - [ ] `$REDIS_URL` available in environment
  
- [ ] **Bot Service** created
  - [ ] Root directory: `trading-bots/`
  - [ ] Build command: `npm install`
  - [ ] Start command: `npm run start:all`
  - [ ] Dockerfile detected ✅

### Environment Variables

#### Aster DEX Credentials
- [ ] `ASTER_USER_ADDRESS` set
- [ ] `ASTER_USER_API_KEY` set
- [ ] `ASTER_USER_SECRET_KEY` set (encrypted in Railway)
- [ ] `ASTER_API_URL=https://fapi.asterdex.com` set
- [ ] `BASE_URL=https://fapi.asterdex.com` set

#### Agent Credentials (5 agents)
- [ ] `AGENT_1_SIGNER` set
- [ ] `AGENT_1_ADDRESS` set
- [ ] `AGENT_1_PRIVATE_KEY` set (encrypted)
- [ ] `AGENT_1_API_KEY` set
- [ ] `AGENT_1_API_SECRET` set (encrypted)
- [ ] `AGENT_1_MODEL_ID=claude_arbitrage` set

**Repeat for AGENT_2, AGENT_3, AGENT_4, AGENT_5**

#### Database & Cache
- [ ] `SUPABASE_URL` set
- [ ] `SUPABASE_SERVICE_KEY` set (encrypted)
- [ ] `REDIS_URL=${{ Redis.REDIS_URL }}` set (auto-linked)

#### Configuration
- [ ] `NODE_ENV=production` set
- [ ] `TRADING_SYMBOL=ASTERUSDT` set (or custom)
- [ ] `AGENT_FUNDING_AMOUNT=50` set
- [ ] `ENABLE_AGENT_FUNDING=true` set

### Domain & Networking
- [ ] Railway URL assigned (optional, not needed for backend service)
- [ ] Redis service linked to Bot service

## Wallet & Funding

- [ ] Main wallet has USDT balance
- [ ] All 5 agent wallets identified:
  - [ ] Agent 1: `0x9E9aF55F0D1a40c05762a94B6620A7929329B37c`
  - [ ] Agent 2: `0x1983fF92113Fe00BC99e042Ad800e794275b34dB`
  - [ ] Agent 3: `0x20Feb3F1b023f45967D71308F94D8a6F7Ca05004`
  - [ ] Agent 4: `0x01FE403480FCef403577c2B9a480D34b05c21747`
  - [ ] Agent 5: `0xe9cc6524c4d304AF4C6698164Fdc2B527983f634`

- [ ] Each agent wallet has minimum 50 USDT
  - Option A: Manual transfer from your main wallet
  - Option B: Bot auto-funds on startup (if `ENABLE_AGENT_FUNDING=true`)

## Deployment

- [ ] Code pushed to GitHub
- [ ] Railway detects new commits
- [ ] Build starts automatically
- [ ] Build completes without errors (check build logs)
- [ ] Deployment starts
- [ ] Service status shows "Running" ✅

## Post-Deployment Verification

### Logs
- [ ] No deployment errors in Railway logs
- [ ] See "Starting 5 trading agents..."
- [ ] See "✓ Launched: Agent 1: Claude Arbitrage"
- [ ] See "✓ Launched: Agent 2: GPT-4 Momentum"
- [ ] See "✓ Launched: Agent 3: Gemini Grid"
- [ ] See "✓ Launched: Agent 4: DeepSeek ML"
- [ ] See "✓ Launched: Agent 5: Buy & Hold"
- [ ] See "All agents running"

### Trading Activity
- [ ] At least one agent shows trade execution
- [ ] Logs show successful Aster API calls
- [ ] No `403 Unauthorized` errors (check credentials)
- [ ] No `Insufficient balance` errors (check funding)

### Frontend Integration
- [ ] Vercel frontend is deployed
- [ ] Frontend environment variables set:
  - [ ] `NEXT_PUBLIC_ASTER_API_URL=https://fapi.asterdex.com`
  - [ ] `SUPABASE_URL` matches Supabase project
  - [ ] `SUPABASE_ANON_KEY` set

- [ ] Visit dashboard: `https://nof1.vercel.app/dashboard`
- [ ] Dashboard shows:
  - [ ] Agent cards with status (Active/Online)
  - [ ] Live positions from Aster
  - [ ] Recent trades appearing
  - [ ] Performance metrics updating
  - [ ] No "No trades available" message

## Monitoring

- [ ] Set up log streaming: `railway logs -f`
- [ ] Monitor for 5-10 minutes
- [ ] Check for:
  - [ ] Regular trade execution messages
  - [ ] No repeated errors
  - [ ] Agents running smoothly
  - [ ] Redis connections working

- [ ] Configure alerts (optional):
  - [ ] Slack webhook for errors
  - [ ] Email notification if service stops

## Maintenance

- [ ] Document deployment date
- [ ] Note bot start time and initial status
- [ ] Record wallet addresses for reference
- [ ] Create backup of environment variables (secure location)
- [ ] Plan regular updates (at least monthly)

## Troubleshooting

### If bots don't start:
- [ ] Check Redis service is running in Railway
- [ ] Verify all environment variables are set
- [ ] Check agent wallet balances (need USDT)
- [ ] Review Railway logs for errors

### If trades aren't showing on frontend:
- [ ] Verify agent credentials are correct
- [ ] Check Aster API is accessible: `curl https://fapi.asterdex.com/status`
- [ ] Verify frontend API route is working: `curl https://nof1.vercel.app/api/aster/trades?agentId=claude_arbitrage`
- [ ] Check Supabase connection

### If bots keep crashing:
- [ ] Increase memory allocation in Railway settings
- [ ] Check for Redis connection issues
- [ ] Review agent strategy logs for logic errors
- [ ] Verify Aster API rate limits not exceeded

## Rollback Plan

If something goes wrong:

1. Stop the deployment: Railway Dashboard → Stop Service
2. Review logs: `railway logs`
3. Fix the issue locally: `npm run start:all`
4. Commit and push: `git push origin main`
5. Railway redeploys automatically

---

## 📞 Support Resources

- **Railway Docs**: https://docs.railway.app
- **Aster API Docs**: https://www.asterdex.com/api
- **Supabase Docs**: https://supabase.com/docs
- **Trading Bot Logs**: Railway Dashboard → Logs tab

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Status**: ✅ Production Live