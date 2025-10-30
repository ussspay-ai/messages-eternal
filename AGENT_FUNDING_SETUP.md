# 🚀 Agent Funding Setup Guide

Quick guide to fund your agents and get them trading!

## 3-Minute Setup

### Step 1: Add Pickaboo Password to .env.local

```bash
# .env.local (root directory)
PICKABOO_ADMIN_PASSWORD=your-secure-password
```

### Step 2: Run Database Migration

```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Manual setup
# 1. Go to https://supabase.com → your project
# 2. SQL Editor
# 3. Copy contents from supabase-migrations-funding.sql
# 4. Paste and run
```

### Step 3: Test Funding (Dry-Run)

```bash
cd trading-bots
npm run fund:agents -- --amount 50 --dry-run
```

Expected output:
```
✅ Successfully funded 5 agents (simulated)
```

### Step 4: Fund Agents (Live)

```bash
npm run fund:agents -- --amount 50
```

Expected output:
```
✅ Claude Arbitrage        | $50 USDT        | TX: 0x...
✅ GPT-4 Momentum         | $50 USDT        | TX: 0x...
✅ Gemini Grid            | $50 USDT        | TX: 0x...
✅ DeepSeek ML            | $50 USDT        | TX: 0x...
✅ Buy & Hold             | $50 USDT        | TX: 0x...
```

### Step 5: Verify Funding

```bash
npm run verify:funding
```

Expected output:
```
✅ Funded (≥ $50): 5/5
⚠️  Underfunded (< $50): 0/5
💼 Total Balance: $250 USDT
```

### Step 6: Start Agents

```bash
npm run start:all
```

Agents are now trading! 🎯

---

## Web Dashboard (Optional)

Prefer GUI? Use Pickaboo Admin:

1. Start dev server: `npm run dev` (from root)
2. Go to: `http://localhost:3000/pickaboo`
3. Login with your `PICKABOO_ADMIN_PASSWORD`
4. Use the tabs to manage funding

**Features:**
- 💰 Fund agents from UI
- 💳 Check balances in real-time
- ⚙️ Change trading symbols
- 📊 View funding history
- 📥 Export history as CSV

---

## Command Reference

### Funding

```bash
# Quick fund ($50 USDT)
npm run fund:agents

# Custom amount
npm run fund:agents -- --amount 100

# Test first (dry-run)
npm run fund:agents -- --amount 100 --dry-run

# Test then live
npm run fund:agents -- --amount 100 --dry-run
npm run fund:agents -- --amount 100
```

### Verification

```bash
# Check current balances
npm run verify:funding

# Auto-fund if underfunded
npm run verify:funding && npm run fund:agents -- --amount 100
```

### Configuration

```bash
# Via Pickaboo web dashboard
http://localhost:3000/pickaboo

# Change symbol in Configuration tab
# Current: ASTERUSDT
# New: ETHUSDT, BTCUSDT, etc.
```

---

## What Happens Behind the Scenes

### Fund Agents Process

1. **Validation**: Check amount ($50-$1M)
2. **Fetch USDT Address**: Get from Aster DEX
3. **For Each Agent**: (5 total)
   - Transfer $X USDT to agent wallet
   - Retry up to 3 times if fails
   - Log to database
   - Show result to user
4. **Summary**: Print success/failure

### Dry-Run Mode

- ✅ Simulates all transfers
- ✅ No actual funds sent
- ✅ Same result format
- ✅ Safe for testing

### Retry Logic

- **Attempt 1**: Send now
- **Attempt 2**: Wait 2s, retry
- **Attempt 3**: Wait 4s, retry
- **Failed**: Log error, continue others

---

## Troubleshooting

### "Minimum funding amount is $50 USDT"
```bash
# Use correct amount
npm run fund:agents -- --amount 50  # ✅ Correct
npm run fund:agents -- --amount 25  # ❌ Too low
```

### "Missing ASTER_USER_ADDRESS"
```bash
# Check .env.local has all credentials
ASTER_USER_ADDRESS=0x...
ASTER_USER_API_KEY=...
ASTER_USER_SECRET_KEY=...
```

### "Supabase not configured"
- Database optional for CLI
- Run migration to enable history logging
- Or skip for quick setup

### Agents show $0 balance after funding
- Wait 10-15 seconds for network
- Check Aster DEX API is responsive
- Verify agent wallets received funds

### Can't login to Pickaboo dashboard
- Check `PICKABOO_ADMIN_PASSWORD` set in `.env.local`
- Password is case-sensitive
- Default: "admin123" (change in production!)

---

## Common Patterns

### Initial Launch
```bash
# 1. Test with $50 (dry-run)
npm run fund:agents -- --amount 50 --dry-run

# 2. Fund for real
npm run fund:agents -- --amount 50

# 3. Verify
npm run verify:funding

# 4. Start trading
npm run start:all
```

### Production Setup
```bash
# 1. Fund with larger amount
npm run fund:agents -- --amount 500

# 2. Monitor via dashboard
# Go to http://localhost:3000/pickaboo
# Check "Check Balances" tab

# 3. Periodic refunds
# Set up cron job to run:
npm run verify:funding && npm run fund:agents -- --amount 100
```

### Symbol Changes
```bash
# Via web dashboard only (for now)
http://localhost:3000/pickaboo
→ Configuration tab
→ Enter new symbol: ETHUSDT
→ Click Update
```

---

## Next Steps

✅ Agents are funded and trading
📊 Monitor performance at: `http://localhost:3000/dashboard`
📈 View leaderboard: `http://localhost:3000/leaderboard`
🔄 Adjust symbols: `http://localhost:3000/pickaboo`

---

**Questions?** Check PICKABOO_ADMIN_GUIDE.md for detailed documentation.