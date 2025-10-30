# Critical Wallet Isolation Fix - Agent Credential Routing

## Problem Summary
Agents were placing trades in the **main user wallet** instead of their **individual agent-specific wallets** because of two critical credential routing issues:

### Issue 1: API Key Being Used as Wallet Address
In multiple API routes, the code was incorrectly passing the agent's API key as the `signer` parameter (which should be a wallet address):
```typescript
// WRONG ❌
signer: credentials.userApiKey || credentials.signer
```

This confused the AsterClient which logs "Trading from signer wallet: [API_KEY]" instead of the actual wallet address.

### Issue 2: Main Wallet Used for Agent Requests
The `getAgentCredentials()` function was returning the **main user wallet** (`ASTER_USER_ADDRESS`) for all agents, even when they had agent-specific API keys:
```typescript
// WRONG ❌
const user = process.env.ASTER_USER_ADDRESS  // Main wallet for all agents!
```

When REST API calls were made with agent-specific credentials but the main wallet address, orders would be placed on the main wallet, not the agent's wallet.

## Solution
Fixed credential passing to correctly route each agent to their own wallet:

### Change 1: `getAgentCredentials()` in `/lib/constants/agents.ts`
- Removed confusing `user` field set to main wallet
- Now returns `user: signer` (agent's wallet) for REST API calls
- Only validates agent-specific credentials (signer and private key)

```typescript
// CORRECT ✅
return {
  signer,                    // Agent's wallet address
  user: signer,             // For REST API: use agent's wallet (not main user wallet)
  privateKey,
  userApiKey,
  userApiSecret,
}
```

### Change 2: All API Routes Fixed
Updated 7 frontend API routes to correctly pass wallet addresses:

1. **`/app/api/aster/agents-data/route.ts`**
   - Changed: `signer: credentials.userApiKey || credentials.signer` → `signer: credentials.signer`
   - Changed: `user: credentials.user` → `userAddress: credentials.signer`

2. **`/app/api/aster/account/route.ts`**
   - Same fix as above

3. **`/app/api/aster/positions/route.ts`**
   - Same fix as above

4. **`/app/api/aster/trades/route.ts`**
   - Same fix as above

5. **`/app/api/aster/account-history/route.ts`**
   - Same fix as above

6. **`/app/api/realtime/agents/route.ts`**
   - Same fix as above

7. **`/app/api/aster/agents/optimize/route.ts`**
   - Same fix as above

8. **`/app/api/leaderboard/route.ts`**
   - Changed: `user: userAddress` (main wallet) → `userAddress: signerAddress` (agent's wallet)

## How It Works Now

### Before (BROKEN):
```
Agent 1 (API: AGENT_1_API_KEY) → Wrong signer (API key string)
                                → Wrong user (ASTER_USER_ADDRESS)
                                → Orders placed on MAIN WALLET ❌
```

### After (CORRECT):
```
Agent 1 (API: AGENT_1_API_KEY) → Correct signer (AGENT_1_SIGNER wallet)
                                → Correct user (AGENT_1_SIGNER wallet)
                                → Orders placed on AGENT_1_SIGNER wallet ✅
```

## Architecture Clarification

**Each agent has three related credentials:**

1. **Agent Signer Wallet** (`AGENT_X_SIGNER`)
   - The blockchain wallet address where trades are placed
   - Each agent has a unique wallet

2. **REST API Credentials** (`AGENT_X_API_KEY`, `AGENT_X_API_SECRET`)
   - Registered on Aster DEX under the agent's signer wallet
   - Used for REST API authentication

3. **Agent Private Key** (`AGENT_X_PRIVATE_KEY`)
   - Only used for on-chain signing (not in REST API calls)

**Correct REST API Flow:**
- Use agent-specific API credentials in request headers (X-MBX-APIKEY)
- Use agent-specific API secret for HMAC signature
- These credentials are pre-registered with the agent's signer wallet on Aster DEX
- Orders are automatically placed on the agent's wallet

## Verification Checklist

- [ ] All 7 API routes use `signer: credentials.signer` (not API key)
- [ ] All API routes use `userAddress: credentials.signer` (not main wallet)
- [ ] `getAgentCredentials()` returns agent's wallet for `user` field
- [ ] Trading-bots `base-strategy.ts` already had correct implementation (no changes needed)
- [ ] Each agent uses their own API credentials (AGENT_X_API_KEY/SECRET)
- [ ] New 20 ASTERUSDT orders should be on correct agent wallets, not main wallet

## Files Modified
1. `/lib/constants/agents.ts` - getAgentCredentials function
2. `/app/api/aster/agents-data/route.ts`
3. `/app/api/aster/account/route.ts`
4. `/app/api/aster/positions/route.ts`
5. `/app/api/aster/trades/route.ts`
6. `/app/api/aster/account-history/route.ts`
7. `/app/api/realtime/agents/route.ts`
8. `/app/api/aster/agents/optimize/route.ts`
9. `/app/api/leaderboard/route.ts`