/**
 * Verify Agent Funding
 * Checks current USDT balance for each agent
 * Usage: npx ts-node verify-funding.ts
 */

import dotenv from 'dotenv'
import { AsterClient } from "./lib/aster-client.ts"
import { AGENTS } from "./lib/funding-config.ts"

dotenv.config({ path: '.env.local' })

interface BalanceCheckResult {
  agent_id: string
  agent_name: string
  signer: string
  balance: number
  status: 'funded' | 'underfunded' | 'error'
  error?: string
  timestamp: string
}

class BalanceVerifier {
  private results: BalanceCheckResult[] = []

  /**
   * Create Aster client for an agent
   */
  private createClientForAgent(agent: typeof AGENTS[0]): AsterClient {
    // Use agent-specific credentials
    // agent.id format is 'agent_1', 'agent_2', etc.
    const agentNum = agent.id.split('_')[1]
    const apiKeyVar = `AGENT_${agentNum}_API_KEY`
    const apiSecretVar = `AGENT_${agentNum}_API_SECRET`
    
    const apiKey = process.env[apiKeyVar]
    const apiSecret = process.env[apiSecretVar]

    if (!apiKey || !apiSecret) {
      throw new Error(`Missing agent credentials: ${apiKeyVar} or ${apiSecretVar}`)
    }

    return new AsterClient({
      agentId: agent.id,
      signer: agent.signer,
      agentPrivateKey: '', // Not needed for balance check
      userAddress: agent.signer, // Use agent's signer as the trading address
      userApiKey: apiKey,
      userApiSecret: apiSecret,
    })
  }

  /**
   * Check balance for a single agent
   */
  async checkAgentBalance(agent: typeof AGENTS[0]): Promise<BalanceCheckResult> {
    const result: BalanceCheckResult = {
      agent_id: agent.id,
      agent_name: agent.name,
      signer: agent.signer,
      balance: 0,
      status: 'error',
      timestamp: new Date().toISOString(),
    }

    try {
      const client = this.createClientForAgent(agent)
      
      // Get account info to check balance
      const accountInfo = await client.getAccountInfo()
      const balance = accountInfo.equity || 0

      result.balance = balance
      result.status = balance >= 50 ? 'funded' : 'underfunded'
      
      return result
    } catch (error: any) {
      result.error = error?.message || String(error)
      result.status = 'error'
      return result
    }
  }

  /**
   * Check all agent balances
   */
  async checkAllBalances(): Promise<BalanceCheckResult[]> {
    console.log('\n' + '='.repeat(70))
    console.log('🔍 AGENT BALANCE VERIFICATION')
    console.log('='.repeat(70) + '\n')

    console.log('Checking balances for all agents...\n')

    for (const agent of AGENTS) {
      console.log(`📊 Checking ${agent.name}...`)
      const result = await this.checkAgentBalance(agent)
      this.results.push(result)

      if (result.status === 'error') {
        console.log(`   ❌ Error: ${result.error}\n`)
      } else {
        const statusIcon = result.status === 'funded' ? '✅' : '⚠️'
        console.log(`   ${statusIcon} Balance: $${result.balance.toFixed(2)} USDT`)
        console.log(`   Status: ${result.status === 'funded' ? 'Funded' : 'Underfunded (< $50)'}\n`)
      }
    }

    return this.results
  }

  /**
   * Print summary
   */
  printSummary(): void {
    console.log('='.repeat(70))
    console.log('📋 BALANCE SUMMARY')
    console.log('='.repeat(70) + '\n')

    const funded = this.results.filter(r => r.status === 'funded')
    const underfunded = this.results.filter(r => r.status === 'underfunded')
    const errors = this.results.filter(r => r.status === 'error')

    console.log(`✅ Funded (≥ $50): ${funded.length}/${this.results.length}`)
    console.log(`⚠️  Underfunded (< $50): ${underfunded.length}/${this.results.length}`)
    console.log(`❌ Errors: ${errors.length}/${this.results.length}\n`)

    console.log('Agent Balances:')
    console.log('-'.repeat(70))
    
    this.results.forEach(result => {
      let statusIcon = '❓'
      if (result.status === 'funded') statusIcon = '✅'
      else if (result.status === 'underfunded') statusIcon = '⚠️'
      else if (result.status === 'error') statusIcon = '❌'

      const balance = result.status === 'error' 
        ? 'N/A' 
        : `$${result.balance.toFixed(2)} USDT`
      
      console.log(`${statusIcon} ${result.agent_name.padEnd(25)} | ${balance.padEnd(15)} | ${result.signer.slice(0, 10)}...`)
    })

    console.log('-'.repeat(70) + '\n')

    const totalBalance = this.results
      .filter(r => r.status !== 'error')
      .reduce((sum, r) => sum + r.balance, 0)

    console.log(`💼 Total Balance Across Agents: $${totalBalance.toFixed(2)} USDT`)

    if (underfunded.length > 0) {
      console.log(`\n⚠️  WARNING: ${underfunded.length} agent(s) need funding!`)
      console.log('Run: npx ts-node fund-agents.ts --amount 50\n')
    }

    if (errors.length > 0) {
      console.log(`\n❌ ${errors.length} agent(s) had errors checking balances`)
      errors.forEach(e => {
        console.log(`   - ${e.agent_name}: ${e.error}`)
      })
      console.log('')
    }

    console.log('='.repeat(70) + '\n')
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const verifier = new BalanceVerifier()
    const results = await verifier.checkAllBalances()
    verifier.printSummary()

    // Exit with warning code if any agent is underfunded (but not error)
    if (results.some(r => r.status === 'underfunded')) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main()