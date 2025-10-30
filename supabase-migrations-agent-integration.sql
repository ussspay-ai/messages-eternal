-- ========================================
-- AGENT INTEGRATION TABLES
-- ========================================

-- 1. Agent Trade Executions (logs every trade made)
CREATE TABLE IF NOT EXISTS agent_trades (
  id BIGSERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL, -- BUY or SELL
  quantity DECIMAL(20, 8) NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  executed_price DECIMAL(20, 8),
  stop_loss DECIMAL(20, 8),
  take_profit DECIMAL(20, 8),
  reason TEXT, -- Why the trade was executed
  confidence DECIMAL(5, 2), -- Signal confidence 0-100
  pnl DECIMAL(20, 8), -- Profit/Loss if closed
  status VARCHAR(50) DEFAULT 'open', -- open, closed, cancelled, error
  trade_timestamp TIMESTAMP WITH TIME ZONE,
  close_timestamp TIMESTAMP WITH TIME ZONE,
  order_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_trades_agent_time 
ON agent_trades (agent_id, trade_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_trades_status 
ON agent_trades (agent_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_trades_symbol 
ON agent_trades (symbol, trade_timestamp DESC);


-- 2. Agent Trading Signals (logs the decision-making process)
CREATE TABLE IF NOT EXISTS agent_signals (
  id BIGSERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  action VARCHAR(20) NOT NULL, -- BUY, SELL, HOLD
  confidence DECIMAL(5, 2) NOT NULL, -- 0-100
  reasoning TEXT NOT NULL, -- Full explanation of the signal
  market_analysis TEXT, -- Market conditions analyzed
  technical_indicators JSONB, -- Technical indicators used
  signal_timestamp TIMESTAMP WITH TIME ZONE,
  was_executed BOOLEAN DEFAULT FALSE, -- Did it result in a trade?
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_signals_agent_time 
ON agent_signals (agent_id, signal_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_signals_action 
ON agent_signals (action, signal_timestamp DESC);


-- 3. Agent Thinking/Analysis Logs (detailed reasoning)
CREATE TABLE IF NOT EXISTS agent_thinking (
  id BIGSERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  thinking_type VARCHAR(50), -- analysis, decision, error, recovery
  content TEXT NOT NULL, -- Full thinking process
  context JSONB, -- Additional context (market data, positions, etc.)
  model_used VARCHAR(100), -- Which AI model generated this
  tokens_used INTEGER, -- API tokens consumed
  thinking_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_thinking_agent_time 
ON agent_thinking (agent_id, thinking_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_thinking_type 
ON agent_thinking (thinking_type, thinking_timestamp DESC);


-- 4. Real-time Agent Status
CREATE TABLE IF NOT EXISTS agent_status (
  id BIGSERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'running', -- running, paused, error, sleeping
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  current_position VARCHAR(255), -- Current trading position summary
  last_signal_time TIMESTAMP WITH TIME ZONE,
  last_trade_time TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  thinking_message TEXT, -- Current thinking status
  performance_metrics JSONB, -- Real-time performance data
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_status_agent 
ON agent_status (agent_id);


-- 5. Agent Decision Logs (for learning/analysis)
CREATE TABLE IF NOT EXISTS agent_decision_logs (
  id BIGSERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  decision_type VARCHAR(100), -- trade_signal, position_management, risk_check, etc.
  input_data JSONB, -- Input that went into the decision
  decision JSONB, -- The decision made
  reasoning TEXT, -- Explanation
  outcome VARCHAR(50), -- success, failure, pending
  metrics JSONB, -- Metrics related to the decision
  decision_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_decision_logs_agent 
ON agent_decision_logs (agent_id, decision_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_decision_logs_type 
ON agent_decision_logs (decision_type, decision_timestamp DESC);


-- ========================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE agent_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_thinking ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_decision_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role to insert/update
CREATE POLICY "Allow service role to manage agent_trades"
ON agent_trades
USING (true);

CREATE POLICY "Allow service role to manage agent_signals"
ON agent_signals
USING (true);

CREATE POLICY "Allow service role to manage agent_thinking"
ON agent_thinking
USING (true);

CREATE POLICY "Allow service role to manage agent_status"
ON agent_status
USING (true);

CREATE POLICY "Allow service role to manage agent_decision_logs"
ON agent_decision_logs
USING (true);

-- ========================================
-- VIEWS FOR FRONTEND
-- ========================================

-- Recent trades for each agent
CREATE OR REPLACE VIEW agent_recent_trades AS
SELECT 
  agent_id,
  symbol,
  side,
  quantity,
  entry_price,
  executed_price,
  pnl,
  status,
  reason,
  confidence,
  trade_timestamp,
  created_at
FROM agent_trades
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY trade_timestamp DESC;

-- Recent signals for each agent
CREATE OR REPLACE VIEW agent_recent_signals AS
SELECT 
  agent_id,
  symbol,
  action,
  confidence,
  reasoning,
  was_executed,
  signal_timestamp,
  created_at
FROM agent_signals
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY signal_timestamp DESC;

-- Agent performance summary
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT 
  agent_id,
  COUNT(CASE WHEN status = 'closed' THEN 1 END) as total_closed_trades,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_trades,
  COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
  COUNT(CASE WHEN pnl <= 0 THEN 1 END) as losing_trades,
  SUM(pnl) as total_pnl,
  AVG(confidence) as avg_signal_confidence,
  MAX(trade_timestamp) as last_trade_timestamp
FROM agent_trades
WHERE status IN ('closed', 'open')
GROUP BY agent_id;