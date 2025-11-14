import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase credentials not configured. Historical data will not be saved.')
}

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export interface AgentSnapshot {
  agent_id: string
  timestamp: string
  account_value: number
  total_pnl: number
  return_percent: number
  win_rate: number
  trades_count: number
  sharpe_ratio?: number
  active_positions?: number
}

/**
 * Save agent performance snapshot to Supabase
 * Called every 5 minutes to build historical data for charts
 */
export async function saveAgentSnapshots(snapshots: AgentSnapshot[]): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping snapshot save')
    return false
  }

  try {
    const { error } = await supabase
      .from('agent_snapshots')
      .insert(snapshots)

    if (error) {
      console.error('Failed to save agent snapshots:', error)
      return false
    }

    console.log(`Successfully saved ${snapshots.length} agent snapshots`)
    return true
  } catch (error) {
    console.error('Error saving snapshots to Supabase:', error)
    return false
  }
}

/**
 * Fetch historical snapshots for an agent within time range
 */
export async function getAgentSnapshots(
  agentId: string,
  startTime: Date,
  endTime: Date
): Promise<AgentSnapshot[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('agent_snapshots')
      .select('*')
      .eq('agent_id', agentId)
      .gte('timestamp', startTime.toISOString())
      .lte('timestamp', endTime.toISOString())
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Failed to fetch agent snapshots:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching snapshots from Supabase:', error)
    return []
  }
}

/**
 * Get latest snapshot for all agents
 */
export async function getLatestSnapshots(): Promise<Record<string, AgentSnapshot>> {
  if (!supabase) return {}

  try {
    const { data, error } = await supabase
      .from('agent_snapshots')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Failed to fetch latest snapshots:', error)
      return {}
    }

    // Get the most recent snapshot for each agent
    const latestByAgent: Record<string, AgentSnapshot> = {}
    data?.forEach((snapshot) => {
      if (!latestByAgent[snapshot.agent_id]) {
        latestByAgent[snapshot.agent_id] = snapshot
      }
    })

    return latestByAgent
  } catch (error) {
    console.error('Error fetching latest snapshots:', error)
    return {}
  }
}

/**
 * Get snapshot from ~5 minutes ago for win rate calculation
 * Returns the oldest snapshot within the last 6-7 minutes to give buffer
 */
export async function get5MinuteOldSnapshot(agentId: string): Promise<AgentSnapshot | null> {
  if (!supabase) return null

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const now = new Date().toISOString()

    // Get the snapshot closest to 5 minutes ago
    const { data, error } = await supabase
      .from('agent_snapshots')
      .select('*')
      .eq('agent_id', agentId)
      .lte('timestamp', fiveMinutesAgo)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.warn(`Could not fetch 5m snapshot for ${agentId}:`, error)
      return null
    }

    return data || null
  } catch (error) {
    console.error('Error fetching 5-minute old snapshot:', error)
    return null
  }
}

/**
 * Funding History Types and Functions
 */
export interface FundingHistoryRecord {
  agent_id: string
  agent_name: string
  amount: number
  status: 'pending' | 'success' | 'failed'
  tx_hash?: string
  error_message?: string
  dry_run?: boolean
}

/**
 * Save funding transaction to history
 */
export async function saveFundingHistory(record: FundingHistoryRecord): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping funding history save')
    return false
  }

  try {
    const { error } = await supabase
      .from('funding_history')
      .insert([record])

    if (error) {
      console.error('Failed to save funding history:', error)
      return false
    }

    console.log(`✅ Funding history saved for ${record.agent_name}`)
    return true
  } catch (error) {
    console.error('Error saving funding history to Supabase:', error)
    return false
  }
}

/**
 * Get funding history for an agent
 */
export async function getAgentFundingHistory(agentId: string): Promise<FundingHistoryRecord[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('funding_history')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch funding history:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching funding history from Supabase:', error)
    return []
  }
}

/**
 * Get all funding history with optional filters
 */
export async function getAllFundingHistory(limit: number = 100): Promise<FundingHistoryRecord[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('funding_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch funding history:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching funding history from Supabase:', error)
    return []
  }
}

/**
 * Get funding statistics
 */
