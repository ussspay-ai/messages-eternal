# 🚀 Getting Started: Pickaboo Agent Funding System

## What Just Got Added?

Complete **agent funding management system** with:
- ✅ CLI tool to fund & verify agents (`npm run fund:agents`, `npm run verify:funding`)
- ✅ Web admin dashboard at `/pickaboo`
- ✅ Database tables for audit trail & configuration
- ✅ API endpoints for automation
- ✅ Dry-run mode for safe testing

---

## 📋 Quick Action Plan (5 Minutes)

### 1️⃣ Database Setup (1 minute)

Choose one:

**Option A: Using Supabase CLI** (Recommended)
```bash
supabase login
supabase db push
```

**Option B: Manual SQL**
1. Go to: https://supabase.com → your project
2. SQL Editor tab
3. Open file: `supabase-migrations-funding.sql`
4. Copy all SQL code
5. Paste in Supabase SQL editor
6. Click "Run"

✅ Done! Tables created.

### 2️⃣ Test with Dry-Run (1 minute)

```bash
cd trading-bots
npm run fund:agents -- --amount 50 --dry-run
```

Expected output:
```
✅ Claude Arbitrage        | $50 USDT        | TX: 0xdry_...
✅ GPT-4 Momentum         | $50 USDT        | TX: 0xdry_...
... (all 5 agents)
```

✅ No funds sent, just testing!

### 3️⃣ Fund Agents Live (1 minute)

```bash
npm run fund:agents -- --amount 50
```

Expected output:
```
✅ Successful: 5/5
❌ Failed: 0/5
💼 Total Funded: $250 USDT
```

✅ Agents now have $50 USDT each!

### 4️⃣ Verify Success (1 minute)

```bash
npm run verify:funding
```

Expected output:
```
✅ Funded (≥ $50): 5/5
⚠️  Underfunded (< $50): 0/5
💼 Total Balance Across Agents: $250 USDT
```

✅ All agents funded and verified!

### 5️⃣ Start Trading (1 minute)

```bash
npm run start:all
```

✅ Agents are now trading ASTERUSDT!

---

## 🌐 Access Web Dashboard (Optional)

Want a GUI instead of CLI?

1. Start dev server (from root directory):
   ```bash
   npm run dev
   ```

2. Go to: `http://localhost:3000/pickaboo`

3. Login with password: `admin123`

4. Use tabs to:
   - 💰 Fund agents
   - 💳 Check balances
   - ⚙️ Change trading symbol
   - 📊 View funding history & export

---

## 📁 What Files Were Created

### Scripts (for CLI)
- `trading-bots/fund-agents.ts` - Fund agents
- `trading-bots/verify-funding.ts` - Check balances
- `trading-bots/lib/funding-config.ts` - Configuration

### Web Dashboard
- `app/pickaboo/page.tsx` - Full admin UI

### API Endpoints
- `app/api/pickaboo/fund-agents/route.ts` - Fund via API
- `app/api/pickaboo/verify-balances/route.ts` - Check balances
- `app/api/pickaboo/update-symbol/route.ts` - Change symbols
- `app/api/pickaboo/funding-history/route.ts` - View history

### Database
- `supabase-migrations-funding.sql` - Create tables

### Documentation
- `AGENT_FUNDING_SETUP.md` - Setup guide
- `PICKABOO_ADMIN_GUIDE.md` - Complete documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical details

### Configuration
- Updated `.env.example` files
- Updated `.env.local` files
- Updated `trading-bots/package.json`

---

## 💰 Command Reference

```bash
# Fund agents (TEST first with dry-run)
npm run fund:agents -- --amount 50 --dry-run    # Test
npm run fund:agents -- --amount 50              # Real

# Check balances
npm run verify:funding

# Start all agents
npm run start:all

# Check specific agent
npm run start:agent1  # Just agent 1

# Monitor dashboard
# http://localhost:3000/dashboard
```

---

## 🔐 Security Notes

### Change Admin Password!

Current: `admin123` (for development)

