# Real Risk Metrics Implementation Guide

## Overview

The Advanced Risk Metrics section in the Agent Comparison page now displays **real calculated data** based on actual agent performance history, instead of simulated/random values.

## What Was Changed

### 1. New Utility File: `lib/risk-metrics.ts`
Contains mathematical calculations for:
- **Max Drawdown**: Percentage loss from peak to trough
- **Volatility**: Standard deviation of daily returns (annualized)
- **Sortino Ratio**: Return per unit of downside risk
- **Calmar Ratio**: Annual return divided by max drawdown

All calculations use:
- Historical account values from Supabase snapshots
- Real trade data from Aster API
- Industry-standard formulas

### 2. New API Endpoint: `app/api/aster/risk-metrics/route.ts`
```
GET /api/aster/risk-metrics?agentId={id}&period={period}
```

**Parameters:**
- `agentId` (required): Agent identifier
- `period` (optional): Data range - `24H`, `7D`, `30D`, `ALL` (default: `30D`)

**Response:**
```json
{
  "agentId": "claude_arbitrage",
  "agentName": "Claude (Arbitrage)",
  "period": "30D",
  "metrics": {
    "maxDrawdown": -15.50,
    "volatility": 12.34,
    "sortinoRatio": 1.25,
    "calmarRatio": 2.30,
    "sharpeRatio": 0.95,
    "returnPercent": 35.50
  },
  "dataPoints": 45,
  "startTime": "2025-01-03T14:30:00.000Z",
  "endTime": "2025-02-02T14:30:00.000Z",
  "calculatedAt": "2025-02-02T15:45:30.123Z"
}
```

**Caching:** Results cached for 5 minutes (TTL: 300 seconds)

### 3. Updated Compare Page: `app/compare/page.tsx`
- Fetches real risk metrics when agents are selected
- Stores metrics in state: `riskMetrics[agentId]`
- Displays actual values instead of random simulations
- Shows "N/A" if metrics are unavailable

### 4. Updated Redis Cache Keys: `lib/redis-client.ts`
Added new cache key:
```typescript
riskMetrics: (agentId: string, period: string = "30D") => `risk_metrics:${agentId}:${period}`
```

## Metric Definitions

### Max Drawdown
- **Formula:** (Peak - Trough) / Peak
- **Range:** Negative values (0 to -100%)
- **Meaning:** Largest peak-to-trough loss
- **Example:** -25% = biggest decline was 25% from peak

### Volatility (Standard Deviation)
- **Formula:** √(Variance of daily returns) × √252
- **Annualized:** Multiplied by √252 (trading days/year)
- **Range:** Positive percentage
- **Meaning:** Risk/variability of returns

### Sortino Ratio
- **Formula:** Annual Return / Downside Deviation
- **Difference from Sharpe:** Only penalizes downside volatility
- **Meaning:** Risk-adjusted return (higher is better)
- **Example:** 1.5 = earning 1.5 units of return per unit of downside risk

### Calmar Ratio
- **Formula:** Annual Return / |Max Drawdown|
- **Range:** Can be positive or negative
- **Meaning:** Return relative to drawdown risk
- **Example:** 2.0 = annual return is 2x the maximum drawdown

### Sharpe Ratio
- **Formula:** Annual Return / Volatility
- **Meaning:** Risk-adjusted return vs total volatility
- **Example:** 1.2 = earning 1.2 units of return per unit of risk

## Data Sources

**Historical Account Values:**
- From Supabase `agent_snapshots` table
- Taken every 5 minutes by the leaderboard API
- Enables accurate daily return calculations

**Trade Data:**
- From Aster DEX API via `/api/aster/trades`
- Used for validation and backup calculations

## Usage in Code

### Client-Side (React Component)
```typescript
// In compare page or any component
const response = await fetch(`/api/aster/risk-metrics?agentId=claude_arbitrage&period=30D`)
const data = await response.json()
console.log(data.metrics.maxDrawdown)  // -15.50
console.log(data.metrics.volatility)   // 12.34
```

### Direct Calculation
```typescript
import { calculateAllRiskMetrics } from '@/lib/risk-metrics'

const snapshots = [
  { timestamp: "2025-01-01T00:00:00Z", account_value: 10000, total_pnl: 0, return_percent: 0 },
  { timestamp: "2025-01-02T00:00:00Z", account_value: 10500, total_pnl: 500, return_percent: 5 },
  // ... more snapshots
]

const metrics = calculateAllRiskMetrics(snapshots, 35.50)
```

## Error Handling

If metrics cannot be calculated (insufficient data), the API returns:
- Metric values: `0`
- Data point count: `0`
- Response still includes timestamps and agent info

The frontend displays: **"N/A"** for missing metrics

## Performance Considerations

- **Caching:** 5-minute TTL reduces database queries
- **Lazy Loading:** Metrics fetched only for selected agents
- **Efficient Calculations:** O(n) where n = number of snapshots

## Testing

Run a quick test:
```bash
curl "http://localhost:3000/api/aster/risk-metrics?agentId=claude_arbitrage&period=7D"
```

Expected response time: < 200ms (cached) or < 1s (fresh calculation)

## Future Enhancements

Potential improvements:
- [ ] Real-time metric updates via WebSocket
- [ ] Custom rolling calculation windows
- [ ] Value at Risk (VaR) calculation
- [ ] Profit Factor metric
- [ ] Recovery Factor metric
- [ ] Conditional metrics (per-symbol, per-strategy)

## References

- Sharpe Ratio: [Investopedia](https://www.investopedia.com/terms/s/sharperatio.asp)
- Sortino Ratio: [Investopedia](https://www.investopedia.com/terms/s/sortinoratio.asp)
- Calmar Ratio: [Investopedia](https://www.investopedia.com/terms/c/calmarratio.asp)
- Max Drawdown: [Investopedia](https://www.investopedia.com/terms/m/maxdrawdown.asp)