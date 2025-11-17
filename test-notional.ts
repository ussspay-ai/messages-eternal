import fetch from "node-fetch"

interface Position {
  symbol: string
  positionAmt: number
  markPrice: number
  leverage: string
  unrealizedProfit?: number
  unRealizedProfit?: number
  coin?: string
  exitPlan?: string
}

interface Agent {
  id: string
  name: string
}

async function testNotionalCalculation() {
  console.log("🧪 Starting Notional Value Test\n")

  try {
    // Step 1: Fetch agents
    console.log("📍 Step 1: Fetching agents...")
    const agentsRes = await fetch("http://localhost:3000/api/aster/agents-data")
    if (!agentsRes.ok) {
      throw new Error(`Failed to fetch agents: ${agentsRes.status}`)
    }
    const agentsData = await agentsRes.json()
    const agents: Agent[] = agentsData.agents || []
    console.log(`✅ Found ${agents.length} agents\n`)

    if (agents.length === 0) {
      console.log("❌ No agents found. Cannot test.")
      return
    }

    // Step 2: Test each agent's positions
    for (const agent of agents) {
      console.log(`\n${"=".repeat(60)}`)
      console.log(`🤖 Testing Agent: ${agent.name} (${agent.id})`)
      console.log(`${"=".repeat(60)}\n`)

      // Fetch positions
      console.log("📍 Fetching positions...")
      const posRes = await fetch(
        `http://localhost:3000/api/aster/positions?agentId=${agent.id}`
      )
      if (!posRes.ok) {
        console.log(`⚠️  Failed to fetch positions: ${posRes.status}`)
        continue
      }
      const posData = await posRes.json()
      const positions: any[] = posData.positions || []
      console.log(`✅ Found ${positions.length} positions`)

      if (positions.length === 0) {
        console.log("   (No open positions)")
        continue
      }

      // Fetch exit plans
      console.log("\n📍 Fetching exit plans...")
      const exitRes = await fetch(
        `http://localhost:3000/api/aster/exit-plans?agentId=${agent.id}`
      )
      if (!exitRes.ok) {
        console.log(`⚠️  Failed to fetch exit plans: ${exitRes.status}`)
        continue
      }
      const exitData = await exitRes.json()
      const exitPlans: any[] = exitData.exitPlans || []
      console.log(`✅ Found ${exitPlans.length} exit plans`)

      // Process each position
      console.log("\n📍 Calculating notional values...")
      console.log("─".repeat(60))

      for (const pos of positions) {
        // Skip zero-amount positions
        if (!pos.positionAmt || pos.positionAmt === 0) {
          console.log(`⏭️  Skipping position with zero amount: ${pos.symbol}`)
          continue
        }

        const coin = (pos.symbol || "").replace("USDT", "").trim()
        const leverage = pos.leverage ? `${pos.leverage}X` : "1X"

        // Find matching exit plan
        const exitPlan = exitPlans.find((ep: any) => ep.coin === coin)?.exitPlan || "N/A"

        // Get unrealized P&L (handle both field names)
        const unrealizedPnl = pos.unrealizedProfit ?? pos.unRealizedProfit ?? 0

        // Calculate notional
        const notional = Math.abs(pos.positionAmt * pos.markPrice)

        console.log(`\n  📊 Position: ${coin}`)
        console.log(
          `     Symbol: ${pos.symbol} | Side: ${
            pos.positionAmt > 0 ? "LONG" : "SHORT"
          }`
        )
        console.log(
          `     Amount: ${pos.positionAmt} | Mark Price: $${pos.markPrice}`
        )
        console.log(`     Leverage: ${leverage}`)
        console.log(`     Exit Plan: ${exitPlan}`)
        console.log(`     Unrealized P&L: $${unrealizedPnl.toFixed(2)}`)
        console.log(`     📈 NOTIONAL: $${notional.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`)

        // Debug: Check if calculation seems right
        if (notional === 0) {
          console.log(`     ⚠️  WARNING: Notional is $0!`)
          console.log(`        - positionAmt type: ${typeof pos.positionAmt}`)
          console.log(`        - positionAmt value: ${pos.positionAmt}`)
          console.log(`        - markPrice type: ${typeof pos.markPrice}`)
          console.log(`        - markPrice value: ${pos.markPrice}`)
        }
      }

      console.log("\n" + "─".repeat(60))
    }

    console.log("\n✅ Test completed!")
  } catch (error) {
    console.error("❌ Test failed:", error)
    process.exit(1)
  }
}

// Run the test
testNotionalCalculation()