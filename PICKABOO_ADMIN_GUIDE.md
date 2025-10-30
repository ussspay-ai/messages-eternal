# 🐤 Pickaboo Admin Dashboard Guide

## Overview

**Pickaboo** is the admin control panel for managing agent funding and trading configuration. It provides a web-based interface to fund agents, verify balances, and track funding history.

## Quick Start

### 1. Setup Database

Run the Supabase migration to create tables:

```bash
# Login to Supabase CLI
supabase login

# Run migration
supabase db push

# Or manually run SQL in Supabase console:
# Copy contents from supabase-migrations-funding.sql
```

### 2. Configure Environment

Add to `.env.local`:

```bash
# Pickaboo Admin Dashboard
PICKABOO_ADMIN_PASSWORD=your-secure-password-here

# Already configured:
ASTER_USER_ADDRESS=0x...
ASTER_USER_API_KEY=...
ASTER_USER_SECRET_KEY=...
```

### 3. Access Dashboard

Navigate to: `http://localhost:3000/pickaboo`

**Login:** Enter your admin password

## Features

### 💰 Fund Agents

**Page:** "Fund Agents" tab

**What it does:**
- Distributes USDT to all 5 agent wallets
- Supports dry-run mode for testing
- Retries failed transfers automatically
- Logs all transactions to database

**Steps:**
1. Enter amount per agent ($50-$1M USDT)
2. Choose mode:
   - 🔄 **Dry-Run**: Simulate without sending funds
   - 🚀 **Live**: Execute real transfers
3. Click "Fund X USDT per Agent"
4. View results for each agent

**Example Scenarios:**
```
# Test with dry-run first
Amount: 100
Mode: Dry-Run
→ See simulated transfers without spending

# Then fund for real
Amount: 100
Mode: Live
→ Actually transfer funds to agents
```

### 💳 Check Balances

**Page:** "Check Balances" tab

**What it does:**
- Shows current USDT balance for each agent
- Flags underfunded agents (< $50)
- Displays total portfolio balance

