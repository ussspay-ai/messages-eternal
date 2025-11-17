# Symbol Tracking Migration Guide

## Problem
The Gemini agent (and all other agents) were generating chat messages with trading symbols, but those symbols were not being stored in the Supabase database because the `agent_chat_messages` table was missing a `symbol` column.

**Test Results:**
- ✅ Pickaboo correctly returns Gemini's symbols: AAVEUSDT, SUIUSDT
- ❌ Chat generation fails with HTTP 500 (trying to insert symbol into non-existent column)
- ❌ Existing messages don't have symbol data

## Solution
Add the `symbol` column to the `agent_chat_messages` table and create appropriate indexes.

## Files Modified
1. **supabase-migrations-chat.sql** - Updated table definition to include `symbol` TEXT column
2. **supabase-migrations-symbol-tracking.sql** - Alternative migration if you need to add column without recreating table

## How to Apply

### Option 1: Via Supabase SQL Editor (Recommended for existing databases)

1. Go to your Supabase dashboard
2. Navigate to the **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase-migrations-symbol-tracking.sql`
5. Run the query
6. Verify the column was added: You should see the table structure with `symbol` column

**What it does:**
```sql
ALTER TABLE agent_chat_messages 
ADD COLUMN IF NOT EXISTS symbol TEXT;
```

### Option 2: Via Supabase Migrations (For fresh deployments)

If you're deploying to a fresh Supabase project:

1. Copy `supabase-migrations-chat.sql` (already updated with symbol column)
2. Run it in the SQL Editor
3. The table will be created with the symbol column from the start

### Option 3: Via CLI (For Supabase CLI users)

```bash
# Using Supabase CLI
supabase db push

# Or manually:
psql $DATABASE_URL < supabase-migrations-symbol-tracking.sql
```

## Verification

After running the migration, verify it worked:

```sql
-- Check the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agent_chat_messages' 
ORDER BY ordinal_position;

-- You should see 9 columns including:
-- symbol | text | YES
```

## Testing After Migration

Once the migration is applied:

1. **Clear old messages** (optional, to avoid confusion):
   ```sql
   DELETE FROM agent_chat_messages;
   ```

2. **Run the test suite**:
   ```bash
   npx tsx test-gemini-symbols.ts
   ```

3. **Expected test results**:
   - ✅ TEST 1: Pickaboo Symbol Fetch
   - ✅ TEST 2: Chat Generation (should no longer get HTTP 500)
   - ✅ TEST 3: API Message Fetch (should now include symbol)
   - ✅ TEST 4: Dashboard Transformation (symbol should be present)
   - ✅ TEST 5: Supabase Schema Check (should show symbol column)

## What Happens After Migration

### Chat Message Flow
1. **Chat Engine** generates a message with a random symbol from agent's Pickaboo-configured symbols
2. **API Route** `/api/chat/generate` stores the message to Supabase including the `symbol` field
3. **API Route** `/api/chat/messages` retrieves messages from Supabase (with symbol)
4. **Dashboard** transforms and displays the symbol in the model chat view
5. **Component** `ModelChatView` shows the trading symbol context for each message

### Example Message in Supabase
```json
{
  "id": "gemini_grid-1234567890",
  "agent_id": "gemini_grid",
  "agent_name": "Gemini",
  "message_type": "trade_signal",
  "content": "AAVEUSDT showing strong uptrend...",
  "confidence": 78.5,
  "timestamp": "2025-01-17T10:30:00Z",
  "symbol": "AAVEUSDT",
  "created_at": "2025-01-17T10:30:00.123Z"
}
```

## Rollback (If Needed)

If something goes wrong, you can remove the symbol column:

```sql
ALTER TABLE agent_chat_messages 
DROP COLUMN IF EXISTS symbol;

-- Also drop the indexes:
DROP INDEX IF EXISTS idx_agent_chat_symbol;
DROP INDEX IF EXISTS idx_agent_chat_agent_symbol;
```

## Troubleshooting

### Migration fails with "column already exists"
- This means the column was already added. Run the verification query above to confirm it exists.

### HTTP 500 still occurs after migration
- Clear the browser cache
- Restart the Next.js dev server
- Restart the trading bots if running on Railway
- Check server logs for specific error messages

### Symbol still shows as "NONE" in dashboard
- This might mean:
  1. The Supabase table hasn't synced (wait a few seconds)
  2. Old messages from before migration don't have symbols (they won't)
  3. New messages aren't being generated (check `/api/chat/generate` logs)

## Next Steps

1. ✅ Run the migration (Option 1 recommended)
2. ✅ Run the test suite to verify
3. ✅ Clear old messages (optional)
4. ✅ Restart dev server and/or Railway trading bots
5. ✅ Refresh dashboard and verify symbols appear

## Additional Notes

- The `symbol` field is **nullable** - old messages without symbols won't break anything
- Indexes on `symbol` and `(agent_id, symbol)` improve query performance
- This change is **backward compatible** with existing code
- The symbol represents the trading context the agent was discussing, not necessarily the primary position

## Support

If you encounter issues:
1. Check the test results: `npx tsx test-gemini-symbols.ts`
2. Look at server logs (esp. for HTTP 500 errors)
3. Verify the column exists in Supabase dashboard
4. Ensure all API keys and environment variables are set correctly