/**
 * Supabase Client for Trading Bots
 * Standalone implementation for agent trading operations
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[Supabase] Credentials not configured. Agent data will not be saved.')
}

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// Type interfaces with full type safety
export interface AgentTrade {
  agent_id: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  entry_price: number
  executed_price: number
  stop_loss?: number
  take_profit?: number
  reason: string
  confidence: number
  status: 'open' | 'closed' | 'cancelled' | 'error'
  trade_timestamp: string
  order_id?: string
}

export interface AgentSignal {
  agent_id: string
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  quantity?: number
  price?: number
  confidence: number
  reason: string
  signal_timestamp: string
}

export interface AgentThinking {
  agent_id: string
  thinking_type: 'analysis' | 'error' | 'decision' | 'market_analysis'
  content: string
  metadata?: Record<string, any>
  thinking_timestamp: string
}

export interface AgentStatusRecord {
  agent_id: string
  name: string
  status: 'running' | 'idle' | 'error' | 'paused'
  message?: string
  last_heartbeat?: string
  updated_at?: string
}

export interface AgentDecisionLog {
  agent_id: string
  symbol: string
  decision: 'BUY' | 'SELL' | 'HOLD'
  reasoning: string
  confidence: number
  market_context?: Record<string, any>
  decision_timestamp: string
}

export interface ExitPlan {
  agent_id: string
  symbol: string
  side: 'LONG' | 'SHORT'
  position_size: number
  entry_price: number
  take_profit: number
  stop_loss: number
  confidence: number
  reasoning: string
  created_at?: string
}

export interface AgentChatMessage {
  agent_id: string
  agent_name: string
  message_type: 'analysis' | 'trade_signal' | 'market_update' | 'risk_management' | 'reasoning'
  content: string
  symbol?: string
  confidence?: number
  unrealized_pnl?: number
  timestamp: string
}

// Stub implementations - agents can operate without Supabase
export async function saveAgentTrade(trade: AgentTrade): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('agent_trades').insert([trade])
    return !error
  } catch (error) {
    console.warn('[Supabase] Error saving trade:', error)
    return false
  }
}

export async function saveAgentSignal(signal: AgentSignal): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('agent_signals').insert([signal])
    return !error
  } catch (error) {
    console.warn('[Supabase] Error saving signal:', error)
    return false
  }
}

export async function saveAgentThinking(thinking: AgentThinking): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('agent_thinking').insert([thinking])
    return !error
  } catch (error) {
    console.warn('[Supabase] Error saving thinking:', error)
    return false
  }
}

export async function updateAgentStatus(status: AgentStatusRecord): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('agent_status').upsert([status])
    return !error
  } catch (error) {
    console.warn('[Supabase] Error updating status:', error)
    return false
  }
}

export async function saveAgentDecision(decision: AgentDecisionLog): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('agent_decisions').insert([decision])
    return !error
  } catch (error) {
    console.warn('[Supabase] Error saving decision:', error)
    return false
  }
}

export async function saveExitPlan(plan: ExitPlan): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('active_exit_plans').insert([plan])
    return !error
  } catch (error) {
    console.warn('[Supabase] Error saving exit plan:', error)
    return false
  }
}

export async function saveAgentChatMessage(message: AgentChatMessage): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('agent_chat_messages').insert([message])
    return !error
  } catch (error) {
    console.warn('[Supabase] Error saving chat message:', error)
    return false
  }
}