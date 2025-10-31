/**
 * Production Start Script for Trading Bots
 * Runs all 5 agents in parallel with:
 * - Automatic restart on crash
 * - Graceful shutdown
 * - Health checks
 * - Detailed logging
 */

import { spawn } from "child_process"
import path from "path"
import { fileURLToPath } from "url"
import { createWriteStream } from "fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface Agent {
  name: string
  file: string
  color: string
  crashes: number
  lastCrashTime?: number
}

const agents: Agent[] = [
  {
    name: "Agent 1: Claude Arbitrage",
    file: "agents/agent1-claude.ts",
    color: "\x1b[36m", // Cyan
    crashes: 0,
  },
  {
    name: "Agent 2: GPT-4 Momentum",
    file: "agents/agent2-gpt4.ts",
    color: "\x1b[35m", // Magenta
    crashes: 0,
  },
  {
    name: "Agent 3: Gemini Grid",
    file: "agents/agent3-gemini.ts",
    color: "\x1b[33m", // Yellow
    crashes: 0,
  },
  {
    name: "Agent 4: DeepSeek ML",
    file: "agents/agent4-deepseek.ts",
    color: "\x1b[32m", // Green
    crashes: 0,
  },
  {
    name: "Agent 5: Buy & Hold",
    file: "agents/agent5-bh.ts",
    color: "\x1b[34m", // Blue
    crashes: 0,
  },
]

const colorReset = "\x1b[0m"
const processes: Map<
  string,
  {
    process: any
    color: string
    agent: Agent
  }
> = new Map()

// Setup logging
const logStream = createWriteStream(path.join(__dirname, "bots.log"), {
  flags: "a",
})

function log(message: string) {
  const timestamp = new Date().toISOString()
  console.log(message)
  logStream.write(`${timestamp} ${message}\n`)
}

function logColor(agent: Agent, message: string) {
  const coloredMsg = `${agent.color}[${agent.name}]${colorReset} ${message}`
  log(coloredMsg)
}

function startAgent(agent: Agent) {
  const process = spawn("node", ["--loader", "ts-node/esm", agent.file], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 0,
  })

  process.stdout?.on("data", (data) => {
    logColor(agent, data.toString().trim())
  })

  process.stderr?.on("data", (data) => {
    logColor(agent, `ERROR: ${data.toString().trim()}`)
  })

  process.on("error", (error) => {
    logColor(agent, `Process error: ${error}`)
  })

  process.on("exit", (code) => {
    if (code !== 0) {
      agent.crashes++
      agent.lastCrashTime = Date.now()
      logColor(agent, `Exited with code ${code} (Crash #${agent.crashes})`)

      // Exponential backoff: 5s, 10s, 20s, 40s, etc.
      const backoffMs = Math.min(5000 * Math.pow(2, agent.crashes - 1), 300000)
      logColor(agent, `Restarting in ${backoffMs / 1000}s...`)

      setTimeout(() => {
        logColor(agent, "Restarting...")
        startAgent(agent)
      }, backoffMs)
    } else {
      logColor(agent, "Exited gracefully")
    }
  })

  processes.set(agent.name, { process, color: agent.color, agent })
}

// Main startup
console.log("\n" + "=".repeat(60))
console.log("NOF1 Trading Bots - Production Mode")
console.log("=".repeat(60))
console.log(`Started: ${new Date().toISOString()}`)
console.log(`Redis: ${process.env.REDIS_URL || "localhost:6379"}`)
console.log(`Node Env: ${process.env.NODE_ENV || "production"}`)
console.log("=".repeat(60))
log(`\n🚀 Starting ${agents.length} trading agents in production mode...\n`)

agents.forEach((agent) => {
  startAgent(agent)
  console.log(`${agent.color}✓${colorReset} Scheduled: ${agent.name}`)
})

console.log("\n" + "=".repeat(60))
console.log("All agents scheduled. Press Ctrl+C to stop gracefully.\n")
console.log("Monitor logs: tail -f trading-bots/bots.log")
console.log("=".repeat(60) + "\n")

// Graceful shutdown
process.on("SIGINT", () => {
  log("\n\n⚠️  Received shutdown signal. Stopping agents gracefully...")

  let stoppedCount = 0
  const totalProcesses = processes.size

  processes.forEach(({ process: childProcess, agent }) => {
    logColor(agent, "Stopping...")
    childProcess.kill("SIGTERM")

    // Force kill after 10 seconds
    const forceKillTimeout = setTimeout(() => {
      if (!childProcess.killed) {
        logColor(agent, "Force killing (timeout)")
        childProcess.kill("SIGKILL")
      }
    }, 10000)

    childProcess.on("exit", () => {
      clearTimeout(forceKillTimeout)
      stoppedCount++
      logColor(agent, "Stopped ✓")

      if (stoppedCount === totalProcesses) {
        log("\n✓ All agents stopped. Exiting.")
        logStream.end()
        process.exit(0)
      }
    })
  })

  // Force exit after 30 seconds
  setTimeout(() => {
    log("\nForce exiting after 30s timeout")
    process.exit(1)
  }, 30000)
})

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  log(`UNCAUGHT EXCEPTION: ${error.message}`)
  log(error.stack || "")
})

process.on("unhandledRejection", (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`)
})

// Periodic status report
setInterval(() => {
  const stats = agents.map((a) => `${a.name}: ${a.crashes} crashes`).join(" | ")
  log(`📊 Status Check: ${stats}`)
}, 300000) // Every 5 minutes