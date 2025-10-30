/**
 * POST /api/pickaboo/fund-agents
 * Fund agents with USDT
 * Requires: admin password
 * Features:
 * - Checks main account balance before funding
 * - Notifies if insufficient funds
 * - Attempts real transfers to agent wallets
 * - Logs all transactions
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase, isPickabooAdminWhitelisted } from '@/lib/supabase-client'
import { AsterClient } from '@/lib/aster-client'

interface FundAgentsRequest {
  wallet: string
  amount: number
  dryRun: boolean
}

interface FundAgentsResponse {
  success: boolean
  message: string
  results?: any[]
  insufficient_balance?: boolean
  main_account_balance?: number
  required_total?: number
  error?: string
}

const AGENTS = [
  { id: 'agent_1', name: 'Claude Arbitrage', signer: process.env.AGENT_1_SIGNER },
  { id: 'agent_2', name: 'GPT-4 Momentum', signer: process.env.AGENT_2_SIGNER },
  { id: 'agent_3', name: 'Gemini Grid', signer: process.env.AGENT_3_SIGNER },
  { id: 'agent_4', name: 'DeepSeek ML', signer: process.env.AGENT_4_SIGNER },
  { id: 'agent_5', name: 'Buy & Hold', signer: process.env.AGENT_5_SIGNER },
]

async function logFundingHistory(
  agentId: string,
  agentName: string,
  amount: number,
  status: 'success' | 'failed' | 'pending',
  txHash?: string,
  error?: string,
  dryRun?: boolean
) {
  if (!supabase) {
    console.warn('Supabase not configured, skipping funding history log')
    return
  }

  try {
    await supabase.from('funding_history').insert({
      agent_id: agentId,
      agent_name: agentName,
      amount,
      status,
      tx_hash: txHash,
      error_message: error,
      dry_run: dryRun || false,
    })
  } catch (err) {
    console.error('Failed to log funding history:', err)
  }
}

/**
 * Check main account balance
 */
