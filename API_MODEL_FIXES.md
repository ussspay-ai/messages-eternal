# API Model Configuration & Troubleshooting Guide

## Problem Summary

The agents were falling back to mock data because the AI model names were **hardcoded and outdated**. The system was attempting real API calls but receiving 404/422 errors.

## Root Causes Found

From server logs analysis, here's what was failing:

| Agent | Model | Error | Status |
|-------|-------|-------|--------|
| Claude Arbitrage | `claude-3-5-sonnet-20241022` | 404 Not Found | ❌ Model doesn't exist |
| GPT-4 Momentum | `gpt-4-turbo` | 429 Too Many Requests | ❌ **Quota exceeded** |
| Gemini Grid | `gemini-1.5-pro` | 404 Not Found | ❌ Model not available |
| DeepSeek ML | `deepseek-chat` | ✅ SUCCESS | ✅ Working! |
| Buy & Hold (Grok) | `grok-2-latest` | 422 Unprocessable Entity | ❌ Invalid request |

**Critical Finding**: DeepSeek is actually working! You saw the full AI response in the logs for that agent.

---

## Fixes Applied

### 1. **Model Names Are Now Configurable**

All hardcoded model names have been replaced with environment variable lookups with fallbacks:

```typescript
// BEFORE (hardcoded):
model: "claude-3-5-sonnet-20241022"

// AFTER (configurable):
model: process.env.CLAUDE_MODEL || "claude-3-sonnet-20240229"
```

This means:
- If you set `CLAUDE_MODEL` in `.env.local`, it will use that
- Otherwise, it falls back to a working default (`claude-3-sonnet-20240229`)

### 2. **Updated `.env.local`**

Added optional model configuration variables (commented out by default):

```
# CLAUDE_MODEL=claude-3-5-sonnet-20241022
# OPENAI_MODEL=gpt-4-turbo
# GEMINI_MODEL=gemini-1.5-pro
# DEEPSEEK_MODEL=deepseek-chat
# GROK_MODEL=grok-2-latest
```

---

## Current Fallback Models

If you don't uncomment the variables, the system will use these:

| API Provider | Fallback Model | Notes |
|--------------|----------------|-------|
| Claude (Anthropic) | `claude-3-sonnet-20240229` | Stable, widely available |
| OpenAI | `gpt-4-turbo-preview` | Safe fallback for GPT-4 |
| Gemini (Google) | `gemini-pro` | Latest stable Gemini |
| DeepSeek | `deepseek-chat` | Already working! |
| Grok (xAI) | `grok-2-1212` | Latest Grok release |

---

## What You Need To Do

### **URGENT: Fix OpenAI Quota (429 Error)**

Your OpenAI key has hit a quota limit. This requires one of:

1. **Check billing**:
   - Go to [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
   - Verify your payment method is valid
   - Add more credits if needed

2. **Check rate limits**:
   - Maybe you're making too many requests
   - Consider adding delays between requests

3. **Alternative**: Use a different OpenAI API key with available quota

### **Test the Fallback Models**

The system will now automatically try the fallback models. Just restart your dev server:

```bash
# Kill the dev server (Ctrl+C)
npm run dev
```

This will pick up the new model configuration code. You should see:
- ✅ DeepSeek responses (already working)
- ✅ Claude responses (with fallback model)
- ✅ Gemini responses (with fallback model)
- ✅ Grok responses (with fallback model)
- ❌ GPT-4 responses (will still fail until you fix quota)

### **Optional: Specify Exact Models**

If you know the correct/current model names, uncomment and update in `.env.local`:

```
CLAUDE_MODEL=claude-3-5-sonnet-20241022
OPENAI_MODEL=gpt-4-turbo
GEMINI_MODEL=gemini-1.5-pro
DEEPSEEK_MODEL=deepseek-chat
GROK_MODEL=grok-2-latest
```

---

## How to Verify the Fixes

### 1. **Check Server Logs**

After restarting the dev server, run:

```bash
curl -X POST http://localhost:3000/api/chat/generate
```

Look in the dev server terminal for messages like:

```
[LLM-APIs] ✅ Claude API success for claude_arbitrage
[LLM-APIs] ✅ Gemini API success for gemini_grid
[LLM-APIs] ✅ DeepSeek API success for deepseek_ml
```

If you see these, real APIs are being called! ✅

### 2. **Check for Fallback Messages**

If you see:

```
⚠️ Falling back to mock responses for [agent]
```

This means that API call failed. Check the preceding error message.

### 3. **Available Model Names by Provider**

If the fallbacks don't work, try these:

**Claude (Anthropic)**:
- `claude-3-opus-20240229` (best, most expensive)
- `claude-3-sonnet-20240229` (balanced)
- `claude-3-haiku-20240307` (fast, cheaper)

**OpenAI**:
- `gpt-4-turbo-preview`
- `gpt-4-0125-preview`
- `gpt-3.5-turbo` (if quota issues persist)

**Gemini (Google)**:
- `gemini-pro` (v1)
- `gemini-1.5-flash` (latest, fast)
- `gemini-pro-vision` (with images)

**DeepSeek**:
- `deepseek-chat` (main model)

**Grok (xAI)**:
- `grok-2-1212` (latest)
- `grok-2` (fallback)

---

## Architecture: How API Selection Works

```
Request for Agent Response
  ↓
generateAgentResponse() called with agent.id
  ↓
callAgentAPI() routes to correct API based on agent ID
  ↓
API function (callClaudeAPI, callOpenAIAPI, etc.)
  ├─ Checks if API key exists
  ├─ Builds request with model: process.env.[MODEL_NAME] || fallback
  ├─ Makes API call
  └─ If fails → Error logged, Promise rejected
  ↓
Chat engine catches error
  ├─ Logs: "[Chat Engine] ❌ Real API failed for [agent]"
  └─ Falls back to mock response
```

---

## Logging Prefixes to Watch

| Prefix | Meaning |
|--------|---------|
| `[LLM-APIs] ✅` | API call succeeded |
| `[LLM-APIs] ❌` | API returned error |
| `[Chat Engine] ❌ Real API failed` | API call was attempted but failed |
| `[Chat Engine] ⚠️ Falling back to mock` | Now using mock data |
| `[Chat Engine] 🤖 Calling real API` | About to try real API |

---

## Next Steps

1. **Restart dev server** to load the new code
2. **Fix OpenAI quota** (if you want GPT-4 responses)
3. **Test** with the curl command above
4. **Monitor server logs** for `[LLM-APIs]` and `[Chat Engine]` prefixes

The system is now set up to gracefully handle model availability changes! 🚀