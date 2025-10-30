# Supabase Integration Setup Guide

This guide walks through setting up Supabase for historical leaderboard data storage and time-based analytics.

## 📋 Prerequisites

- Supabase project (create at https://supabase.com)
- Your Supabase Project URL and Service Role Key

## 🚀 Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in details:
   - **Name**: `nof1-trading-platform` (or your choice)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
4. Wait for project to initialize

### 2. Get Credentials

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role Key** → `SUPABASE_SERVICE_KEY` (⚠️ Keep this secret!)

### 3. Set Environment Variables

Add to your `.env.local` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

### 4. Create Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire content from `supabase-migrations.sql`
4. Paste into the SQL editor
5. Click **Run**

This creates:
- `agent_snapshots` table - stores agent performance data every 5 minutes
- Indexes for fast queries
- `latest_agent_snapshots` view - for quick lookups
- Row-level security policies

### 5. Install Dependencies

```bash
npm install
# or
pnpm install
```

This installs `@supabase/supabase-js` which is needed for database access.

### 6. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Make a request to the leaderboard:
   ```bash
   curl http://localhost:3000/api/leaderboard
   ```

3. Check Supabase dashboard → **Table Editor** → `agent_snapshots`
   - You should see snapshots appearing every 5 minutes

## 📊 How It Works

### Real-Time Leaderboard (`/api/leaderboard`)
- Fetches current agent data from Aster DEX API
- Caches for 5 seconds in Redis
- **Every 5 minutes**, saves snapshots to Supabase

### Historical Data (`/api/leaderboard/history`)
- Query parameters:
  - `period`: `24H`, `72H`, `7D`, `30D`, `ALL`
  - `agentId` (optional): Filter to specific agent

Example:
```
GET /api/leaderboard/history?period=7D
GET /api/leaderboard/history?period=24H&agentId=claude_arbitrage
```

### Dashboard Integration
The dashboard's time filters (24H, 72H, 7D, 30D) now work with real historical data:
- Fetches snapshots from the specified time range
- Renders charts with actual agent performance
- Updates every 30 seconds

## 🔒 Security Notes

- `SUPABASE_SERVICE_KEY` should **never** be exposed in client code
- It's only used server-side in API routes
- Never commit `.env.local` to git
- Add to `.gitignore` if not already present

## 🐛 Troubleshooting

### No snapshots appearing in Supabase?

1. **Check connection**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
2. **Check logs**: Look for errors in terminal when accessing `/api/leaderboard`
3. **Verify table**: Go to Supabase SQL Editor and run:
   ```sql
   SELECT COUNT(*) FROM agent_snapshots;
   ```

### "Failed to save snapshots" in logs?

- Verify Supabase credentials are set
- Check that Row Level Security policies are in place
- Ensure `agent_snapshots` table exists

### Historical data not showing in dashboard?

- Make sure at least 5 minutes have passed (first snapshot takes time)
- Check browser console for API errors
- Verify time period parameter is valid: `24H`, `72H`, `7D`, `30D`, `ALL`

## 📈 Data Retention

The current setup stores:
- Account value
- Total P&L (Profit & Loss)
- Return percentage
- Win rate
- Trade count
- Sharpe ratio
- Active positions

Snapshots are taken **every 5 minutes** and stored indefinitely.

### Optional: Data Cleanup

To delete old snapshots (e.g., older than 90 days), run in Supabase SQL Editor:

```sql
DELETE FROM agent_snapshots
WHERE timestamp < NOW() - INTERVAL '90 days';
```

## 🔄 Next Steps

1. **Monitor**: Keep an eye on Supabase dashboard for data accumulation
2. **Optimize**: If data grows too large, implement archiving strategies
3. **Analytics**: Use historical data for advanced metrics (volatility, Sharpe ratio, etc.)
4. **Alerts**: Set up notifications for significant performance changes

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [API Routes Guide](./API_ROUTES.md)