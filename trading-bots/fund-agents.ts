/**
 * Fund Agents Script
 * Distributes USDT from main account to agent wallets
 * Usage: npx ts-node fund-agents.ts --amount 50 --dry-run
 */

import dotenv from 'dotenv'
import { AsterClient } from "./lib/aster-client.ts"
import { AGENTS, DEFAULT_FUNDING_CONFIG, validateFundingAmount, FundingResult } from "./lib/funding-config.ts"
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

// Initialize Supabase client for funding history
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

interface CommandLineArgs {
  amount?: number
  dryRun: boolean
  symbol?: string
}

class AgentFundingManager {
  private asterClient: AsterClient
  private mainAddress: string
  private results: FundingResult[] = []

  constructor() {
    const mainAddress = process.env.ASTER_USER_ADDRESS
    if (!mainAddress) {
      throw new Error('ASTER_USER_ADDRESS not configured')
    }

    const apiKey = process.env.ASTER_USER_API_KEY
    if (!apiKey) {
      throw new Error('ASTER_USER_API_KEY not configured')
    }

    const apiSecret = process.env.ASTER_USER_SECRET_KEY
    if (!apiSecret) {
      throw new Error('ASTER_USER_SECRET_KEY not configured')
    }

    this.mainAddress = mainAddress
    this.asterClient = new AsterClient({
      agentId: 'FundingManager',
      signer: mainAddress,
      agentPrivateKey: '', // Not needed for funding
      userAddress: mainAddress,
      userApiKey: apiKey,
      userApiSecret: apiSecret,
    })
  }

  /**
   * Get USDT contract address from Aster DEX
   */
  async getUSDTAddress(): Promise<string> {
    try {
      console.log('📡 Fetching USDT contract address from Aster DEX...')
      
      // Get exchange info to find USDT token address
      const response = await fetch('https://fapi.asterdex.com/fapi/v1/exchangeInfo')
      const data = await response.json() as any
      
      // Look for USDT in assets
      if (data.assets) {
        const usdtAsset = data.assets.find((a: any) => a.asset === 'USDT')
        if (usdtAsset) {
          console.log(`✅ Found USDT: ${usdtAsset.assetCode}`)
          return usdtAsset.assetCode
        }
      }
      
      // Fallback to common USDT address on the chain
      const fallbackUSDT = '0xdac17f958d2ee523a2206206994597c13d831ec7' // Common USDT address
      console.log(`⚠️  Using fallback USDT address: ${fallbackUSDT}`)
      return fallbackUSDT
    } catch (error) {
      console.error('❌ Error fetching USDT address:', error)
      throw error
    }
  }

  /**
   * Verify agent wallets are configured
   */
  private validateAgents(): void {
    const invalidAgents = AGENTS.filter(a => !a.signer || a.signer === '0x')
    
    if (invalidAgents.length > 0) {
      console.error('❌ Invalid agent configurations:')
      invalidAgents.forEach(a => {
        console.error(`   - ${a.name}: missing signer address`)
      })
      throw new Error('Some agent addresses are not configured')
    }
  }

  /**
   * Get main account balance
   */
  async getMainAccountBalance(): Promise<number> {
    try {
      const stats = await this.asterClient.getWalletBalance()
      return stats
    } catch (error: any) {
      console.error('❌ Error fetching main account balance:', error)
      throw error
    }
  }

