/**
 * Funding Configuration and Types
 */

export interface AgentConfig {
  id: string
  name: string
  signer: string
  apiKey?: string
  apiSecret?: string
}

export interface FundingRecord {
  agent_id: string
  amount: number
  status: 'pending' | 'success' | 'failed'
  tx_hash?: string
  error_message?: string
  dry_run: boolean
  created_at: string
  updated_at: string
}

export interface FundingResult {
  agent_id: string
  agent_name: string
  signer: string
  amount: number
  status: 'success' | 'failed' | 'pending'
  tx_hash?: string
  error?: string
  attempts?: number
}

export interface FundingConfig {
  amount: number
  dryRun: boolean
  maxRetries: number
  retryDelayMs: number
  symbol?: string
}

// Agent configurations
export const AGENTS: AgentConfig[] = [
  {
    id: 'agent_1',
    name: 'Claude Arbitrage',
    signer: process.env.AGENT_1_SIGNER || '',
  },
  {
    id: 'agent_2',
    name: 'GPT-4 Momentum',
    signer: process.env.AGENT_2_SIGNER || '',
  },
  {
    id: 'agent_3',
    name: 'Gemini Grid',
    signer: process.env.AGENT_3_SIGNER || '',
  },
  {
    id: 'agent_4',
    name: 'DeepSeek ML',
    signer: process.env.AGENT_4_SIGNER || '',
  },
  {
    id: 'agent_5',
    name: 'Buy & Hold',
    signer: process.env.AGENT_5_SIGNER || '',
  },
]

export const DEFAULT_FUNDING_CONFIG: FundingConfig = {
  amount: 50,
  dryRun: false,
  maxRetries: 3,
  retryDelayMs: 2000,
}

export function validateFundingAmount(amount: number): { valid: boolean; error?: string } {
  if (amount < 50) {
    return { valid: false, error: 'Minimum funding amount is $50 USDT' }
  }
  if (amount > 1_000_000) {
    return { valid: false, error: 'Maximum funding amount is $1,000,000 USDT' }
  }
  return { valid: true }
}