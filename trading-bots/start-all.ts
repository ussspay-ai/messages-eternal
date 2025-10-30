/**
 * Start All Trading Bots
 * Runs all 5 agents in parallel
 */

import { spawn } from "child_process"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const agents = [
  {
    name: "Agent 1: Claude Arbitrage",
    file: "agents/agent1-claude.ts",
    color: "\x1b[36m", // Cyan
  },
  {
    name: "Agent 2: GPT-4 Momentum",
    file: "agents/agent2-gpt4.ts",
    color: "\x1b[35m", // Magenta
  },
  {
    name: "Agent 3: Gemini Grid",
    file: "agents/agent3-gemini.ts",
    color: "\x1b[33m", // Yellow
  },
  {
    name: "Agent 4: DeepSeek ML",
    file: "agents/agent4-deepseek.ts",
    color: "\x1b[32m", // Green
  },
  {
    name: "Agent 5: Buy & Hold",
    file: "agents/agent5-bh.ts",
    color: "\x1b[34m", // Blue
  },
]

console.log("\n" + "=".repeat(60))
console.log("      NOF1 Trading Platform - Bot Launcher")
console.log("=".repeat(60))
console.log(`\nStarting ${agents.length} trading agents...\n`)

const processes: { name: string; process: any; color: string }[] = []

agents.forEach((agent) => {
  const process = spawn("node", ["--loader", "ts-node/esm", agent.file], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
  })

  const colorReset = "\x1b[0m"

  process.stdout?.on("data", (data) => {
    console.log(`${agent.color}[${agent.name}]${colorReset} ${data.toString().trim()}`)
  })

  process.stderr?.on("data", (data) => {
    console.error(`${agent.color}[${agent.name}]${colorReset} ${data.toString().trim()}`)
  })

  process.on("error", (error) => {
    console.error(`${agent.color}[${agent.name}]${colorReset} Process error:`, error)
  })

  process.on("exit", (code) => {
    console.warn(`${agent.color}[${agent.name}]${colorReset} Exited with code ${code}`)
  })

  processes.push({ name: agent.name, process, color: agent.color })
  console.log(`${agent.color}✓${"\x1b[0m"} Launched: ${agent.name}`)
})

console.log("\n" + "=".repeat(60))
console.log("All agents running. Press Ctrl+C to stop.\n")

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down agents...")
  processes.forEach(({ name, process, color }) => {
    process.kill()
    console.log(`${color}✓${"\x1b[0m"} Stopped: ${name}`)
  })
  setTimeout(() => {
    console.log("\nAll agents stopped.")
    process.exit(0)
  }, 2000)
})