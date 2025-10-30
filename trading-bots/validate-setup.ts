#!/usr/bin/env ts-node
/**
 * AI Agent Trading Setup Validator
 * Checks all configuration before running agents
 */

import dotenv from "dotenv"
import path from "path"
import fs from "fs"

dotenv.config({ path: ".env.local" })

interface ValidationResult {
  name: string
  status: "✅" | "⚠️" | "❌"
  message: string
  critical: boolean
}

const results: ValidationResult[] = []

// Colors for terminal
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
}

function check(name: string, condition: boolean, message: string, critical = true) {
  results.push({
    name,
    status: condition ? "✅" : critical ? "❌" : "⚠️",
    message,
    critical,
  })
}

console.log(`\n${colors.cyan}${colors.bright}🤖 AI AGENT TRADING SETUP VALIDATOR${colors.reset}\n`)

// ============ CRITICAL: Aster API Configuration ============
console.log(`${colors.bright}━━━ Aster DEX API Configuration ━━━${colors.reset}`)

const userAddress = process.env.ASTER_USER_ADDRESS
check(
  "User Address",
  !!userAddress && userAddress.startsWith("0x") && userAddress.length === 42,
  userAddress ? `Configured: ${userAddress.substring(0, 10)}...` : "NOT SET - Required!",
  true
)

const userApiKey = process.env.ASTER_USER_API_KEY
check(
  "API Key",
  !!userApiKey && userApiKey.length > 20,
  userApiKey ? `Configured: ${userApiKey.substring(0, 10)}...` : "NOT SET - Required!",
  true
)

const userApiSecret = process.env.ASTER_USER_SECRET_KEY
check(
  "API Secret",
  !!userApiSecret && userApiSecret.length > 20,
  userApiSecret ? `Configured: ${userApiSecret.substring(0, 10)}...` : "NOT SET - Required!",
  true
)

// ============ CRITICAL: Agent Configuration ============
console.log(`\n${colors.bright}━━━ Trading Agent Configuration ━━━${colors.reset}`)

const agents = [
  { num: 1, name: "Claude (Arbitrage)" },
  { num: 2, name: "GPT-4 (Momentum)" },
  { num: 3, name: "Gemini (Grid)" },
  { num: 4, name: "DeepSeek (ML)" },
  { num: 5, name: "B&H (Buy & Hold)" },
]

agents.forEach((agent) => {
  const signer = process.env[`AGENT_${agent.num}_SIGNER`]
  const privKey = process.env[`AGENT_${agent.num}_PRIVATE_KEY`]

  check(
    `Agent ${agent.num}: ${agent.name}`,
    !!signer &&
      signer.startsWith("0x") &&
      signer.length === 42 &&
      !!privKey &&
      privKey.startsWith("0x") &&
      privKey.length === 66,
    signer && privKey
      ? `✓ Signer: ${signer.substring(0, 10)}... | Key: ${privKey.substring(0, 10)}...`
      : "⚠️ Missing signer or private key"
  )
})

// ============ OPTIONAL: Strategy Configuration ============
console.log(`\n${colors.bright}━━━ Optional Configuration ━━━${colors.reset}`)

const tradingSymbol = process.env.TRADING_SYMBOL
check(
  "Trading Symbol",
  !!tradingSymbol,
  tradingSymbol || "Not set - will default to ETHUSDT",
  false
)

const redisUrl = process.env.REDIS_URL
check(
  "Redis URL",
  !!redisUrl,
  redisUrl || "Not set - optional for local testing",
  false
)

const supabaseUrl = process.env.SUPABASE_URL
check(
  "Supabase URL",
  !!supabaseUrl,
  supabaseUrl ? `Configured: ${supabaseUrl.substring(0, 20)}...` : "Not set - optional",
  false
)

// ============ FILE SYSTEM CHECKS ============
console.log(`\n${colors.bright}━━━ File System Checks ━━━${colors.reset}`)