export async function getFundingStats(): Promise<{
  totalFunded: number
  successCount: number
  failedCount: number
  pendingCount: number
}> {
  if (!supabase) return { totalFunded: 0, successCount: 0, failedCount: 0, pendingCount: 0 }

  try {
    const { data, error } = await supabase
      .from('funding_history')
      .select('amount, status')

    if (error) {
      console.error('Failed to fetch funding stats:', error)
      return { totalFunded: 0, successCount: 0, failedCount: 0, pendingCount: 0 }
    }

    const stats = {
      totalFunded: 0,
      successCount: 0,
      failedCount: 0,
      pendingCount: 0,
    }

    data?.forEach((record: any) => {
      if (record.status === 'success') {
        stats.totalFunded += record.amount
        stats.successCount++
      } else if (record.status === 'failed') {
        stats.failedCount++
      } else if (record.status === 'pending') {
        stats.pendingCount++
      }
    })

    return stats
  } catch (error) {
    console.error('Error fetching funding stats from Supabase:', error)
    return { totalFunded: 0, successCount: 0, failedCount: 0, pendingCount: 0 }
  }
}

/**
 * Pickaboo Admin Whitelist Types and Functions
 */
export interface PickabooAdmin {
  id: string
  wallet_address: string
  admin_name: string | null
  added_by: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Check if a wallet address is whitelisted as a pickaboo admin
 */
export async function isPickabooAdminWhitelisted(walletAddress: string): Promise<boolean> {
  if (!supabase) return false

  try {
    const { data, error } = await supabase
      .from('pickaboo_admin_whitelist')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking whitelist:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error checking whitelist:', error)
    return false
  }
}

/**
 * Get all active pickaboo admins
 */
export async function getPickabooAdmins(): Promise<PickabooAdmin[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('pickaboo_admin_whitelist')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch pickaboo admins:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching pickaboo admins:', error)
    return []
  }
}

/**
 * Add a new pickaboo admin to whitelist
 */
export async function addPickabooAdmin(
  walletAddress: string,
  adminName?: string,
  addedBy?: string
): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('pickaboo_admin_whitelist')
      .insert([
        {
          wallet_address: walletAddress.toLowerCase(),
          admin_name: adminName || null,
          added_by: addedBy || null,
          is_active: true,
        },
      ])

    if (error) {
      console.error('Failed to add pickaboo admin:', error)
      return false
    }

    console.log(`✅ Added ${walletAddress} to pickaboo admin whitelist`)
    return true
  } catch (error) {
    console.error('Error adding pickaboo admin:', error)
    return false
  }
}

/**
 * Remove a pickaboo admin from whitelist (soft delete)
 */
export async function removePickabooAdmin(walletAddress: string): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('pickaboo_admin_whitelist')
      .update({ is_active: false })
      .eq('wallet_address', walletAddress.toLowerCase())

    if (error) {
      console.error('Failed to remove pickaboo admin:', error)
      return false
    }

    console.log(`✅ Removed ${walletAddress} from pickaboo admin whitelist`)
    return true
  } catch (error) {
    console.error('Error removing pickaboo admin:', error)
    return false
  }
}

/**
 * Trading Symbol Management - Get current active trading symbol
 */
export async function getCurrentTradingSymbol(agentId: string = 'agent_1'): Promise<string> {
  if (!supabase) {
    console.warn('Supabase not configured, using default symbol ASTERUSDT')
    return 'ASTERUSDT'
  }

  try {
    const { data, error } = await supabase
      .from('trading_symbols')
      .select('symbol')
      .eq('agent_id', agentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - return default
        console.warn(`No trading symbol found for ${agentId}, using default ASTERUSDT`)
        return 'ASTERUSDT'
      }
      console.error('Error fetching trading symbol:', error)
      return 'ASTERUSDT'
    }

    if (!data?.symbol) {
      return 'ASTERUSDT'
    }

    return data.symbol
  } catch (error) {
    console.error('Error fetching current trading symbol:', error)
    return 'ASTERUSDT'
  }
}

/**
 * Get trading symbol for all agents (should be the same)
 */
