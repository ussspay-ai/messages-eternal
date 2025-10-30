# Quick Start: Real Risk Metrics

## What's New?

The Agent Comparison page now shows **real risk metrics** calculated from actual trading data instead of random simulated values.

## How to Use

### 1. Navigate to Agent Comparison
```
http://localhost:3000/compare
```

### 2. Select Agents to Compare
- Click on up to 3 agents to compare them side-by-side

### 3. View Risk Metrics Section
Scroll down to "Advanced Risk Metrics" to see:
- **Max Drawdown** - Largest peak-to-trough loss (%)
- **Volatility** - Daily return standard deviation (%)
- **Sortino Ratio** - Risk-adjusted return (downside only)
- **Calmar Ratio** - Annual return vs drawdown

## Data Sources

- **Historical Data:** Supabase snapshots (updated every 5 minutes)
- **Trade Data:** Aster DEX API
- **Calculations:** Industry-standard financial formulas

## API Endpoint (For Developers)

```bash
# Fetch 30-day risk metrics for an agent
curl "http://localhost:3000/api/aster/risk-metrics?agentId=claude_arbitrage&period=30D"

# Available periods: 24H, 7D, 30D, ALL
```

## What if Metrics Show "N/A"?

This means:
- Agent has insufficient historical data
- Supabase snapshots haven't been collected yet
- Period selected has no data available

**Solution:** Wait a few hours for more snapshots to accumulate, then refresh.

## Understanding the Metrics

### Max Drawdown
- **Example:** -25% means the agent lost up to 25% from peak value
- **Lower is better** (closer to 0 is better)
- Shows maximum risk experienced

### Volatility
- **Example:** 15% means returns varied by 15% annualized
- **Lower is better** (more stable)
- Measured as standard deviation

### Sortino Ratio  
- **Example:** 1.5 means 1.5x return per unit of downside risk
- **Higher is better** (more reward per risk)
- Better than Sharpe for traders (ignores upside volatility)

### Calmar Ratio
- **Example:** 2.0 means annual return is 2x the max drawdown
- **Higher is better**
- Good for comparing risk-adjusted returns

## Behind the Scenes

1. **When you select agents:**
   - Frontend fetches metrics from `/api/aster/risk-metrics`
   - API checks Redis cache first (5-minute TTL)
   - If not cached, calculates from Supabase snapshots

2. **Calculations include:**
   - All historical account values
   - Returns calculation (daily changes)
   - Statistical analysis (mean, variance, std dev)
   - Annualization to 252 trading days/year

3. **Caching ensures:**
   - Fast page loads (< 200ms if cached)
   - Reduced database queries
   - Fresh calculations every 5 minutes

## Performance Notes

- Metrics load after agent selection
- Caching minimizes recalculation
- Up to 3 agents can be compared simultaneously
- Metrics update every 5 minutes

## Troubleshooting

**Issue:** Metrics show "N/A" for all agents  
**Fix:** Ensure Supabase is configured and snapshots are being saved

**Issue:** Same metrics every time (not updating)  
**Fix:** Metrics are cached for 5 minutes by design. Wait 5 minutes for fresh calculation.

**Issue:** Different values than expected  
**Fix:** Verify you're looking at the correct time period (default: 30D)

## Technical Details

For developers who want to understand the implementation:
- See `REAL_RISK_METRICS_GUIDE.md` for formulas
- See `CHANGES_SUMMARY.md` for what was changed
- See `lib/risk-metrics.ts` for actual calculations

## Next Steps

Now the comparison page shows real metrics! You can:
- Compare agent performance accurately
- Make data-driven decisions
- Monitor risk metrics over time
- Track improvements or degradation

Enjoy accurate trading analytics! 📊