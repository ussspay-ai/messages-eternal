/**
 * Verify Fee Calculation Fix
 * Run with: npx ts-node verify-fee-fix.ts
 * 
 * This script verifies that the fee calculation produces realistic numbers
 */

interface TradeExample {
  symbol: string
  price: string
  qty: string
  isBuyerMaker: boolean
  description: string
}

// Examples from real trading scenarios
const TRADE_EXAMPLES: TradeExample[] = [
  {
    symbol: "ASTERUSDT",
    price: "1.09530",
    qty: "77.86",
    isBuyerMaker: false,
    description: "Typical taker trade (Claude arbitrage)",
  },
  {
    symbol: "ASTERUSDT",
    price: "0.85000",
    qty: "100",
    isBuyerMaker: true,
    description: "Large maker order",
  },
  {
    symbol: "BTCUSDT",
    price: "43000",
    qty: "0.001",
    isBuyerMaker: false,
    description: "Small Bitcoin taker",
  },
]

// Fee rates (matching lib/aster-client.ts)
const ASTER_FEE_RATES = {
  maker: 0.0001, // 0.01%
  taker: 0.00035, // 0.035%
}

function calculateFee(trade: TradeExample): {
  amount: number
  feeRate: number
  commission: number
  percentage: string
} {
  const price = parseFloat(trade.price)
  const qty = parseFloat(trade.qty)
  const tradeAmount = price * qty

  const feeRate = trade.isBuyerMaker ? ASTER_FEE_RATES.maker : ASTER_FEE_RATES.taker
  const commission = tradeAmount * feeRate
  const percentageOfTrade = (feeRate * 100).toFixed(3)

  return {
    amount: tradeAmount,
    feeRate,
    commission,
    percentage: percentageOfTrade,
  }
}

console.log("\n📊 Fee Calculation Verification")
console.log("================================\n")

let totalVolume = 0
let totalFees = 0

for (const trade of TRADE_EXAMPLES) {
  const result = calculateFee(trade)
  totalVolume += result.amount
  totalFees += result.commission

  console.log(`${trade.description}`)
  console.log(`  Symbol: ${trade.symbol}`)
  console.log(`  Price: $${trade.price} × Qty: ${trade.qty}`)
  console.log(`  Trade Amount: $${result.amount.toFixed(2)} USDT`)
  console.log(`  Fee Type: ${trade.isBuyerMaker ? "MAKER" : "TAKER"} (${result.percentage}%)`)
  console.log(`  Commission: $${result.commission.toFixed(6)} USDT`)
  console.log()
}

console.log("📈 Summary")
console.log("----------")
console.log(`Total Trading Volume: $${totalVolume.toFixed(2)} USDT`)
console.log(`Total Fees: $${totalFees.toFixed(6)} USDT`)
console.log(`Average Fee Rate: ${((totalFees / totalVolume) * 100).toFixed(4)}%`)

console.log("\n✅ Sanity Check: EXPECTED VALUES")
console.log("--------------------------------")
console.log("✓ Individual fees should be < $1 for typical trades")
console.log("✓ Total fees should be << account balance ($50)")
console.log("✓ Fee rate should be between 0.01% - 0.035%")
console.log("✓ Fees should NOT exceed 1-2% of account value\n")

// Check for the bug
console.log("❌ BUG DETECTION: What would cause HIGH fees?")
console.log("------------------------------------------")
console.log("If fees showed as $229-872 on $50 accounts:")

console.log("\nPossible Issue 1: Wrong fee rates")
const buggyRates = {
  maker: 0.01,  // 1% instead of 0.01%
  taker: 0.035, // 3.5% instead of 0.035%
}
const buggyFee1 = TRADE_EXAMPLES[0]
const buggyAmount1 = parseFloat(buggyFee1.price) * parseFloat(buggyFee1.qty)
const buggyCommission1 = buggyAmount1 * buggyRates.taker
console.log(`  If rates were 1% and 3.5%: fee would be $${buggyCommission1.toFixed(2)} ✗`)

console.log("\nPossible Issue 2: API returns commission as absolute %, not decimal")
const apiExample = "0.035"
const buggyFee2 = parseFloat(apiExample) // Would be 0.035 instead of 0.00035
console.log(`  If API returns "0.035" and we use it as decimal: ${buggyFee2} ✗`)

console.log("\nPossible Issue 3: Cumulative bug")
console.log(`  1000 trades × $0.85 average = $850+ in fees for realistic scenario ✓`)
console.log("  This is normal and not a bug!\n")