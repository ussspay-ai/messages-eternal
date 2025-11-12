# Fee Calculation Bug Fix

## Problem
The leaderboard was displaying outrageous fee amounts for agents:
- Claude: $229.26 fees on $50.01 account (459% of account value)
- Buy & Hold: $872.05 fees on $49.16 account (1774% of account value)
- ChatGPT: $531.03 fees on $48.28 account (1100% of account value)

These numbers clearly indicated an error in fee calculation.

## Root Cause
**The Aster API DOES return a `commission` field in the trade response, but the code was ignoring it and recalculating fees incorrectly.**

### Previous Behavior
```typescript
// OLD CODE - Always calculated fees
private calculateTradeCommission(trade: any) {
  const price = parseFloat(trade.price || 0)
  const qty = parseFloat(trade.qty || 0)
  const tradeAmount = price * qty
  const feeRate = isMaker ? ASTER_FEE_RATES.maker : ASTER_FEE_RATES.taker
  const commission = tradeAmount * feeRate  // ❌ Wrong calculation
  return commission
}
```

## Solution
Modified `/lib/aster-client.ts` to check if Aster API returns commission first, and only calculate it if needed:

```typescript
// NEW CODE - Uses API commission if available
private calculateTradeCommission(trade: any) {
  // PRIORITY 1: Check if Aster API returns commission directly
  if (trade.commission !== undefined && trade.commission !== null && trade.commission !== 0) {
    const commission = parseFloat(trade.commission)
    return commission  // ✅ Use API-provided value
  }

  // PRIORITY 2: Calculate commission if API doesn't provide it
  const price = parseFloat(trade.price || 0)
  const qty = parseFloat(trade.qty || 0)
  const tradeAmount = price * qty
  const feeRate = isMaker ? ASTER_FEE_RATES.maker : ASTER_FEE_RATES.taker
  const commission = tradeAmount * feeRate  // ✅ Fallback calculation
  return commission
}
```

## Changes Made
1. **File: `/lib/aster-client.ts`**
   - Modified `calculateTradeCommission()` method (lines 137-171)
   - Added priority check for API-provided commission
   - Added fallback calculation if API doesn't return commission
   - Updated logging to indicate which source is being used

## Expected Results
- **Fee values should decrease dramatically** to realistic amounts
- Fees should represent 0.01%-0.035% of trade amount (not 459% of account)
- Example: $50 account with $500 trading volume = ~$0.17-0.58 in fees (not $229+)

## Files Modified
- ✅ `/lib/aster-client.ts` - Primary API client

## Files NOT Modified (already correct)
- `/app/api/leaderboard/route.ts` - Correctly accumulates fees
- `/lib/metrics-calculator.ts` - Correctly sums commissions

## Testing
Check the leaderboard after the fix. You should see:
1. Fee amounts drop to reasonable percentages of account value
2. Console logs showing "Using Aster API commission or calculated fees"
3. Fees appearing on leaderboard but not exceeding 1-2% of account value for reasonable trading

## Verification
Run this to verify the fix:
```bash
# Check the logs for the new calculation
tail -f your-log-file.log | grep "Trades enriched with fees"

# Expected output: Shows totalFees and avgFeePerTrade with realistic values
```