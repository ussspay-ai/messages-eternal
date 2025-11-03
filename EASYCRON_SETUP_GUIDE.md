# EasyCron Snapshot Collection Setup Guide

This guide walks you through setting up automated snapshot collection every 5 minutes using EasyCron.

---

## Step 1: Generate a Secure Token

Generate a strong random token for authentication:

```bash
# macOS/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output something like:
```
a7f9d3c2e1b8f4a6d9c2e5f8a1b4c7d0e3f6a9c2d5e8f1a4b7c0d3e6f9a2
```

---

## Step 2: Update Environment Variable

Replace `CRON_SECRET` in your `.env.local` with the generated token:

```env
CRON_SECRET=a7f9d3c2e1b8f4a6d9c2e5f8a1b4c7d0e3f6a9c2d5e8f1a4b7c0d3e6f9a2
```

For production (Vercel/Railway), add this to your deployment environment variables.

---

## Step 3: Test the Endpoint

Test your endpoint locally or in production before setting up the cron job:

```bash
# Test with your token
curl -X GET "http://localhost:3000/api/cron/collect-snapshots" \
  -H "Authorization: Bearer your-token-here"

# Or in production
curl -X GET "https://yourdomain.com/api/cron/collect-snapshots" \
  -H "Authorization: Bearer your-token-here"
```

You should see a response like:
```json
{
  "success": true,
  "count": 5,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "snapshots": [...]
}
```

---

## Step 4: Create EasyCron Job

1. **Sign up** at [https://easycron.com](https://easycron.com) (free tier available)

2. **Click "Create Cron Job"**

3. **Fill in the form:**

   | Field | Value |
   |-------|-------|
   | **Cron URL** | `https://yourdomain.com/api/cron/collect-snapshots` |
   | **HTTP Basic Auth** | (Leave empty - we're using Authorization header) |
   | **HTTP Request Method** | `GET` |
   | **Cron Expression** | `*/5 * * * *` |
   | **Timezone** | Your preferred timezone |
   | **Notification** | (Optional: get alerts on failure) |

4. **Add Custom HTTP Header:**
   - Click "Advanced" or "Headers"
   - Add header:
     - **Name:** `Authorization`
     - **Value:** `Bearer your-secure-token-here`

5. **Save and enable the job**

---

## Step 5: Verify It's Working

1. Go to your EasyCron dashboard
2. Click on your job and check "Execution Log"
3. Look for successful executions (green checkmarks)
4. Check your database to confirm snapshots are being saved

You can also check your API logs (Vercel, Railway, or server logs) for `[Cron]` entries.

---

## What This Does

- **Runs every 5 minutes** - Collects agent account data from Aster DEX
- **Stores snapshots** - Saves to Supabase with timestamp
- **Feeds chart data** - Dashboard pulls these snapshots for chart visualization
- **No downtime dependency** - Works whether trading-bots is running or not
- **Continuous history** - Fills gaps in historical data for smooth chart progression

---

## Monitoring & Troubleshooting

### Check Recent Collections

```sql
-- In Supabase SQL Editor
SELECT 
  agent_id, 
  timestamp, 
  account_value 
FROM agent_snapshots 
ORDER BY timestamp DESC 
LIMIT 20;
```

### Expected Data Points

- **24 hours** = 288 snapshots (one every 5 minutes)
- **7 days** = 2,016 snapshots
- Each snapshot includes: account_value, total_pnl, return_percent, active_positions

### Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check token matches `CRON_SECRET` in env |
| 500 Error | Check Aster API credentials (AGENT_X_API_KEY/SECRET) |
| No snapshots saving | Verify Supabase connection and credentials |
| Inconsistent 5-min intervals | Check EasyCron timezone settings |

---

## Production Deployment Checklist

- [ ] Generate secure `CRON_SECRET` token
- [ ] Add `CRON_SECRET` to production environment variables (Vercel/Railway)
- [ ] Verify endpoint works: `https://yourdomain.com/api/cron/collect-snapshots`
- [ ] Create EasyCron job with correct token
- [ ] Monitor first 24 hours for successful collections
- [ ] Verify snapshots appear in Supabase
- [ ] Check chart displays continuous data over time

---

## When You're Done

Your dashboard will now:
- ✅ Have uninterrupted 24h chart history
- ✅ Display smooth line progression
- ✅ Collect data independently of user activity
- ✅ Work reliably with zero trading-bots dependency

The snapshot collection is now **proactive** instead of **reactive**! 🚀