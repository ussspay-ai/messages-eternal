# Vercel Dashboard Fix Guide

## Problem
Dashboard shows blank chart with "Failed to load prices" error on Vercel production.

**Root Causes:**
1. ❌ Missing Aster API credentials (AGENT_1_SIGNER, AGENT_1_API_KEY, etc.)
2. ❌ REDIS_URL pointing to localhost:6379 (doesn't exist on Vercel)
3. ❌ All fallback data fetches failing

## Solution

### Option A: Use Real Data (Recommended for Production)

#### Step 1: Get Aster Credentials
1. Go to https://www.asterdex.com/en/api-wallet
2. For each agent (1-5), get:
   - **Signer** (wallet address, starts with `0x`)
   - **Private Key**
   - **API Key & Secret** (for REST API)

#### Step 2: Add to Vercel Environment
Go to **Vercel Dashboard → Project → Settings → Environment Variables**

Add these for each agent:
```
AGENT_1_SIGNER=0x9E9aF55F0D1a40c05762a94B6620A7929329B37c
AGENT_1_PRIVATE_KEY=0x6fcf956a49d3536db8fb815c37f1741e0546cc82b6974974c7bff8e116aff060
AGENT_1_API_KEY=8ccc5e2e10f1bfdc494f245109d579ac9aac23a89393e54d161127eaa620c18a
AGENT_1_API_SECRET=fa21277222c58b09ba4bed9a7fb5bdda4770f8e63edac38453bf71e53a2b93b4

# ... Repeat for AGENT_2 through AGENT_5
```

Also add:
```
ASTER_USER_ADDRESS=0x[your_main_wallet_address]
NEXT_PUBLIC_USE_MOCK_DATA=false
```

#### Step 3: Redeploy
```bash
git push # Vercel auto-deploys
# or manually trigger deploy in Vercel Dashboard
```

---

### Option B: Use Mock Data (For Testing/Demo)

#### Step 1: Enable Mock Mode

In Vercel Environment Variables, set:
```
NEXT_PUBLIC_USE_MOCK_DATA=true
```

#### Step 2: Redeploy
The dashboard will now show mock agent data with:
- ✅ Bezier lines for each agent
- ✅ Agent logos at endpoints
- ✅ Mock balances & performance metrics
- ✅ Working price ticker

---

## What Changed

### Files Modified:
1. **`lib/redis-client.ts`** - Made Redis truly optional
   - Returns `null` if Redis unavailable
   - Gracefully degrades without caching
   - Won't hang on connection attempts

2. **`app/dashboard/page.tsx`** - Added mock data mode
   - `NEXT_PUBLIC_USE_MOCK_DATA=true` → Force mock data
   - Falls back to mock if real data fails

3. **`.env.production`** - Removed localhost Redis
   - `REDIS_URL` now commented out
   - Docs explain how to configure managed Redis

---

## Verification

After deploying, check:

✅ **Dashboard loads** with chart visible
✅ **Bezier lines** show for each agent
✅ **Agent logos** appear at line endpoints
✅ **Price ticker** shows (may say "Failed to load" if Binance blocked, but mock will show)
✅ **Agent pills** appear below chart

---

## Troubleshooting

### Still seeing blank chart?
1. Check Vercel logs: `vercel logs [project-name] --prod`
2. Open browser DevTools → Console tab
3. Look for specific error messages

### Common Issues:

| Issue | Fix |
|-------|-----|
| "Invalid credentials" | Verify AGENT_*_SIGNER/API_KEY set in Vercel |
| "Connection refused" | Redis URL is still misconfigured (should be empty) |
| "Failed to load prices" | Normal - Binance API may be blocked, mock prices fallback |
| Chart still blank | Set `NEXT_PUBLIC_USE_MOCK_DATA=true` to test |

---

## Environment Variables Checklist

```
✓ NEXT_PUBLIC_USE_MOCK_DATA = "true" (for testing) or "false" (for production)
✓ AGENT_1_SIGNER = 0x...
✓ AGENT_1_PRIVATE_KEY = 0x...
✓ AGENT_1_API_KEY = hex string
✓ AGENT_1_API_SECRET = hex string
✓ AGENT_2_SIGNER through AGENT_5_API_SECRET (repeat for agents 2-5)
✓ REDIS_URL = (leave EMPTY for Vercel)
✓ NODE_ENV = "production"
```

---

## Local Testing

To test locally with mock data:
```bash
# In .env.local, set:
NEXT_PUBLIC_USE_MOCK_DATA=true

# Then:
npm run dev
# Visit http://localhost:3000/dashboard
```

Chart should now load with mock agent data! 🎉