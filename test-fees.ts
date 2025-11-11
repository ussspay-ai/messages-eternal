/**
 * Direct Aster API test script
 * Fetches trades to check if commission fees are returned
 * 
 * Run with: npx ts-node test-fees.ts
 */

import { createHmac } from "crypto"
import * as fs from "fs"
import * as path from "path"

// Actual response from Aster API /fapi/v1/trades
interface AsterTrade {
  id: number
  price: string
  qty: string
  quoteQty: string
  time: number
  isBuyerMaker: boolean
}

// Enriched with calculated fees
interface EnrichedAsterTrade extends AsterTrade {
  commission: number
  commissionAsset: string
  feeType: "maker" | "taker"
}

class DirectAsterClient {
  private baseUrl = "https://fapi.asterdex.com"
  private apiKey: string
  private apiSecret: string

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
  }

  private getTimestamp(): number {
    return Date.now()
  }

  private generateSignature(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort()
    const totalParams = sortedKeys.map((key) => `${key}=${params[key]}`).join("&")
    return createHmac("sha256", this.apiSecret).update(totalParams).digest("hex")
  }

  async getTrades(symbol: string, limit: number = 100): Promise<any> {
    const timestamp = this.getTimestamp()

    const allParams: Record<string, any> = {
      symbol,
      limit,
      timestamp,
      recvWindow: 10000,
    }

    const signature = this.generateSignature(allParams)

    const sortedKeys = Object.keys(allParams).sort()
    const queryString = sortedKeys.map((key) => `${key}=${encodeURIComponent(allParams[key])}`).join("&")

    const url = `${this.baseUrl}/fapi/v1/trades?${queryString}&signature=${signature}`

    console.log(`\n📡 Fetching trades from: ${this.baseUrl}/fapi/v1/trades`)
    console.log(`   Limit: ${limit}`)
    console.log(`   Symbol: ${symbol || "all"}`)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-MBX-APIKEY": this.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "NOF1-Test/1.0",
      },
      signal: AbortSignal.timeout(8000),
    })

    const text = await response.text()

    if (!response.ok) {
      console.error(`❌ API Error (${response.status}): ${text.substring(0, 300)}`)
      throw new Error(`API Error: ${text}`)
    }

    try {
      return JSON.parse(text)
    } catch (e) {
      console.error(`❌ Failed to parse JSON: ${text.substring(0, 300)}`)
      throw e
    }
  }
}

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8")
    content.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match && !line.startsWith("#")) {
        process.env[match[1].trim()] = match[2].trim()
      }
    })
  }
}

/**
 * Aster Exchange Fee Structure:
 * - Maker Fee: 0.01% (providing liquidity)
 * - Taker Fee: 0.035% (taking liquidity)
 * 
 * Fee = Trade Amount × Fee Rate
 * Where Trade Amount = qty × price
 */
const ASTER_FEE_RATES = {
  maker: 0.0001, // 0.01%
  taker: 0.00035, // 0.035%
} as const

const COMMISSION_ASSET = "USDT"

function calculateFee(trade: AsterTrade): EnrichedAsterTrade {
  const price = parseFloat(trade.price)
  const qty = parseFloat(trade.qty)
  const tradeAmount = price * qty

  // Determine if maker or taker
  const isMaker = trade.isBuyerMaker
  const feeRate = isMaker ? ASTER_FEE_RATES.maker : ASTER_FEE_RATES.taker
  const commission = tradeAmount * feeRate
  const feeType = isMaker ? "maker" : "taker"

  return {
    ...trade,
    commission,
    commissionAsset: COMMISSION_ASSET,
    feeType,
  }
}

