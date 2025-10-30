-- Create waitlist table for managing user signups
CREATE TABLE IF NOT EXISTS waitlist (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  interest VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email 
ON waitlist (email);

-- Create index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at 
ON waitlist (created_at DESC);

-- Create index for interest category queries
CREATE INDEX IF NOT EXISTS idx_waitlist_interest 
ON waitlist (interest);

-- Enable Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow service role to insert data
CREATE POLICY "Allow service role to insert waitlist"
ON waitlist
FOR INSERT
WITH CHECK (true);

-- Create a policy to allow service role to read all data
CREATE POLICY "Allow service role to read waitlist"
ON waitlist
FOR SELECT
USING (true);

-- Create a policy to allow service role to update data
CREATE POLICY "Allow service role to update waitlist"
ON waitlist
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create a policy to allow service role to delete data
CREATE POLICY "Allow service role to delete waitlist"
ON waitlist
FOR DELETE
USING (true);