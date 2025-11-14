# Agent Battle Arena 🏆⚔️

A real-time competitive AI trading arena where agents duel in simulated market scenarios.

## Overview

**Agent Battle Arena** is the hackathon's killer feature that showcases:
- ✅ Real LLM integration (Claude, GPT-4, Gemini, DeepSeek, Grok)
- ✅ Real-time agent decision-making
- ✅ Competitive framework to judge AI quality
- ✅ Highly shareable & entertaining UI
- ✅ Novel competitive element judges will love

## Features

### 1. **Live Agent Duels** ⚔️
Pick any 2 agents to battle against each other in real-time market scenarios.

**Agents:**
- Claude Arbitrage (Anthropic's Claude)
- GPT-4 Momentum (OpenAI's GPT-4)
- Gemini Grid (Google's Gemini)
- DeepSeek ML (DeepSeek's V3)
- Buy & Hold (Grok sentiment)

### 2. **Market Scenarios** 📊
Each battle uses real market conditions but with scenario modifications:

- **💥 Market Crash** - 15% sudden drop (tests defensive positioning)
- **🚀 Market Pump** - 20% explosive rally (tests opportunity capture)
- **➡️ Sideways Market** - 2% random noise (tests trader discipline)
- **⚡ Extreme Volatility** - ±15% wild swings (tests risk management)
- **⚠️ Flash Crash** - 25% instant drop (tests conviction)

### 3. **Real Decisions** 🤖
Each agent gets a customized battle prompt and calls its actual LLM API:
```
"You are in a competitive trading scenario against another AI agent. 
Respond with your strategy based on these real market conditions."
```

No mocking - this is real AI reasoning head-to-head!

### 4. **Competitive Scoring** 🏅
Winner determined by:
- **Decision Fit**: Does the stance match the scenario? (Bearish in crash = smart)
- **Confidence Level**: How certain is the agent? (Extracted from response length/certainty words)
- **Consensus**: Are they aligned or completely opposed?

### 5. **Beautiful UI** ✨
- Side-by-side agent comparison
- Real decision text displayed
- Confidence bars
- Winner highlighted with reasoning
- Consensus metrics
- Action replay ("Run Another Battle")

## Architecture

### Files Created

```
lib/
├── agent-battle.ts                  # Battle simulation engine
│   ├── simulateAgentBattle()       # Main battle function
│   ├── generateScenarioContext()   # Market scenario generator
│   ├── extractStance()             # Parse bullish/bearish from text
│   ├── extractConfidence()         # Parse confidence % from response
│   └── determineWinner()           # Winner logic
│
components/
├── agent-battle-arena.tsx          # Main UI component (production-ready)
│
app/
├── battles/
│   └── page.tsx                    # Battle page (/battles)
├── api/aster/battle/
│   └── route.ts                    # Battle API endpoint
│
components/
└── sidebar.tsx                     # Updated with Battle Arena link
```

### Data Flow

1. **User selects** 2 agents + scenario from UI
2. **Frontend calls** `POST /api/aster/battle`
3. **Backend fetches** current market prices from `/api/market/prices`
4. **Backend calls** `simulateAgentBattle()`:
   - Generates scenario context (modified prices)
   - Calls agent1's LLM (Claude/GPT-4/Gemini/DeepSeek/Grok)
   - Calls agent2's LLM (parallel)
   - Extracts stance, confidence from responses
   - Determines winner
5. **Frontend displays** side-by-side results

## API Endpoints

### Start Battle
```bash
POST /api/aster/battle
Content-Type: application/json

{
  "agent1Id": "claude_arbitrage",
  "agent2Id": "chatgpt_openai",
  "scenario": "crash"
}
```

**Response:**
```json
{
  "agent1Id": "claude_arbitrage",
  "agent1Name": "Claude",
  "agent1Decision": "...",
  "agent1Confidence": 78,
  "agent1StanceDirection": "bearish",
  
  "agent2Id": "chatgpt_openai",
  "agent2Name": "ChatGPT",
  "agent2Decision": "...",
  "agent2Confidence": 65,
  "agent2StanceDirection": "neutral",
  
  "winnerId": "claude_arbitrage",
  "winnerName": "Claude",
  "winReason": "✅ Correctly defensive in crash scenario",
  "consensusLevel": 20,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Integration Points

### Existing Services Used
- ✅ `lib/llm-apis.ts` - Claude, OpenAI, Gemini, DeepSeek, Grok APIs
- ✅ `/api/market/prices` - Real-time price context
- ✅ `lib/constants/agents.ts` - Agent configurations
- ✅ `lib/chat-engine.ts` - Market context types

### Environment Requirements
All LLM API keys must be set (these are already configured):
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `DEEPSEEK_API_KEY`
- `GROK_API_KEY`

## Navigation

**In Sidebar:** New "Battle Arena" link with ⚡ icon
- Direct path: `/battles`
- Category: Main navigation (between Agents and Leaderboard)

## Usage Guide

### For Users
1. Open `/battles` or click "Battle Arena" in sidebar
2. Select Agent 1 (left panel)
3. Select Agent 2 (right panel) - can't select same agent twice
4. Choose Market Scenario (5 options)
5. Click "⚔️ START BATTLE"
6. Watch real-time LLM calls process
7. See results with winner highlighted
8. Click "Run Another Battle" to try again

### For Developers
```typescript
// To simulate a battle programmatically:
import { simulateAgentBattle } from "@/lib/agent-battle"
import { getAllAgents } from "@/lib/constants/agents"

const agents = getAllAgents()
const result = await simulateAgentBattle(
  agents[0],      // Agent 1
  agents[1],      // Agent 2
  marketContext,  // From /api/market/prices
  "crash"         // Scenario
)
```

## Performance Notes

- **Duration:** 15-40 seconds per battle (LLM API calls)
- **Timeout:** API endpoint configured for 60 seconds max
- **Concurrent:** Can run multiple battles (parallel LLM calls)
- **Caching:** Market prices cached for 30 seconds

## Hackathon Value Proposition

This feature demonstrates:

1. **🚀 Production-Ready AI Integration** - Real multi-LLM orchestration
2. **🎮 Novel UX** - No other trading platform has this
3. **📊 Competitive Intelligence** - Shows which models perform best in different scenarios
4. **🏆 Highly Shareable** - "My AI agent just beat ChatGPT in a crash!" posts
5. **⚙️ Technical Depth** - Judge can see:
   - Real LLM prompt engineering
   - Multi-model reasoning comparison
   - Confidence extraction & scoring
   - Market condition simulation

## Future Enhancements

- Add battle leaderboard (track win rates over 100+ battles)
- Tournament mode (8-agent bracket)
- Time-series battle history
- Export battle videos
- Community voting on winners
- Seasonal rankings

## Testing

### Quick Test (Local)
```bash
# Ensure all LLM API keys are set
curl -X POST http://localhost:3000/api/aster/battle \
  -H "Content-Type: application/json" \
  -d '{
    "agent1Id": "claude_arbitrage",
    "agent2Id": "chatgpt_openai",
    "scenario": "crash"
  }'
```

### UI Test
Open `/battles` and run a battle through the UI.

## Notes

- Battle results are deterministic based on LLM responses (may vary between runs)
- Scenario context is realistic but synthetic for controlled testing
- Winner determination uses multi-factor scoring (not just one metric)
- All decisions are real - no hallucinated trades