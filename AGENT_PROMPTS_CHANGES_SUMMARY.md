# Agent Trading Prompts - Implementation Summary

## What Was Done

This implementation enables admins to configure custom trading strategy prompts for each AI agent through the Pickaboo dashboard. These prompts directly influence how agents explain their trading decisions in the dashboard chat interface.

## Files Modified

### 1. Frontend UI Changes
**File:** `/app/pickaboo/page.tsx`
- Updated Prompts tab to display current prompt and editor side-by-side
- Left panel: Shows "📋 Current Active Prompt" in a read-only display (green-themed)
- Right panel: "✏️ Edit New Prompt" text area where users type new prompts
- Both panels are height-matched for comparison
- Responsive: Stacks on mobile, side-by-side on desktop
- Added helpful labels and character count

### 2. LLM API Integration
**File:** `/lib/llm-apis.ts`
- Updated 5 agent API functions to accept optional `customPromptTemplate` parameter:
  - `callClaudeAPI()`
  - `callOpenAIAPI()`
  - `callGeminiAPI()`
  - `callDeepSeekAPI()`
  - `callGrokAPI()`
- Updated unified function: `callAgentAPI()` to pass custom prompt to appropriate agent function
- Custom prompts are combined with market context (BTC, ETH, SOL, BNB, DOGE prices)
- Maintains backward compatibility - uses default prompts if custom not provided

### 3. Chat Engine Integration
**File:** `/lib/chat-engine.ts`
- Added logic to fetch custom prompts before calling LLM APIs
- Uses agent ID mapping to look up correct prompt in database
- Automatically fetches from `/api/pickaboo/agent-prompts` endpoint
- Passes custom prompt to `callAgentAPI()` function
- Logs whether custom prompt is being used for debugging
- Graceful fallback to default prompts if fetch fails

### 4. New Files Created

#### Prompt Fetching Utility
**File:** `/trading-bots/lib/agent-prompt-config.ts`
- Utility functions for trading bots to fetch prompts
- `getAgentPrompt(agentId)` - Fetch single agent prompt
- `getAllAgentPrompts()` - Fetch all agent prompts at once
- Includes agent ID mapping and fallback logic
- Ready for future integration into on-chain trading logic

#### Documentation
**File:** `/AGENT_PROMPTS_INTEGRATION.md`
- Comprehensive guide on how the system works
- Usage instructions for admins
- Architecture overview
- Troubleshooting guide
- Future enhancement suggestions

**File:** `/AGENT_PROMPTS_CHANGES_SUMMARY.md` (this file)
- Summary of all changes made
- Files modified and created
- How the system works
- Testing instructions

## How It Works

### Data Flow
```
1. Admin configures prompt in Pickaboo Prompts tab
   ↓
2. Prompt saved to Supabase via /api/pickaboo/agent-prompts
   ↓
3. When agent generates response in chat:
   a. Chat engine fetches custom prompt from API
   b. Prompt combined with market data and portfolio info
   c. Combined prompt sent to LLM (Claude, GPT-4, Gemini, DeepSeek, Grok)
   d. Agent response displayed with custom prompt's influence
   ↓
4. Previous prompt automatically archived for history
```

### Example Prompt Usage
**Custom Prompt Set:**
```
You are a conservative arbitrage specialist. Focus on:
- Capital preservation over growth
- Low-risk spreads above 0.5%
- Maintaining minimum cash reserves of 30%
```

**Final Prompt Sent to Claude:**
```
You are a conservative arbitrage specialist. Focus on:
- Capital preservation over growth
- Low-risk spreads above 0.5%
- Maintaining minimum cash reserves of 30%

Current Market Conditions:
- BTC: $45000
- ETH: $2500
- SOL: $120

Your Portfolio Activity: Holdings: BTC 0.1, ETH 2.0 | Total PnL: $450.23
Your Overall Performance: 8.5% ROI
```

## Testing Instructions

