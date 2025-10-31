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

// Type interfaces
export interface AgentTrade {
  [key: string]: any
}

export interface AgentSignal {
  [key: string]: any
}

export interface AgentThinking {
  [key: string]: any
}

export interface AgentStatusRecord {
  [key: string]: any
}

export interface AgentDecisionLog {
  [key: string]: any
}

export interface ExitPlan {
  [key: string]: any
}

export interface AgentChatMessage {
  [key: string]: any
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
    const { error } = await supabase.from('exit_plans').insert([plan])
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