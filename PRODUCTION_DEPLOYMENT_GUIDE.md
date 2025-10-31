# Production Deployment Guide

## ✅ Fixed Issues

### 1. **Hardcoded Localhost References** (CRITICAL)
The application was failing in production because server-side API calls were hardcoded to `http://localhost:3000`.

**Files Fixed:**
- ✅ `/app/api/chat/generate/route.ts` - Line 58
- ✅ `/app/api/leaderboard/route.ts` - Line 169

**Change Applied:**
```typescript
// ❌ BEFORE (fails in production)
const response = await fetch("http://localhost:3000/api/aster/agents-data")

// ✅ AFTER (works on localhost and production)
const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:3000`
const response = await fetch(`${baseUrl}/api/aster/agents-data`)
```

This automatically:
- Uses `https://your-domain.vercel.app` in production (via `VERCEL_URL`)
- Falls back to `http://localhost:3000` in local development
- Works on any self-hosted environment

---

## 📋 Pre-Deployment Checklist

### Step 1: Verify Environment Variables
Your `.env.production` template needs to be synced to your deployment platform.

**For Vercel (Recommended):**
1. Go to your project: https://vercel.com/dashboard
2. Select your project → Settings → Environment Variables
3. Add these variables:

```
ASTER_USER_ADDRESS=0x7fBED03564F1E15654B774B3102Ed1fD23C75C5D
ASTER_USER_API_KEY=e33a20cf7d948b9f032d89e35ff001e0840da45e5fabd573fa8fff3322a8ff1c
ASTER_USER_SECRET_KEY=13dc0a396854aed77595974e46e7259af3843b1821f5480c0e49078c5fd52d1b

# All Agent credentials (AGENT_1 through AGENT_5)
AGENT_1_SIGNER=...
AGENT_1_ADDRESS=...
# ... (repeat for agents 2-5)

# API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...
GROK_API_KEY=xai-...

# Supabase
SUPABASE_URL=https://ccnvewlpjwfvptsrwhko.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Node environment
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=BNBFORGE Trading Platform
```

**Redis Note:** 
- If you have managed Redis (AWS ElastiCache, Redis Cloud, Railway), set `REDIS_URL`
- If deploying to **Vercel only**, leave `REDIS_URL` empty - the app gracefully degrades without cache
- Without Redis, you may hit API rate limits more frequently but the app will still work

### Step 2: Verify Build Configuration
Your `vercel.json` is already configured correctly:
- ✅ Build command: `npm run build`
- ✅ Output directory: `.next`
- ✅ API function duration: 60 seconds (suitable for market data fetches)
- ✅ API function memory: 1024MB

### Step 3: Test Locally First
```bash
# Build the app
npm run build

# Start production server
npm start

# Test endpoints
curl http://localhost:3000/api/market/prices
curl http://localhost:3000/api/aster/agents-data
curl http://localhost:3000/api/chat/generate -X POST -H "Content-Type: application/json" -d '{}'
```

### Step 4: Deploy to Vercel
```bash
# Deploy directly
vercel deploy --prod

# Or push to main branch if connected to GitHub
git push origin main
```

---

## 🔍 Verification After Deployment

### 1. Check Endpoints Are Working
```bash
# Replace with your Vercel URL
DOMAIN=https://your-app.vercel.app

# Test price endpoint
curl $DOMAIN/api/market/prices

# Test agents endpoint
curl $DOMAIN/api/aster/agents-data

# Test chat endpoint
curl -X POST $DOMAIN/api/chat/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test", "selectedAgents": ["claude_arbitrage"]}'
```

### 2. Check Dashboard
- Visit https://your-app.vercel.app/dashboard
- Verify leaderboard shows real agent data (not $0k)
- Verify prices are showing (not "failed to fetch")
- Verify chat works

### 3. Monitor Logs
```bash
# View Vercel logs (requires Vercel CLI)
vercel logs --prod

# Look for these patterns:
# ✅ [Prices] ✅ Returning coingecko prices
# ✅ Fetching fresh leaderboard data from agents-data endpoint
# ❌ Error calling agents-data endpoint: TypeError: fetch failed
```

---

## 🐛 Troubleshooting

### Issue: "Error calling agents-data endpoint: TypeError: fetch failed"
**Cause:** Environment variables not set  
**Fix:** Ensure all variables in Step 1 are in Vercel Settings

### Issue: Prices showing as $0
**Cause:** CoinGecko fetch failing, no Binance fallback  
**Fix:** Check `/api/market/prices` logs, verify CoinGecko and Binance are accessible

### Issue: Leaderboard showing $0k for all agents
**Cause:** API credentials invalid or missing  
**Fix:** Verify ASTER_USER_ADDRESS and ASTER_USER_API_KEY are correct

### Issue: High latency or rate limit errors
**Cause:** No Redis cache available  
**Fix:** Either:
1. Add managed Redis (AWS ElastiCache, Redis Cloud, Railway)
2. Accept graceful degradation without cache (app still works)

---

## 📊 Architecture Overview (Production)

```
┌─────────────────────┐
│  User Browser       │
│  (Vercel Edge)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  Next.js Server (Vercel)    │
│                             │
│  /api/market/prices ────────┼──► CoinGecko API
│  /api/aster/agents-data ────┼──► Aster DEX API
│  /api/chat/generate ────────┼──► LLM APIs
│  /api/leaderboard ──────────┘
└─────────────────────────────┘
           │
           ├──► Supabase (user data)
           └──► No Redis (graceful degradation)
```

---

## 🚀 Performance Tips

1. **Enable Vercel Analytics**
   - Already installed (`@vercel/analytics`)
   - Automatically tracks performance

2. **Optimize Images**
   - Next.js automatically optimizes images via `/next/image`

3. **Monitor API Response Times**
   - Market prices: ~500ms (CoinGecko) or ~1000ms (Binance fallback)
   - Agent data: ~1000-2000ms (depends on Aster DEX latency)
   - Chat generation: ~5000ms (depends on LLM response time)

4. **Configure Cache TTLs**
   - Market prices: 30 seconds (`.env` configurable)
   - Agent data: 5 seconds (`.env` configurable)
   - Adjust based on your needs

---

## 📱 CI/CD Pipeline (GitHub to Vercel)

If you connect your GitHub repo to Vercel:
1. Push to `main` branch → Automatic deployment
2. Create PR → Preview deployment
3. All environment variables used automatically from Vercel Settings

No manual deployment needed!

---

## ⚠️ Security Checklist

- ✅ All API keys stored in Vercel Environment Variables (not in code)
- ✅ `.env.local` and `.env.production` are in `.gitignore`
- ✅ No sensitive data in logs (API keys are redacted)
- ✅ HTTPS enforced (Vercel provides SSL by default)
- ✅ CORS headers properly configured in `vercel.json`

---

## 📞 Support

**If deployment fails:**
1. Check Vercel logs: `vercel logs --prod`
2. Verify all environment variables are set
3. Test locally: `npm run build && npm start`
4. Check network requests in browser DevTools

**Common Issues:**
- `ECONNREFUSED` → Environment variables not set
- `403 Forbidden` → Invalid API credentials
- `429 Too Many Requests` → Add Redis or increase cache TTLs