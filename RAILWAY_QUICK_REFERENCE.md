# 🚀 Railway Deployment Quick Reference

## One-Page Summary

### Files Created
- ✅ `trading-bots/Dockerfile` - Production container
- ✅ `trading-bots/.env.production` - Environment template
- ✅ `trading-bots/railway.json` - Railway config
- ✅ `trading-bots/start-all-production.ts` - Auto-restart launcher
- ✅ `RAILWAY_DEPLOYMENT_GUIDE.md` - Full guide (9 sections)
- ✅ `trading-bots/PRODUCTION_CHECKLIST.md` - Deployment checklist

### 7-Step Deployment

| Step | Action | Time |
|------|--------|------|
| 1 | Push to GitHub | 5 min |
| 2 | Create Railway project | 10 min |
| 3 | Add Redis service | 5 min |
| 4 | Set environment variables | 15 min |
| 5 | Configure bot service | 5 min |
| 6 | Fund agent wallets | 5-30 min |
| 7 | Deploy | 2-5 min |

**Total: ~45 min**

---

## Environment Variables to Set

### Main Account
```
ASTER_USER_ADDRESS=0x7fBED03564F1E15654B774B3102Ed1fD23C75C5D
ASTER_USER_API_KEY=e33a20cf7d948b9f032d89e35ff001e0840da45e5fabd573fa8fff3322a8ff1c
ASTER_USER_SECRET_KEY=13dc0a396854aed77595974e46e7259af3843b1821f5480c0e49078c5fd52d1b
```

### Each Agent (repeat for 1-5)
```
AGENT_X_SIGNER=0x...
AGENT_X_PRIVATE_KEY=0x...
AGENT_X_API_KEY=...
AGENT_X_API_SECRET=...
```

### Services
```
REDIS_URL=${{ Redis.REDIS_URL }}
SUPABASE_URL=https://ccnvewlpjwfvptsrwhko.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

### Config
```
NODE_ENV=production
ASTER_API_URL=https://fapi.asterdex.com
```

Copy all from `trading-bots/.env.production`

---

## Agent Wallet Addresses (Fund These!)

```
Agent 1: 0x9E9aF55F0D1a40c05762a94B6620A7929329B37c
Agent 2: 0x1983fF92113Fe00BC99e042Ad800e794275b34dB
Agent 3: 0x20Feb3F1b023f45967D71308F94D8a6F7Ca05004
Agent 4: 0x01FE403480FCef403577c2B9a480D34b05c21747
Agent 5: 0xe9cc6524c4d304AF4C6698164Fdc2B527983f634
```

**Send 50+ USDT to each**

---

## Success Indicators

### In Railway Logs
```
✓ Launched: Agent 1: Claude Arbitrage
✓ Launched: Agent 2: GPT-4 Momentum
✓ Launched: Agent 3: Gemini Grid
✓ Launched: Agent 4: DeepSeek ML
✓ Launched: Agent 5: Buy & Hold
All agents running.
```

### In Frontend Dashboard
- Agent cards show "Active" status
- Recent trades appearing
- Performance metrics updating
- No "No trades available" error

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Cannot read property 'REDIS_URL'` | Add Redis service to Railway |
| Bots stuck on startup | Check agent wallet balance (need USDT) |
| `403 Unauthorized` | Verify agent API credentials |
| No trades showing | Check Aster API status, agent balance |
| Bots crash repeatedly | Check logs, review agent strategy for errors |

More help: `RAILWAY_DEPLOYMENT_GUIDE.md` → "Common Issues & Solutions"

---

## Key Commands

```bash
# Local test before deploying
npm run start:all

# Verify agent funding
npm run verify:funding

# View production logs (if Railway CLI installed)
railway logs -f

# Deploy latest code
git push origin main  # Railway auto-deploys
```

---

## Useful Links

| Resource | URL |
|----------|-----|
| Railway Dashboard | https://railway.app/dashboard |
| Deployment Guide | See `RAILWAY_DEPLOYMENT_GUIDE.md` |
| Checklist | See `trading-bots/PRODUCTION_CHECKLIST.md` |
| Aster API | https://www.asterdex.com/api |
| Railway Docs | https://docs.railway.app |

---

## Important Files

```
trading-bots/
  ├── Dockerfile
  ├── .env.production
  ├── railway.json
  ├── start-all-production.ts
  └── package.json

Documentation:
  ├── RAILWAY_DEPLOYMENT_GUIDE.md (read this first!)
  ├── PRODUCTION_CHECKLIST.md (use before deploy)
  └── PRODUCTION_DEPLOYMENT_SUMMARY.md (overview)
```

---

## Pre-Deployment Checklist

- [ ] GitHub repo connected to Railway
- [ ] Code pushed to GitHub
- [ ] All env vars in Railway dashboard
- [ ] Redis service running
- [ ] Agent wallets funded (50+ USDT each)
- [ ] Local test passed: `npm run start:all`
- [ ] Build succeeds in Railway
- [ ] Logs show "All agents running"
- [ ] Frontend dashboard shows trades

---

## What Happens After Deploy

✅ Bots run 24/7 on Railway  
✅ Auto-restart on crash  
✅ Frontend queries live trade data  
✅ Performance metrics update in real-time  
✅ GitHub commits auto-deploy  

---

## Emergency Restart

If bots misbehave:

1. Railway Dashboard → Services → Bot service
2. Click **"Stop"**
3. Wait 5 seconds
4. Click **"Deploy"**
5. View logs to verify restart

---

**First Time?** Read: `RAILWAY_DEPLOYMENT_GUIDE.md`  
**Double Check?** Use: `trading-bots/PRODUCTION_CHECKLIST.md`  
**Quick Help?** This file!

**Ready? Let's go! 🚀**