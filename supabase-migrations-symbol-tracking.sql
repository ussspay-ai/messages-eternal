-- Migration: Add symbol tracking to agent_chat_messages table
-- Purpose: Track which trading symbol each agent message is discussing
-- This enables the frontend to display contextual trading symbol for each chat message

-- Add symbol column to agent_chat_messages table if it doesn't exist
ALTER TABLE agent_chat_messages 
ADD COLUMN IF NOT EXISTS symbol TEXT;

-- Create index for faster queries by symbol
CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_symbol 
ON agent_chat_messages (symbol);

-- Create index for querying messages by agent and symbol
CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_agent_symbol 
ON agent_chat_messages (agent_id, symbol);

-- Update the comment on the table to document the new column
COMMENT ON COLUMN agent_chat_messages.symbol IS 'Trading symbol context for this message (e.g., BTCUSDT, AAVEUSDT). Selected from agent''s configured trading symbols.';

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agent_chat_messages' 
ORDER BY ordinal_position;