For production:
```bash
# 1. Edit .env.local
PICKABOO_ADMIN_PASSWORD=your-super-strong-password

# 2. Restart server
npm run dev

# 3. Use new password to login at /pickaboo
```

---

## ❓ Common Questions

### Q: Where do I fund agents?
**A:** CLI: `npm run fund:agents`  
Or web: `http://localhost:3000/pickaboo`

### Q: What's the minimum funding amount?
**A:** $50 USDT minimum, $1M maximum per agent

### Q: Can I change from ASTERUSDT to ETHUSDT?
**A:** Yes! Go to Pickaboo dashboard → Configuration tab → change symbol

### Q: What if funding fails?
**A:** Automatic retry 3 times. Check console for errors.

### Q: How do I see funding history?
**A:** Pickaboo dashboard → History tab → Export as CSV

### Q: Is dry-run mode safe?
**A:** Yes! 100% safe. No funds are actually transferred.

---

## 🧪 Test Scenarios

### Scenario 1: Quick Test (2 minutes)
```bash
# 1. Test without sending funds
npm run fund:agents -- --amount 50 --dry-run

# 2. Check output
# Should see 5 successful simulated transfers
```

### Scenario 2: Fund & Verify (3 minutes)
```bash
# 1. Fund with real funds
npm run fund:agents -- --amount 50

# 2. Check balances
npm run verify:funding

# 3. Verify each agent has ~$50 USDT
```

### Scenario 3: Change Trading Symbol (2 minutes)
```bash
# 1. Go to web dashboard
http://localhost:3000/pickaboo

# 2. Login with: admin123

# 3. Go to Configuration tab

# 4. Change symbol to ETHUSDT

# 5. Click Update

# 6. Agents now trade ETHUSDT instead of ASTERUSDT
```

### Scenario 4: Monitor Agents (Ongoing)
```bash
# Terminal 1: Start agents
npm run start:all

# Terminal 2: Monitor (every 30 seconds)
npm run verify:funding

# Browser: View dashboard
http://localhost:3000/dashboard
```

---

## 🛠️ Troubleshooting

### Issue: "npm run fund:agents not found"
**Fix:**
```bash
cd trading-bots
npm run fund:agents -- --amount 50
```

### Issue: "Invalid password" on /pickaboo
**Fix:** Check PICKABOO_ADMIN_PASSWORD in .env.local

### Issue: "Supabase not configured"
**Fix:** Run migration: `supabase db push`

### Issue: Agents show $0 balance after funding
**Fix:** Wait 15 seconds, then run `npm run verify:funding` again

---

## 📚 Detailed Documentation

For more info, read:
- **AGENT_FUNDING_SETUP.md** - Step-by-step setup
- **PICKABOO_ADMIN_GUIDE.md** - Full feature documentation
- **IMPLEMENTATION_SUMMARY.md** - Technical overview

---

## ✅ Your Next Steps

Right now:
1. Run: `npm run fund:agents -- --amount 50 --dry-run` (test)
2. Run: `npm run fund:agents -- --amount 50` (real)
3. Run: `npm run verify:funding` (verify)
4. Run: `npm run start:all` (trade!)

Then:
5. Visit: `http://localhost:3000/pickaboo` (web dashboard)
6. Visit: `http://localhost:3000/dashboard` (trading dashboard)
7. Visit: `http://localhost:3000/leaderboard` (agent leaderboard)

---

## 🎯 Success Criteria

You're all set when:
- [x] Database migration ran successfully
- [x] Fund agents dry-run completed
- [x] Fund agents live completed
- [x] Verify funding shows all agents funded
- [x] Agents started with `npm run start:all`
- [x] Web dashboard accessible at `/pickaboo`
- [x] Admin password changed from default

---

## 💬 Need Help?

1. Check AGENT_FUNDING_SETUP.md
2. Check PICKABOO_ADMIN_GUIDE.md
3. Look at console output for error messages
4. Check Supabase dashboard for query errors

---

**Status: Ready to Fund! 🚀**

You're all set. Go forth and fund those agents!