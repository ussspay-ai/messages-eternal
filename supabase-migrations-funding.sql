-- Create funding_history table for audit trail
CREATE TABLE IF NOT EXISTS funding_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR NOT NULL,
  agent_name VARCHAR,
  amount DECIMAL(20, 2) NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  tx_hash VARCHAR,
  error_message TEXT,
  dry_run BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_funding_history_agent_id ON funding_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_funding_history_status ON funding_history(status);
CREATE INDEX IF NOT EXISTS idx_funding_history_created_at ON funding_history(created_at DESC);

-- Create trading_symbols configuration table
CREATE TABLE IF NOT EXISTS trading_symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR NOT NULL UNIQUE,
  symbol VARCHAR NOT NULL DEFAULT 'ASTERUSDT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for trading symbols
CREATE INDEX IF NOT EXISTS idx_trading_symbols_agent_id ON trading_symbols(agent_id);

-- Initialize trading symbols for all agents
INSERT INTO trading_symbols (agent_id, symbol) VALUES
  ('agent_1', 'ASTERUSDT'),
  ('agent_2', 'ASTERUSDT'),
  ('agent_3', 'ASTERUSDT'),
  ('agent_4', 'ASTERUSDT'),
  ('agent_5', 'ASTERUSDT')
ON CONFLICT (agent_id) DO NOTHING;

-- Create policy for funding_history table (if using RLS)
ALTER TABLE funding_history ENABLE ROW LEVEL SECURITY;

-- Create policy for trading_symbols table (if using RLS)
ALTER TABLE trading_symbols ENABLE ROW LEVEL SECURITY;

-- Grant access to service role (for backend)
GRANT ALL ON funding_history TO service_role;
GRANT ALL ON trading_symbols TO service_role;

-- Create pickaboo admin whitelist table
CREATE TABLE IF NOT EXISTS pickaboo_admin_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR NOT NULL UNIQUE,
  admin_name VARCHAR,
  added_by VARCHAR,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_pickaboo_admin_whitelist_address ON pickaboo_admin_whitelist(wallet_address);
CREATE INDEX IF NOT EXISTS idx_pickaboo_admin_whitelist_active ON pickaboo_admin_whitelist(is_active);

-- Enable RLS for pickaboo_admin_whitelist
ALTER TABLE pickaboo_admin_whitelist ENABLE ROW LEVEL SECURITY;

-- Grant access to service role
GRANT ALL ON pickaboo_admin_whitelist TO service_role;