export async function getAllTradingSymbols(): Promise<Record<string, string>> {
  if (!supabase) {
    return {
      agent_1: 'ASTERUSDT',
      agent_2: 'ASTERUSDT',
      agent_3: 'ASTERUSDT',
      agent_4: 'ASTERUSDT',
      agent_5: 'ASTERUSDT',
    }
  }

  try {
    const { data, error } = await supabase
      .from('trading_symbols')
      .select('agent_id, symbol')

    if (error) {
      console.error('Error fetching trading symbols:', error)
      return {
        agent_1: 'ASTERUSDT',
        agent_2: 'ASTERUSDT',
        agent_3: 'ASTERUSDT',
        agent_4: 'ASTERUSDT',
        agent_5: 'ASTERUSDT',
      }
    }

    const symbolMap: Record<string, string> = {}
    data?.forEach((row: any) => {
      symbolMap[row.agent_id] = row.symbol
    })

    return symbolMap
  } catch (error) {
    console.error('Error fetching all trading symbols:', error)
    return {
      agent_1: 'ASTERUSDT',
      agent_2: 'ASTERUSDT',
      agent_3: 'ASTERUSDT',
      agent_4: 'ASTERUSDT',
      agent_5: 'ASTERUSDT',
    }
  }
}

/**
 * AGENT INTEGRATION - Trade Execution Logging
 */
export interface AgentTrade {
  agent_id: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  entry_price: number
  executed_price?: number
  stop_loss?: number
  take_profit?: number
  reason: string
  confidence: number
  pnl?: number
  status?: 'open' | 'closed' | 'cancelled' | 'error'
  trade_timestamp?: string
  order_id?: string
  error_message?: string
}

export async function saveAgentTrade(trade: AgentTrade): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping trade log save')
    return false
  }

  try {
    const { error } = await supabase
      .from('agent_trades')
      .insert([{
        ...trade,
        trade_timestamp: trade.trade_timestamp || new Date().toISOString(),
      }])

    if (error) {
      console.error('Failed to save agent trade:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving agent trade to Supabase:', error)
    return false
  }
}

export async function getAgentTrades(
  agentId: string,
  limit: number = 50
): Promise<AgentTrade[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('agent_trades')
      .select('*')
      .eq('agent_id', agentId)
      .order('trade_timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch agent trades:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching agent trades:', error)
    return []
  }
}

/**
 * AGENT INTEGRATION - Trading Signals
 */
export interface AgentSignal {
  agent_id: string
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reasoning: string
  market_analysis?: string
  technical_indicators?: Record<string, any>
  signal_timestamp?: string
  was_executed?: boolean
}

export async function saveAgentSignal(signal: AgentSignal): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping signal save')
    return false
  }

  try {
    const { error } = await supabase
      .from('agent_signals')
      .insert([{
        ...signal,
        signal_timestamp: signal.signal_timestamp || new Date().toISOString(),
        technical_indicators: signal.technical_indicators || null,
      }])

    if (error) {
      console.error('Failed to save agent signal:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving agent signal:', error)
    return false
  }
}

export async function getAgentSignals(
  agentId: string,
  limit: number = 50
): Promise<AgentSignal[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('agent_signals')
      .select('*')
      .eq('agent_id', agentId)
      .order('signal_timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch agent signals:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching agent signals:', error)
    return []
  }
}

/**
 * AGENT INTEGRATION - Thinking/Analysis Logs
 */
export interface AgentThinking {
  agent_id: string
  symbol: string
  thinking_type: 'analysis' | 'decision' | 'error' | 'recovery'
  content: string
  context?: Record<string, any>
  model_used?: string
  tokens_used?: number
  thinking_timestamp?: string
}

export async function saveAgentThinking(thinking: AgentThinking): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping thinking log save')
    return false
  }

  try {
    const { error } = await supabase
      .from('agent_thinking')
      .insert([{
        ...thinking,
        thinking_timestamp: thinking.thinking_timestamp || new Date().toISOString(),
        context: thinking.context || null,
      }])

    if (error) {
      console.error('Failed to save agent thinking:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving agent thinking:', error)
    return false
  }
}

export async function getAgentThinking(
  agentId: string,
  limit: number = 50
): Promise<AgentThinking[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('agent_thinking')
      .select('*')
      .eq('agent_id', agentId)
      .order('thinking_timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch agent thinking:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching agent thinking:', error)
    return []
  }
}

/**
 * AGENT INTEGRATION - Real-time Status
 */
export interface AgentStatusRecord {
  agent_id: string
  name: string
  status: 'running' | 'paused' | 'error' | 'sleeping'
  last_heartbeat?: string
  current_position?: string
  last_signal_time?: string
  last_trade_time?: string
  error_message?: string
  thinking_message?: string
  performance_metrics?: Record<string, any>
}