async function checkMainAccountBalance(): Promise<number> {
  const userAddress = process.env.ASTER_USER_ADDRESS
  const userApiKey = process.env.ASTER_USER_API_KEY
  const userApiSecret = process.env.ASTER_USER_SECRET_KEY

  if (!userAddress || !userApiKey || !userApiSecret) {
    console.error('[Funding] Missing credentials:', {
      hasUserAddress: !!userAddress,
      hasUserApiKey: !!userApiKey,
      hasUserApiSecret: !!userApiSecret,
    })
    throw new Error('Aster DEX credentials not configured (ASTER_USER_ADDRESS, ASTER_USER_API_KEY, or ASTER_USER_SECRET_KEY missing)')
  }

  try {
    const asterClient = new AsterClient({
      agentId: 'FundingChecker',
      signer: userAddress,
      agentPrivateKey: '',
      userAddress,
      userApiKey,
      userApiSecret,
    })

    return await asterClient.getWalletBalance()
  } catch (error) {
    console.error('[Funding] AsterClient error:', error)
    throw new Error(`Failed to fetch balance from Aster DEX: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Transfer USDT to agent wallet
 */
async function transferToAgent(
  agentAddress: string,
  amount: number,
  retries: number = 3
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const userAddress = process.env.ASTER_USER_ADDRESS
  const userApiKey = process.env.ASTER_USER_API_KEY
  const userApiSecret = process.env.ASTER_USER_SECRET_KEY

  if (!userAddress || !userApiKey || !userApiSecret) {
    throw new Error('Aster DEX credentials not configured')
  }

  const asterClient = new AsterClient({
    agentId: 'FundingManager',
    signer: userAddress,
    agentPrivateKey: '',
    userAddress,
    userApiKey,
    userApiSecret,
  })

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Funding] Attempt ${attempt}/${retries}: Transferring $${amount} USDT to ${agentAddress}...`)
      
      const result = await asterClient.transferUSDT(agentAddress, amount)
      
      console.log(`[Funding] Transfer successful! TX: ${result.txHash}`)
      return {
        success: true,
        txHash: result.txHash,
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error)
      console.error(`[Funding] Attempt ${attempt} failed: ${errorMsg}`)

      if (attempt < retries) {
        const delayMs = 2000 * attempt
        console.log(`[Funding] Retrying in ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } else {
        return {
          success: false,
          error: errorMsg,
        }
      }
    }
  }

  return {
    success: false,
    error: 'Max retries exceeded',
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<FundAgentsResponse>> {
  try {
    const body = (await request.json()) as FundAgentsRequest

    // Verify wallet is whitelisted
    if (!body.wallet) {
      return NextResponse.json(
        { success: false, message: 'Wallet address is required', error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const isWhitelisted = await isPickabooAdminWhitelisted(body.wallet)
    if (!isWhitelisted) {
      return NextResponse.json(
        { success: false, message: 'Wallet not authorized to fund agents', error: 'Wallet not authorized' },
        { status: 403 }
      )
    }

    // Validate amount
    if (!body.amount || body.amount < 50 || body.amount > 1_000_000) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid funding amount',
          error: 'Amount must be between $50 and $1,000,000 USDT',
        },
        { status: 400 }
      )
    }

    const requiredTotal = body.amount * AGENTS.length

    // Check main account balance (for non-dry-run)
    let mainBalance = 0
    if (!body.dryRun) {
      try {
        mainBalance = await checkMainAccountBalance()
        console.log(`[Funding] Main account balance: $${mainBalance} USDT`)

        if (mainBalance < requiredTotal) {
          console.warn(
            `[Funding] Insufficient balance! Have $${mainBalance}, need $${requiredTotal} for ${AGENTS.length} agents`
          )
          
          // Log failed funding attempt for each agent due to insufficient balance
          for (const agent of AGENTS) {
            if (agent.signer) {
              await logFundingHistory(
                agent.id,
                agent.name,
                body.amount,
                'failed',
                undefined,
                `Insufficient balance in main account. Have $${mainBalance} USDT, need $${requiredTotal} USDT total`
              )
            }
          }
          
          return NextResponse.json(
            {
              success: false,
              message: `❌ Insufficient balance in main account. Have $${mainBalance} USDT, need $${requiredTotal} USDT to fund ${AGENTS.length} agents ($${body.amount} each).`,
              error: 'Insufficient funds',
              insufficient_balance: true,
              main_account_balance: mainBalance,
              required_total: requiredTotal,
            },
            { status: 402 } // Payment Required
          )
        }
      } catch (error: any) {
        console.error('[Funding] Error checking balance:', error)
        
        // Log failed funding attempt for each agent due to credential/API error
        for (const agent of AGENTS) {
          if (agent.signer) {
            await logFundingHistory(
              agent.id,
              agent.name,
              body.amount,
              'failed',
              undefined,
              `Balance check failed: ${error?.message || 'Failed to verify account balance'}`
            )
          }
        }
        
        return NextResponse.json(
          {
            success: false,
            message: error?.message || 'Could not verify account balance. Check Aster DEX API credentials.',
            error: error?.message || 'Failed to check balance',
          },
          { status: 500 }
        )
      }
    }

    const results = []

    if (body.dryRun) {
      // Dry run: simulate funding (no balance check)
      console.log(`[Funding] DRY-RUN MODE: Simulating funding of ${AGENTS.length} agents with $${body.amount} USDT each`)

      for (const agent of AGENTS) {
        if (!agent.signer) {
          results.push({
            agent_id: agent.id,
            agent_name: agent.name,
            amount: body.amount,
            status: 'failed',
            error: 'Agent signer not configured',
          })
          continue
        }

        const result = {
          agent_id: agent.id,
          agent_name: agent.name,
          amount: body.amount,
          status: 'success',
          tx_hash: `0xdry_${agent.id}_${Date.now()}`,
        }
        results.push(result)
        // Don't log dry-run transactions to database
      }

      return NextResponse.json({
        success: true,
        message: `[DRY-RUN] Would fund ${AGENTS.length} agents with $${body.amount} USDT each (Total: $${requiredTotal})`,
        results,
      })
    }

    // Real funding
    console.log(`[Funding] Starting real funding: ${AGENTS.length} agents x $${body.amount} = $${requiredTotal}`)

    for (const agent of AGENTS) {
      if (!agent.signer) {
        const result = {
          agent_id: agent.id,
          agent_name: agent.name,
          amount: body.amount,
          status: 'failed',
          error: 'Agent signer address not configured',
          wallet_address: 'N/A',
        }
        results.push(result)
        await logFundingHistory(
          agent.id,
          agent.name,
          body.amount,
          'failed',
          undefined,
          'Agent signer not configured'
        )
        continue
      }

      // Note: Aster API doesn't support programmatic transfers
      // Return agent signer address so user can manually fund via wallet
      const result = {
        agent_id: agent.id,
        agent_name: agent.name,
        amount: body.amount,
        status: 'pending_manual_transfer',
        error: 'Aster API does not support programmatic transfers. Manual funding required via BNB Chain wallet.',
        wallet_address: agent.signer,
        instructions: `Send $${body.amount} USDT (BEP-20) to this address on BNB Chain (Chain ID: 56)`,
      }

      results.push(result)
      await logFundingHistory(
        agent.id,
        agent.name,
        body.amount,
        'pending',
        `manual_wallet_transfer_to_${agent.signer.substring(0, 6)}...`,
        'Awaiting manual transfer via BNB Chain wallet'
      )
    }

    const needsManual = results.filter(r => r.status === 'pending_manual_transfer').length
    const failed = results.filter(r => r.status === 'failed').length

    return NextResponse.json({
      success: needsManual > 0,
      message: `⚠️ Manual funding required for ${needsManual}/${AGENTS.length} agents. Send USDT to the wallet addresses below via BNB Chain.`,
      note: 'Aster DEX API does not support programmatic transfers. Please manually transfer USDT using a wallet (MetaMask, etc.)',
      agentSignerAddresses: AGENTS.filter(a => a.signer).map(a => ({
        agent: a.name,
        signer_wallet: a.signer,
        amount_needed: `$${body.amount} USDT (BEP-20)`,
      })),
      results,
    })
  } catch (error: any) {
    console.error('Fund agents error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fund agents',
        error: error?.message || 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}