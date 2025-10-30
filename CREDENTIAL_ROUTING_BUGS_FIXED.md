# Credential Routing Bugs - Fixed ✅

## Bug Fixes Applied

### ✅ Fix #1: `app/api/pickaboo/agent-balances/route.ts` (Line 155)

**Changed From:**
```typescript
const asterClient = new AsterClient({
  agentId,
  signer: signerAddress,
  user: userAddress,  // ← WRONG: Main wallet
  userApiKey: agentApiKey,
  userApiSecret: agentApiSecret,
})
```

**Changed To:**
```typescript
const asterClient = new AsterClient({
  agentId,
  signer: signerAddress,
  userAddress: signerAddress,  // ← FIXED: Use agent's wallet
  userApiKey: agentApiKey,
  userApiSecret: agentApiSecret,
})
```

**Impact:** Pickaboo admin endpoint now fetches agent stats from correct individual agent wallets instead of main wallet.

---

### ✅ Fix #2: `trading-bots/deploy-agents.ts` (Lines 71-103)

**Changed From:**
```typescript
for (const agent of agents) {
  // ... validation ...
  try {
    const client = new AsterClient({
      agentId: agent.agentId,
      signer: agent.signerAddress,
      userAddress,       // ← WRONG: Main wallet
      userApiKey,        // ← WRONG: Main account API key
      userApiSecret,     // ← WRONG: Main account secret
    })
    // ...
  }
}
```

**Changed To:**
```typescript
for (const agent of agents) {
  // ... validation ...
  try {
    // Extract agent number and get agent-specific credentials
    const agentNum = agent.signerAddress.split('_')[1] || agent.agentId.split('_')[1]
    if (!agentNum) {
      console.error(`❌ ${agent.agentId}: Could not extract agent number`)
      continue
    }

    const agentApiKey = process.env[`AGENT_${agentNum}_API_KEY`] || ""
    const agentApiSecret = process.env[`AGENT_${agentNum}_API_SECRET`] || ""

    if (!agentApiKey || !agentApiSecret) {
      console.error(`❌ ${agent.agentId}: Missing agent API credentials`)
      continue
    }

    const client = new AsterClient({
      agentId: agent.agentId,
      signer: agent.signerAddress,
      userAddress: agent.signerAddress,  // ← FIXED: Use agent wallet
      userApiKey: agentApiKey,           // ← FIXED: Use agent credentials
      userApiSecret: agentApiSecret,     // ← FIXED: Use agent credentials
    })
    // ...
  }
}
```

**Impact:** Deploy script now uses correct agent-specific API credentials for each agent instead of main account credentials for all agents.

---

## Summary of Changes

| File | Bug | Fix | Impact |
|------|-----|-----|--------|
| `app/api/pickaboo/agent-balances/route.ts` | Line 155: `user: userAddress` | Changed to `userAddress: signerAddress` | Agent balances now fetched from correct wallets |
| `trading-bots/deploy-agents.ts` | Lines 81-88: Main wallet + credentials for all agents | Extract agent-specific credentials per agent | Deploy script uses correct credentials per agent |

---

## Verification Checklist

- [x] Both files edited successfully
- [x] Agent wallet addresses now used instead of main wallet
- [x] Agent-specific API credentials extracted and used
- [x] Error handling added for missing agent numbers/credentials
- [x] Inline comments clarify the fix

## Testing Recommendations

1. **For agent-balances fix:**
   - Call `/api/pickaboo/agent-balances` endpoint
   - Verify each agent's stats are fetched from their individual signer wallet
   - Check logs show correct agent wallet addresses (not main wallet)

2. **For deploy-agents fix:**
   - Run `node --loader ts-node/esm deploy-agents.ts`
   - Verify each agent is deployed with their own credentials
   - Check that agent account info is fetched correctly per agent
   - Ensure proper error messages if agent credentials are missing

## Related Issues Fixed

These fixes complement the previous wallet isolation fixes applied to 8 frontend API routes:
- `/app/api/aster/agents-data/route.ts`
- `/app/api/aster/account/route.ts`
- `/app/api/aster/positions/route.ts`
- `/app/api/aster/trades/route.ts`
- `/app/api/aster/account-history/route.ts`
- `/app/api/realtime/agents/route.ts`
- `/app/api/aster/agents/optimize/route.ts`
- `/app/api/leaderboard/route.ts`

Now **all credential routing** throughout the codebase should be correct.

## Architecture Pattern

**Correct Pattern (now implemented everywhere):**
```
Agent-Specific Data Fetch:
  AsterClient({
    signer: AGENT_X_SIGNER,           // Agent's wallet address
    userAddress: AGENT_X_SIGNER,      // Agent's wallet address (not main)
    userApiKey: AGENT_X_API_KEY,      // Agent's credentials (not main)
    userApiSecret: AGENT_X_API_SECRET,// Agent's credentials (not main)
  })
```