const requiredFiles = [
  "lib/aster-client.ts",
  "lib/market-analyzer.ts",
  "lib/risk-manager.ts",
  "strategies/claude-arbitrage.ts",
  "strategies/gpt4-momentum.ts",
  "strategies/gemini-grid.ts",
  "strategies/deepseek-ml.ts",
  "base-strategy.ts",
]

requiredFiles.forEach((file) => {
  const fullPath = path.join(process.cwd(), file)
  const exists = fs.existsSync(fullPath)
  check(`File: ${file}`, exists, exists ? "Found" : `Missing: ${fullPath}`, true)
})

// ============ ENVIRONMENT FILE CHECK ============
console.log(`\n${colors.bright}━━━ Environment Configuration ━━━${colors.reset}`)

const envPath = path.join(process.cwd(), ".env.local")
const envExists = fs.existsSync(envPath)
check(".env.local exists", envExists, envExists ? "File found" : "File not found - copy from .env.example", true)

const envExamplePath = path.join(process.cwd(), ".env.example")
const envExampleExists = fs.existsSync(envExamplePath)
check(".env.example exists", envExampleExists, envExampleExists ? "Reference file found" : "Missing", false)

// ============ PRINT RESULTS ============
console.log(`\n${colors.bright}━━━ VALIDATION RESULTS ━━━${colors.reset}\n`)

results.forEach((r) => {
  const statusColor =
    r.status === "✅"
      ? colors.green
      : r.status === "❌"
        ? colors.red
        : colors.yellow
  console.log(`${statusColor}${r.status}${colors.reset} ${r.name.padEnd(30)} ${r.message}`)
})

// ============ FINAL VERDICT ============
const hasCriticalErrors = results.some((r) => r.status === "❌" && r.critical)
const hasErrors = results.some((r) => r.status === "❌")
const hasWarnings = results.some((r) => r.status === "⚠️")

console.log(`\n${colors.bright}━━━ SUMMARY ━━━${colors.reset}\n`)

if (hasCriticalErrors) {
  console.log(
    `${colors.red}${colors.bright}❌ SETUP NOT READY${colors.reset}\n` +
      `${colors.red}Critical errors found. Please fix the issues above before running agents.${colors.reset}\n` +
      `${colors.yellow}See AI_AGENT_LIVE_TRADING_SETUP.md for detailed instructions.${colors.reset}\n`
  )
  process.exit(1)
} else if (hasErrors) {
  console.log(
    `${colors.yellow}${colors.bright}⚠️  SETUP INCOMPLETE${colors.reset}\n` +
      `${colors.yellow}Some important settings are missing.${colors.reset}\n`
  )
} else if (hasWarnings) {
  console.log(
    `${colors.yellow}${colors.bright}✓ SETUP READY (WITH WARNINGS)${colors.reset}\n` +
      `${colors.yellow}Some optional features are not configured.${colors.reset}\n` +
      `${colors.green}Agents can still run, but consider adding optional settings.${colors.reset}\n`
  )
} else {
  console.log(
    `${colors.green}${colors.bright}✅ SETUP COMPLETE!${colors.reset}\n` +
      `${colors.green}All systems ready for live trading.${colors.reset}\n`
  )
}

// ============ RECOMMENDATIONS ============
console.log(`${colors.bright}📋 Next Steps:${colors.reset}`)
console.log(`\n1. Start all agents:`)
console.log(`   ${colors.cyan}npm run start:all${colors.reset}`)
console.log(`\n2. Monitor in dashboard:`)
console.log(`   ${colors.cyan}http://localhost:3000/dashboard${colors.reset}`)
console.log(`\n3. For individual agent start:`)
agents.forEach((agent) => {
  console.log(`   Agent ${agent.num}: ${colors.cyan}npx ts-node agents/agent${agent.num}-*.ts${colors.reset}`)
})

console.log(`\n4. View position sizes & limits:`)
console.log(`   ${colors.cyan}cat AI_AGENT_LIVE_TRADING_SETUP.md | grep -A 10 "Position Sizing"${colors.reset}`)
console.log()