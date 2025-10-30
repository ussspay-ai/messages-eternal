# Agent Trading Prompts Integration Guide

## Overview
The Pickaboo admin dashboard now includes a **"Agent Trading Prompts"** tab that allows admins to customize the trading strategy prompts for each AI agent. These custom prompts directly influence how agents explain their trading decisions and reasoning in the dashboard chat interface.

## What the Prompt System Does

### ✅ Currently Working
1. **Custom Prompt Storage** - Admins can configure unique trading strategy prompts for each agent
2. **Version History** - Previous prompts are automatically saved, allowing admins to track changes
3. **LLM Integration** - Custom prompts are sent to Claude, GPT-4, Gemini, DeepSeek, and Grok APIs
4. **Agent Responses** - Agents use custom prompts when generating chat responses shown in the dashboard
5. **Market Context Injection** - Custom prompts are automatically enhanced with current market data and portfolio activity

### 📊 Where Prompts Are Used
- **Dashboard Chat Responses** - When agents explain their current holdings, strategy, and reasoning
- **Agent Thinking** - The reasoning explanations shown in agent cards
- **Portfolio Analysis** - When agents provide market analysis and insights

## Architecture

### Frontend (Pickaboo Dashboard)
**File:** `/app/pickaboo/page.tsx`
- **Prompts Tab** - Displays list of agents
- **Two-Column View** - Shows current active prompt (left) alongside edit area (right)
- **Previous History** - Shows previous prompt version with timestamp and who updated it
- **Current Info** - Confirms the active prompt is deployed

### Backend API
**File:** `/app/api/pickaboo/agent-prompts/route.ts`
- **GET** - Fetch all agent prompts from database
- **POST** - Update an agent's prompt with automatic version history

### Database
**Table:** `agent_prompts` (Supabase)
```sql
- agent_id (TEXT, PRIMARY KEY)
- agent_name (TEXT) - Human-readable name
- current_prompt (TEXT) - Active trading prompt
- previous_prompt (TEXT) - Last version for history
- updated_at (TIMESTAMP) - When last updated
- updated_by (TEXT) - Wallet address of who updated
- created_at (TIMESTAMP) - When first created
```

### LLM Integration
**File:** `/lib/llm-apis.ts`
- Updated all agent API functions to accept optional `customPromptTemplate` parameter
- Functions: `callClaudeAPI`, `callOpenAIAPI`, `callGeminiAPI`, `callDeepSeekAPI`, `callGrokAPI`
- Maintains backward compatibility with default prompts
- Custom prompt is combined with market context and portfolio data

### Chat Engine
**File:** `/lib/chat-engine.ts`
- Automatically fetches custom prompts for agents before calling LLM APIs
- Passes custom prompt to `callAgentAPI` function
- Falls back to default prompts if custom prompts aren't configured
- Logs whether custom prompts are being used

## How to Use

### 1. Access the Prompts Dashboard
1. Go to Pickaboo Admin page
2. Click the **"Prompts"** tab
3. You'll see a grid of all available agents

### 2. Configure an Agent's Prompt
1. Click on an agent card (e.g., "Claude Arbitrage")
2. The left panel shows the **current active prompt**
3. Edit the prompt in the **right text area**
4. Click **"Save Prompt"** to deploy
5. The previous prompt is automatically archived

### 3. View History
- After updating a prompt, the **"Previous Prompt Version"** section shows the old prompt
- Includes timestamp of when it was last updated
- Shows who updated it (wallet address)

### 4. Reset Changes
- Click **"Reset"** button to reload the current active prompt

## Prompt Template Examples

### Claude Arbitrage Template
```
You are Claude, executing sophisticated arbitrage strategies.
Analyze current market conditions and explain:
1. Price discrepancies you're identifying
2. Your entry/exit logic for each position
3. Cross-pair dynamics you're monitoring

Current Portfolio Activity: [AUTO-FILLED]
Market Prices: [AUTO-FILLED]
Performance: [AUTO-FILLED]
```

### GPT-4 Momentum Template
```
You are GPT Momentum, a trend-following trading AI.
Explain your current positioning:
1. Trend direction and strength you're following
2. Entry conditions and exit strategy
3. Conviction levels for each position

Portfolio Status: [AUTO-FILLED]
Market Conditions: [AUTO-FILLED]
```

## System Behavior

### Prompt Composition
When an agent responds, the final prompt sent to the LLM is:
```
[CUSTOM_PROMPT]

Current Market Conditions:
- BTC: $[price]
- ETH: $[price]
- SOL: $[price]
...

Your Portfolio Activity: [holdings_and_pnl]
Your Overall Performance: [roi]%
```

### Fallback Logic
- If custom prompt is not configured → uses default prompt
- If API fails → falls back to mock responses with agent-specific patterns
- If market data unavailable → uses placeholder values

## Technical Details

### Agent ID Mapping
```
Frontend Agent       →    Agent ID    →    Database Key
Claude Arbitrage    →    agent_1     →    "agent_1"
GPT-4 Momentum      →    agent_2     →    "agent_2"
Gemini Grid         →    agent_3     →    "agent_3"
DeepSeek ML         →    agent_4     →    "agent_4"
Buy & Hold          →    agent_5     →    "agent_5"
```

### Update Flow
```
1. Admin clicks "Save Prompt"
   ↓
2. Frontend POST to /api/pickaboo/agent-prompts
   ↓
3. API fetches current prompt from DB
   ↓
4. API saves current as "previous_prompt"
   ↓
5. API stores new prompt as "current_prompt"
   ↓
6. Next agent response uses new prompt
```

## Important Notes

⚠️ **Deployment Time**
- Prompts take effect immediately on the next agent response
- No agent restart required
- No dashboard refresh required

⚠️ **Prompt Best Practices**
- Keep prompts focused on trading strategy explanation
- Include specific metrics you want agents to consider
- Avoid conflicting instructions with agent roles
- Test with market-moving scenarios

✅ **Backward Compatibility**
- All existing code works without modifications
- Default prompts still used if custom ones not configured
- No database migration required if using mock mode

## Troubleshooting

### Problem: Custom prompt not appearing in chat
**Solution:**
1. Verify prompt was saved (check "Current Active Prompt" section)
2. Wait for next agent response (cache may be stale)
3. Check browser console for any errors
4. Verify API key is configured for the LLM provider

### Problem: Getting "<!DOCTYPE" error
**Solution:**
1. Ensure Supabase `agent_prompts` table is created
2. Run the database migration: `supabase-migrations-agent-prompts.sql`
3. Check that the API endpoint `/api/pickaboo/agent-prompts` is accessible

### Problem: Agent still using default prompt
**Solution:**
1. Confirm you clicked "Save Prompt" (not just edited)
2. Check the "Current Active Prompt" section shows your text
3. Verify agent's LLM API key is configured
4. Check browser network tab for failed API requests

## Future Enhancements

- [ ] Prompt templates library with pre-built strategies
- [ ] A/B testing different prompts for same agent
- [ ] Prompt performance metrics (ROI correlation)
- [ ] Multi-version comparison view
- [ ] Prompt validation before saving
- [ ] Integration into on-chain trading decisions (not just chat)

## Support

For issues or questions about the prompt system:
1. Check the logs in Pickaboo dashboard
2. Review the error messages in browser console
3. Verify database schema matches requirements
4. Ensure all API endpoints are properly configured