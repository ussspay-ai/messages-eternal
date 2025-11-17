/**
 * Test Chat Generation System
 * 
 * Usage: node test-chat-system.js
 * 
 * Tests:
 * 1. Diagnostic endpoint - checks all APIs and positions
 * 2. Position fetching - for each agent
 * 3. Market prices - verifies pricing endpoint
 * 4. Chat generation - tries to generate messages
 */

const BASE_URL = process.env.BASE_URL || process.env.VERCEL_URL || "http://localhost:3000"

async function runDiagnostics() {
  console.log("🔍 Running Chat Generation Diagnostics...\n")
  
  try {
    const response = await fetch(`${BASE_URL}/api/chat/diagnostics`)
    const diagnostics = await response.json()
    
    console.log("📋 API KEYS STATUS:")
    Object.entries(diagnostics.apiKeys).forEach(([key, value]) => {
      console.log(`  ${value ? "✅" : "❌"} ${key}`)
    })
    
    console.log("\n👥 AGENT CREDENTIALS:")
    Object.entries(diagnostics.agentCredentials).forEach(([agent, valid]) => {
      console.log(`  ${valid ? "✅" : "❌"} ${agent}`)
    })
    
    console.log("\n📍 POSITION FETCHES:")
    Object.entries(diagnostics.positionsFetch).forEach(([agent, data]) => {
      const status = data.ok ? "✅" : "❌"
      const count = data.count ? ` (${data.count} positions)` : ""
      console.log(`  ${status} ${agent}${count}${data.error ? ` - ${data.error}` : ""}`)
    })
    
    console.log("\n💰 MARKET PRICES:")
    if (diagnostics.marketPrices?.ok) {
      console.log(`  ✅ Endpoint OK - ${diagnostics.marketPrices.symbols?.length || 0} symbols`)
    } else {
      console.log(`  ❌ Endpoint failed - ${diagnostics.marketPrices?.error || "Unknown error"}`)
    }
    
    console.log("\n📊 SUMMARY:")
    console.log(`  All LLMs Configured: ${diagnostics.summary.allLLMsConfigured ? "✅ YES" : "❌ NO"}`)
    console.log(`  All Agents Ready: ${diagnostics.summary.allAgentsConfigured ? "✅ YES" : "❌ NO"}`)
    console.log(`  Has Real Positions: ${diagnostics.summary.hasPositions ? "✅ YES" : "❌ NO (will use synthetic)"}`)
    console.log(`  Market Data OK: ${diagnostics.summary.marketDataOk ? "✅ YES" : "❌ NO"}`)
    console.log(`  Critical Errors: ${diagnostics.summary.totalErrors}`)
    
    if (diagnostics.errors.length > 0) {
      console.log("\n⚠️  ERRORS FOUND:")
      diagnostics.errors.forEach(err => {
        console.log(`  • ${err}`)
      })
    }
    
    console.log("\n" + "=".repeat(60))
    console.log("NEXT STEPS:")
    
    if (!diagnostics.summary.allLLMsConfigured) {
      console.log("1. ❌ Some LLM APIs are not configured. Check .env.local:")
      console.log("   - ANTHROPIC_API_KEY")
      console.log("   - OPENAI_API_KEY")
      console.log("   - GOOGLE_API_KEY")
      console.log("   - DEEPSEEK_API_KEY")
      console.log("   - GROK_API_KEY")
    } else {
      console.log("1. ✅ All LLM APIs are configured")
    }
    
    if (!diagnostics.summary.allAgentsConfigured) {
      console.log("2. ❌ Some agent credentials are missing. Check .env.local:")
      console.log("   - AGENT_*_SIGNER")
      console.log("   - AGENT_*_API_KEY")
      console.log("   - AGENT_*_API_SECRET")
    } else {
      console.log("2. ✅ All agent credentials are configured")
    }
    
    if (!diagnostics.summary.hasPositions) {
      console.log("3. ⚠️  No real positions found - using synthetic positions (this is OK for testing)")
      console.log("   Real positions will work when trading bots are running and holding positions")
    } else {
      console.log("3. ✅ Real positions found from trading bots")
    }
    
    if (!diagnostics.summary.marketDataOk) {
      console.log("4. ❌ Market price endpoint is failing - agents won't have price context")
    } else {
      console.log("4. ✅ Market prices are accessible")
    }
    
  } catch (error) {
    console.error("❌ Diagnostics request failed:", error.message)
    console.error("\nMake sure:")
    console.error("1. Server is running: npm run dev")
    console.error("2. BASE_URL is correct:", BASE_URL)
    console.error("3. .env.local is configured with API keys")
  }
}

runDiagnostics()