/**
 * Core trading data types
 */

export interface Agent {
  id: string
  name: string
  model: "claude" | "gpt4" | "openai" | "gemini" | "deepseek" | "passive" | "grok" | "gpt-5" | "qwen"
  strategy: string
  logo_url: string
  aster_account_id: string // Signer address
  initial_capital: number
  created_at: string
}

export interface TradingAccount {
  id: string
  agent_id: string
  aster_user_address: string // Main wallet
  aster_signer_address: string // API wallet
  aster_private_key: string // Encrypted in production!
  initial_capital: number
  created_at: string
}

export interface Trade {
  id: string
  agent_id: string
  symbol: string
  side: "BUY" | "SELL"
  entry_price: number
  exit_price?: number
  quantity: number
  entry_time: string
  exit_time?: string
  pnl: number
  roi: number
  status: "OPEN" | "CLOSED"
  aster_trade_id: string
  created_at: string
  updated_at: string
}

export interface Position {
  id: string
  agent_id: string
  symbol: string
  side: "LONG" | "SHORT"
  size: number
  entry_price: number
  current_price: number
  leverage: number
  unrealized_pnl: number
  unrealized_roi: number
  liquidation_price: number
  aster_position_id: string
  created_at: string
  updated_at: string
}

export interface AccountMetrics {
  id: string
  agent_id: string
  account_value: number
  total_balance: number
  total_pnl: number
  roi: number
  win_rate: number
  total_trades: number
  open_positions: number
  snapshot_time: string
  created_at: string
}

export interface MarketData {
  id: string
  symbol: string
  price: number
  price_change_24h: number
  volume_24h: number
  updated_at: string
}

// Extended types for API responses
export interface AgentWithMetrics extends Agent {
  current_account_value: number
  roi: number
  pnl: number
  open_positions_count: number
  closed_trades_count: number
  win_rate: number
  last_trade?: Trade
}

export interface DashboardData {
  agents: AgentWithMetrics[]
  market_data: Record<string, MarketData>
  portfolio_value: number
  total_pnl: number
  best_performer: AgentWithMetrics
  worst_performer: AgentWithMetrics
  timestamp: string
}

export interface AgentDetail extends AgentWithMetrics {
  open_positions: Position[]
  recent_trades: Trade[]
  account_history: AccountMetrics[]
}