export async function updateAgentStatus(status: AgentStatusRecord): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping status update')
    return false
  }

  try {
    const { error } = await supabase
      .from('agent_status')
      .upsert([{
        ...status,
        last_heartbeat: status.last_heartbeat || new Date().toISOString(),
        performance_metrics: status.performance_metrics || null,
      }], { onConflict: 'agent_id' })

    if (error) {
      console.error('Failed to update agent status:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating agent status:', error)
    return false
  }
}

export async function getAgentStatus(agentId: string): Promise<AgentStatusRecord | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('agent_status')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') { // Not found error
        console.error('Failed to fetch agent status:', error)
      }
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching agent status:', error)
    return null
  }
}

export async function getAllAgentStatuses(): Promise<AgentStatusRecord[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('agent_status')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch all agent statuses:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching all agent statuses:', error)
    return []
  }
}

/**
 * AGENT INTEGRATION - Decision Logs
 */
export interface AgentDecisionLog {
  agent_id: string
  decision_type: string
  input_data?: Record<string, any>
  decision?: Record<string, any>
  reasoning: string
  outcome?: 'success' | 'failure' | 'pending'
  metrics?: Record<string, any>
  decision_timestamp?: string
}

export async function saveAgentDecision(decision: AgentDecisionLog): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping decision log save')
    return false
  }

  try {
    const { error } = await supabase
      .from('agent_decision_logs')
      .insert([{
        ...decision,
        decision_timestamp: decision.decision_timestamp || new Date().toISOString(),
        input_data: decision.input_data || null,
        decision: decision.decision || null,
        metrics: decision.metrics || null,
      }])

    if (error) {
      console.error('Failed to save agent decision:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving agent decision:', error)
    return false
  }
}

/**
 * Waitlist Management Types and Functions
 */
export interface WaitlistEntry {
  id?: number
  email: string
  name: string
  interest: string
  created_at?: string
  updated_at?: string
}

/**
 * Add a new entry to the waitlist
 */
export async function addToWaitlist(entry: Omit<WaitlistEntry, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string; position?: number }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', entry.email)
      .single()

    if (existing) {
      return { success: false, error: 'This email is already on the waitlist' }
    }

    // Insert new entry
    const { error } = await supabase
      .from('waitlist')
      .insert([{
        email: entry.email,
        name: entry.name,
        interest: entry.interest,
      }])

    if (error) {
      console.error('Failed to add to waitlist:', error)
      return { success: false, error: error.message }
    }

    // Get the position in the waitlist
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

    console.log(`✅ Added ${entry.email} to waitlist at position ${count}`)
    return { success: true, position: count ?? undefined }
  } catch (error: any) {
    console.error('Error adding to waitlist:', error)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

/**
 * Get all waitlist entries with optional pagination and filtering
 */
export async function getWaitlistEntries(limit: number = 100, offset: number = 0, interest?: string): Promise<WaitlistEntry[]> {
  if (!supabase) return []

  try {
    let query = supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false })

    if (interest && interest !== 'all') {
      query = query.eq('interest', interest)
    }

    const { data, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to fetch waitlist entries:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching waitlist entries:', error)
    return []
  }
}

/**
 * Get waitlist statistics
 */
export async function getWaitlistStats(): Promise<{
  total: number
  byInterest: Record<string, number>
}> {
  if (!supabase) return { total: 0, byInterest: {} }

  try {
    const { count: total } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

    // Get breakdown by interest
    const { data } = await supabase
      .from('waitlist')
      .select('interest')

    const byInterest: Record<string, number> = {}
    data?.forEach((row: any) => {
      byInterest[row.interest] = (byInterest[row.interest] || 0) + 1
    })

    return { total: total || 0, byInterest }
  } catch (error) {
    console.error('Error fetching waitlist stats:', error)
    return { total: 0, byInterest: {} }
  }
}

/**
 * Delete a waitlist entry
 */
export async function removeFromWaitlist(email: string): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('waitlist')
      .delete()
      .eq('email', email)

    if (error) {
      console.error('Failed to remove from waitlist:', error)
      return false
    }

    console.log(`✅ Removed ${email} from waitlist`)
    return true
  } catch (error) {
    console.error('Error removing from waitlist:', error)
    return false
  }
}

/**
 * Get waitlist count
 */
