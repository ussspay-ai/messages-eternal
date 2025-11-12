-- Create agent_chat_messages table for real-time chat persistence
-- Fixed: Using TEXT for timestamp (ISO 8601 strings) to match API expectations
-- Drop dependent views first, then recreate table

DROP VIEW IF EXISTS recent_agent_messages CASCADE;
DROP TABLE IF EXISTS agent_chat_messages CASCADE;

CREATE TABLE agent_chat_messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('analysis', 'trade_signal', 'market_update', 'risk_management')),
  content TEXT NOT NULL,
  confidence NUMERIC(5, 2),
  timestamp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_agent_chat_agent_id 
  ON agent_chat_messages(agent_id);

CREATE INDEX idx_agent_chat_timestamp_desc
  ON agent_chat_messages(timestamp DESC);

CREATE INDEX idx_agent_chat_agent_timestamp 
  ON agent_chat_messages(agent_id, timestamp DESC);

CREATE INDEX idx_agent_chat_created_at 
  ON agent_chat_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE agent_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage messages
CREATE POLICY "service_role_manage_messages" ON agent_chat_messages
  FOR ALL USING (TRUE) WITH CHECK (TRUE);