### 1. Test UI Display
1. Go to Pickaboo dashboard → Prompts tab
2. Click on any agent (e.g., "Claude Arbitrage")
3. Verify:
   - Left panel shows current prompt (or empty if not configured)
   - Right panel is ready for edit
   - Buttons (Save/Reset) are functional

### 2. Test Prompt Configuration
1. Select an agent
2. Enter a unique test prompt in the right panel
3. Click "Save Prompt"
4. Verify:
   - Success message appears
   - Previous prompt now shown in history section
   - Current prompt updated

### 3. Test LLM Integration
1. Configure a distinct custom prompt for an agent
2. Go to Dashboard or Agent detail page
3. Wait for that agent's chat message to load
4. Verify the response reflects the custom prompt's style/instructions
5. Check browser console for "[custom prompt]" log message

### 4. Test Fallback Behavior
1. Delete the custom prompt (set empty)
2. Agent should revert to default prompt
3. Response style changes back to original

## Database Schema Required

The system uses a Supabase table `agent_prompts`:

```sql
CREATE TABLE agent_prompts (
  agent_id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  current_prompt TEXT,
  previous_prompt TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_prompts_updated_at ON agent_prompts(updated_at DESC);
```

**Note:** If using the migration file, run:
```sql
-- From: supabase-migrations-agent-prompts.sql
-- (Run this in Supabase SQL editor)
```

## API Endpoints

### GET /api/pickaboo/agent-prompts
- Query param: `wallet` (required) - wallet address making request
- Returns: All agent prompts organized by agent ID
- Response format:
```json
{
  "success": true,
  "agent_prompts": {
    "agent_1": {
      "agent_id": "agent_1",
      "agent_name": "Claude",
      "current_prompt": "...",
      "previous_prompt": "...",
      "updated_at": "2024-01-15T10:30:00Z",
      "updated_by": "0x..."
    }
  },
  "count": 5
}
```

### POST /api/pickaboo/agent-prompts
- Body:
```json
{
  "wallet": "0x...",
  "agent_id": "agent_1",
  "agent_name": "Claude Arbitrage",
  "new_prompt": "Your custom prompt text..."
}
```
- Response:
```json
{
  "success": true,
  "message": "Agent prompt updated successfully",
  "prompt": { ... }
}
```

## Key Features

✅ **Version Control** - Previous prompts automatically saved
✅ **Real-time Usage** - No restart required, next response uses new prompt
✅ **Backward Compatible** - Works with existing code, no breaking changes
✅ **Audit Trail** - Tracks who updated prompts and when
✅ **Graceful Fallback** - Uses default prompts if custom unavailable
✅ **Side-by-Side Comparison** - View current and new prompt simultaneously
✅ **Error Handling** - Comprehensive logging and error messages

## Integration Points

1. **Pickaboo Dashboard** - Admin interface for managing prompts
2. **LLM APIs** - Claude, GPT-4, Gemini, DeepSeek, Grok
3. **Chat Engine** - Fetches and uses prompts when generating responses
4. **Database** - Supabase for persistent storage
5. **Trading Bots** - Ready for future on-chain integration (utility created)

## Future Enhancement Opportunities

- [ ] Integrate prompts into on-chain trading strategy decisions
- [ ] Create prompt template library
- [ ] A/B testing different prompts
- [ ] Prompt performance analytics (ROI correlation)
- [ ] Multi-version comparison UI
- [ ] Prompt validation rules
- [ ] Scheduled prompt rotations
- [ ] Agent-specific prompt guidelines/templates

## Compatibility

- ✅ Next.js 16.0.0+ (Turbopack)
- ✅ React 19+
- ✅ TypeScript
- ✅ Supabase
- ✅ All LLM providers (Anthropic, OpenAI, Google, DeepSeek, xAI)

## No Breaking Changes

All modifications are backward compatible:
- Existing code works without updates
- New parameters are optional
- Default behavior unchanged if prompts not configured
- API extensions don't affect existing endpoints