async function main() {
  console.log("🔍 Aster API Fees Test\n")
  console.log("=".repeat(60))

  loadEnv()

  // Get symbol from command line or use default
  const symbol = process.argv[2] || "ASTERUSDT"

  // Test with Agent 1
  const agent1ApiKey = process.env.AGENT_1_API_KEY || ""
  const agent1ApiSecret = process.env.AGENT_1_API_SECRET || ""

  if (!agent1ApiKey || !agent1ApiSecret) {
    console.error("❌ Missing AGENT_1_API_KEY or AGENT_1_API_SECRET in environment")
    console.error("   Tried to load from .env.local")
    process.exit(1)
  }

  const client = new DirectAsterClient(agent1ApiKey, agent1ApiSecret)

  try {
    console.log("\n🤖 Testing Agent 1 (Claude Arbitrage)\n")

    // Fetch trades for the specified symbol
    const trades = await client.getTrades(symbol, 50)

    console.log(`\n✅ Received ${trades.length} trades\n`)

    if (trades.length === 0) {
      console.log("⚠️  No trades found for this agent yet.")
      console.log("   This could mean:")
      console.log("   - The agent hasn't made any trades yet")
      console.log("   - API credentials are not for a trading account")
    } else {
      // Show first trade structure
      const firstTrade = trades[0]
      console.log("📋 ASTER API RESPONSE (Raw Trade):")
      console.log("─".repeat(60))
      console.log(JSON.stringify(firstTrade, null, 2))
      console.log("─".repeat(60))

      // Calculate fees for all trades
      console.log("\n💰 CALCULATING FEES BASED ON ASTER FEE STRUCTURE...")
      console.log(`   Maker Fee: ${(ASTER_FEE_RATES.maker * 100).toFixed(2)}%`)
      console.log(`   Taker Fee: ${(ASTER_FEE_RATES.taker * 100).toFixed(2)}%`)

      const enrichedTrades = trades.map(calculateFee)
      const firstEnriched = enrichedTrades[0]

      console.log("\n📋 FIRST TRADE WITH CALCULATED FEE:")
      console.log("─".repeat(60))
      console.log(`   ID: ${firstEnriched.id}`)
      console.log(`   Price: ${firstEnriched.price}`)
      console.log(`   Quantity: ${firstEnriched.qty}`)
      console.log(`   Trade Amount: ${(parseFloat(firstEnriched.price) * parseFloat(firstEnriched.qty)).toFixed(6)} USDT`)
      const feeRate = ASTER_FEE_RATES[firstEnriched.feeType as keyof typeof ASTER_FEE_RATES]
      console.log(`   Fee Type: ${firstEnriched.feeType.toUpperCase()} (${(feeRate * 100).toFixed(3)}%)`)
      console.log(`   Calculated Commission: ${firstEnriched.commission.toFixed(6)} ${firstEnriched.commissionAsset}`)
      console.log(`   Time: ${new Date(firstEnriched.time).toISOString()}`)

      // Calculate total fees
      let totalFees = 0
      let makerFees = 0
      let takerFees = 0
      let makerCount = 0
      let takerCount = 0

      for (const trade of enrichedTrades) {
        totalFees += trade.commission
        if (trade.feeType === "maker") {
          makerFees += trade.commission
          makerCount++
        } else {
          takerFees += trade.commission
          takerCount++
        }
      }

      console.log(`\n� FEE SUMMARY (across all ${trades.length} trades)`)
      console.log("─".repeat(60))
      console.log(`   Total Fees: ${totalFees.toFixed(6)} USDT`)
      console.log(`   Maker Trades: ${makerCount} (${makerFees.toFixed(6)} USDT)`)
      console.log(`   Taker Trades: ${takerCount} (${takerFees.toFixed(6)} USDT)`)
      console.log(`   Average Fee per Trade: ${(totalFees / trades.length).toFixed(6)} USDT`)

      // Show a few more trades for verification
      if (trades.length > 1) {
        console.log(`\n� SAMPLE OF CALCULATED FEES:`)
        console.log("─".repeat(60))
        for (let i = 0; i < Math.min(5, trades.length); i++) {
          const t = enrichedTrades[i]
          const tradeAmount = (parseFloat(t.price) * parseFloat(t.qty)).toFixed(2)
          console.log(
            `   Trade ${i + 1}: ${t.feeType.padEnd(6)} | ` +
            `Amount: ${tradeAmount.padStart(10)} USDT | ` +
            `Fee: ${t.commission.toFixed(6).padStart(10)} USDT`
          )
        }
      }
    }

    console.log("\n" + "=".repeat(60))
    console.log("✅ Test completed successfully\n")
  } catch (error) {
    console.error("\n❌ Test failed:")
    console.error(error)
    process.exit(1)
  }
}

main()