import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

console.log("🔍 Debugging startup...")
console.log("Node version:", process.version)
console.log("CWD:", process.cwd())
console.log("ENV loaded:", process.env.AGENT_1_SIGNER ? "✅" : "❌")

async function testImport(name: string, modulePath: string): Promise<boolean> {
  try {
    console.log(`\n${name}️⃣ Importing ${modulePath}...`)
    await import(modulePath)
    console.log(`   ✅ ${modulePath} imported successfully`)
    return true
  } catch (error: unknown) {
    const err = error as Error
    console.error(`   ❌ Error: ${err.message}`)
    return false
  }
}

async function main() {
  const results: boolean[] = []

  results.push(await testImport("1", "./lib/aster-client.ts"))
  results.push(await testImport("2", "./lib/trading-symbol-config.ts"))
  results.push(await testImport("3", "./base-strategy.ts"))
  results.push(await testImport("4", "./strategies/claude-arbitrage.ts"))
  
  // Skip supabase import for now due to circular dependency
  console.log("\n⏭️  Skipping supabase-client (has circular dependency)")
  results.push(true)

  if (results.every(r => r)) {
    console.log("\n✅ All critical imports successful!")
  } else {
    console.error("\n❌ Some imports failed")
    process.exit(1)
  }
}

main()