export async function getWaitlistCount(): Promise<number> {
  if (!supabase) return 0

  try {
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

    return count || 0
  } catch (error) {
    console.error('Error fetching waitlist count:', error)
    return 0
  }
}

/**
 * AGENT EXIT PLANS - Real-time trading exit strategies
 */
export interface ExitPlan {
  agent_id: string
  symbol: string
  side: 'LONG' | 'SHORT'
  position_size: number
  entry_price: number
  take_profit: number
  stop_loss: number
  confidence: number
  reasoning?: string
  status?: 'active' | 'closed' | 'hit_tp' | 'hit_sl'
}

/**
 * Save an exit plan when a trade is generated
 */
export async function saveExitPlan(plan: ExitPlan): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping exit plan save')
    return false
  }

  try {
    const { error } = await supabase
      .from('active_exit_plans')
      .insert([{
        ...plan,
        status: plan.status || 'active',
        created_at: new Date().toISOString(),
      }])

    if (error) {
      console.error('Failed to save exit plan:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving exit plan to Supabase:', error)
    return false
  }
}

/**
 * Get active exit plans for an agent
 */
export async function getActiveExitPlans(agentId: string): Promise<ExitPlan[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('active_exit_plans')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch exit plans:', error)
      return []
    }

    return (data || []).map(p => ({
      agent_id: p.agent_id,
      symbol: p.symbol,
      side: p.side,
      position_size: p.position_size,
      entry_price: p.entry_price,
      take_profit: p.take_profit,
      stop_loss: p.stop_loss,
      confidence: p.confidence,
      reasoning: p.reasoning,
      status: p.status,
    }))
  } catch (error) {
    console.error('Error fetching exit plans:', error)
    return []
  }
}

/**
 * Get latest exit plan for a specific symbol/side combination
 */
export async function getLatestExitPlan(
  agentId: string,
  symbol: string,
  side: string
): Promise<ExitPlan | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('active_exit_plans')
      .select('*')
      .eq('agent_id', agentId)
      .eq('symbol', symbol)
      .eq('side', side)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch exit plan:', error)
      return null
    }

    if (!data) return null

    return {
      agent_id: data.agent_id,
      symbol: data.symbol,
      side: data.side,
      position_size: data.position_size,
      entry_price: data.entry_price,
      take_profit: data.take_profit,
      stop_loss: data.stop_loss,
      confidence: data.confidence,
      reasoning: data.reasoning,
      status: data.status,
    }
  } catch (error) {
    console.error('Error fetching latest exit plan:', error)
    return null
  }
}

/**
 * Close an exit plan (when TP/SL is hit or position closed)
 */
export async function closeExitPlan(
  agentId: string,
  symbol: string,
  side: string,
  closeReason: 'hit_tp' | 'hit_sl' | 'closed'
): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('active_exit_plans')
      .update({
        status: closeReason,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)
      .eq('symbol', symbol)
      .eq('side', side)
      .eq('status', 'active')

    if (error) {
      console.error('Failed to close exit plan:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error closing exit plan:', error)
    return false
  }
}

/**
 * AGENT CHAT MESSAGING - For exit plan announcements and analysis
 */
export interface AgentChatMessage {
  id?: string
  agent_id: string
  agent_name: string
  content: string
  type: 'analysis' | 'trade_signal' | 'market_update' | 'risk_management' | 'exit_plan'
  confidence?: number
  exit_plan_id?: string
  symbol?: string
  side?: string
  take_profit?: number
  stop_loss?: number
  timestamp?: string
}

/**
 * Save agent chat message (for exit plan announcements, analysis, etc)
 * Messages are stored temporarily in Redis for real-time chat display
 */
export async function saveAgentChatMessage(message: AgentChatMessage): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping chat message save')
    return false
  }

  try {
    const { error } = await supabase
      .from('agent_chat_messages')
      .insert([{
        agent_id: message.agent_id,
        agent_name: message.agent_name,
        content: message.content,
        type: message.type,
        confidence: message.confidence,
        exit_plan_id: message.exit_plan_id,
        symbol: message.symbol,
        side: message.side,
        take_profit: message.take_profit,
        stop_loss: message.stop_loss,
        created_at: message.timestamp || new Date().toISOString(),
      }])

    if (error) {
      console.error('Failed to save chat message:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving chat message:', error)
    return false
  }
}