**Status Indicators:**
- ✅ **Funded** (≥ $50 USDT)
- ⚠️ **Underfunded** (< $50 USDT)
- ❌ **Error** (couldn't fetch balance)

**Use Cases:**
- Monitor agent capital
- Identify agents needing refunding
- Track total capital allocated

### ⚙️ Configuration

**Page:** "Configuration" tab

**What it does:**
- Update trading symbol for all agents
- Change from ASTERUSDT → ETHUSDT, BTCUSDT, etc.
- Applied immediately to all agents

**Supported Symbols:**
- ASTERUSDT (default)
- ETHUSDT
- BTCUSDT
- BNBUSDT
- SOLUSDT
- XRPUSDT
- *Any token pair with USDT*

**Steps:**
1. Enter new symbol (e.g., "ETHUSDT")
2. Click "Update"
3. Confirmation shows updated agents

### 📊 Funding History

**Page:** "History" tab

**What it does:**
- View all funding transactions
- Filter by status, date, agent
- Export history as CSV
- Track funding patterns

**Columns:**
- **Agent**: Agent name & ID
- **Amount**: USDT transferred
- **Status**: ✅ Success / ❌ Failed / ⏳ Pending
- **Date**: When transfer occurred
- **TX Hash**: Blockchain transaction ID

**Export:**
- Click "Export CSV" to download records
- Useful for accounting & reporting

## Command Line Usage

For automation and scripting, use CLI commands:

### Fund Agents (CLI)

```bash
# Test with dry-run
cd trading-bots
npm run fund:agents -- --amount 50 --dry-run

# Fund for real
npm run fund:agents -- --amount 100

# Custom amount
npm run fund:agents -- --amount 500
```

**Output:**
```
🚀 AGENT FUNDING MANAGER
=======================================================================
📍 Main Account: 0x7fBED...
💰 Amount per Agent: $50 USDT
📊 Total to Distribute: $250 USDT
🔄 Mode: DRY-RUN
🎯 Agents: 5
=======================================================================

🔄 Funding agents...

✅ Claude Arbitrage     | $50 USDT        | TX: 0xdry_agent_1_...
✅ GPT-4 Momentum       | $50 USDT        | TX: 0xdry_agent_2_...
...

📋 FUNDING SUMMARY
=======================================================================
✅ Successful: 5/5
❌ Failed: 0/5
...
```

### Verify Funding (CLI)

```bash
cd trading-bots
npm run verify:funding
```

**Output:**
```
🔍 AGENT BALANCE VERIFICATION
=======================================================================

📊 Checking Claude Arbitrage...
   ✅ Balance: $250.50 USDT
   Status: Funded

📊 Checking GPT-4 Momentum...
   ✅ Balance: $150.75 USDT
   Status: Funded

...

📋 BALANCE SUMMARY
=======================================================================
✅ Funded (≥ $50): 5/5
⚠️  Underfunded (< $50): 0/5
❌ Errors: 0/5

💼 Total Balance Across Agents: $1,250.35 USDT
```

## Workflow Examples

### Initial Setup

```bash
# 1. Verify agents are configured
cd trading-bots
npm run verify:funding

# 2. Fund with dry-run to test
npm run fund:agents -- --amount 50 --dry-run

# 3. Check results
# → Should see 5 successful simulated transfers

# 4. Fund for real
npm run fund:agents -- --amount 50

# 5. Verify balances
npm run verify:funding

# 6. Start agents
npm run start:all
```

### Periodic Refunding

```bash
# Check if any agents need refunding
npm run verify:funding

# If balances < $50 USDT:
npm run fund:agents -- --amount 100

# Verify success
npm run verify:funding
```

### Symbol Change (e.g., ASTER → ETH)

**Via Dashboard:**
1. Go to "Configuration" tab
2. Change symbol to "ETHUSDT"
3. Click "Update"
4. Agents switch to ETHUSDT trading

**Via CLI:**
```bash
# CLI does not currently support symbol changes
# Use web dashboard for now
```

## Troubleshooting

### "Invalid admin password"
- Check `PICKABOO_ADMIN_PASSWORD` in `.env.local`
- Make sure you're entering the correct password
- Default during development: "admin123"

### Funding shows "Dry-run" mode stuck
- Toggle the "DRY-RUN" switch off for live mode
- Ensure checkbox is properly unchecked

### Balances show "N/A" or error
- Check Aster DEX API credentials
- Verify agent wallets exist and have gas fees
- Check network connectivity to Aster DEX

### Can't connect to database
- Run Supabase migration: `supabase db push`
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Check Supabase project is active

### Funding amounts not matching
- Confirm decimal precision (e.g., 50.00 vs 50)
- Check network fees aren't being deducted
- View transaction hash for exact amounts

## Security Notes

⚠️ **Important:**
1. **Change admin password** from default immediately
2. **Never share** password in code or commits
3. **Use strong passwords** (20+ characters recommended)
4. **HTTPS only** in production
5. **Restrict access** to trusted admin IPs if possible

**Environment Setup:**
```bash
# Generate strong password
openssl rand -base64 32

# Add to .env.local (not in git)
PICKABOO_ADMIN_PASSWORD=your-generated-password
```

## Database Schema

### funding_history table

```sql
- id (UUID) - Primary key
- agent_id (VARCHAR) - e.g., "agent_1"
- agent_name (VARCHAR) - e.g., "Claude Arbitrage"
- amount (DECIMAL) - USDT amount
- status (VARCHAR) - 'success' | 'failed' | 'pending'
- tx_hash (VARCHAR) - Blockchain transaction ID
- error_message (TEXT) - Error details if failed
- dry_run (BOOLEAN) - Whether this was a test
- created_at (TIMESTAMP) - When recorded
- updated_at (TIMESTAMP) - Last update
```

### trading_symbols table

```sql
- id (UUID) - Primary key
- agent_id (VARCHAR) - e.g., "agent_1"
- symbol (VARCHAR) - e.g., "ASTERUSDT"
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## API Endpoints

If you want to integrate with other systems:

### Fund Agents
```bash
POST /api/pickaboo/fund-agents
Content-Type: application/json

{
  "password": "admin-password",
  "amount": 50,
  "dryRun": false
}

# Response
{
  "success": true,
  "message": "Successfully funded 5 agents...",
  "results": [
    {
      "agent_id": "agent_1",
      "agent_name": "Claude Arbitrage",
      "amount": 50,
      "status": "success",
      "tx_hash": "0x..."
    }
  ]
}
```

### Check Balances
```bash
GET /api/pickaboo/verify-balances?password=admin-password

# Response
{
  "success": true,
  "results": [
    {
      "agent_id": "agent_1",
      "agent_name": "Claude Arbitrage",
      "balance": 150.50,
      "status": "funded"
    }
  ],
  "total_balance": 1250.35
}
```

### Get Funding History
```bash
GET /api/pickaboo/funding-history?password=admin-password&limit=50&offset=0

# Response
{
  "success": true,
  "history": [...],
  "total_count": 127
}
```

### Update Trading Symbol
```bash
PUT /api/pickaboo/update-symbol
Content-Type: application/json

{
  "password": "admin-password",
  "symbol": "ETHUSDT"
}

# Response
{
  "success": true,
  "message": "Updated trading symbol to ETHUSDT for all agents",
  "updated_agents": ["agent_1", "agent_2", ...]
}
```

## Tips & Best Practices

✅ **Do:**
- Use dry-run mode before real funding
- Check balances regularly
- Export history for record-keeping
- Update agents' trading symbols as needed
- Monitor funding success rate

❌ **Don't:**
- Send large amounts in one transfer (test first)
- Change symbols while agents are trading
- Share admin password with non-admins
- Use weak or default passwords in production
- Ignore funding errors (investigate & retry)

## Support

For issues:
1. Check troubleshooting section above
2. View console logs for detailed errors
3. Check database migration completed
4. Verify all environment variables set
5. Test with dry-run mode first

---

**Created:** January 2025
**Version:** 1.0.0
**Status:** Production Ready ✅