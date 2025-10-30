-- Create agent_snapshots table for historical performance data
CREATE TABLE IF NOT EXISTS agent_snapshots (
  id BIGSERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  account_value DECIMAL(20, 8) NOT NULL,
  total_pnl DECIMAL(20, 8) NOT NULL,
  return_percent DECIMAL(10, 4) NOT NULL,
  win_rate DECIMAL(5, 2) NOT NULL,
  trades_count INTEGER NOT NULL DEFAULT 0,
  sharpe_ratio DECIMAL(10, 4),
  active_positions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by agent_id and time range
CREATE INDEX IF NOT EXISTS idx_agent_snapshots_agent_time 
ON agent_snapshots (agent_id, timestamp DESC);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_agent_snapshots_timestamp 
ON agent_snapshots (timestamp DESC);

-- Create index to find latest snapshots efficiently
CREATE INDEX IF NOT EXISTS idx_agent_snapshots_agent_latest 
ON agent_snapshots (agent_id, created_at DESC);

-- Create a view for the latest snapshot of each agent
CREATE OR REPLACE VIEW latest_agent_snapshots AS
SELECT DISTINCT ON (agent_id)
  agent_id,
  timestamp,
  account_value,
  total_pnl,
  return_percent,
  win_rate,
  trades_count,
  sharpe_ratio,
  active_positions,
  created_at
FROM agent_snapshots
ORDER BY agent_id, timestamp DESC;

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE agent_snapshots ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow service role to insert data
CREATE POLICY "Allow service role to insert snapshots"
ON agent_snapshots
FOR INSERT
WITH CHECK (true);

-- Create a policy to allow public to read snapshots
CREATE POLICY "Allow public to read snapshots"
ON agent_snapshots
FOR SELECT
USING (true);