  /**
   * Perform funding with retry logic
   */
  async fundAgent(
    agent: typeof AGENTS[0],
    amount: number,
    dryRun: boolean,
    maxRetries: number = 3
  ): Promise<FundingResult> {
    const result: FundingResult = {
      agent_id: agent.id,
      agent_name: agent.name,
      signer: agent.signer,
      amount,
      status: 'pending',
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (dryRun) {
          console.log(`   [DRY-RUN] Would transfer ${amount} USDT to ${agent.name} (${agent.signer})`)
          result.status = 'success'
          result.tx_hash = `0xdry_${agent.id}_${Date.now()}`
          return result
        }

        // Actual transfer to agent wallet
        console.log(`   Attempt ${attempt}/${maxRetries}: Transferring ${amount} USDT to ${agent.name}...`)
        
        const transferResult = await this.asterClient.transferUSDT(agent.signer, amount)
        
        console.log(`   ✅ Transfer successful! TX: ${transferResult.txHash}`)
        result.status = 'success'
        result.tx_hash = transferResult.txHash
        return result
      } catch (error: any) {
        const errorMsg = error?.message || String(error)
        console.error(`   ❌ Attempt ${attempt} failed: ${errorMsg}`)
        result.error = errorMsg
        result.attempts = attempt

        if (attempt < maxRetries) {
          const delayMs = DEFAULT_FUNDING_CONFIG.retryDelayMs * attempt
          console.log(`   ⏳ Retrying in ${delayMs}ms...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      }
    }

    result.status = 'failed'
    return result
  }

  /**
   * Fund all agents
   */
  async fundAllAgents(config: {
    amount: number
    dryRun: boolean
    maxRetries?: number
  }): Promise<FundingResult[]> {
    try {
      this.validateAgents()
      
      const validation = validateFundingAmount(config.amount)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      const requiredTotal = config.amount * AGENTS.length

      console.log('\n' + '='.repeat(70))
      console.log('🚀 AGENT FUNDING MANAGER')
      console.log('='.repeat(70))
      console.log(`📍 Main Account: ${this.mainAddress}`)
      console.log(`💰 Amount per Agent: $${config.amount} USDT`)
      console.log(`📊 Total to Distribute: $${requiredTotal} USDT`)
      console.log(`🔄 Mode: ${config.dryRun ? 'DRY-RUN' : 'LIVE'}`)
      console.log(`🎯 Agents: ${AGENTS.length}`)
      console.log('='.repeat(70) + '\n')

      if (config.dryRun) {
        console.log('⚠️  DRY-RUN MODE: No actual transfers will be made\n')
      } else {
        // Check balance for real funding
        try {
          const mainBalance = await this.getMainAccountBalance()
          console.log(`💼 Main Account Balance: $${mainBalance.toFixed(2)} USDT`)
          console.log(`💰 Required Total: $${requiredTotal} USDT\n`)

          if (mainBalance < requiredTotal) {
            const shortfall = requiredTotal - mainBalance
            console.error(
              `\n❌ INSUFFICIENT BALANCE!\n` +
              `   Have: $${mainBalance.toFixed(2)} USDT\n` +
              `   Need: $${requiredTotal} USDT\n` +
              `   Shortfall: $${shortfall.toFixed(2)} USDT\n`
            )
            throw new Error(
              `Insufficient funds. Have $${mainBalance}, need $${requiredTotal} USDT`
            )
          }
          console.log('✅ Sufficient balance confirmed\n')
        } catch (error: any) {
          if (error?.message?.includes('Insufficient')) {
            throw error
          }
          console.error(`⚠️  Warning: Could not verify balance (${error?.message || 'unknown error'})`)
          console.log('Proceeding with funding anyway...\n')
        }
      }

      // Fund each agent
      console.log('🔄 Funding agents...\n')
      for (const agent of AGENTS) {
        const result = await this.fundAgent(
          agent,
          config.amount,
          config.dryRun,
          config.maxRetries || DEFAULT_FUNDING_CONFIG.maxRetries
        )
        this.results.push(result)
      }

      return this.results
    } catch (error) {
      console.error('\n❌ Fatal error:', error)
      throw error
    }
  }

  /**
   * Save funding results to database
   */
  async saveFundingResults(dryRun: boolean): Promise<void> {
    if (!supabase) {
      console.warn('⚠️  Supabase not configured, skipping funding history save')
      return
    }

    console.log('\n💾 Saving funding history to database...')
    let successCount = 0
    let failureCount = 0

    for (const result of this.results) {
      try {
        const record = {
          agent_id: result.agent_id,
          agent_name: result.agent_name,
          amount: result.amount,
          status: result.status,
          tx_hash: result.tx_hash || null,
          error_message: result.error || null,
          dry_run: dryRun,
        }

        const { error } = await supabase
          .from('funding_history')
          .insert([record])

        if (error) {
          console.error(`  ❌ Failed to save ${result.agent_name}: ${error.message}`)
          failureCount++
        } else {
          console.log(`  ✅ Saved: ${result.agent_name}`)
          successCount++
        }
      } catch (error: any) {
        console.error(`  ❌ Error saving ${result.agent_name}: ${error?.message || error}`)
        failureCount++
      }
    }

    console.log(`\n✅ Database save complete: ${successCount} saved, ${failureCount} failed\n`)
  }

  /**
   * Print summary of funding results
   */
  printSummary(): void {
    console.log('\n' + '='.repeat(70))
    console.log('📋 FUNDING SUMMARY')
    console.log('='.repeat(70) + '\n')

    const successful = this.results.filter(r => r.status === 'success')
    const failed = this.results.filter(r => r.status === 'failed')

    console.log(`✅ Successful: ${successful.length}/${this.results.length}`)
    console.log(`❌ Failed: ${failed.length}/${this.results.length}\n`)

    console.log('Agent Funding Status:')
    console.log('-'.repeat(70))
    
    this.results.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌'
      const amount = result.status === 'success' ? `$${result.amount} USDT` : `Failed`
      const info = result.status === 'success' 
        ? `TX: ${result.tx_hash?.slice(0, 16)}...`
        : `Error: ${result.error?.slice(0, 40)}...`
      
      console.log(`${status} ${result.agent_name.padEnd(25)} | ${amount.padEnd(15)} | ${info}`)
    })

    console.log('-'.repeat(70) + '\n')

    if (failed.length > 0) {
      console.log('Failed agents details:')
      failed.forEach(result => {
        console.log(`  - ${result.agent_name}: ${result.error}`)
      })
      console.log('')
    }

    const totalFunded = successful.reduce((sum, r) => sum + r.amount, 0)
    console.log(`💼 Total Funded: $${totalFunded} USDT`)
    console.log('='.repeat(70) + '\n')
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): CommandLineArgs {
  const args: CommandLineArgs = {
    dryRun: false,
  }

  process.argv.slice(2).forEach((arg, i, arr) => {
    if (arg === '--amount' && i + 1 < arr.length) {
      args.amount = parseFloat(arr[i + 1])
    }
    if (arg === '--dry-run') {
      args.dryRun = true
    }
    if (arg === '--symbol' && i + 1 < arr.length) {
      args.symbol = arr[i + 1]
    }
  })

  return args
}

/**
 * Main execution
 */
async function main() {
  try {
    const args = parseArgs()
    const amount = args.amount || DEFAULT_FUNDING_CONFIG.amount
    
    const manager = new AgentFundingManager()
    const results = await manager.fundAllAgents({
      amount,
      dryRun: args.dryRun,
      maxRetries: DEFAULT_FUNDING_CONFIG.maxRetries,
    })

    manager.printSummary()

    // Save funding history to database
    await manager.saveFundingResults(args.dryRun)

    // Exit with error if any funding failed (unless dry-run)
    if (!args.dryRun && results.some(r => r.status === 'failed')) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main()